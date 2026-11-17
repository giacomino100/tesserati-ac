import { Injectable, computed, inject, signal } from '@angular/core';
import {
  suggestFamilies,
  validateFamily,
  type ConfirmedFamily,
  type ConfirmedFamilyView,
  type FamilyWarning,
  type ProposedAddition,
  type SuggestedFamily,
  type YearMember,
} from '@tesseramento/families';
import { AuthService } from '../core/auth.service';
import { FAMILIES_BACKEND, MemberInOtherFamilyError, type FamilyDraft } from './families-backend';

/** Famiglie per gruppo in "Conferma tutte": limite di 20 documenti letti dalle regole per richiesta (R3). */
export const CONFIRM_GROUP_SIZE = 8;

export const FAMILIES_MESSAGES = {
  load: 'Impossibile leggere le famiglie. Controlla la connessione e riprova.',
  saveFailed: 'Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.',
  changedByOthers: 'Le famiglie sono state modificate da qualcun altro. La pagina è stata aggiornata.',
  tooFew: 'Una famiglia ha almeno 2 componenti.',
} as const;

/** Famiglia in correzione: senza `id` è nuova (suggerita o creata a mano). */
export interface FamilyEdit {
  readonly id?: string;
  readonly memberIds: readonly string[];
  readonly origin: 'legame' | 'manuale';
  readonly bondId?: string;
}

const EMPTY = suggestFamilies([], [], new Map());

/**
 * Famiglie dell'anno (specifica 007): suggerite dal N. Legame, confermate, corrette o sciolte da una persona.
 * L'autorizzazione e l'unicità vere stanno nelle Security Rules; nessun nome nei log.
 */
@Injectable({ providedIn: 'root' })
export class FamiliesService {
  private readonly backend = inject(FAMILIES_BACKEND);
  private readonly auth = inject(AuthService);

  readonly years = signal<number[]>([]);
  readonly year = signal(0);
  readonly members = signal<YearMember[]>([]);
  readonly confirmedFamilies = signal<ConfirmedFamily[]>([]);
  readonly memberships = signal<Map<string, string>>(new Map());
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  readonly editing = signal<FamilyEdit | null>(null);

  readonly view = computed(() =>
    this.members().length === 0 ? EMPTY : suggestFamilies(this.members(), this.confirmedFamilies(), this.memberships()),
  );

  readonly summary = computed(() => {
    const v = this.view();
    return `${v.suggested.length} famiglie suggerite · ${v.confirmed.length} confermate · ${v.withoutFamily.length} tesserati senza famiglia`;
  });

  readonly canSaveEdit = computed(() => (this.editing()?.memberIds.length ?? 0) >= 2);

  private readonly byId = computed(() => new Map(this.members().map((m) => [m.personId, m])));

  /** Carica gli anni importati e le famiglie dell'anno (l'ultimo, se non indicato o non importato). */
  async load(year?: number): Promise<void> {
    this.loading.set(true);
    try {
      const years = [...(await this.backend.importedYears())].sort((a, b) => b - a);
      this.years.set(years);
      const chosen = year !== undefined && years.includes(year) ? year : years[0];
      if (chosen === undefined) {
        this.year.set(year ?? 0);
        this.members.set([]);
        this.confirmedFamilies.set([]);
        this.memberships.set(new Map());
        return;
      }
      await this.loadYear(chosen);
    } catch {
      this.message.set(FAMILIES_MESSAGES.load);
    } finally {
      this.loading.set(false);
    }
  }

  // ---- Testi (solo a schermo) ----

  memberName(personId: string): string {
    const m = this.byId().get(personId);
    return m ? `${m.lastName} ${m.firstName}` : personId;
  }

  /** "VERDI PAOLO": il componente più anziano della famiglia confermata. */
  familyLabel(familyId: string): string {
    const view = this.view().confirmed.find((c) => c.family.id === familyId);
    const first = view?.members[0];
    return first ? `${first.lastName} ${first.firstName}` : 'un\'altra famiglia';
  }

  warningText(warning: FamilyWarning, bond?: string): string {
    switch (warning.kind) {
      case 'sizeMismatch':
        return `Il Legame ${bond ?? ''} indica ${warning.expected} componenti, ne sono stati trovati ${warning.found}.`;
      case 'bondMismatch':
        return `I componenti hanno Legame diversi: ${warning.bonds.join(', ')}.`;
      case 'inconsistent':
        return `Dati incoerenti per ${warning.personIds.map((p) => this.memberName(p)).join(', ')}: presente anche in un'altra famiglia. Correggi e riconferma.`;
    }
  }

  additionText(addition: ProposedAddition): string {
    return `Aggiungi ${addition.member.lastName} ${addition.member.firstName} (stesso N. Legame)`;
  }

  elsewhereText(member: YearMember, familyId: string): string {
    return `${member.lastName} ${member.firstName} è nella famiglia di ${this.familyLabel(familyId)}`;
  }

  // ---- Conferma (US2) ----

  async confirmSuggested(family: SuggestedFamily): Promise<void> {
    await this.save([this.draftOfSuggested(family)]);
  }

  /** Conferma tutte le suggerite con almeno 2 componenti, a gruppi; si ferma al primo gruppo che non riesce. */
  async confirmAll(): Promise<void> {
    const suggested = this.view().suggested;
    const drafts = suggested.filter((f) => f.confirmable).map((f) => this.draftOfSuggested(f));
    const skipped = suggested.length - drafts.length;
    const email = this.auth.user()?.email;
    if (!email || drafts.length === 0) return;
    this.busy.set(true);
    let done = 0;
    let failed = false;
    try {
      for (let i = 0; i < drafts.length; i += CONFIRM_GROUP_SIZE) {
        const group = drafts.slice(i, i + CONFIRM_GROUP_SIZE);
        try {
          await this.backend.confirm(group, email);
          done += group.length;
        } catch {
          failed = true;
          break;
        }
      }
      if (failed) {
        this.message.set(
          `Confermate ${done} famiglie su ${drafts.length}. Impossibile salvare le altre: controlla la connessione e riprova.`,
        );
      } else {
        const skippedText = skipped > 0 ? `; ${skipped} famiglia con un solo componente non confermata` : '';
        this.message.set(`Confermate ${done} famiglie${skippedText}.`);
      }
      await this.reload();
    } finally {
      this.busy.set(false);
    }
  }

  async addProposed(addition: ProposedAddition): Promise<void> {
    const view = this.view().confirmed.find((c) => c.family.id === addition.familyId);
    if (!view) return;
    await this.save([
      { ...this.draftOfConfirmed(view), memberIds: [...view.members.map((m) => m.personId), addition.member.personId] },
    ]);
  }

  // ---- Correzioni (US3) ----

  startEditSuggested(family: SuggestedFamily): void {
    const draft = this.draftOfSuggested(family);
    this.editing.set({ memberIds: draft.memberIds, origin: draft.origin, ...(draft.bondId ? { bondId: draft.bondId } : {}) });
  }

  startEditConfirmed(view: ConfirmedFamilyView): void {
    const draft = this.draftOfConfirmed(view);
    this.editing.set({ id: draft.id!, memberIds: draft.memberIds, origin: draft.origin, ...(draft.bondId ? { bondId: draft.bondId } : {}) });
  }

  removeMember(personId: string): void {
    const edit = this.editing();
    if (edit) this.editing.set({ ...edit, memberIds: edit.memberIds.filter((p) => p !== personId) });
  }

  /** Aggiunge un tesserato dell'anno, purché non sia già in un'altra famiglia. */
  addMember(personId: string): void {
    const edit = this.editing();
    if (!edit || edit.memberIds.includes(personId)) return;
    const issue = validateFamily([personId, ...edit.memberIds], this.members(), this.memberships(), edit.id).find(
      (i) => i.kind === 'inOtherFamily' && i.personId === personId,
    );
    if (issue?.kind === 'inOtherFamily') {
      this.message.set(
        `${this.memberName(personId)} è già nella famiglia di ${this.familyLabel(issue.familyId)}: prima togli questa persona da quella famiglia.`,
      );
      return;
    }
    this.editing.set({ ...edit, memberIds: [...edit.memberIds, personId] });
  }

  /** Tesserati che si possono aggiungere alla famiglia in correzione: solo chi è senza famiglia. */
  readonly addable = computed(() => {
    const edit = this.editing();
    const assigned = this.memberships();
    return this.members().filter(
      (m) => !edit?.memberIds.includes(m.personId) && (!assigned.has(m.personId) || assigned.get(m.personId) === edit?.id),
    );
  });

  cancelEdit(): void {
    this.editing.set(null);
  }

  hasUnsavedChanges(): boolean {
    return this.editing() !== null;
  }

  async saveEdit(): Promise<void> {
    const edit = this.editing();
    if (!edit) return;
    if (!this.canSaveEdit()) {
      this.message.set(FAMILIES_MESSAGES.tooFew);
      return;
    }
    const saved = await this.save([{ ...edit, associationYear: this.year() }]);
    if (saved) this.editing.set(null);
  }

  /** Crea e conferma una famiglia a mano con tesserati senza famiglia. */
  async createFamily(memberIds: readonly string[]): Promise<void> {
    if (new Set(memberIds).size < 2) {
      this.message.set(FAMILIES_MESSAGES.tooFew);
      return;
    }
    await this.save([{ associationYear: this.year(), memberIds: [...memberIds], origin: 'manuale' }]);
  }

  async dissolve(familyId: string): Promise<void> {
    this.busy.set(true);
    try {
      await this.backend.dissolve(familyId);
      this.message.set(null);
    } catch {
      this.message.set(FAMILIES_MESSAGES.saveFailed);
    } finally {
      await this.reload();
      this.busy.set(false);
    }
  }

  // ---- Interni ----

  private draftOfSuggested(family: SuggestedFamily): FamilyDraft {
    return {
      associationYear: this.year(),
      memberIds: family.members.map((m) => m.personId),
      origin: 'legame',
      bondId: family.bondId,
    };
  }

  private draftOfConfirmed(view: ConfirmedFamilyView): FamilyDraft {
    const f = view.family;
    return {
      id: f.id,
      associationYear: f.associationYear,
      memberIds: view.members.map((m) => m.personId),
      origin: f.origin,
      ...(f.bondId ? { bondId: f.bondId } : {}),
    };
  }

  /** Salva e ricarica; `true` se salvato. */
  private async save(drafts: FamilyDraft[]): Promise<boolean> {
    const email = this.auth.user()?.email;
    if (!email) return false;
    this.busy.set(true);
    try {
      await this.backend.confirm(drafts, email);
      this.message.set(null);
      await this.reload();
      return true;
    } catch (error) {
      if (error instanceof MemberInOtherFamilyError) {
        await this.reload();
        this.editing.set(null);
        this.message.set(FAMILIES_MESSAGES.changedByOthers);
      } else {
        this.message.set(FAMILIES_MESSAGES.saveFailed);
      }
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  private async reload(): Promise<void> {
    try {
      await this.loadYear(this.year());
    } catch {
      this.message.set(FAMILIES_MESSAGES.load);
    }
  }

  private async loadYear(year: number): Promise<void> {
    const [members, families, memberships] = await Promise.all([
      this.backend.yearMembers(year),
      this.backend.confirmedFamilies(year),
      this.backend.memberships(year),
    ]);
    this.year.set(year);
    this.members.set(members);
    this.confirmedFamilies.set(families);
    this.memberships.set(memberships);
  }
}
