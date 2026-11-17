import { SCHEDULE_2026_27, type FeeSchedule } from '@tesseramento/fees';
import {
  ScheduleConflictError,
  type FeeScheduleBackend,
  type StoredSchedule,
} from './fee-schedule-backend';

/** Strumenti di prova condivisi dagli spec dei listini (nessun dato reale). */

export const OPENED = new Date('2026-11-17T10:00:00Z');

export function stored(schedule: FeeSchedule = SCHEDULE_2026_27, over: Partial<StoredSchedule> = {}): StoredSchedule {
  return { schedule, updatedAt: OPENED, updatedBy: 'gestore@example.org', ...over };
}

/** Backend finto in memoria: stessa logica di collisione del backend Firestore. */
export class FakeBackend implements FeeScheduleBackend {
  items: StoredSchedule[];
  failWith: Error | undefined;
  calls: string[] = [];
  private clock = 1;

  constructor(items: StoredSchedule[] = [stored()]) {
    this.items = [...items];
  }

  async list(): Promise<StoredSchedule[]> {
    this.calls.push('list');
    if (this.failWith) throw this.failWith;
    return [...this.items];
  }

  async get(year: number): Promise<StoredSchedule | undefined> {
    this.calls.push(`get:${year}`);
    if (this.failWith) throw this.failWith;
    return this.items.find((i) => i.schedule.associationYear === year);
  }

  async create(schedule: FeeSchedule, email: string): Promise<void> {
    this.calls.push(`create:${schedule.associationYear}`);
    if (this.failWith) throw this.failWith;
    if (this.items.some((i) => i.schedule.associationYear === schedule.associationYear)) {
      throw new Error('already-exists');
    }
    this.items.push({ schedule, updatedAt: this.tick(), updatedBy: email.toLowerCase() });
  }

  async update(schedule: FeeSchedule, email: string, openedAt: Date, overwrite: boolean): Promise<void> {
    this.calls.push(`update:${schedule.associationYear}${overwrite ? ':overwrite' : ''}`);
    if (this.failWith) throw this.failWith;
    const index = this.items.findIndex((i) => i.schedule.associationYear === schedule.associationYear);
    const current = this.items[index];
    if (!current) throw new Error('not-found');
    if (!overwrite && current.updatedAt.getTime() !== openedAt.getTime()) throw new ScheduleConflictError();
    this.items[index] = { schedule, updatedAt: this.tick(), updatedBy: email.toLowerCase() };
  }

  /** Simula la modifica di un'altra persona. */
  touchByOther(year: number): void {
    const index = this.items.findIndex((i) => i.schedule.associationYear === year);
    const current = this.items[index];
    if (current) this.items[index] = { ...current, updatedAt: this.tick(), updatedBy: 'altro@example.org' };
  }

  private tick(): Date {
    return new Date(OPENED.getTime() + 60_000 * this.clock++);
  }
}
