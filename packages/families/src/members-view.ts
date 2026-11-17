import type { FeeSchedule } from '@tesseramento/fees';
import { renewalView } from './renewals';
import type {
  ConfirmedFamily,
  FamilyPanel,
  FamilyUpdate,
  MemberYearRow,
  MemberYearView,
  RenewalCandidate,
  YearMember,
} from './types';

const byName = (a: YearMember, b: YearMember) =>
  a.lastName.localeCompare(b.lastName, 'it') || a.firstName.localeCompare(b.firstName, 'it');
const byAge = (a: YearMember, b: YearMember) => a.birthDate.localeCompare(b.birthDate) || byName(a, b);

export interface MemberYearInput {
  readonly year: number;
  /** Tesserati dell'anno precedente. */
  readonly previous: readonly YearMember[];
  /** Tesserati dell'anno (con origine, pagamento, eccezione). */
  readonly current: readonly YearMember[];
  /** Appartenenze dell'anno: personId → familyId. */
  readonly memberships: ReadonlyMap<string, string>;
  readonly schedule?: FeeSchedule;
}

/**
 * Elenco unico di Tesserati (specifica 013, research R1): tesserati dell'anno precedente ancora da confermare (con età,
 * elenco ed avvisi della 008) e iscritti dell'anno, in ordine di cognome e nome.
 */
export function memberYearView(input: MemberYearInput): MemberYearView {
  const view = renewalView(input);
  const candidates = new Map<string, RenewalCandidate>(
    [...view.groups.flatMap((g) => g.candidates), ...view.singles].map((c) => [c.member.personId, c]),
  );
  const rows: MemberYearRow[] = [];
  for (const [personId, candidate] of candidates) {
    rows.push({ member: candidate.member, status: 'pending', candidate, undoable: false });
    void personId;
  }
  for (const m of input.current) {
    const origin = m.origin ?? 'import';
    const familyId = input.memberships.get(m.personId);
    rows.push({
      member: m,
      status: 'enrolled',
      origin,
      ...(m.paidOn ? { paidOn: m.paidOn } : {}),
      ...(familyId ? { familyId } : {}),
      undoable: origin !== 'import' && !familyId,
    });
  }
  rows.sort((a, b) => byName(a.member, b.member));
  return { rows, pendingCount: candidates.size, enrolledCount: input.current.length };
}

export interface FamilyAfterConfirmInput {
  readonly personId: string;
  /** Iscritti dell'anno (con la persona appena confermata). */
  readonly current: readonly YearMember[];
  readonly families: readonly ConfirmedFamily[];
  readonly memberships: ReadonlyMap<string, string>;
}

/**
 * Famiglia dell'anno dopo la conferma di una persona (chiarimento B della 013): si aggiunge alla famiglia confermata con
 * il suo N. Legame; altrimenti nasce con gli iscritti dello stesso N. Legame fuori da famiglie. Chi è stato tolto a
 * mano (`familyOptOut`) non entra e non fa entrare.
 */
export function familyAfterConfirm(input: FamilyAfterConfirmInput): FamilyUpdate {
  const person = input.current.find((m) => m.personId === input.personId);
  if (!person?.bondId || person.familyOptOut || input.memberships.has(person.personId)) return { kind: 'none' };
  const existing = input.families.find((f) => f.bondId === person.bondId);
  if (existing) {
    const members = existing.memberIds.filter((id) => input.memberships.get(id) === existing.id);
    return { kind: 'add', familyId: existing.id, memberIds: [...members, person.personId] };
  }
  const others = input.current.filter(
    (m) => m.bondId === person.bondId && m.personId !== person.personId && !input.memberships.has(m.personId) && !m.familyOptOut,
  );
  if (others.length === 0) return { kind: 'none' };
  return { kind: 'create', bondId: person.bondId, memberIds: [...others.map((m) => m.personId), person.personId] };
}

export interface FamilyPanelInput {
  readonly personId: string;
  readonly previous: readonly YearMember[];
  readonly current: readonly YearMember[];
  readonly families: readonly ConfirmedFamily[];
  readonly memberships: ReadonlyMap<string, string>;
}

/**
 * Pannello "Famiglia" di una persona (research R4): la famiglia confermata dell'anno (sua o del suo N. Legame), i
 * componenti effettivi e chi ha lo stesso N. Legame l'anno prima, con lo stato; gli iscritti aggiungibili.
 */
export function familyPanel(input: FamilyPanelInput): FamilyPanel {
  const currentById = new Map(input.current.map((m) => [m.personId, m]));
  const person = currentById.get(input.personId) ?? input.previous.find((m) => m.personId === input.personId);
  if (!person) return { members: [], addable: [] };
  const ownFamilyId = input.memberships.get(person.personId);
  const family =
    (ownFamilyId ? input.families.find((f) => f.id === ownFamilyId) : undefined) ??
    (person.bondId ? input.families.find((f) => f.bondId === person.bondId) : undefined);
  const bondId = person.bondId ?? family?.bondId;

  const ids = new Set<string>([person.personId]);
  if (family) for (const id of family.memberIds) if (input.memberships.get(id) === family.id) ids.add(id);
  if (bondId) {
    for (const m of [...input.previous, ...input.current]) if (m.bondId === bondId) ids.add(m.personId);
  }
  const previousById = new Map(input.previous.map((m) => [m.personId, m]));
  const members = [...ids]
    .map((id) => currentById.get(id) ?? previousById.get(id))
    .filter((m): m is YearMember => m !== undefined)
    .sort(byAge)
    .map((m) => ({
      member: m,
      status: currentById.has(m.personId) ? ('enrolled' as const) : ('pending' as const),
      inFamily: family !== undefined && input.memberships.get(m.personId) === family.id,
    }));
  const addable = input.current
    .filter((m) => !ids.has(m.personId) && !input.memberships.has(m.personId))
    .sort(byName);
  return { ...(family ? { familyId: family.id } : {}), ...(bondId ? { bondId } : {}), members, addable };
}
