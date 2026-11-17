import { SCHEDULE_2026_27, type FeeSchedule } from '@tesseramento/fees';
import type { ConfirmedFamily, RenewalDraft, YearMember } from '@tesseramento/families';
import { yearMember } from '../famiglie/testing';
import type { FamilyDraft } from '../famiglie/families-backend';
import { AlreadyRenewedError, RenewalInFamilyError } from '../riconferme/renewals-backend';
import type { ListChangeRequest } from './members-backend';
import type { YearBackend } from './year-backend';

/** Strumenti di prova per Tesserati (solo nomi inventati). */

export const schedule2027 = (): FeeSchedule =>
  ({ ...(JSON.parse(JSON.stringify(SCHEDULE_2026_27)) as FeeSchedule), associationYear: 2027 }) as FeeSchedule;

/** Backend finto in memoria con le regole di Firestore (una adesione per persona per anno, una famiglia per persona). */
export class FakeYearBackend implements YearBackend {
  members = new Map<number, YearMember[]>();
  schedules = new Map<number, FeeSchedule>();
  families: ConfirmedFamily[] = [];
  /** `${anno}_${personId}` → familyId. */
  links = new Map<string, string>();
  savedFees = new Set<string>();
  calls: string[] = [];
  failWith: Error | undefined;
  failFamilyWith: Error | undefined;
  private nextFamily = 1;

  async memberYears(): Promise<number[]> {
    return [...this.members].filter(([, m]) => m.length > 0).map(([y]) => y);
  }

  async yearMembers(year: number): Promise<YearMember[]> {
    return [...(this.members.get(year) ?? [])];
  }

  async memberships(year: number): Promise<Map<string, string>> {
    const prefix = `${year}_`;
    return new Map([...this.links].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));
  }

  async confirmedFamilies(year: number): Promise<ConfirmedFamily[]> {
    return this.families.filter((f) => f.associationYear === year).map((f) => ({ ...f }));
  }

  async schedule(year: number): Promise<FeeSchedule | undefined> {
    return this.schedules.get(year);
  }

  async renew(drafts: readonly RenewalDraft[], paidOn: string, email: string): Promise<void> {
    this.calls.push(`renew:${drafts.length}`);
    if (this.failWith) throw this.failWith;
    for (const d of drafts) {
      if ((this.members.get(d.associationYear) ?? []).some((m) => m.personId === d.personId)) throw new AlreadyRenewedError();
    }
    for (const d of drafts) {
      const before = (this.members.get(d.associationYear - 1) ?? []).find((m) => m.personId === d.personId)!;
      const list = this.members.get(d.associationYear) ?? [];
      list.push({ ...before, list: d.list, origin: 'riconferma', paidOn });
      this.members.set(d.associationYear, list);
    }
    void email;
  }

  async undo(year: number, personId: string): Promise<void> {
    this.calls.push(`undo:${personId}`);
    if (this.failWith) throw this.failWith;
    if (this.links.has(`${year}_${personId}`)) throw new RenewalInFamilyError();
    this.members.set(year, (this.members.get(year) ?? []).filter((m) => m.personId !== personId));
  }

  async hasSavedFee(year: number, personId: string): Promise<boolean> {
    return this.savedFees.has(`${year}_${personId}`);
  }

  async registerPayment(year: number, personIds: readonly string[], paidOn: string): Promise<void> {
    this.calls.push(`pay:${personIds.length}`);
    if (this.failWith) throw this.failWith;
    this.members.set(year, (this.members.get(year) ?? []).map((m) => (personIds.includes(m.personId) ? { ...m, paidOn } : m)));
  }

  async confirmFamily(draft: FamilyDraft, email: string): Promise<void> {
    this.calls.push(`family:${draft.memberIds.length}`);
    if (this.failFamilyWith) throw this.failFamilyWith;
    const id = draft.id ?? `F${this.nextFamily++}`;
    const previous = this.families.find((f) => f.id === id);
    for (const p of previous?.memberIds ?? []) if (!draft.memberIds.includes(p)) this.links.delete(`${draft.associationYear}_${p}`);
    this.families = this.families.filter((f) => f.id !== id);
    this.families.push({
      id,
      associationYear: draft.associationYear,
      memberIds: [...draft.memberIds],
      origin: draft.origin,
      ...(draft.bondId ? { bondId: draft.bondId } : {}),
      confirmedAt: new Date('2026-11-17T10:00:00Z'),
      confirmedBy: email.toLowerCase(),
    });
    for (const p of draft.memberIds) this.links.set(`${draft.associationYear}_${p}`, id);
  }

  async dissolveFamily(familyId: string): Promise<void> {
    this.calls.push(`dissolve:${familyId}`);
    const family = this.families.find((f) => f.id === familyId);
    this.families = this.families.filter((f) => f.id !== familyId);
    for (const p of family?.memberIds ?? []) this.links.delete(`${family!.associationYear}_${p}`);
  }

  async setFamilyOptOut(year: number, personId: string, value: boolean): Promise<void> {
    this.calls.push(`optOut:${personId}:${value}`);
    this.members.set(
      year,
      (this.members.get(year) ?? []).map((m) => {
        if (m.personId !== personId) return m;
        const { familyOptOut: _drop, ...rest } = m;
        void _drop;
        return value ? { ...rest, familyOptOut: true as const } : rest;
      }),
    );
  }

  async changeList(changes: readonly ListChangeRequest[]): Promise<void> {
    this.calls.push(`list:${changes.length}`);
    for (const [year, rows] of this.members) {
      this.members.set(
        year,
        rows.map((m) => {
          const change = changes.find((c) => c.adhesionId === `${year}_${m.personId}`);
          if (!change) return m;
          const { exception: _e, listNote: _n, ...rest } = m;
          void _e;
          void _n;
          return change.note ? { ...rest, list: change.to, exception: true as const, listNote: change.note } : { ...rest, list: change.to };
        }),
      );
    }
  }
}

/** 2026/27: la famiglia GALLO (900003) e tre singoli; listino 2027/28. */
export function yearFixture(): FakeYearBackend {
  const backend = new FakeYearBackend();
  const fam = { bond: 'C4', bondId: '900003' };
  backend.members.set(2026, [
    yearMember('gallo-l', { lastName: 'GALLO', firstName: 'LUCA', birthDate: '1978-06-30', ...fam }),
    yearMember('conti', { lastName: 'CONTI', firstName: 'MARTA', birthDate: '1981-02-14', ...fam }),
    yearMember('gallo-t', { lastName: 'GALLO', firstName: 'TOMMASO', birthDate: '2014-09-01', list: 'ACR', ...fam }),
    yearMember('gallo-g', { lastName: 'GALLO', firstName: 'GIULIA', birthDate: '2019-12-24', list: 'ACR', ...fam }),
    yearMember('moretti', { lastName: 'MORETTI', firstName: 'CARLA', birthDate: '1955-01-30' }),
    yearMember('rinaldi', { lastName: 'RINALDI', firstName: 'PIETRO', birthDate: '2012-03-03', list: 'ACR' }),
    yearMember('gatti', { lastName: 'GATTI', firstName: 'MIA', birthDate: '2022-09-09', list: 'ACR' }),
  ]);
  backend.schedules.set(2027, schedule2027());
  return backend;
}
