import { ageFor, bandForAge, type AgeBand, type FeeSchedule } from '@tesseramento/fees';
import type { FamilyList, ListStatus, YearMember } from './types';

const LIST_OF_BAND: Record<AgeBand, FamilyList> = {
  acr: 'ACR',
  giovanissimi: 'GIOVANI',
  giovani: 'GIOVANI',
  adulti: 'ADULTI',
};

/** Elenco del nuovo anno per una fascia del PDF (regole-famiglia.md §3, specifica 008). */
export function listForBand(band: AgeBand): FamilyList {
  return LIST_OF_BAND[band];
}

/**
 * Elenco per età nell'anno con le fasce del listino (specifiche 008, 009, 011): sotto l'età minima ACR; data non
 * valida o successiva all'anno → `undefined`.
 */
export function listForAge(birthDate: string, year: number, schedule: FeeSchedule): FamilyList | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return undefined;
  const age = ageFor(birthDate, year);
  if (!Number.isInteger(age) || age < 0) return undefined;
  const band = bandForAge(age, schedule);
  return band ? listForBand(band) : 'ACR';
}

/** Stato dell'elenco di un'adesione rispetto all'età (specifica 011, research R5). */
export function listStatus(
  row: Pick<YearMember, 'list' | 'birthDate' | 'exception'>,
  year: number,
  schedule: FeeSchedule | undefined,
): ListStatus {
  const expected = schedule ? listForAge(row.birthDate, year, schedule) : undefined;
  if (row.exception) return expected ? { kind: 'exception', expected } : { kind: 'exception' };
  if (!expected) return { kind: 'unknown' };
  return row.list === expected ? { kind: 'aligned' } : { kind: 'misaligned', expected };
}

/** "Allinea tutte": le adesioni non allineate (escluse le eccezioni) con l'elenco per età. */
export function alignAllPlan<T extends Pick<YearMember, 'list' | 'birthDate' | 'exception'>>(
  rows: readonly T[],
  year: number,
  schedule: FeeSchedule | undefined,
): { readonly row: T; readonly to: FamilyList }[] {
  const plan: { row: T; to: FamilyList }[] = [];
  for (const row of rows) {
    const status = listStatus(row, year, schedule);
    if (status.kind === 'misaligned') plan.push({ row, to: status.expected });
  }
  return plan;
}
