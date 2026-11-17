import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { parseAdhesionSheet } from '@tesseramento/import';
import type { ConfirmedFamily, FamilyList, YearMember } from '../src/index';

/** Tesserato inventato dell'anno. */
export function member(personId: string, over: Partial<YearMember> = {}): YearMember {
  return {
    personId,
    lastName: personId.toUpperCase(),
    firstName: 'ALFA',
    birthDate: '2000-01-01',
    list: 'ADULTI',
    ...over,
  };
}

export function family(id: string, memberIds: string[], over: Partial<ConfirmedFamily> = {}): ConfirmedFamily {
  return {
    id,
    associationYear: 2026,
    memberIds,
    origin: 'legame',
    confirmedAt: new Date('2026-11-17T10:00:00Z'),
    confirmedBy: 'segreteria@example.org',
    ...over,
  };
}

/** Appartenenze coerenti con le famiglie date (personId → familyId). */
export function membershipsOf(...families: ConfirmedFamily[]): Map<string, string> {
  return new Map(families.flatMap((f) => f.memberIds.map((p) => [p, f.id] as const)));
}

/** I tesserati di un file finto, come li darebbe l'archivio (ID = chiave di identità). */
export function sampleMembers(name: string, list: FamilyList): YearMember[] {
  const path = fileURLToPath(new URL(`../../../docs/dominio/excel-esempio/${name}`, import.meta.url));
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', dense: true });
  const ws = wb.Sheets['ElencoAdesioniExcel'];
  const rows = ws ? XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) : [];
  const parsed = parseAdhesionSheet({ sheetNames: wb.SheetNames, rows, date1904: false });
  if (!parsed.ok) throw new Error('file finto non valido');
  return parsed.rows.map((r) => ({
    personId: r.identityKey,
    lastName: r.lastName,
    firstName: r.firstName,
    birthDate: r.birthDate,
    list,
    ...(r.bond ? { bond: r.bond } : {}),
    ...(r.bondId ? { bondId: r.bondId } : {}),
  }));
}

export const allSamples = (): YearMember[] => [
  ...sampleMembers('ElencoAdesioni_ACR.xlsx', 'ACR'),
  ...sampleMembers('ElencoAdesioni_Giovani.xlsx', 'GIOVANI'),
  ...sampleMembers('ElencoAdesioni_Adulti.xlsx', 'ADULTI'),
];
