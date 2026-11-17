import { SCHEDULE_2026_27, type FeeSchedule } from '@tesseramento/fees';
import { identityKey, type ArchivedPerson } from '@tesseramento/import';
import {
  AlreadyEnrolledError,
  RenewableError,
  type NewMemberBackend,
  type NewMemberContext,
  type NewMemberEntry,
} from './new-member-backend';

/** Strumenti di prova per il nuovo tesserato (solo nomi inventati). */

export function archived(id: string, lastName: string, firstName: string, birthDate: string, over: Partial<ArchivedPerson> = {}): ArchivedPerson {
  return { id, lastName, firstName, birthDate, identityKey: identityKey(lastName, firstName, birthDate), ...over };
}

export class FakeNewMemberBackend implements NewMemberBackend {
  archive: ArchivedPerson[] = [];
  /** `${anno}_${personId}`. */
  adhesions = new Set<string>();
  schedules = new Map<number, FeeSchedule>([[2026, SCHEDULE_2026_27]]);
  added: NewMemberEntry[] = [];
  failWith: Error | undefined;
  private nextId = 1;

  async context(year: number): Promise<NewMemberContext> {
    const ids = (y: number) =>
      new Set([...this.adhesions].filter((k) => k.startsWith(`${y}_`)).map((k) => k.slice(`${y}_`.length)));
    const schedule = this.schedules.get(year);
    return {
      archive: [...this.archive],
      yearIds: ids(year),
      previousYearIds: ids(year - 1),
      ...(schedule ? { schedule } : {}),
    };
  }

  async add(entry: NewMemberEntry, email: string): Promise<void> {
    if (this.failWith) throw this.failWith;
    const personId = 'personId' in entry ? entry.personId : `n${this.nextId++}`;
    if (this.adhesions.has(`${entry.year}_${personId}`)) throw new AlreadyEnrolledError();
    if ('personId' in entry && this.adhesions.has(`${entry.year - 1}_${personId}`)) throw new RenewableError();
    if ('member' in entry) {
      const m = entry.member;
      this.archive.push(archived(personId, m.lastName, m.firstName, m.birthDate, m.taxCode ? { taxCode: m.taxCode } : {}));
    }
    this.adhesions.add(`${entry.year}_${personId}`);
    this.added.push(entry);
    void email;
  }
}

/** Archivio di prova: ROSSI MARIO iscritto nel 2026, VERDI PAOLO l'ultima volta nel 2023, NERI ANNA nel 2025. */
export function newMemberFixture(): FakeNewMemberBackend {
  const backend = new FakeNewMemberBackend();
  backend.archive = [
    archived('rossi', 'ROSSI', 'MARIO', '1965-03-12', { lastAdhesion: { year: 2026, list: 'ADULTI' } }),
    archived('verdi', 'VERDI', 'PAOLO', '1980-01-20', { lastAdhesion: { year: 2023, list: 'ADULTI' } }),
    archived('neri', 'NERI', 'ANNA', '1982-11-05', { taxCode: 'NRENNA82S45G348X', lastAdhesion: { year: 2025, list: 'ADULTI' } }),
  ];
  backend.adhesions = new Set(['2026_rossi', '2023_verdi', '2025_neri']);
  return backend;
}
