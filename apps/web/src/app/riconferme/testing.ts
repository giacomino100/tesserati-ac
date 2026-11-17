import { SCHEDULE_2026_27, type FeeSchedule } from '@tesseramento/fees';
import type { RenewalDraft, YearMember } from '@tesseramento/families';
import { yearMember } from '../famiglie/testing';
import {
  AlreadyRenewedError,
  PartialRenewalError,
  RENEWAL_GROUP_SIZE,
  RenewalInFamilyError,
  type RenewalInfo,
  type RenewalsBackend,
} from './renewals-backend';

/** Strumenti di prova per le riconferme (solo nomi inventati). */

export const schedule2027 = (): FeeSchedule =>
  ({ ...(JSON.parse(JSON.stringify(SCHEDULE_2026_27)) as FeeSchedule), associationYear: 2027 }) as FeeSchedule;

/** Backend finto in memoria con le stesse regole di Firestore (una adesione per persona per anno). */
export class FakeRenewalsBackend implements RenewalsBackend {
  members = new Map<number, YearMember[]>();
  schedules = new Map<number, FeeSchedule>();
  /** `${anno}_${personId}` → familyId. */
  links = new Map<string, string>();
  info = new Map<string, RenewalInfo>();
  /** `${anno}_${personId}` con una quota salvata del nucleo da 1. */
  savedFees = new Set<string>();
  calls: string[] = [];
  /** Il gruppo n (da 1) fallisce con questo errore. */
  failGroupAt: { group: number; error: Error } | undefined;
  failWith: Error | undefined;

  async memberYears(): Promise<number[]> {
    return [...this.members].filter(([, m]) => m.length > 0).map(([y]) => y);
  }

  async yearMembers(year: number): Promise<YearMember[]> {
    if (this.failWith) throw this.failWith;
    return [...(this.members.get(year) ?? [])];
  }

  async memberships(year: number): Promise<Map<string, string>> {
    const prefix = `${year}_`;
    return new Map([...this.links].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));
  }

  async schedule(year: number): Promise<FeeSchedule | undefined> {
    return this.schedules.get(year);
  }

  async renewals(year: number): Promise<Map<string, RenewalInfo>> {
    const prefix = `${year}_`;
    return new Map([...this.info].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));
  }

  async renew(drafts: readonly RenewalDraft[], email: string): Promise<void> {
    let saved = 0;
    for (let i = 0, group = 1; i < drafts.length; i += RENEWAL_GROUP_SIZE, group++) {
      const chunk = drafts.slice(i, i + RENEWAL_GROUP_SIZE);
      this.calls.push(`renew:${chunk.length}`);
      try {
        if (this.failGroupAt?.group === group) throw this.failGroupAt.error;
        if (this.failWith) throw this.failWith;
        const previousYear = chunk[0]!.associationYear - 1;
        for (const d of chunk) {
          if ((this.members.get(d.associationYear) ?? []).some((m) => m.personId === d.personId)) {
            throw new AlreadyRenewedError();
          }
        }
        for (const d of chunk) {
          const before = (this.members.get(previousYear) ?? []).find((m) => m.personId === d.personId)!;
          const list = this.members.get(d.associationYear) ?? [];
          list.push({ ...before, list: d.list, origin: 'riconferma' });
          this.members.set(d.associationYear, list);
          this.info.set(`${d.associationYear}_${d.personId}`, {
            renewedAt: new Date('2026-11-17T10:00:00Z'),
            renewedBy: email.toLowerCase(),
          });
        }
        saved += chunk.length;
      } catch (error) {
        if (saved > 0 && !(error instanceof AlreadyRenewedError)) throw new PartialRenewalError(saved);
        throw error;
      }
    }
  }

  async undo(year: number, personId: string): Promise<void> {
    this.calls.push(`undo:${personId}`);
    if (this.failWith) throw this.failWith;
    if (this.links.has(`${year}_${personId}`)) throw new RenewalInFamilyError();
    this.members.set(year, (this.members.get(year) ?? []).filter((m) => m.personId !== personId));
    this.info.delete(`${year}_${personId}`);
  }

  async hasSavedFee(year: number, personId: string): Promise<boolean> {
    return this.savedFees.has(`${year}_${personId}`);
  }
}

/** 2026: la famiglia GALLO (N. Legame 900003, C4) e tre singoli; listino 2027/28. */
export function renewalsFixture(): FakeRenewalsBackend {
  const backend = new FakeRenewalsBackend();
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
