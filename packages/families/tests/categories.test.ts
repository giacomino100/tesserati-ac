import { describe, expect, it } from 'vitest';
import { SCHEDULE_2026_27, type FeeSchedule } from '@tesseramento/fees';
import { alignAllPlan, listForAge, listStatus, renewalView, type YearMember } from '../src/index';
import { allSamples, member } from './helpers';

/** Specifica 011 (contracts/categories-api.md). Persone inventate oltre ai file finti. */

const schedule = (year = 2026): FeeSchedule =>
  ({ ...(JSON.parse(JSON.stringify(SCHEDULE_2026_27)) as FeeSchedule), associationYear: year }) as FeeSchedule;

const born = (yearOfBirth: number) => `${yearOfBirth}-06-15`;

describe('listForAge (C1)', () => {
  it.each([
    [2021, 'ACR'],
    [2020, 'ACR'],
    [2012, 'ACR'],
    [2011, 'GIOVANI'],
    [1997, 'GIOVANI'],
    [1996, 'ADULTI'],
  ])('nato nel %i → %s nel 2026/27', (y, list) => {
    expect(listForAge(born(y), 2026, schedule())).toBe(list);
  });

  it('data non valida o successiva all’anno → nessun elenco', () => {
    expect(listForAge('2030-01-01', 2026, schedule())).toBeUndefined();
    expect(listForAge('boh', 2026, schedule())).toBeUndefined();
  });
});

describe('renewalView invariata (C8)', () => {
  it('37 da decidere, 14 ACR / 8 Giovani / 15 Adulti nel 2027/28', () => {
    const v = renewalView({ year: 2027, previous: allSamples(), current: [], memberships: new Map(), schedule: schedule(2027) });
    const all = [...v.groups.flatMap((g) => g.candidates), ...v.singles];
    expect(all).toHaveLength(37);
    const count = (l: string) => all.filter((c) => c.list === l).length;
    expect([count('ACR'), count('GIOVANI'), count('ADULTI')]).toEqual([14, 8, 15]);
  });
});

describe('listStatus (C2–C5)', () => {
  it('C2: i file finti del 2026/27 sono tutti allineati', () => {
    const statuses = allSamples().map((m) => listStatus(m, 2026, schedule()));
    expect(statuses).toHaveLength(37);
    expect(statuses.every((s) => s.kind === 'aligned')).toBe(true);
  });

  it('C3: trentenne nei Giovani → non allineata, per età Adulti', () => {
    const elena = member('rossi-e', { lastName: 'ROSSI', firstName: 'ELENA', birthDate: '1996-04-02', list: 'GIOVANI' });
    expect(listStatus(elena, 2026, schedule())).toEqual({ kind: 'misaligned', expected: 'ADULTI' });
  });

  it('C4: eccezione con nota → eccezione, con l’elenco per età', () => {
    const greco = member('greco', { lastName: 'GRECO', firstName: 'NICOLO', birthDate: '2011-11-11', list: 'ACR', exception: true });
    expect(listStatus(greco, 2026, schedule())).toEqual({ kind: 'exception', expected: 'GIOVANI' });
  });

  it('C5: senza listino → sconosciuto', () => {
    const elena = member('rossi-e', { birthDate: '1996-04-02', list: 'GIOVANI' });
    expect(listStatus(elena, 2025, undefined)).toEqual({ kind: 'unknown' });
    expect(alignAllPlan([elena], 2025, undefined)).toEqual([]);
  });
});

describe('alignAllPlan (C6)', () => {
  it('solo le non allineate, escluse le eccezioni', () => {
    const rows: YearMember[] = [
      member('rossi-e', { birthDate: '1996-04-02', list: 'GIOVANI' }),
      member('rossi-l', { birthDate: '1996-09-30', list: 'GIOVANI' }),
      member('greco', { birthDate: '2011-11-11', list: 'ACR', exception: true }),
      member('ok', { birthDate: '1980-01-01', list: 'ADULTI' }),
    ];
    expect(alignAllPlan(rows, 2026, schedule()).map((p) => [p.row.personId, p.to])).toEqual([
      ['rossi-e', 'ADULTI'],
      ['rossi-l', 'ADULTI'],
    ]);
  });
});

describe('renewalView – eccezione dell’anno prima (C7)', () => {
  it('GRECO NICOLO eccezione ACR nel 2026 → nel 2027 elenco per età e avviso', () => {
    const previous = allSamples().map((m) =>
      m.lastName === 'GRECO' && m.firstName === 'NICOLO' ? { ...m, list: 'ACR' as const, exception: true as const } : m,
    );
    const v = renewalView({ year: 2027, previous, current: [], memberships: new Map(), schedule: schedule(2027) });
    const greco = v.groups.flatMap((g) => g.candidates).find((c) => c.member.lastName === 'GRECO' && c.member.firstName === 'NICOLO')!;
    expect(greco.list).toBe('GIOVANI');
    expect(greco.warnings).toContainEqual({ kind: 'previousException', list: 'ACR' });
  });
});
