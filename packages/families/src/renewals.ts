import { ageFor, bandForAge, type AgeBand, type FeeSchedule } from '@tesseramento/fees';
import type {
  FamilyList,
  RenewalCandidate,
  RenewalDraft,
  RenewalGroup,
  RenewalView,
  RenewalWarning,
  RenewedMember,
  YearMember,
} from './types';

const LIST_OF_BAND: Record<AgeBand, FamilyList> = {
  acr: 'ACR',
  giovanissimi: 'GIOVANI',
  giovani: 'GIOVANI',
  adulti: 'ADULTI',
};

/** Elenco del nuovo anno per una fascia del PDF (regole-famiglia.md §3, specifica 008). */
export function listForBand(band: AgeBand): FamilyList {
  return LIST_OF_BAND[band];
}

const byAge = (a: YearMember, b: YearMember) =>
  a.birthDate.localeCompare(b.birthDate) || a.lastName.localeCompare(b.lastName, 'it') || a.firstName.localeCompare(b.firstName, 'it');
const byName = (a: YearMember, b: YearMember) =>
  a.lastName.localeCompare(b.lastName, 'it') || a.firstName.localeCompare(b.firstName, 'it');

function candidate(m: YearMember, year: number, schedule: FeeSchedule | undefined): RenewalCandidate {
  const age = /^\d{4}-\d{2}-\d{2}$/.test(m.birthDate) ? ageFor(m.birthDate, year) : Number.NaN;
  if (!Number.isInteger(age) || age < 0) {
    return { member: m, age: Number.isInteger(age) ? age : 0, warnings: [{ kind: 'invalidBirthDate' }], renewable: false };
  }
  if (!schedule) return { member: m, age, warnings: [], renewable: false };
  const band = bandForAge(age, schedule);
  const warnings: RenewalWarning[] = [];
  const list = band ? listForBand(band) : 'ACR';
  if (!band) warnings.push({ kind: 'underMinAge', minAge: schedule.minAge });
  if (list !== m.list) warnings.push({ kind: 'listChange', from: m.list, to: list });
  return { member: m, age, list, warnings, renewable: true };
}

export interface RenewalInput {
  /** Anno nuovo. */
  readonly year: number;
  /** Tesserati dell'anno precedente. */
  readonly previous: readonly YearMember[];
  /** Tesserati dell'anno nuovo (con `origin`). */
  readonly current: readonly YearMember[];
  /** Appartenenze dell'anno nuovo: personId → familyId. */
  readonly memberships: ReadonlyMap<string, string>;
  /** Listino dell'anno nuovo; assente = nessuno riconfermabile. */
  readonly schedule?: FeeSchedule;
}

/**
 * Vista delle riconferme (specifica 008, research R4 e R8): tesserati dell'anno precedente senza adesione nell'anno
 * nuovo, raggruppati per N. Legame (dal più anziano) e poi singoli in ordine di nome; a parte chi è già iscritto.
 */
export function renewalView(input: RenewalInput): RenewalView {
  const currentById = new Map(input.current.map((m) => [m.personId, m]));
  const pending: YearMember[] = [];
  const renewed: RenewedMember[] = [];
  for (const m of input.previous) {
    const now = currentById.get(m.personId);
    if (!now) {
      pending.push(m);
      continue;
    }
    const origin = now.origin ?? 'import';
    const inFamily = input.memberships.has(m.personId);
    renewed.push({ member: now, origin, inFamily, undoable: origin === 'riconferma' && !inFamily });
  }

  const byBond = new Map<string, YearMember[]>();
  const singles: YearMember[] = [];
  for (const m of pending) {
    if (m.bondId) byBond.set(m.bondId, [...(byBond.get(m.bondId) ?? []), m]);
    else singles.push(m);
  }
  const groups: RenewalGroup[] = [...byBond]
    .sort(([a], [b]) => a.localeCompare(b, 'it', { numeric: true }))
    .map(([bondId, members]) => {
      const bond = members.find((m) => m.bond)?.bond;
      return {
        bondId,
        ...(bond ? { bond } : {}),
        candidates: [...members].sort(byAge).map((m) => candidate(m, input.year, input.schedule)),
      };
    });

  return {
    groups,
    singles: singles.sort(byName).map((m) => candidate(m, input.year, input.schedule)),
    renewed: renewed.sort((a, b) => byName(a.member, b.member)),
    pendingCount: pending.length,
    renewedCount: renewed.length,
  };
}

/** Adesione da creare per un candidato riconfermabile: elenco del nuovo anno, legame dell'anno precedente. */
export function renewalDraft(c: RenewalCandidate, year: number): RenewalDraft {
  if (!c.renewable || !c.list) throw new Error('not-renewable');
  return {
    personId: c.member.personId,
    associationYear: year,
    list: c.list,
    ...(c.member.bond ? { bond: c.member.bond } : {}),
    ...(c.member.bondId ? { bondId: c.member.bondId } : {}),
  };
}
