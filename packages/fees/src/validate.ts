import type { HouseholdFeeInput, InvalidInputError } from './types';

export const MAX_PLAUSIBLE_AGE = 110;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function validateInput(input: HouseholdFeeInput): InvalidInputError[] {
  const errors: InvalidInputError[] = [];
  if (input.associationYear !== input.schedule.associationYear) {
    errors.push({ code: 'scheduleYearMismatch' });
  }
  const seen = new Set<string>();
  const reportedDuplicates = new Set<string>();
  for (const member of input.members) {
    if (seen.has(member.id) && !reportedDuplicates.has(member.id)) {
      errors.push({ code: 'duplicateMemberId', memberId: member.id });
      reportedDuplicates.add(member.id);
    }
    seen.add(member.id);

    if (!isRealDate(member.birthDate)) {
      errors.push({ code: 'invalidBirthDate', memberId: member.id });
      continue;
    }
    const year = Number(member.birthDate.slice(0, 4));
    if (year > input.associationYear) {
      errors.push({ code: 'birthDateAfterYear', memberId: member.id });
    } else if (input.associationYear - year > MAX_PLAUSIBLE_AGE) {
      errors.push({ code: 'invalidBirthDate', memberId: member.id });
    }
  }
  return errors;
}
