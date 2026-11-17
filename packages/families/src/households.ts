import type { Household, HouseholdsOfYear, YearFamilies, YearMember } from './types';

const byAge = (a: YearMember, b: YearMember) =>
  a.birthDate.localeCompare(b.birthDate) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
const byName = (a: Household, b: Household) => {
  const x = a.members[0]!;
  const y = b.members[0]!;
  return x.lastName.localeCompare(y.lastName, 'it') || x.firstName.localeCompare(y.firstName, 'it');
};

/**
 * Nuclei dell'anno (specifica 010, regole-famiglia.md §1): le famiglie confermate con i componenti effettivi e ogni
 * tesserato fuori da una famiglia confermata come nucleo da 1 — anche se è in una famiglia solo suggerita.
 */
export function householdsOfYear(families: YearFamilies): HouseholdsOfYear {
  const confirmed: Household[] = families.confirmed
    .filter((c) => c.members.length > 0)
    .map((c) => ({
      key: `f-${c.family.id}`,
      familyId: c.family.id,
      ...(c.family.bondId ? { bondId: c.family.bondId } : {}),
      members: [...c.members].sort(byAge),
    }));
  const singles: YearMember[] = [
    ...families.suggested.flatMap((s) => s.members),
    ...families.additions.map((a) => a.member),
    ...families.withoutFamily,
  ];
  const singleHouseholds: Household[] = singles.map((m) => ({ key: `p-${m.personId}`, members: [m] })).sort(byName);
  return {
    households: [...confirmed.sort(byName), ...singleHouseholds],
    unconfirmedSuggested: families.suggested.filter((s) => s.confirmable).length,
  };
}
