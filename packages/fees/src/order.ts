import type { HouseholdMember } from './types';

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Dal più anziano al più giovane; a parità: cognome, nome, id. Non modifica l'input. */
export function orderMembers(members: readonly HouseholdMember[]): HouseholdMember[] {
  return [...members].sort(
    (a, b) =>
      cmp(a.birthDate, b.birthDate) ||
      cmp(a.lastName, b.lastName) ||
      cmp(a.firstName, b.firstName) ||
      cmp(a.id, b.id),
  );
}
