import { SCHEDULE_2026_27, type FeeSchedule } from '@tesseramento/fees';
import { sectorOf } from '@tesseramento/import';
import type { ListChangeRequest, MemberRow, MembersBackend } from './members-backend';

/** Strumenti di prova per Tesserati (solo nomi inventati). */

export function memberRow(lastName: string, firstName: string, over: Partial<MemberRow> = {}): MemberRow {
  const personId = `${lastName}-${firstName}`.toLowerCase();
  return {
    adhesionId: `2026_${personId}`,
    personId,
    lastName,
    firstName,
    birthDate: '2016-04-09',
    list: 'ACR',
    sector: 'RAGAZZI',
    imported: true,
    exportAgeBand: '9/11',
    bond: 'C3',
    bondId: '900002',
    ...over,
  };
}

export class FakeMembersBackend implements MembersBackend {
  schedules = new Map<number, FeeSchedule>();
  calls: string[] = [];
  failWith: Error | undefined;

  constructor(public byYear: Record<number, MemberRow[]> = {}) {}

  async importedYears(): Promise<number[]> {
    return Object.keys(this.byYear).map(Number);
  }

  async membersOfYear(year: number): Promise<MemberRow[]> {
    return [...(this.byYear[year] ?? [])];
  }

  async schedule(year: number): Promise<FeeSchedule | undefined> {
    return this.schedules.get(year);
  }

  async changeList(changes: readonly ListChangeRequest[], email: string): Promise<void> {
    this.calls.push(`change:${changes.length}`);
    if (this.failWith) throw this.failWith;
    for (const change of changes) {
      for (const [year, rows] of Object.entries(this.byYear)) {
        this.byYear[Number(year)] = rows.map((r) => {
          if (r.adhesionId !== change.adhesionId) return r;
          const exportSector = r.exportSector ?? (r.imported ? r.sector : undefined);
          return {
            ...r,
            list: change.to,
            sector: sectorOf(change.to),
            ...(exportSector ? { exportSector } : {}),
            listChange: {
              from: r.list,
              at: new Date('2026-11-17T10:00:00Z'),
              by: email.toLowerCase(),
              ...(change.note ? { note: change.note } : {}),
            },
          };
        });
      }
    }
  }
}

/** 2026/27 con listino: due trentenne nei Giovani (non allineate), GRECO NICOLO e un adulto allineati. */
export function membersFixture(): FakeMembersBackend {
  const backend = new FakeMembersBackend({
    2026: [
      memberRow('ROSSI', 'ELENA', { birthDate: '1996-04-02', list: 'GIOVANI', sector: 'GIOVANI', exportAgeBand: '26/30', bond: undefined, bondId: undefined }),
      memberRow('ROSSI', 'LUCIA', { birthDate: '1996-09-30', list: 'GIOVANI', sector: 'GIOVANI', exportAgeBand: '26/30', bond: undefined, bondId: undefined }),
      memberRow('GRECO', 'NICOLO', { birthDate: '2011-11-11', list: 'GIOVANI', sector: 'GIOVANI', exportAgeBand: '15/18' }),
      memberRow('MORETTI', 'CARLA', { birthDate: '1955-01-30', list: 'ADULTI', sector: 'ADULTI', exportAgeBand: 'AD' }),
    ],
  });
  backend.schedules.set(2026, SCHEDULE_2026_27);
  return backend;
}
