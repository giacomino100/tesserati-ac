import type { BandFee, FeeSchedule } from '../types';

/**
 * Listino 2026/27, copiato dal PDF docs/dominio/fonti/quote-tesseramento-2026-27.pdf
 * (vedi docs/dominio/regole-quote.md). Le quote si cambiano qui, non nel codice di calcolo.
 */
const bands: readonly BandFee[] = [
  { band: 'acr', minAge: 6, maxAge: 14, fullCents: 1500, discountedCents: 1200 },
  { band: 'giovanissimi', minAge: 15, maxAge: 18, fullCents: 1600, discountedCents: 1300 },
  { band: 'giovani', minAge: 19, maxAge: 29, fullCents: 2200, discountedCents: 1800 },
  { band: 'adulti', minAge: 30, fullCents: 2600, discountedCents: 2100 },
].map((b): BandFee => Object.freeze(b) as BandFee);

export const SCHEDULE_2026_27: FeeSchedule = Object.freeze({
  associationYear: 2026,
  label: '2026/27',
  minAge: 6,
  bands: Object.freeze(bands),
  acrPackageCents: 2500,
  maxHouseholdSize: 4,
});
