import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import {
  identityKey,
  matchNewMember,
  parseAdhesionSheet,
  resolveSimilar,
  validateNewMember,
  type ArchivedPerson,
  type NewMember,
  type NewMemberInput,
} from '../src/index';

/** Nomi inventati (specifica 009, contracts/new-member-api.md). */

const input = (over: Partial<NewMemberInput> = {}): NewMemberInput => ({
  lastName: 'BIANCO',
  firstName: 'LUCA',
  birthDate: '2019-05-10',
  sex: '',
  taxCode: '',
  ...over,
});

function valid(over: Partial<NewMemberInput> = {}, year = 2026): NewMember {
  const result = validateNewMember(input(over), year);
  if (!result.ok) throw new Error('dati di prova non validi');
  return result.member;
}

function person(id: string, lastName: string, firstName: string, birthDate: string, over: Partial<ArchivedPerson> = {}): ArchivedPerson {
  return { id, lastName, firstName, birthDate, identityKey: identityKey(lastName, firstName, birthDate), ...over };
}

const none = new Set<string>();

describe('validateNewMember (N1–N5)', () => {
  it('N1: pulisce spazi e minuscole; stessa chiave dell’import', () => {
    const member = valid({ lastName: '  bianco ', firstName: 'luca   maria' });
    expect(member).toMatchObject({ lastName: 'BIANCO', firstName: 'LUCA MARIA', birthDate: '2019-05-10' });
    expect(member.identityKey).toBe(identityKey('BIANCO', 'LUCA MARIA', '2019-05-10'));
  });

  it('N2: campi obbligatori', () => {
    expect(validateNewMember(input({ lastName: ' ', firstName: '', birthDate: '' }), 2026)).toEqual({
      ok: false,
      errors: {
        lastName: 'Inserisci il cognome.',
        firstName: 'Inserisci il nome.',
        birthDate: 'Inserisci la data di nascita.',
      },
    });
  });

  it.each(['2019-02-30', '2027-01-01', '1905-12-31', '10/05/2019'])('N3: data %s non valida', (birthDate) => {
    expect(validateNewMember(input({ birthDate }), 2026)).toEqual({
      ok: false,
      errors: { birthDate: 'Data di nascita non valida.' },
    });
  });

  it('N3: limiti accettati (nato nell’anno, 120 anni prima)', () => {
    expect(validateNewMember(input({ birthDate: '2026-12-31' }), 2026).ok).toBe(true);
    expect(validateNewMember(input({ birthDate: '1906-01-01' }), 2026).ok).toBe(true);
  });

  it('N4: codice fiscale', () => {
    expect(valid({ taxCode: ' bnclcu19e10g348x ' }).taxCode).toBe('BNCLCU19E10G348X');
    expect(valid({ taxCode: '' })).not.toHaveProperty('taxCode');
    for (const taxCode of ['BNCLCU19E10G348', 'BNCLCU19E10G348-']) {
      expect(validateNewMember(input({ taxCode }), 2026)).toEqual({
        ok: false,
        errors: { taxCode: 'Il codice fiscale ha 16 lettere e numeri.' },
      });
    }
  });

  it('N5: sesso facoltativo', () => {
    expect(valid({ sex: '' })).not.toHaveProperty('sex');
    expect(valid({ sex: 'F' }).sex).toBe('F');
  });
});

describe('matchNewMember (N6–N10)', () => {
  const rossi = person('rossi', 'ROSSI', 'MARIO', '1965-03-12', { lastAdhesion: { year: 2026, list: 'ADULTI' } });
  const neri = person('neri', 'NERI', 'ANNA', '1982-11-05', { taxCode: 'NRENNA82S45G348X', lastAdhesion: { year: 2023, list: 'ADULTI' } });
  const verdi = person('verdi', 'VERDI', 'PAOLO', '1980-01-20', { lastAdhesion: { year: 2023, list: 'ADULTI' } });
  const archive = [rossi, neri, verdi];

  it('N6: nessuna persona simile → nuova', () => {
    expect(matchNewMember(valid(), 2026, archive, none, none)).toEqual({ kind: 'new' });
  });

  it('N7: stessa chiave, ultima adesione 2023 → esistente', () => {
    const m = valid({ lastName: 'Verdi', firstName: 'Paolo', birthDate: '1980-01-20' });
    expect(matchNewMember(m, 2026, archive, none, none)).toEqual({ kind: 'existing', person: verdi, by: 'identity' });
  });

  it('N8: stesso codice fiscale con un altro nome → esistente', () => {
    const m = valid({ lastName: 'NERI', firstName: 'ANNAMARIA', birthDate: '1982-11-15', taxCode: 'NRENNA82S45G348X' });
    expect(matchNewMember(m, 2026, archive, none, none)).toEqual({ kind: 'existing', person: neri, by: 'taxCode' });
  });

  it('N9: ROSSI MARIO 13/03 con 12/03 in archivio → possibile doppione', () => {
    const m = valid({ lastName: 'ROSSI', firstName: 'MARIO', birthDate: '1965-03-13' });
    expect(matchNewMember(m, 2027, archive, none, none)).toEqual({ kind: 'similar', candidates: [rossi] });
  });

  it('N10: adesione nell’anno precedente → riconferma; nell’anno → già iscritta', () => {
    const m = valid({ lastName: 'ROSSI', firstName: 'MARIO', birthDate: '1965-03-12' }, 2027);
    expect(matchNewMember(m, 2027, archive, none, new Set(['rossi']))).toEqual({
      kind: 'renewable',
      person: rossi,
      previousYear: 2026,
    });
    expect(matchNewMember(m, 2026, archive, new Set(['rossi']), none)).toEqual({ kind: 'alreadyInYear', person: rossi });
  });

  it('N10: dopo "Stessa persona" valgono gli stessi controlli d’anno', () => {
    expect(resolveSimilar('rossi', 2027, archive, none, new Set(['rossi']))).toEqual({
      kind: 'renewable',
      person: rossi,
      previousYear: 2026,
    });
    expect(resolveSimilar('verdi', 2026, archive, none, none)).toEqual({ kind: 'existing', person: verdi, by: 'identity' });
  });
});

describe('N12 – archivio dei file finti', () => {
  it('BIANCO LUCA non c’è: persona nuova', () => {
    const archive: ArchivedPerson[] = [];
    for (const name of ['ACR', 'Giovani', 'Adulti']) {
      const path = fileURLToPath(new URL(`../../../docs/dominio/excel-esempio/ElencoAdesioni_${name}.xlsx`, import.meta.url));
      const wb = XLSX.read(readFileSync(path), { type: 'buffer', dense: true });
      const ws = wb.Sheets['ElencoAdesioniExcel']!;
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
      const parsed = parseAdhesionSheet({ sheetNames: wb.SheetNames, rows, date1904: false });
      if (!parsed.ok) throw new Error('file finto non valido');
      archive.push(...parsed.rows.map((r) => person(r.identityKey, r.lastName, r.firstName, r.birthDate)));
    }
    expect(archive).toHaveLength(37);
    expect(matchNewMember(valid(), 2026, archive, none, none)).toEqual({ kind: 'new' });
  });
});
