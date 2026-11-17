import { describe, expect, it } from 'vitest';
import { SCHEDULE_2026_27, type FeeSchedule } from '@tesseramento/fees';
import {
  listForBand,
  renewalDraft,
  renewalView,
  type RenewalCandidate,
  type RenewalView,
  type YearMember,
} from '../src/index';
import { allSamples, member } from './helpers';

/** Listino 2027/28 di prova: stesse fasce e quote del 2026/27 (come lo creerebbe la segreteria). */
const schedule2027 = (): FeeSchedule =>
  ({ ...(JSON.parse(JSON.stringify(SCHEDULE_2026_27)) as FeeSchedule), associationYear: 2027 }) as FeeSchedule;

const view2027 = (current: YearMember[] = [], memberships = new Map<string, string>()): RenewalView =>
  renewalView({ year: 2027, previous: allSamples(), current, memberships, schedule: schedule2027() });

const pending = (v: RenewalView): RenewalCandidate[] => [...v.groups.flatMap((g) => g.candidates), ...v.singles];
const find = (v: RenewalView, lastName: string) => pending(v).find((c) => c.member.lastName === lastName)!;

describe('listForBand (R1)', () => {
  it('fasce del PDF → elenchi', () => {
    expect(listForBand('acr')).toBe('ACR');
    expect(listForBand('giovanissimi')).toBe('GIOVANI');
    expect(listForBand('giovani')).toBe('GIOVANI');
    expect(listForBand('adulti')).toBe('ADULTI');
  });
});

describe('renewalView sui dati finti 2026 → 2027 (R2–R5)', () => {
  it('37 da decidere: 9 gruppi per N. Legame (27 persone) e 10 singoli in ordine di nome', () => {
    const v = view2027();
    expect(v.pendingCount).toBe(37);
    expect(v.renewedCount).toBe(0);
    expect(v.groups.map((g) => g.bondId)).toEqual([
      '900001', '900002', '900003', '900004', '900005', '900006', '900007', '900008', '900009',
    ]);
    expect(v.groups.flatMap((g) => g.candidates)).toHaveLength(27);
    for (const g of v.groups) {
      const dates = g.candidates.map((c) => c.member.birthDate);
      expect(dates).toEqual([...dates].sort());
    }
    expect(v.groups.find((g) => g.bondId === '900003')!.bond).toBe('C4');
    const names = v.singles.map((c) => `${c.member.lastName} ${c.member.firstName}`);
    expect(names).toHaveLength(10);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'it')));
  });

  it('RINALDI PIETRO passa da ACR a Giovani, RIZZO VALERIA da Giovani ad Adulti', () => {
    const v = view2027();
    const rinaldi = find(v, 'RINALDI');
    expect(rinaldi).toMatchObject({ age: 15, list: 'GIOVANI', renewable: true });
    expect(rinaldi.warnings).toEqual([{ kind: 'listChange', from: 'ACR', to: 'GIOVANI' }]);
    const rizzo = find(v, 'RIZZO');
    expect(rizzo).toMatchObject({ age: 30, list: 'ADULTI', renewable: true });
    expect(rizzo.warnings).toEqual([{ kind: 'listChange', from: 'GIOVANI', to: 'ADULTI' }]);
  });

  it("GATTI MIA: 5 anni, resta ACR con l'avviso di età minima ed è riconfermabile", () => {
    const gatti = find(view2027(), 'GATTI');
    expect(gatti).toMatchObject({ age: 5, list: 'ACR', renewable: true });
    expect(gatti.warnings).toEqual([{ kind: 'underMinAge', minAge: 6 }]);
  });

  it('elenchi del 2027: 14 ACR, 8 Giovani, 15 Adulti; esattamente 2 cambi di elenco', () => {
    const all = pending(view2027());
    const count = (l: string) => all.filter((c) => c.list === l).length;
    expect([count('ACR'), count('GIOVANI'), count('ADULTI')]).toEqual([14, 8, 15]);
    expect(all.filter((c) => c.warnings.some((w) => w.kind === 'listChange'))).toHaveLength(2);
    expect(all.every((c) => c.renewable)).toBe(true);
  });
});

describe('casi particolari (R6–R9)', () => {
  it('R6: nata dopo l anno nuovo → data incoerente, non riconfermabile', () => {
    const v = renewalView({
      year: 2027,
      previous: [member('futura', { birthDate: '2030-01-01', list: 'ACR' })],
      current: [],
      memberships: new Map(),
      schedule: schedule2027(),
    });
    const c = v.singles[0]!;
    expect(c.renewable).toBe(false);
    expect(c.list).toBeUndefined();
    expect(c.warnings).toEqual([{ kind: 'invalidBirthDate' }]);
  });

  it('R7: chi è già nell anno nuovo non è da decidere ma tra gli iscritti', () => {
    const previous = allSamples();
    const moretti = previous.find((m) => m.lastName === 'MORETTI')!;
    const gallo = previous.find((m) => m.lastName === 'GALLO' && m.firstName === 'TOMMASO')!;
    const v = view2027(
      [
        { ...moretti, origin: 'riconferma' },
        { ...gallo, list: 'ACR' },
      ],
      new Map(),
    );
    expect(v.pendingCount).toBe(35);
    expect(v.renewedCount).toBe(2);
    expect(pending(v).some((c) => c.member.personId === moretti.personId)).toBe(false);
    expect(v.renewed.map((r) => r.member.lastName)).toEqual(['GALLO', 'MORETTI']);
    expect(v.groups.find((g) => g.bondId === '900003')!.candidates).toHaveLength(3);
  });

  it('R8: annullabile solo una riconferma fuori da famiglie confermate', () => {
    const previous = allSamples();
    const moretti = previous.find((m) => m.lastName === 'MORETTI')!;
    const barbieri = previous.find((m) => m.lastName === 'BARBIERI')!;
    const fontana = previous.find((m) => m.lastName === 'FONTANA')!;
    const v = view2027(
      [{ ...moretti, origin: 'riconferma' }, { ...barbieri, origin: 'riconferma' }, { ...fontana }],
      new Map([[barbieri.personId, 'fam-1']]),
    );
    const byName = (n: string) => v.renewed.find((r) => r.member.lastName === n)!;
    expect(byName('MORETTI')).toMatchObject({ origin: 'riconferma', inFamily: false, undoable: true });
    expect(byName('BARBIERI')).toMatchObject({ origin: 'riconferma', inFamily: true, undoable: false });
    expect(byName('FONTANA')).toMatchObject({ origin: 'import', undoable: false });
  });

  it('R9: senza listino nessuno è riconfermabile', () => {
    const v = renewalView({ year: 2027, previous: allSamples(), current: [], memberships: new Map() });
    expect(v.pendingCount).toBe(37);
    expect(pending(v).some((c) => c.renewable)).toBe(false);
  });

  it('chi ha un\'adesione solo nell\'anno nuovo (non nel precedente) non compare', () => {
    const v = view2027([member('nuova', { birthDate: '1990-01-01' })]);
    expect(v.renewedCount).toBe(0);
    expect(v.pendingCount).toBe(37);
  });
});

describe('renewalDraft (R10)', () => {
  it('elenco del nuovo anno e legame dell anno precedente, nessun dato anagrafico', () => {
    const rinaldi = find(view2027(), 'RINALDI');
    expect(renewalDraft(rinaldi, 2027)).toEqual({ personId: rinaldi.member.personId, associationYear: 2027, list: 'GIOVANI' });
    const verdi = view2027().groups.find((g) => g.bondId === '900002')!.candidates[0]!;
    const draft = renewalDraft(verdi, 2027);
    expect(draft).toEqual({
      personId: verdi.member.personId,
      associationYear: 2027,
      list: 'ADULTI',
      bond: 'C3',
      bondId: '900002',
    });
    expect(Object.keys(draft)).not.toContain('lastName');
  });
});
