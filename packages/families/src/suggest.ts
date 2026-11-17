import { parseBond } from './bond';
import type {
  ConfirmedFamily,
  ConfirmedFamilyView,
  ElsewhereMember,
  FamilyWarning,
  ProposedAddition,
  SuggestedFamily,
  YearFamilies,
  YearMember,
} from './types';

const byAge = (a: YearMember, b: YearMember) =>
  a.birthDate.localeCompare(b.birthDate) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
const byName = (a: YearMember, b: YearMember) =>
  a.lastName.localeCompare(b.lastName, 'it') || a.firstName.localeCompare(b.firstName, 'it');

/**
 * Appartenenze effettive (research R8): conta solo l'appartenenza verso una famiglia esistente che contiene la
 * persona, e solo per i tesserati dell'anno. È la fonte di verità di chi sta in quale famiglia.
 */
function effectiveMemberships(
  members: ReadonlyMap<string, YearMember>,
  families: ReadonlyMap<string, ConfirmedFamily>,
  memberships: ReadonlyMap<string, string>,
): Map<string, string> {
  const assigned = new Map<string, string>();
  for (const [personId, familyId] of memberships) {
    const family = families.get(familyId);
    if (family && members.has(personId) && family.memberIds.includes(personId)) assigned.set(personId, familyId);
  }
  return assigned;
}

function bondWarnings(group: readonly YearMember[], found: number): FamilyWarning[] {
  const bonds = [...new Set(group.map((m) => m.bond).filter((b): b is string => !!b))].sort();
  const warnings: FamilyWarning[] = [];
  if (bonds.length > 1) warnings.push({ kind: 'bondMismatch', bonds });
  const parsed = bonds.length === 1 ? parseBond(bonds[0]) : undefined;
  if (parsed && parsed.size !== found) warnings.push({ kind: 'sizeMismatch', expected: parsed.size, found });
  return warnings;
}

/**
 * Famiglie dell'anno (specifica 007): confermate con i componenti effettivi, suggerite dal N. Legame (per chi
 * non è in una famiglia confermata), aggiunte proposte alle famiglie confermate con lo stesso N. Legame, e tesserati
 * senza famiglia. Funzione pura.
 */
export function suggestFamilies(
  members: readonly YearMember[],
  confirmed: readonly ConfirmedFamily[],
  memberships: ReadonlyMap<string, string>,
): YearFamilies {
  const byId = new Map(members.map((m) => [m.personId, m]));
  const families = new Map(confirmed.map((f) => [f.id, f]));
  const assigned = effectiveMemberships(byId, families, memberships);

  const confirmedViews: ConfirmedFamilyView[] = confirmed.map((family) => {
    const effective = family.memberIds.filter((id) => assigned.get(id) === family.id);
    const inconsistent = family.memberIds.filter((id) => assigned.get(id) !== family.id);
    return {
      family,
      members: effective.map((id) => byId.get(id)!).sort(byAge),
      warnings: inconsistent.length > 0 ? [{ kind: 'inconsistent', personIds: inconsistent }] : [],
    };
  });

  const byBond = new Map<string, YearMember[]>();
  for (const m of members) {
    if (m.bondId) byBond.set(m.bondId, [...(byBond.get(m.bondId) ?? []), m]);
  }

  const suggested: SuggestedFamily[] = [];
  const additions: ProposedAddition[] = [];
  for (const [bondId, all] of [...byBond].sort(([a], [b]) => a.localeCompare(b))) {
    const free = all.filter((m) => !assigned.has(m.personId)).sort(byAge);
    if (free.length === 0) continue;
    const target = confirmed.find((f) => f.bondId === bondId);
    if (target) {
      for (const member of free) additions.push({ familyId: target.id, member });
      continue;
    }
    const elsewhere: ElsewhereMember[] = all
      .filter((m) => assigned.has(m.personId))
      .sort(byAge)
      .map((member) => ({ member, familyId: assigned.get(member.personId)! }));
    const bond = all.find((m) => m.bond)?.bond;
    suggested.push({
      bondId,
      members: free,
      ...(bond ? { bond } : {}),
      warnings: bondWarnings(all, all.length),
      confirmable: free.length >= 2,
      elsewhere,
    });
  }

  const withoutFamily = members.filter((m) => !m.bondId && !assigned.has(m.personId)).sort(byName);
  return { confirmed: confirmedViews, suggested, additions, withoutFamily };
}
