import type { AgeBand, FeeSchedule } from './types';

/** Età = anno associativo − anno di nascita; giorno e mese non contano. */
export function ageFor(birthDate: string, associationYear: number): number {
  return associationYear - Number(birthDate.slice(0, 4));
}

/** Fascia per l'età data; undefined sotto `schedule.minAge`. */
export function bandForAge(age: number, schedule: FeeSchedule): AgeBand | undefined {
  if (age < schedule.minAge) return undefined;
  return schedule.bands.find((b) => age >= b.minAge && (b.maxAge === undefined || age <= b.maxAge))
    ?.band;
}

export function bandFor(birthDate: string, schedule: FeeSchedule): AgeBand | undefined {
  return bandForAge(ageFor(birthDate, schedule.associationYear), schedule);
}
