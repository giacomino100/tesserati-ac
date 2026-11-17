import { ageFor, bandForAge, type AgeBand, type FeeSchedule } from '@tesseramento/fees';
import type { AgeWarning, ImportRow } from './types';

/** Settore dell'export che corrisponde a ogni fascia del listino. */
const SECTOR_OF_BAND: Record<AgeBand, string> = {
  acr: 'RAGAZZI',
  giovanissimi: 'GIOVANI',
  giovani: 'GIOVANI',
  adulti: 'ADULTI',
};

/**
 * Avvisi non bloccanti (specifica 006, FR-008): età sotto il minimo del listino, oppure settore dell'export
 * diverso da quello della fascia del listino. Età e fasce vengono solo dal listino dell'anno (principio I).
 */
export function ageWarnings(rows: readonly ImportRow[], schedule: FeeSchedule): AgeWarning[] {
  const warnings: AgeWarning[] = [];
  for (const row of rows) {
    const age = ageFor(row.birthDate, schedule.associationYear);
    const band = bandForAge(age, schedule);
    if (band === undefined) {
      warnings.push({ row, age, kind: 'belowMinimumAge' });
      continue;
    }
    const expectedSector = SECTOR_OF_BAND[band];
    if (row.sector.toUpperCase() !== expectedSector) {
      warnings.push({ row, age, kind: 'sectorMismatch', expectedSector });
    }
  }
  return warnings;
}
