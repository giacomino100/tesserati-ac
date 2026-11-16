import { ageFor, bandForAge } from './age-band';
import { orderMembers } from './order';
import type {
  AcrPackageLine,
  BandFee,
  Benefit,
  HouseholdFeeInput,
  HouseholdFeeResult,
  MemberFeeLine,
  NotCoveredReason,
} from './types';
import { validateInput } from './validate';

/**
 * Calcolo della quota di un nucleo (regole di docs/dominio/regole-quote.md).
 * Funzione pura: ogni importo viene dal listino, nessuna percentuale o arrotondamento qui.
 */
export function calculateHouseholdFee(input: HouseholdFeeInput): HouseholdFeeResult {
  const errors = validateInput(input);
  if (errors.length > 0) return { status: 'invalidInput', errors };

  const { schedule } = input;
  const ordered = orderMembers(input.members).map((member) => {
    const age = ageFor(member.birthDate, schedule.associationYear);
    const band = bandForAge(age, schedule);
    return { member, age, band };
  });

  // Casi non previsti dal listino: tutto il nucleo è "non previsto", nessun importo.
  const reasons: NotCoveredReason[] = [];
  if (ordered.length > schedule.maxHouseholdSize) reasons.push('householdTooLarge');
  if (ordered.some(({ age }) => age < schedule.minAge)) reasons.push('memberUnderMinAge');
  if (reasons.length > 0) {
    return {
      status: 'notCovered',
      reasons,
      members: ordered.map(({ member, age, band }) => ({
        memberId: member.id,
        age,
        ...(band !== undefined ? { band } : {}),
      })),
    };
  }

  const n = ordered.length;
  const feeOf = (band: BandFee['band']): BandFee => {
    const fee = schedule.bands.find((b) => b.band === band);
    if (!fee) throw new Error(`listino senza la fascia ${band}`);
    return fee;
  };

  const lines: MemberFeeLine[] = ordered.map(({ member, age, band }) => {
    if (band === undefined) throw new Error('fascia mancante dopo la validazione');
    const fee = feeOf(band);
    return {
      memberId: member.id,
      age,
      band,
      fullCents: fee.fullCents,
      benefit: 'none' as Benefit,
      amountCents: fee.fullCents,
    };
  });

  const withBenefit = (index: number, benefit: 'discount20' | 'free'): void => {
    const line = lines[index];
    if (!line) return;
    const amountCents = benefit === 'free' ? 0 : feeOf(line.band).discountedCents;
    lines[index] = { ...line, benefit, amountCents };
  };
  const intoPackage = (index: number): void => {
    const line = lines[index];
    if (!line) return;
    lines[index] = {
      memberId: line.memberId,
      age: line.age,
      band: line.band,
      fullCents: line.fullCents,
      benefit: 'inAcrPackage',
    };
  };

  let acrPackage: AcrPackageLine | undefined;
  const acrIndexes = lines.flatMap((l, i) => (l.band === 'acr' ? [i] : []));
  const r = acrIndexes.length;

  const applyAcrPackage = (indexes: readonly [number, number]): void => {
    indexes.forEach(intoPackage);
    const [a, b] = indexes;
    acrPackage = {
      amountCents: schedule.acrPackageCents,
      memberIds: [lines[a]?.memberId ?? '', lines[b]?.memberId ?? ''],
    };
  };

  if (n === 2 && r === 2) {
    applyAcrPackage([0, 1]);
  } else if (n === 3) {
    if (r === 2) {
      applyAcrPackage([acrIndexes[0] ?? 0, acrIndexes[1] ?? 0]);
    } else if (r === 3) {
      applyAcrPackage([0, 1]);
      withBenefit(2, 'discount20');
    } else {
      withBenefit(2, 'discount20');
    }
  } else if (n === 4) {
    withBenefit(2, 'discount20');
    withBenefit(3, 'free');
  }

  const totalCents =
    lines.reduce((sum, l) => sum + (l.amountCents ?? 0), 0) + (acrPackage?.amountCents ?? 0);

  return {
    status: 'calculated',
    members: lines,
    ...(acrPackage ? { acrPackage } : {}),
    totalCents,
  };
}
