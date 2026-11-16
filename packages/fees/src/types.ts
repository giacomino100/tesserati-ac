export type AgeBand = 'acr' | 'giovanissimi' | 'giovani' | 'adulti';

export interface BandFee {
  readonly band: AgeBand;
  /** Età minima, inclusa. */
  readonly minAge: number;
  /** Età massima, inclusa; assente = nessun limite. */
  readonly maxAge?: number;
  /** Quota piena in centesimi. */
  readonly fullCents: number;
  /** Intero > 0, ≤ fullCents: quota "Percentuale del 20%" del PDF, non calcolata. */
  readonly discountedCents: number;
}

export interface FeeSchedule {
  readonly associationYear: number;
  readonly label: string;
  readonly minAge: number;
  readonly bands: readonly BandFee[];
  readonly acrPackageCents: number;
  readonly maxHouseholdSize: number;
}

export interface HouseholdMember {
  readonly id: string;
  readonly lastName: string;
  readonly firstName: string;
  /** "YYYY-MM-DD" */
  readonly birthDate: string;
}

export interface HouseholdFeeInput {
  readonly associationYear: number;
  readonly members: readonly HouseholdMember[];
  readonly schedule: FeeSchedule;
}

export type Benefit = 'none' | 'discount20' | 'free' | 'inAcrPackage';

export interface MemberFeeLine {
  readonly memberId: string;
  readonly age: number;
  readonly band: AgeBand;
  readonly fullCents: number;
  readonly benefit: Benefit;
  /** Assente se benefit = 'inAcrPackage'. */
  readonly amountCents?: number;
}

export interface AcrPackageLine {
  readonly amountCents: number;
  readonly memberIds: readonly [string, string];
}

export type NotCoveredReason = 'householdTooLarge' | 'memberUnderMinAge';

export type InvalidInputCode =
  | 'scheduleYearMismatch'
  | 'invalidBirthDate'
  | 'birthDateAfterYear'
  | 'duplicateMemberId';

export interface InvalidInputError {
  readonly code: InvalidInputCode;
  readonly memberId?: string;
}

export interface NotCoveredMember {
  readonly memberId: string;
  readonly age: number;
  readonly band?: AgeBand;
}

export type HouseholdFeeResult =
  | {
      readonly status: 'calculated';
      readonly members: readonly MemberFeeLine[];
      readonly acrPackage?: AcrPackageLine;
      readonly totalCents: number;
    }
  | {
      readonly status: 'notCovered';
      readonly reasons: readonly NotCoveredReason[];
      readonly members: readonly NotCoveredMember[];
    }
  | {
      readonly status: 'invalidInput';
      readonly errors: readonly InvalidInputError[];
    };
