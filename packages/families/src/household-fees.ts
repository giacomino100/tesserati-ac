import { calculateHouseholdFee, type FeeSchedule } from '@tesseramento/fees';
import type {
  FeeComparison,
  FeeLine,
  FeeOutcome,
  Household,
  HouseholdFee,
  NotCoveredKind,
  SavedHouseholdFee,
  YearTotals,
} from './types';

/** Errori di dati che il dominio tratta come "non previsto" (regole-quote.md §4): solo le date di nascita. */
const BIRTH_DATE_ERRORS = new Set(['invalidBirthDate', 'birthDateAfterYear']);

function outcomeOf(household: Household, schedule: FeeSchedule, associationYear: number): FeeOutcome {
  const result = calculateHouseholdFee({
    associationYear,
    schedule,
    members: household.members.map((m) => ({
      id: m.personId,
      lastName: m.lastName,
      firstName: m.firstName,
      birthDate: m.birthDate,
    })),
  });
  if (result.status === 'calculated') {
    return {
      kind: 'calculated',
      lines: result.members.map((l) => ({
        memberId: l.memberId,
        age: l.age,
        band: l.band,
        fullCents: l.fullCents,
        benefit: l.benefit,
        ...(l.amountCents === undefined ? {} : { amountCents: l.amountCents }),
      })),
      ...(result.acrPackage ? { acrPackageCents: result.acrPackage.amountCents } : {}),
      totalCents: result.totalCents,
    };
  }
  if (result.status === 'notCovered') return { kind: 'notCovered', reason: result.reasons[0] as NotCoveredKind };
  return result.errors.every((e) => BIRTH_DATE_ERRORS.has(e.code))
    ? { kind: 'notCovered', reason: 'invalidInput' }
    : { kind: 'error' };
}

/**
 * Quota di ogni nucleo con il solo calcolo della specifica 002 e il listino dell'anno (constitution II):
 * nessun importo né percentuale qui.
 */
export function householdFees(
  households: readonly Household[],
  schedule: FeeSchedule,
  associationYear: number = schedule.associationYear,
): HouseholdFee[] {
  return households.map((household) => ({ household, outcome: outcomeOf(household, schedule, associationYear) }));
}

/** Istantanea da salvare per un nucleo calcolato (solo ID e importi, nessun nome). */
export function toSavedCalculated(
  fee: HouseholdFee,
  associationYear: number,
): Omit<SavedHouseholdFee, 'savedAt' | 'savedBy'> {
  if (fee.outcome.kind !== 'calculated') throw new Error('solo nuclei calcolati');
  return {
    key: fee.household.key,
    associationYear,
    memberIds: fee.household.members.map((m) => m.personId),
    kind: 'calculated',
    lines: fee.outcome.lines,
    ...(fee.outcome.acrPackageCents === undefined ? {} : { acrPackageCents: fee.outcome.acrPackageCents }),
    totalCents: fee.outcome.totalCents,
  };
}

const sameMembers = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().every((id, i) => id === [...b].sort()[i]);

const sameLines = (a: readonly FeeLine[] = [], b: readonly FeeLine[] = []) =>
  a.length === b.length &&
  a.every((x, i) => {
    const y = b[i]!;
    return (
      x.memberId === y.memberId &&
      x.age === y.age &&
      x.band === y.band &&
      x.fullCents === y.fullCents &&
      x.benefit === y.benefit &&
      x.amountCents === y.amountCents
    );
  });

/**
 * Confronto tra calcolo attuale e quote salvate (FR-008, FR-009): le quote salvate non cambiano da sole; un nucleo
 * è "changed" se il calcolo di oggi è diverso, "new" se non è mai stato salvato, "removed" se non esiste più.
 * Una quota manuale vale finché i componenti sono gli stessi.
 */
export function compareWithSaved(
  current: readonly HouseholdFee[],
  saved: readonly SavedHouseholdFee[],
): FeeComparison[] {
  const savedByKey = new Map(saved.map((s) => [s.key, s]));
  const comparisons: FeeComparison[] = current.map((fee) => {
    const s = savedByKey.get(fee.household.key);
    const ids = fee.household.members.map((m) => m.personId);
    const notCovered = fee.outcome.kind === 'notCovered';
    if (!s) return { key: fee.household.key, status: 'new', current: fee, needsManual: notCovered };
    const same = sameMembers(ids, s.memberIds);
    if (s.kind === 'manual') {
      const valid = same && notCovered;
      return { key: fee.household.key, status: valid ? 'unchanged' : 'changed', current: fee, saved: s, needsManual: notCovered && !valid };
    }
    const unchanged =
      same &&
      fee.outcome.kind === 'calculated' &&
      fee.outcome.totalCents === s.totalCents &&
      fee.outcome.acrPackageCents === s.acrPackageCents &&
      sameLines(fee.outcome.lines, s.lines);
    return { key: fee.household.key, status: unchanged ? 'unchanged' : 'changed', current: fee, saved: s, needsManual: notCovered };
  });
  const present = new Set(current.map((f) => f.household.key));
  for (const s of saved) {
    if (!present.has(s.key)) comparisons.push({ key: s.key, status: 'removed', saved: s, needsManual: false });
  }
  return comparisons;
}

/** Totali dell'anno: calcolo attuale + quote manuali valide; e, a parte, il totale delle quote salvate. */
export function yearTotals(comparisons: readonly FeeComparison[]): YearTotals {
  let totalCents = 0;
  let savedTotalCents = 0;
  let calculated = 0;
  let manual = 0;
  let missing = 0;
  let toUpdate = 0;
  for (const c of comparisons) {
    if (c.status !== 'removed' && c.saved) savedTotalCents += c.saved.totalCents;
    if (c.status === 'changed' || c.status === 'removed' || (c.status === 'new' && !c.needsManual)) toUpdate++;
    if (c.status === 'removed' || !c.current) continue;
    const outcome = c.current.outcome;
    if (outcome.kind === 'calculated') {
      calculated++;
      totalCents += outcome.totalCents;
    } else if (c.saved?.kind === 'manual' && !c.needsManual) {
      manual++;
      totalCents += c.saved.totalCents;
    } else {
      missing++;
    }
  }
  return { totalCents, savedTotalCents, calculated, manual, missing, toUpdate };
}
