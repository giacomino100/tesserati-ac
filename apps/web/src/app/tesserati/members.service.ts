import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import type { FeeSchedule } from '@tesseramento/fees';
import { alignAllPlan, listForAge, listStatus, type ListStatus } from '@tesseramento/families';
import { listLabel, type AdhesionList } from '@tesseramento/import';
import { AuthService } from '../core/auth.service';
import { MEMBERS_BACKEND, type ListChangeRequest, type MemberRow } from './members-backend';

export const MEMBERS_MESSAGES = {
  load: 'Impossibile leggere i tesserati. Controlla la connessione e riprova.',
  saveFailed: 'Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.',
  updated: 'Elenco aggiornato.',
  noteRequired: "Scrivi una nota che spieghi l'eccezione.",
  noteTooLong: 'La nota può avere al massimo 200 caratteri.',
} as const;

const NOTE_MAX = 200;

function byName(a: MemberRow, b: MemberRow): number {
  return a.lastName.localeCompare(b.lastName, 'it') || a.firstName.localeCompare(b.firstName, 'it');
}

const adhesions = (n: number) => (n === 1 ? '1 adesione' : `${n} adesioni`);

/**
 * Tesserati di un anno (FR-019 della 004) con l'elenco rispetto all'età (specifica 011): avvisi, allineamento,
 * eccezioni con nota. Le quote non usano l'elenco e non cambiano.
 */
@Injectable()
export class MembersService {
  private readonly backend = inject(MEMBERS_BACKEND);
  private readonly injector = inject(Injector);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  readonly years = signal<number[]>([]);
  readonly year = signal(0);
  private readonly members = signal<MemberRow[]>([]);
  private readonly schedule = signal<FeeSchedule | undefined>(undefined);

  // Cambio di elenco in corso.
  readonly editing = signal<MemberRow | null>(null);
  readonly editList = signal<AdhesionList>('ACR');
  readonly editNote = signal('');
  readonly editError = signal<string | null>(null);
  readonly confirmingAlignAll = signal(false);

  readonly rows = computed(() => [...this.members()].sort(byName));

  private readonly plan = computed(() =>
    alignAllPlan(
      this.rows().map((r) => ({ ...r, ...(this.isException(r) ? { exception: true as const } : {}) })),
      this.year(),
      this.schedule(),
    ),
  );

  readonly misalignedText = computed(() => {
    const n = this.plan().length;
    return n === 0 ? '' : `${adhesions(n)} non ${n === 1 ? 'allineata' : 'allineate'} all’età`;
  });

  readonly alignAllQuestion = computed(() => {
    const n = this.plan().length;
    return `${adhesions(n)} ${n === 1 ? 'cambierà' : 'cambieranno'} elenco. Confermi?`;
  });

  async load(requested?: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const years = [...(await this.backend.importedYears())].sort((a, b) => b - a);
      this.years.set(years);
      const first = requested !== undefined && years.includes(requested) ? requested : years[0];
      if (first !== undefined) await this.show(first);
    } catch {
      this.error.set(MEMBERS_MESSAGES.load);
    } finally {
      this.loading.set(false);
    }
  }

  async show(year: number): Promise<void> {
    this.year.set(year);
    const [members, schedule] = await Promise.all([this.backend.membersOfYear(year), this.backend.schedule(year)]);
    this.members.set(members);
    this.schedule.set(schedule);
  }

  // ---- Testi (solo a schermo) ----

  isException(r: MemberRow): boolean {
    return !!r.listChange?.note;
  }

  status(r: MemberRow): ListStatus {
    return listStatus({ list: r.list, birthDate: r.birthDate, ...(this.isException(r) ? { exception: true } : {}) }, this.year(), this.schedule());
  }

  listText(r: MemberRow): string {
    const exception = this.isException(r) ? ` · eccezione: ${r.listChange!.note}` : '';
    const exportSector = r.exportSector && r.exportSector !== r.sector ? ` (export: ${r.exportSector})` : '';
    return `${listLabel(r.list)}${exception}${exportSector}`;
  }

  warningText(r: MemberRow): string {
    const s = this.status(r);
    return s.kind === 'misaligned' ? `Per età: ${listLabel(s.expected)}` : '';
  }

  canAlign(r: MemberRow): boolean {
    return this.status(r).kind === 'misaligned';
  }

  // ---- Azioni ----

  async align(r: MemberRow): Promise<void> {
    const s = this.status(r);
    if (s.kind !== 'misaligned') return;
    await this.apply([{ adhesionId: r.adhesionId, to: s.expected }], MEMBERS_MESSAGES.updated);
  }

  askAlignAll(): void {
    if (this.plan().length > 0) this.confirmingAlignAll.set(true);
  }

  cancelAlignAll(): void {
    this.confirmingAlignAll.set(false);
  }

  async alignAll(): Promise<void> {
    this.confirmingAlignAll.set(false);
    const plan = this.plan();
    if (plan.length === 0) return;
    const n = plan.length;
    await this.apply(
      plan.map((p) => ({ adhesionId: p.row.adhesionId, to: p.to })),
      `${adhesions(n)} ${n === 1 ? 'allineata' : 'allineate'} all’età.`,
    );
  }

  startEdit(r: MemberRow): void {
    this.editing.set(r);
    this.editList.set(r.list);
    this.editNote.set(r.listChange?.note ?? '');
    this.editError.set(null);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.editError.set(null);
  }

  /** Eccezione con nota obbligatoria (1–200 caratteri dopo il trim); true se salvata. */
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
    this.editError.set(null);
    const ok = await this.apply([{ adhesionId: r.adhesionId, to: this.editList(), note }], MEMBERS_MESSAGES.updated);
    if (ok) this.editing.set(null);
    return ok;
  }

  /** Con il listino torna all'elenco per età; senza, all'elenco di prima dell'eccezione. */
  async removeException(r: MemberRow): Promise<void> {
    if (!this.isException(r)) return;
    const schedule = this.schedule();
    const to = (schedule ? listForAge(r.birthDate, this.year(), schedule) : undefined) ?? r.listChange!.from;
    await this.apply([{ adhesionId: r.adhesionId, to }], MEMBERS_MESSAGES.updated);
  }

  private async apply(changes: ListChangeRequest[], success: string): Promise<boolean> {
    const year = this.year();
    const email = this.injector.get(AuthService).user()?.email ?? '';
    this.busy.set(true);
    this.message.set(null);
    let ok = false;
    try {
      await this.backend.changeList(changes, email);
      ok = true;
    } catch {
      this.message.set(MEMBERS_MESSAGES.saveFailed);
    } finally {
      this.busy.set(false);
    }
    if (ok) {
      try {
        await this.show(year);
        this.message.set(success);
      } catch {
        this.error.set(MEMBERS_MESSAGES.load);
      }
    }
    return ok;
  }
}
