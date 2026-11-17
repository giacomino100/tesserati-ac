import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { labelFor, type FeeSchedule } from '@tesseramento/fees';
import {
  familyAfterConfirm,
  familyPanel,
  listStatus,
  memberYearView,
  renewalDraft,
  type ConfirmedFamily,
  type FamilyPanel,
  type MemberYearRow,
  type MemberYearView,
  type RenewalWarning,
  type YearMember,
} from '@tesseramento/families';
import { listLabel, normalize, type AdhesionList } from '@tesseramento/import';
import { AuthService } from '../core/auth.service';
import { italianDate } from '../importa/format';
import { AlreadyRenewedError, RenewalInFamilyError } from '../riconferme/renewals-backend';
import { TODAY, YEAR_BACKEND } from './year-backend';

export const MEMBERS_MESSAGES = {
  load: 'Impossibile leggere i tesserati. Controlla la connessione e riprova.',
  saveFailed: 'Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.',
  concurrent: 'Qualcuno ha appena confermato questa persona: elenco aggiornato.',
  futureDate: 'La data di pagamento non può essere nel futuro.',
  invalidDate: 'Scegli la data di pagamento.',
  familyFailed: 'Conferma salvata, ma la famiglia non è stata aggiornata: riprova dal pannello.',
  updated: 'Elenco aggiornato.',
  noteRequired: "Scrivi una nota che spieghi l'eccezione.",
  noteTooLong: 'La nota può avere al massimo 200 caratteri.',
  undone: 'Conferma annullata.',
  feeWarning: 'La quota salvata del suo nucleo andrà ricalcolata in Quote.',
} as const;

export type MemberFilter = 'all' | 'pending' | 'enrolled';

export interface UndoRequest {
  readonly personId: string;
  readonly question: string;
  readonly feeWarning: string;
}

const NOTE_MAX = 200;
const EMPTY: MemberYearView = { rows: [], pendingCount: 0, enrolledCount: 0 };

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const fullName = (m: YearMember) => `${m.lastName} ${m.firstName}`;

/**
 * Tesserati di un anno (specifica 013): un solo elenco con chi è da confermare e chi è iscritto, conferma = pagato,
 * famiglia aggiornata da sola e correggibile nel pannello, nuovo tesserato, cambio di elenco come azione secondaria.
 */
@Injectable()
export class MembersService {
  private readonly backend = inject(YEAR_BACKEND);
  private readonly injector = inject(Injector);
  private readonly today = inject(TODAY);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  readonly years = signal<number[]>([]);
  readonly year = signal(0);
  readonly paidOn = signal(isoDate(this.today()));
  readonly filter = signal<MemberFilter>('all');
  readonly search = signal('');
  readonly panelPersonId = signal<string | null>(null);
  readonly undoing = signal<UndoRequest | null>(null);

  // Cambio di elenco (011), azione secondaria.
  readonly editing = signal<MemberYearRow | null>(null);
  readonly editList = signal<AdhesionList>('ACR');
  readonly editNote = signal('');
  readonly editError = signal<string | null>(null);

  private readonly previous = signal<YearMember[]>([]);
  private readonly current = signal<YearMember[]>([]);
  private readonly memberships = signal<Map<string, string>>(new Map());
  private readonly families = signal<ConfirmedFamily[]>([]);
  private readonly schedule = signal<FeeSchedule | undefined>(undefined);

  readonly view = computed<MemberYearView>(() =>
    this.year() === 0
      ? EMPTY
      : memberYearView({
          year: this.year(),
          previous: this.previous(),
          current: this.current(),
          memberships: this.memberships(),
          ...(this.schedule() ? { schedule: this.schedule() } : {}),
        }),
  );

  readonly visibleRows = computed(() => {
    const filter = this.filter();
    const words = normalize(this.search()).split(' ').filter(Boolean);
    return this.view().rows.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      const name = normalize(`${r.member.lastName} ${r.member.firstName}`);
      return words.every((w) => name.includes(w));
    });
  });

  readonly countsText = computed(() => {
    const v = this.view();
    return `${v.pendingCount} da confermare · ${v.enrolledCount} ${v.enrolledCount === 1 ? 'iscritto' : 'iscritti'}`;
  });

  readonly scheduleMissing = computed(() =>
    this.year() > 0 && !this.schedule() && this.view().pendingCount > 0
      ? `Manca il listino ${labelFor(this.year())}. Crealo nella sezione Listini.`
      : '',
  );

  readonly panel = computed<FamilyPanel | null>(() => {
    const id = this.panelPersonId();
    if (!id) return null;
    return familyPanel({
      personId: id,
      previous: this.previous(),
      current: this.current(),
      families: this.families(),
      memberships: this.memberships(),
    });
  });

  readonly panelTitle = computed(() => {
    const p = this.panel();
    if (!p) return '';
    if (!p.familyId && !p.bondId) return 'Nessuna famiglia';
    return p.bondId ? `Famiglia · N. Legame ${p.bondId}` : 'Famiglia';
  });

  /**
   * Anni proposti: ogni anno con tesserati e l'anno dopo (research R7); predefinito l'anno dopo l'ultimo con tesserati
   * se ha un listino, altrimenti l'ultimo con tesserati.
   */
  async load(requested?: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const withMembers = await this.backend.memberYears();
      const years = [...new Set(withMembers.flatMap((y) => [y, y + 1]))].sort((a, b) => b - a);
      this.years.set(years);
      let chosen = requested !== undefined && years.includes(requested) ? requested : undefined;
      if (chosen === undefined && withMembers.length > 0) {
        const last = Math.max(...withMembers);
        chosen = (await this.backend.schedule(last + 1)) ? last + 1 : last;
      }
      if (chosen !== undefined) await this.show(chosen);
    } catch {
      this.error.set(MEMBERS_MESSAGES.load);
    } finally {
      this.loading.set(false);
    }
  }

  async show(year: number): Promise<void> {
    this.year.set(year);
    const [previous, current, memberships, families, schedule] = await Promise.all([
      this.backend.yearMembers(year - 1),
      this.backend.yearMembers(year),
      this.backend.memberships(year),
      this.backend.confirmedFamilies(year),
      this.backend.schedule(year),
    ]);
    this.previous.set(previous);
    this.current.set(current);
    this.memberships.set(memberships);
    this.families.set(families);
    this.schedule.set(schedule);
  }

  // ---- Testi (solo a schermo) ----

  rowText(r: MemberYearRow): string {
    const list = r.status === 'pending' ? r.candidate?.list : r.member.list;
    const base = `${fullName(r.member)} · ${italianDate(r.member.birthDate)}`;
    if (!list) return base;
    const note = r.status === 'enrolled' && r.member.listNote ? ` · eccezione: ${r.member.listNote}` : '';
    return `${base} · ${listLabel(list)}${note}`;
  }

  statusText(r: MemberYearRow): string {
    if (r.status === 'pending') return 'Da confermare';
    return r.paidOn ? `Pagato il ${italianDate(r.paidOn)}` : 'Pagamento non registrato';
  }

  warningTexts(r: MemberYearRow): string[] {
    if (r.status === 'enrolled') {
      const s = listStatus(r.member, this.year(), this.schedule());
      return s.kind === 'misaligned' ? [`Per età: ${listLabel(s.expected)}`] : [];
    }
    return (r.candidate?.warnings ?? []).map((w: RenewalWarning) => {
      switch (w.kind) {
        case 'listChange':
          return `Passa da ${listLabel(w.from)} a ${listLabel(w.to)}`;
        case 'underMinAge':
          return `Sotto l'età minima del listino (${w.minAge} anni): quota non prevista`;
        case 'invalidBirthDate':
          return 'Data di nascita incoerente: non si può confermare';
        case 'previousException':
          return `L'anno scorso era un'eccezione: ${listLabel(w.list)}`;
      }
    });
  }

  canConfirm(r: MemberYearRow): boolean {
    return r.status === 'pending' && !!this.schedule() && !!r.candidate?.renewable && !this.busy();
  }

  canAlign(r: MemberYearRow): boolean {
    return r.status === 'enrolled' && listStatus(r.member, this.year(), this.schedule()).kind === 'misaligned';
  }

  // ---- Conferma = pagato ----

  /** Giorno del pagamento valido e non futuro, oppure il messaggio d'errore. */
  private payment(): string | null {
    const paidOn = this.paidOn();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) {
      this.message.set(MEMBERS_MESSAGES.invalidDate);
      return null;
    }
    if (paidOn > isoDate(this.today())) {
      this.message.set(MEMBERS_MESSAGES.futureDate);
      return null;
    }
    return paidOn;
  }

  private email(): string {
    return this.injector.get(AuthService).user()?.email ?? '';
  }

  /** Conferma = pagato; poi la famiglia si aggiorna da sola e si apre il pannello. True se la conferma è salvata. */
  async confirm(personId: string): Promise<boolean> {
    const row = this.view().rows.find((r) => r.member.personId === personId && r.status === 'pending');
    if (!row?.candidate?.renewable || !this.schedule()) return false;
    const paidOn = this.payment();
    if (!paidOn) return false;
    const year = this.year();
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.backend.renew([renewalDraft(row.candidate, year)], paidOn, this.email());
    } catch (error) {
      this.message.set(error instanceof AlreadyRenewedError ? MEMBERS_MESSAGES.concurrent : MEMBERS_MESSAGES.saveFailed);
      this.busy.set(false);
      await this.reload(year);
      return false;
    }
    let message = `Conferma salvata: ${fullName(row.member)}, pagato il ${italianDate(paidOn)}.`;
    try {
      await this.reload(year);
      const family = await this.updateFamilyAfter(personId, year);
      if (family !== undefined) message += ` Famiglia aggiornata: ${family} componenti.`;
    } catch {
      message = MEMBERS_MESSAGES.familyFailed;
    } finally {
      this.busy.set(false);
    }
    await this.reload(year).catch(() => undefined);
    const member = this.current().find((m) => m.personId === personId);
    if (member?.bondId || this.memberships().has(personId)) this.panelPersonId.set(personId);
    this.message.set(message);
    return true;
  }

  /** Aggiornamento automatico della famiglia (chiarimento B); numero di componenti se cambiata. */
  private async updateFamilyAfter(personId: string, year: number): Promise<number | undefined> {
    const update = familyAfterConfirm({
      personId,
      current: this.current(),
      families: this.families(),
      memberships: this.memberships(),
    });
    if (update.kind === 'none') return undefined;
    const existing = update.kind === 'add' ? this.families().find((f) => f.id === update.familyId) : undefined;
    await this.backend.confirmFamily(
      {
        ...(update.kind === 'add' ? { id: update.familyId } : {}),
        associationYear: year,
        memberIds: update.memberIds,
        origin: existing?.origin ?? 'legame',
        ...((update.kind === 'create' ? update.bondId : existing?.bondId) ? { bondId: update.kind === 'create' ? update.bondId : existing!.bondId! } : {}),
      },
      this.email(),
    );
    return update.memberIds.length;
  }

  async registerPayment(personId: string): Promise<void> {
    const paidOn = this.payment();
    if (!paidOn) return;
    await this.run(() => this.backend.registerPayment(this.year(), [personId], paidOn, this.email()), `Pagamento registrato: pagato il ${italianDate(paidOn)}.`);
  }

  // ---- Annulla conferma ----

  async startUndo(personId: string): Promise<void> {
    const row = this.view().rows.find((r) => r.member.personId === personId && r.status === 'enrolled' && r.undoable);
    if (!row) return;
    let feeWarning = '';
    try {
      if (await this.backend.hasSavedFee(this.year(), personId)) feeWarning = MEMBERS_MESSAGES.feeWarning;
    } catch {
      // l'annullamento resta possibile: Quote lo segnalerà comunque
    }
    this.undoing.set({ personId, question: `Annullare la conferma di ${fullName(row.member)}?`, feeWarning });
  }

  cancelUndo(): void {
    this.undoing.set(null);
  }

  async confirmUndo(): Promise<void> {
    const request = this.undoing();
    if (!request) return;
    this.undoing.set(null);
    const year = this.year();
    this.busy.set(true);
    let message: string = MEMBERS_MESSAGES.undone;
    try {
      await this.backend.undo(year, request.personId);
    } catch (error) {
      message =
        error instanceof RenewalInFamilyError
          ? `Prima togli questa persona dalla famiglia del ${labelFor(year)}.`
          : MEMBERS_MESSAGES.saveFailed;
    } finally {
      this.busy.set(false);
    }
    await this.reload(year).catch(() => undefined);
    if (this.panelPersonId() === request.personId) this.panelPersonId.set(null);
    this.message.set(message);
  }

  // ---- Pannello famiglia ----

  openPanel(personId: string): void {
    this.panelPersonId.set(personId);
  }

  closePanel(): void {
    this.panelPersonId.set(null);
  }

  /** Toglie una persona dalla sua famiglia (sciolta se resta 1) e la segna per non riaggiungerla da sola. */
  async removeFromFamily(personId: string): Promise<void> {
    const familyId = this.memberships().get(personId);
    const family = this.families().find((f) => f.id === familyId);
    if (!family) return;
    const remaining = family.memberIds.filter((id) => id !== personId && this.memberships().get(id) === family.id);
    const year = this.year();
    await this.run(async () => {
      if (remaining.length < 2) await this.backend.dissolveFamily(family.id);
      else
        await this.backend.confirmFamily(
          { id: family.id, associationYear: year, memberIds: remaining, origin: family.origin, ...(family.bondId ? { bondId: family.bondId } : {}) },
          this.email(),
        );
      await this.backend.setFamilyOptOut(year, personId, true);
    }, remaining.length < 2 ? 'Famiglia sciolta.' : `Famiglia aggiornata: ${remaining.length} componenti.`);
  }

  /** Aggiunge un iscritto alla famiglia del pannello, o crea la famiglia con la persona del pannello. */
  async addToFamily(personId: string): Promise<void> {
    const panel = this.panel();
    const owner = this.panelPersonId();
    if (!panel || !owner) return;
    const year = this.year();
    const family = this.families().find((f) => f.id === panel.familyId);
    const members = family
      ? [...family.memberIds.filter((id) => this.memberships().get(id) === family.id), personId]
      : [owner, personId];
    const added = this.current().find((m) => m.personId === personId);
    await this.run(async () => {
      await this.backend.confirmFamily(
        {
          ...(family ? { id: family.id } : {}),
          associationYear: year,
          memberIds: members,
          origin: family?.origin ?? (panel.bondId ? 'legame' : 'manuale'),
          ...((family?.bondId ?? panel.bondId) ? { bondId: (family?.bondId ?? panel.bondId)! } : {}),
        },
        this.email(),
      );
      if (added?.familyOptOut) await this.backend.setFamilyOptOut(year, personId, false);
    }, `Famiglia aggiornata: ${members.length} componenti.`);
  }

  // ---- Cambio di elenco (011), azione secondaria ----

  async align(r: MemberYearRow): Promise<void> {
    const s = listStatus(r.member, this.year(), this.schedule());
    if (s.kind !== 'misaligned') return;
    await this.run(
      () => this.backend.changeList([{ adhesionId: `${this.year()}_${r.member.personId}`, to: s.expected }], this.email()),
      MEMBERS_MESSAGES.updated,
    );
  }

  startEdit(r: MemberYearRow): void {
    this.editing.set(r);
    this.editList.set(r.member.list);
    this.editNote.set(r.member.listNote ?? '');
    this.editError.set(null);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.editError.set(null);
  }

  async saveEdit(): Promise<boolean> {
    const r = this.editing();
    if (!r) return false;
    const note = this.editNote().trim();
    if (!note) {
      this.editError.set(MEMBERS_MESSAGES.noteRequired);
      return false;
    }
    if (note.length > NOTE_MAX) {
      this.editError.set(MEMBERS_MESSAGES.noteTooLong);
      return false;
    }
    const ok = await this.run(
      () => this.backend.changeList([{ adhesionId: `${this.year()}_${r.member.personId}`, to: this.editList(), note }], this.email()),
      MEMBERS_MESSAGES.updated,
    );
    if (ok) this.editing.set(null);
    return ok;
  }

  // ---- Comuni ----

  private async reload(year: number): Promise<void> {
    await this.show(year);
  }

  private async run(work: () => Promise<void>, success: string): Promise<boolean> {
    const year = this.year();
    this.busy.set(true);
    this.message.set(null);
    let ok = false;
    try {
      await work();
      ok = true;
    } catch {
      this.message.set(MEMBERS_MESSAGES.saveFailed);
    } finally {
      this.busy.set(false);
    }
    await this.reload(year).catch(() => this.error.set(MEMBERS_MESSAGES.load));
    if (ok) this.message.set(success);
    return ok;
  }
}
