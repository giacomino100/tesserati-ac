import { formatEuros, parseEuros, type MoneyErrorCode } from './money';
import type { AgeBand, BandFee, FeeSchedule } from './types';

export type FieldIssueCode = MoneyErrorCode | 'discountedAboveFull';
export type DraftField = 'acrPackage' | `${AgeBand}.full` | `${AgeBand}.discounted`;

export interface FieldIssue {
  readonly field: DraftField;
  readonly code: FieldIssueCode;
}

/** Le quote come testo in euro, così come le scrive l'utente. */
export interface ScheduleDraft {
  readonly acrPackage: string;
  readonly bands: Readonly<Record<AgeBand, { readonly full: string; readonly discounted: string }>>;
}

export type DraftResult =
  | { ok: true; schedule: FeeSchedule }
  | { ok: false; issues: readonly FieldIssue[] };

function isPositiveInteger(n: number): boolean {
  return Number.isSafeInteger(n) && n > 0;
}

/** Controlla un listino già in centesimi (anche se letto dall'archivio). */
export function validateFeeSchedule(schedule: FeeSchedule): readonly FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (!isPositiveInteger(schedule.acrPackageCents)) {
    issues.push({ field: 'acrPackage', code: 'notPositive' });
  }
  for (const band of schedule.bands) {
    if (!isPositiveInteger(band.fullCents)) {
      issues.push({ field: `${band.band}.full`, code: 'notPositive' });
    }
    if (!isPositiveInteger(band.discountedCents)) {
      issues.push({ field: `${band.band}.discounted`, code: 'notPositive' });
    } else if (isPositiveInteger(band.fullCents) && band.discountedCents > band.fullCents) {
      issues.push({ field: `${band.band}.discounted`, code: 'discountedAboveFull' });
    }
  }
  return issues;
}

export function scheduleToDraft(schedule: FeeSchedule): ScheduleDraft {
  const bandDraft = (band: AgeBand) => {
    const b = schedule.bands.find((x) => x.band === band);
    if (!b) throw new Error(`fascia mancante nel listino: ${band}`);
    return { full: formatEuros(b.fullCents), discounted: formatEuros(b.discountedCents) };
  };
  return {
    acrPackage: formatEuros(schedule.acrPackageCents),
    bands: {
      acr: bandDraft('acr'),
      giovanissimi: bandDraft('giovanissimi'),
      giovani: bandDraft('giovani'),
      adulti: bandDraft('adulti'),
    },
  };
}

/**
 * Bozza in euro → listino. Cambia solo le quote: anno, etichetta, età minima, massimo del nucleo
 * e fasce d'età vengono da `base`. Restituisce tutti gli errori di campo insieme.
 */
export function draftToSchedule(draft: ScheduleDraft, base: FeeSchedule): DraftResult {
  const issues: FieldIssue[] = [];
  const money = (field: DraftField, text: string): number | undefined => {
    const r = parseEuros(text);
    if (r.ok) return r.cents;
    issues.push({ field, code: r.code });
    return undefined;
  };

  const acrPackageCents = money('acrPackage', draft.acrPackage);
  const bands: BandFee[] = base.bands.map((b) => {
    const d = draft.bands[b.band];
    const fullCents = money(`${b.band}.full`, d.full);
    const discountedCents = money(`${b.band}.discounted`, d.discounted);
    if (fullCents !== undefined && discountedCents !== undefined && discountedCents > fullCents) {
      issues.push({ field: `${b.band}.discounted`, code: 'discountedAboveFull' });
    }
    return { ...b, fullCents: fullCents ?? b.fullCents, discountedCents: discountedCents ?? b.discountedCents };
  });

  if (issues.length > 0 || acrPackageCents === undefined) return { ok: false, issues };
  return { ok: true, schedule: { ...base, acrPackageCents, bands } };
}

export function labelFor(associationYear: number): string {
  const next = String((associationYear + 1) % 100).padStart(2, '0');
  return `${associationYear}/${next}`;
}

/** L'anno successivo al più recente; senza anni non c'è un listino da cui partire. */
export function nextAssociationYear(existingYears: readonly number[]): number {
  if (existingYears.length === 0) throw new Error('nessun listino esistente da cui partire');
  return Math.max(...existingYears) + 1;
}

/** Copia del listino per l'anno dopo: stesse quote e regole fisse, anno ed etichetta nuovi. */
export function copyForNextYear(latest: FeeSchedule): FeeSchedule {
  const associationYear = latest.associationYear + 1;
  return {
    ...latest,
    associationYear,
    label: labelFor(associationYear),
    bands: latest.bands.map((b) => ({ ...b })),
  };
}
