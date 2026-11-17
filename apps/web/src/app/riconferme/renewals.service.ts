import { Injectable, computed, inject, signal } from '@angular/core';
import { labelFor, type FeeSchedule } from '@tesseramento/fees';
import {
  renewalDraft,
  renewalView,
  type RenewalCandidate,
  type RenewalGroup,
  type RenewalView,
  type RenewalWarning,
  type RenewedMember,
  type YearMember,
} from '@tesseramento/families';
import { listLabel } from '@tesseramento/import';
import { AuthService } from '../core/auth.service';
import {
  AlreadyRenewedError,
  PartialRenewalError,
  RENEWALS_BACKEND,
  RenewalInFamilyError,
  type RenewalInfo,
} from './renewals-backend';

export const RENEWALS_MESSAGES = {
  load: 'Impossibile leggere i tesserati. Controlla la connessione e riprova.',
  saveFailed: 'Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.',
  concurrent: 'Qualcuno ha appena iscritto una di queste persone: elenco aggiornato, riprova.',
  undone: 'Riconferma annullata.',
  newUndone: 'Iscrizione annullata.',
  feeWarning: 'La quota salvata del suo nucleo andrà ricalcolata in Quote.',
  noYears: 'Nessun tesserato da riconfermare: importa prima un anno.',
} as const;

export interface UndoRequest {
  readonly personId: string;
  /** Riconferma (008) o nuovo tesserato (009). */
  readonly kind?: 'riconferma' | 'nuovo';
  readonly question: string;
  readonly feeWarning: string;
}

function dateText(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

/** Iscritto a mano nell'anno (specifica 009). */
export interface NewMemberRow {
  readonly member: YearMember;
  readonly undoable: boolean;
}

const EMPTY_VIEW: RenewalView = { groups: [], singles: [], renewed: [], pendingCount: 0, renewedCount: 0 };

/**
 * Riconferme dell'anno nuovo (specifica 008): tesserati dell'anno precedente da decidere, spunte, riconferma a gruppi,
 * annullamento. Nessun dato anagrafico scritto: solo ID, elenco e legame.
 */
@Injectable({ providedIn: 'root' })
export class RenewalsService {
  private readonly backend = inject(RENEWALS_BACKEND);
  private readonly auth = inject(AuthService);

  readonly years = signal<number[]>([]);
  readonly year = signal(0);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly undoing = signal<UndoRequest | null>(null);

  private readonly previous = signal<YearMember[]>([]);
  private readonly current = signal<YearMember[]>([]);
  private readonly memberships = signal<Map<string, string>>(new Map());
  private readonly schedule = signal<FeeSchedule | undefined>(undefined);
  private readonly info = signal<Map<string, RenewalInfo>>(new Map());

  readonly view = computed<RenewalView>(() =>
    this.year() === 0
      ? EMPTY_VIEW
      : renewalView({
          year: this.year(),
          previous: this.previous(),
          current: this.current(),
          memberships: this.memberships(),
          ...(this.schedule() ? { schedule: this.schedule() } : {}),
        }),
  );

  /** Nuovi tesserati dell'anno, in ordine di nome (specifica 009). */
  readonly newMembers = computed<NewMemberRow[]>(() =>
    this.current()
      .filter((m) => m.origin === 'nuovo')
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'it') || a.firstName.localeCompare(b.firstName, 'it'))
      .map((member) => ({ member, undoable: !this.memberships().has(member.personId) })),
  );

  readonly newTitle = computed(() => `Nuovi tesserati del ${labelFor(this.year())}`);

  private readonly renewable = computed(() =>
    [...this.view().groups.flatMap((g) => g.candidates), ...this.view().singles].filter((c) => c.renewable),
  );

  readonly selectedCount = computed(() => this.renewable().filter((c) => this.selected().has(c.member.personId)).length);
  readonly allSelected = computed(() => this.renewable().length > 0 && this.selectedCount() === this.renewable().length);
  readonly canRenew = computed(() => !!this.schedule() && this.selectedCount() > 0 && !this.busy());

  readonly summary = computed(
    () => `Da decidere: ${this.view().pendingCount} · Già iscritti nel ${labelFor(this.year())}: ${this.view().renewedCount}`,
  );

  readonly noPrevious = computed(() => {
    if (this.loading()) return '';
    if (this.years().length === 0) return RENEWALS_MESSAGES.noYears;
    return this.previous().length === 0 ? `Nessun tesserato nel ${labelFor(this.year() - 1)} da riconfermare.` : '';
  });

  readonly scheduleMissing = computed(() =>
    this.year() > 0 && this.previous().length > 0 && !this.schedule()
      ? `Manca il listino ${labelFor(this.year())}. Crealo nella sezione Listini.`
      : '',
  );

  /**
   * Anni proposti: ogni anno con tesserati e l'anno dopo (008 R9, esteso dalla 009 R6 per la sezione "Nuovi
   * tesserati"); predefinito il più alto.
   */
  async load(year?: number): Promise<void> {
    this.loading.set(true);
    try {
      const withMembers = await this.backend.memberYears();
      const years = [...new Set(withMembers.flatMap((y) => [y, y + 1]))].sort((a, b) => b - a);
      this.years.set(years);
      const chosen = year !== undefined && years.includes(year) ? year : years[0];
      this.year.set(chosen ?? 0);
      if (chosen === undefined) {
        this.previous.set([]);
        return;
      }
      const [previous, current, memberships, schedule, info] = await Promise.all([
        this.backend.yearMembers(chosen - 1),
        this.backend.yearMembers(chosen),
        this.backend.memberships(chosen),
        this.backend.schedule(chosen),
        this.backend.renewals(chosen),
      ]);
      this.previous.set(previous);
      this.current.set(current);
      this.memberships.set(memberships);
      this.schedule.set(schedule);
      this.info.set(info);
      const pending = new Set(previous.map((m) => m.personId).filter((id) => !current.some((c) => c.personId === id)));
      this.selected.set(new Set([...this.selected()].filter((id) => pending.has(id))));
    } catch {
      this.message.set(RENEWALS_MESSAGES.load);
    } finally {
      this.loading.set(false);
    }
  }

  // ---- Testi (solo a schermo) ----

  groupTitle(group: RenewalGroup): string {
    return `N. Legame ${group.bondId}${group.bond ? ` · ${group.bond}` : ''}`;
  }

  rowText(c: RenewalCandidate): string {
    const name = `${c.member.lastName} ${c.member.firstName}`;
    return c.list ? `${name} · ${c.age} anni · ${listLabel(c.list)}` : name;
  }

  warningTexts(c: RenewalCandidate): string[] {
    return c.warnings.map((w: RenewalWarning) => {
      switch (w.kind) {
        case 'listChange':
          return `Passa da ${listLabel(w.from)} a ${listLabel(w.to)}`;
        case 'underMinAge':
          return `Sotto l'età minima del listino (${w.minAge} anni): quota non prevista`;
        case 'invalidBirthDate':
          return 'Data di nascita incoerente: non si può riconfermare';
      }
    });
  }

  renewedText(r: RenewedMember): string {
    const base = `${r.member.lastName} ${r.member.firstName} · ${listLabel(r.member.list)}`;
    if (r.origin === 'import') return `${base} · da import`;
    const info = this.info().get(r.member.personId);
    return info ? `${base} · riconferma del ${dateText(info.renewedAt)} (${info.renewedBy})` : `${base} · riconferma`;
  }

  newText(n: NewMemberRow): string {
    return `${n.member.lastName} ${n.member.firstName} · ${listLabel(n.member.list)}`;
  }

  newBlockedText(n: NewMemberRow): string {
    return n.undoable ? '' : this.inFamilyText();
  }

  blockedText(r: RenewedMember): string {
    return r.origin === 'riconferma' && r.inFamily ? this.inFamilyText() : '';
  }

  private inFamilyText(): string {
    return `Prima togli questa persona dalla famiglia del ${labelFor(this.year())}.`;
  }

  // ---- Selezione ----

  isSelected(personId: string): boolean {
    return this.selected().has(personId);
  }

  toggle(personId: string): void {
    const next = new Set(this.selected());
    if (next.has(personId)) next.delete(personId);
    else next.add(personId);
    this.selected.set(next);
  }

  groupState(group: RenewalGroup): 'all' | 'some' | 'none' {
    const ids = group.candidates.filter((c) => c.renewable).map((c) => c.member.personId);
    const n = ids.filter((id) => this.selected().has(id)).length;
    return n === 0 ? 'none' : n === ids.length ? 'all' : 'some';
  }

  toggleGroup(group: RenewalGroup): void {
    const ids = group.candidates.filter((c) => c.renewable).map((c) => c.member.personId);
    const next = new Set(this.selected());
    if (this.groupState(group) === 'all') ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    this.selected.set(next);
  }

  toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.renewable().map((c) => c.member.personId)));
  }

  // ---- Azioni ----

  /** Riconferma i selezionati; true se tutti salvati. */
  async renew(): Promise<boolean> {
    const year = this.year();
    const chosen = this.renewable().filter((c) => this.selected().has(c.member.personId));
    if (chosen.length === 0 || !this.schedule()) return false;
    const email = this.auth.user()?.email ?? '';
    this.busy.set(true);
    this.message.set(null);
    let ok = false;
    try {
      await this.backend.renew(
        chosen.map((c) => renewalDraft(c, year)),
        email,
      );
      this.selected.set(new Set());
      ok = true;
      this.message.set(
        chosen.length === 1
          ? `1 persona riconfermata per il ${labelFor(year)}.`
          : `${chosen.length} persone riconfermate per il ${labelFor(year)}.`,
      );
    } catch (error) {
      this.message.set(
        error instanceof PartialRenewalError
          ? `Riconfermate ${error.saved} persone su ${chosen.length}. Le altre non sono state salvate: controlla la connessione e riprova.`
          : error instanceof AlreadyRenewedError
            ? RENEWALS_MESSAGES.concurrent
            : RENEWALS_MESSAGES.saveFailed,
      );
    } finally {
      this.busy.set(false);
    }
    const message = this.message();
    await this.load(year);
    if (this.message() === RENEWALS_MESSAGES.load) return false;
    this.message.set(message);
    return ok;
  }

  async startUndo(personId: string): Promise<void> {
    const renewed = this.view().renewed.find((x) => x.member.personId === personId && x.undoable);
    const added = this.newMembers().find((x) => x.member.personId === personId && x.undoable);
    const member = renewed?.member ?? added?.member;
    if (!member) return;
    const kind = added ? 'nuovo' : 'riconferma';
    let feeWarning = '';
    try {
      if (await this.backend.hasSavedFee(this.year(), personId)) feeWarning = RENEWALS_MESSAGES.feeWarning;
    } catch {
      // Se non si riesce a leggere la quota, l'annullamento resta possibile: Quote la segnalerà comunque.
    }
    const what = kind === 'nuovo' ? "l'iscrizione" : 'la riconferma';
    this.undoing.set({
      personId,
      ...(kind === 'nuovo' ? { kind } : {}),
      question: `Annullare ${what} di ${member.lastName} ${member.firstName}?`,
      feeWarning,
    });
  }

  cancelUndo(): void {
    this.undoing.set(null);
  }

  async confirmUndo(): Promise<void> {
    const request = this.undoing();
    if (!request) return;
    const year = this.year();
    this.undoing.set(null);
    this.busy.set(true);
    let message: string;
    try {
      await this.backend.undo(year, request.personId);
      message = request.kind === 'nuovo' ? RENEWALS_MESSAGES.newUndone : RENEWALS_MESSAGES.undone;
    } catch (error) {
      message = error instanceof RenewalInFamilyError ? this.inFamilyText() : RENEWALS_MESSAGES.saveFailed;
    } finally {
      this.busy.set(false);
    }
    await this.load(year);
    if (this.message() !== RENEWALS_MESSAGES.load) this.message.set(message);
  }
}
