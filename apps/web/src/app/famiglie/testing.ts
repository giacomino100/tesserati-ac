import type { ConfirmedFamily, YearMember } from '@tesseramento/families';
import { MemberInOtherFamilyError, type FamiliesBackend, type FamilyDraft } from './families-backend';

/** Strumenti di prova per le famiglie (solo nomi inventati). */

export function yearMember(personId: string, over: Partial<YearMember> = {}): YearMember {
  return {
    personId,
    lastName: personId.toUpperCase(),
    firstName: 'ALFA',
    birthDate: '1980-01-20',
    list: 'ADULTI',
    ...over,
  };
}

/** Backend finto in memoria con le stesse regole di Firestore (almeno 2, una famiglia per persona per anno). */
export class FakeFamiliesBackend implements FamiliesBackend {
  members = new Map<number, YearMember[]>();
  families: ConfirmedFamily[] = [];
  /** `${anno}_${personId}` → familyId. */
  links = new Map<string, string>();
  calls: string[] = [];
  /** Se impostato, la n-esima chiamata a `confirm` (da 1) fallisce con questo errore. */
  failConfirmAt: { call: number; error: Error } | undefined;
  failWith: Error | undefined;
  private nextId = 1;
  private confirmCalls = 0;

  async importedYears(): Promise<number[]> {
    return [...this.members.keys()];
  }

  async yearMembers(year: number): Promise<YearMember[]> {
    if (this.failWith) throw this.failWith;
    return [...(this.members.get(year) ?? [])];
  }

  async confirmedFamilies(year: number): Promise<ConfirmedFamily[]> {
    return this.families.filter((f) => f.associationYear === year).map((f) => ({ ...f }));
  }

  async memberships(year: number): Promise<Map<string, string>> {
    const prefix = `${year}_`;
    return new Map(
      [...this.links].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]),
    );
  }

  async confirm(drafts: readonly FamilyDraft[], email: string): Promise<void> {
    this.confirmCalls++;
    this.calls.push(`confirm:${drafts.length}`);
    if (this.failConfirmAt?.call === this.confirmCalls) throw this.failConfirmAt.error;
    if (this.failWith) throw this.failWith;
    const ids = drafts.map((d) => d.id ?? `f${this.nextId++}`);
    // Controllo prima di scrivere: tutto o niente.
    drafts.forEach((d, i) => {
      if (new Set(d.memberIds).size < 2) throw new Error('too-few');
      for (const p of d.memberIds) {
        const owner = this.links.get(`${d.associationYear}_${p}`);
        if (owner !== undefined && owner !== ids[i] && !drafts.some((o, j) => ids[j] === owner && !o.memberIds.includes(p))) {
          throw new MemberInOtherFamilyError(p);
        }
      }
    });
    drafts.forEach((d, i) => {
      const id = ids[i]!;
      const previous = this.families.find((f) => f.id === id);
      for (const p of previous?.memberIds ?? []) {
        if (!d.memberIds.includes(p)) this.links.delete(`${d.associationYear}_${p}`);
      }
      this.families = this.families.filter((f) => f.id !== id);
      this.families.push({
        id,
        associationYear: d.associationYear,
        memberIds: [...d.memberIds],
        origin: d.origin,
        ...(d.bondId ? { bondId: d.bondId } : {}),
        confirmedAt: new Date('2026-11-17T10:00:00Z'),
        confirmedBy: email.toLowerCase(),
      });
      for (const p of d.memberIds) this.links.set(`${d.associationYear}_${p}`, id);
    });
  }

  async dissolve(familyId: string): Promise<void> {
    this.calls.push(`dissolve:${familyId}`);
    if (this.failWith) throw this.failWith;
    const family = this.families.find((f) => f.id === familyId);
    if (!family) return;
    for (const p of family.memberIds) this.links.delete(`${family.associationYear}_${p}`);
    this.families = this.families.filter((f) => f.id !== familyId);
  }
}

/** Anno 2026 inventato: due nuclei confermabili, un nucleo con un solo tesserato, tre singoli. */
export function sampleBackend(): FakeFamiliesBackend {
  const backend = new FakeFamiliesBackend();
  backend.members.set(2026, [
    yearMember('rossi', { lastName: 'ROSSI', firstName: 'MARIO', birthDate: '1965-03-12', bond: 'C2', bondId: '900001' }),
    yearMember('bianchi', { lastName: 'BIANCHI', firstName: 'LUCIA', birthDate: '1968-07-02', bond: 'C2', bondId: '900001' }),
    yearMember('verdi-p', { lastName: 'VERDI', firstName: 'PAOLO', birthDate: '1980-01-20', bond: 'C3', bondId: '900002' }),
    yearMember('neri', { lastName: 'NERI', firstName: 'ANNA', birthDate: '1982-11-05', bond: 'C3', bondId: '900002' }),
    yearMember('verdi-s', { lastName: 'VERDI', firstName: 'SOFIA', birthDate: '2016-04-09', list: 'ACR', bond: 'C3', bondId: '900002' }),
    yearMember('marino', { lastName: 'MARINO', firstName: 'LEONARDO', birthDate: '2015-02-02', list: 'ACR', bond: 'N2', bondId: '900005' }),
    yearMember('moretti', { lastName: 'MORETTI', firstName: 'CARLA', birthDate: '1955-01-30' }),
    yearMember('barbieri', { lastName: 'BARBIERI', firstName: 'SALVATORE', birthDate: '1960-10-03' }),
    yearMember('mariani', { lastName: 'MARIANI', firstName: 'ALICE', birthDate: '2008-12-12', list: 'GIOVANI' }),
  ]);
  backend.members.set(2027, [yearMember('rossi', { lastName: 'ROSSI', firstName: 'MARIO' })]);
  return backend;
}
