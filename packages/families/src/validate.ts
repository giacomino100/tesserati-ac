import type { FamilyIssue, YearMember } from './types';

/**
 * Problemi di una famiglia da confermare (regole-famiglia.md §1, chiarimenti della 007): almeno 2 componenti,
 * tutti tesserati dell'anno, nessuno già in un'altra famiglia (secondo le appartenenze, personId → familyId).
 * `familyId` è la famiglia che si sta modificando: i suoi componenti non sono "in un'altra famiglia".
 */
export function validateFamily(
  memberIds: readonly string[],
  members: readonly YearMember[],
  memberships: ReadonlyMap<string, string>,
  familyId?: string,
): FamilyIssue[] {
  const unique = [...new Set(memberIds)];
  const inYear = new Set(members.map((m) => m.personId));
  const issues: FamilyIssue[] = [];
  if (unique.length < 2) issues.push({ kind: 'tooFew' });
  for (const personId of unique) {
    if (!inYear.has(personId)) {
      issues.push({ kind: 'notInYear', personId });
      continue;
    }
    const other = memberships.get(personId);
    if (other !== undefined && other !== familyId) issues.push({ kind: 'inOtherFamily', personId, familyId: other });
  }
  return issues;
}
