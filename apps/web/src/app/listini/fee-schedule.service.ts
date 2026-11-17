import { Injectable, computed, inject, signal } from '@angular/core';
import {
  copyForNextYear,
  draftToSchedule,
  nextAssociationYear,
  type FeeSchedule,
  type FieldIssue,
  type ScheduleDraft,
} from '@tesseramento/fees';
import { AuthService } from '../core/auth.service';
import { FEE_SCHEDULE_BACKEND, ScheduleConflictError, type StoredSchedule } from './fee-schedule-backend';
import { SCHEDULE_USAGE } from './schedule-usage';

export const MESSAGES = {
  load: 'Impossibile leggere i listini. Controlla la connessione e riprova.',
  save: 'Impossibile salvare. Controlla la connessione e riprova.',
  yearNotAllowed: 'Il listino per questo anno non può essere creato. Crea prima gli anni precedenti.',
} as const;

export type SaveResult =
  | { status: 'saved' }
  | { status: 'invalid'; issues: readonly FieldIssue[] }
  | { status: 'error'; message: string };

export type UpdateResult = SaveResult | { status: 'conflict' } | { status: 'confirmNeeded' };

export interface UpdateOptions {
  /** L'utente ha scelto "Sovrascrivi" dopo un conflitto. */
  readonly overwrite?: boolean;
  /** L'utente ha confermato l'avviso "anno con adesioni". */
  readonly confirmed?: boolean;
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/**
 * Listini per anno associativo (specifica 003). L'autorizzazione vera sta nelle Security Rules:
 * qui si gestiscono stato e messaggi. Nessuna email o quota viene scritta nei log.
 */
@Injectable({ providedIn: 'root' })
export class FeeScheduleService {
  private readonly backend = inject(FEE_SCHEDULE_BACKEND);
  private readonly auth = inject(AuthService);
  private readonly usage = inject(SCHEDULE_USAGE);

  readonly schedules = signal<StoredSchedule[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Anno del nuovo listino: l'ultimo + 1; `undefined` se non c'è nessun listino da copiare. */
  readonly proposedYear = computed(() => {
    const years = this.schedules().map((s) => s.schedule.associationYear);
    return years.length === 0 ? undefined : nextAssociationYear(years);
  });

  /** Carica l'elenco dei listini, dal più recente. */
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const all = await this.backend.list();
      this.schedules.set(
        [...all].sort((a, b) => b.schedule.associationYear - a.schedule.associationYear),
      );
    } catch {
      this.schedules.set([]);
      this.error.set(MESSAGES.load);
    } finally {
      this.loading.set(false);
    }
  }

  /** Legge un listino dall'archivio; `undefined` se non esiste o la lettura fallisce (vedi `error`). */
  async open(year: number): Promise<StoredSchedule | undefined> {
    this.error.set(null);
    try {
      return await this.backend.get(year);
    } catch {
      this.error.set(MESSAGES.load);
      return undefined;
    }
  }

  /** Copia del listino più recente per l'anno successivo (quote e regole fisse). */
  startNew(): FeeSchedule | undefined {
    const latest = this.schedules()[0];
    return latest ? copyForNextYear(latest.schedule) : undefined;
  }

  /**
   * Crea il listino dell'anno di `base` con le quote della bozza. Se i valori non sono validi
   * non scrive nulla e restituisce tutti gli errori di campo insieme.
   */
  async create(draft: ScheduleDraft, base: FeeSchedule): Promise<SaveResult> {
    const result = draftToSchedule(draft, base);
    if (!result.ok) return { status: 'invalid', issues: result.issues };
    const email = this.auth.user()?.email;
    if (!email) return { status: 'error', message: MESSAGES.save };
    try {
      await this.backend.create(result.schedule, email);
    } catch (error) {
      const code = errorCode(error);
      const message = code === 'permission-denied' || code === 'already-exists' ? MESSAGES.yearNotAllowed : MESSAGES.save;
      return { status: 'error', message };
    }
    return { status: 'saved' };
  }

  /**
   * Modifica le quote di un listino aperto. Prima di scrivere: valida (tutti gli errori insieme),
   * chiede conferma se l'anno ha adesioni (FR-011) e, in archivio, controlla che nessuno l'abbia
   * cambiato dopo l'apertura (FR-014) salvo scelta esplicita di sovrascrivere.
   */
  async update(draft: ScheduleDraft, current: StoredSchedule, options: UpdateOptions = {}): Promise<UpdateResult> {
    const result = draftToSchedule(draft, current.schedule);
    if (!result.ok) return { status: 'invalid', issues: result.issues };
    const email = this.auth.user()?.email;
    if (!email) return { status: 'error', message: MESSAGES.save };
    try {
      if (!options.confirmed && (await this.usage.isInUse(current.schedule.associationYear))) {
        return { status: 'confirmNeeded' };
      }
      await this.backend.update(result.schedule, email, current.updatedAt, options.overwrite ?? false);
    } catch (error) {
      if (error instanceof ScheduleConflictError) return { status: 'conflict' };
      return { status: 'error', message: MESSAGES.save };
    }
    return { status: 'saved' };
  }
}
