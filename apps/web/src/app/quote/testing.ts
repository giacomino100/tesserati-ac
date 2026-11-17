import type { SavedHouseholdFee } from '@tesseramento/families';
import { sampleBackend, yearMember } from '../famiglie/testing';
import { FakeBackend as FakeScheduleBackend, stored } from '../listini/testing';
import type { HouseholdFeeEntry, HouseholdFeesBackend } from './fees-backend';

/** Strumenti di prova per le quote (solo nomi inventati). */

export class FakeHouseholdFeesBackend implements HouseholdFeesBackend {
  items: SavedHouseholdFee[] = [];
  calls: string[] = [];
  failWith: Error | undefined;
  savedAt = new Date('2026-11-17T10:00:00Z');

  async saved(year: number): Promise<SavedHouseholdFee[]> {
    return this.items.filter((i) => i.associationYear === year);
  }

  async save(entries: readonly HouseholdFeeEntry[], removedKeys: readonly string[], year: number, email: string): Promise<void> {
    this.calls.push(`save:${entries.length}:${removedKeys.length}`);
    if (this.failWith) throw this.failWith;
    const touched = new Set([...entries.map((e) => e.key), ...removedKeys]);
    this.items = this.items.filter((i) => !(i.associationYear === year && touched.has(i.key)));
    this.items.push(...entries.map((e) => ({ ...e, savedAt: this.savedAt, savedBy: email.toLowerCase() })));
  }
}

/** Anno 2026 della 007 più una bambina di 4 anni (nucleo non previsto). */
export function quoteFixture() {
  const families = sampleBackend();
  families.members.get(2026)!.push(
    yearMember('gatti', { lastName: 'GATTI', firstName: 'MIA', birthDate: '2022-09-09', list: 'ACR' }),
  );
  const schedules = new FakeScheduleBackend([stored()]);
  const fees = new FakeHouseholdFeesBackend();
  return { families, schedules, fees };
}
