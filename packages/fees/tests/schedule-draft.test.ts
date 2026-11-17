import { describe, expect, it } from 'vitest';
import {
  copyForNextYear,
  draftToSchedule,
  labelFor,
  nextAssociationYear,
  SCHEDULE_2026_27,
  scheduleToDraft,
  validateFeeSchedule,
  type FeeSchedule,
  type ScheduleDraft,
} from '../src/index';

const baseDraft = (): ScheduleDraft => scheduleToDraft(SCHEDULE_2026_27);

describe('draftToSchedule (P3, P4)', () => {
  it('andata e ritorno: scheduleToDraft → draftToSchedule restituisce lo stesso listino', () => {
    const r = draftToSchedule(baseDraft(), SCHEDULE_2026_27);
    expect(r).toEqual({ ok: true, schedule: SCHEDULE_2026_27 });
  });

  it('scheduleToDraft mostra gli euro con la virgola', () => {
    const d = baseDraft();
    expect(d.acrPackage).toBe('25,00');
    expect(d.bands.adulti).toEqual({ full: '26,00', discounted: '21,00' });
  });

  it('applica le quote cambiate e tiene le regole fisse di base', () => {
    const d: ScheduleDraft = {
      ...baseDraft(),
      bands: { ...baseDraft().bands, adulti: { full: '27', discounted: '22.50' } },
    };
    const r = draftToSchedule(d, SCHEDULE_2026_27);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const adulti = r.schedule.bands.find((b) => b.band === 'adulti')!;
    expect(adulti).toEqual({ band: 'adulti', minAge: 30, fullCents: 2700, discountedCents: 2250 });
    expect(r.schedule.associationYear).toBe(2026);
    expect(r.schedule.label).toBe('2026/27');
    expect(r.schedule.minAge).toBe(6);
    expect(r.schedule.maxHouseholdSize).toBe(4);
    expect(r.schedule.bands.map((b) => [b.band, b.minAge, b.maxAge])).toEqual(
      SCHEDULE_2026_27.bands.map((b) => [b.band, b.minAge, b.maxAge]),
    );
  });

  it('segnala tutti gli errori insieme e non arrotonda mai', () => {
    const d: ScheduleDraft = {
      acrPackage: '0',
      bands: {
        acr: { full: '26,555', discounted: '' },
        giovanissimi: { full: 'abc', discounted: '13' },
        giovani: { full: '10', discounted: '11' },
        adulti: { full: '-3', discounted: '21' },
      },
    };
    const r = draftToSchedule(d, SCHEDULE_2026_27);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues).toEqual(
      expect.arrayContaining([
        { field: 'acrPackage', code: 'notPositive' },
        { field: 'acr.full', code: 'tooManyDecimals' },
        { field: 'acr.discounted', code: 'required' },
        { field: 'giovanissimi.full', code: 'notNumber' },
        { field: 'giovani.discounted', code: 'discountedAboveFull' },
        { field: 'adulti.full', code: 'notPositive' },
      ]),
    );
    expect(r.issues).toHaveLength(6);
  });

  it('accetta quota scontata uguale alla piena', () => {
    const d: ScheduleDraft = {
      ...baseDraft(),
      bands: { ...baseDraft().bands, acr: { full: '15', discounted: '15' } },
    };
    expect(draftToSchedule(d, SCHEDULE_2026_27).ok).toBe(true);
  });
});

describe('validateFeeSchedule (P5)', () => {
  it('il listino 2026/27 è valido', () => {
    expect(validateFeeSchedule(SCHEDULE_2026_27)).toEqual([]);
  });

  it('segnala scontata > piena e pacchetto ≤ 0', () => {
    const bad: FeeSchedule = {
      ...SCHEDULE_2026_27,
      acrPackageCents: 0,
      bands: SCHEDULE_2026_27.bands.map((b) =>
        b.band === 'giovani' ? { ...b, discountedCents: b.fullCents + 1 } : b,
      ),
    };
    expect(validateFeeSchedule(bad)).toEqual(
      expect.arrayContaining([
        { field: 'acrPackage', code: 'notPositive' },
        { field: 'giovani.discounted', code: 'discountedAboveFull' },
      ]),
    );
  });

  it('segnala importi non interi o non positivi', () => {
    const bad: FeeSchedule = {
      ...SCHEDULE_2026_27,
      bands: SCHEDULE_2026_27.bands.map((b) =>
        b.band === 'acr' ? { ...b, fullCents: 15.5, discountedCents: -1 } : b,
      ),
    };
    const fields = validateFeeSchedule(bad).map((i) => i.field);
    expect(fields).toContain('acr.full');
    expect(fields).toContain('acr.discounted');
  });
});

describe('anni (P6)', () => {
  it('labelFor', () => {
    expect(labelFor(2026)).toBe('2026/27');
    expect(labelFor(2027)).toBe('2027/28');
    expect(labelFor(2099)).toBe('2099/00');
  });

  it('nextAssociationYear è l’ultimo anno + 1', () => {
    expect(nextAssociationYear([2026])).toBe(2027);
    expect(nextAssociationYear([2026, 2027])).toBe(2028);
    expect(nextAssociationYear([2027, 2026])).toBe(2028);
  });

  it('nextAssociationYear senza anni è un errore', () => {
    expect(() => nextAssociationYear([])).toThrow();
  });

  it('copyForNextYear non modifica l’input e conserva le regole fisse', () => {
    const before = JSON.stringify(SCHEDULE_2026_27);
    const next = copyForNextYear(SCHEDULE_2026_27);
    expect(JSON.stringify(SCHEDULE_2026_27)).toBe(before);
    expect(next.associationYear).toBe(2027);
    expect(next.label).toBe('2027/28');
    expect(next.minAge).toBe(6);
    expect(next.maxHouseholdSize).toBe(4);
    expect(next.acrPackageCents).toBe(2500);
    expect(next.bands).toEqual(SCHEDULE_2026_27.bands);
  });
});
