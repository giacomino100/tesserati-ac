import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  copyForNextYear,
  SCHEDULE_2026_27,
  scheduleToDraft,
  type FeeSchedule,
  type ScheduleDraft,
} from '@tesseramento/fees';
import { AuthService } from '../core/auth.service';
import { FEE_SCHEDULE_BACKEND } from './fee-schedule-backend';
import { FeeScheduleService, MESSAGES } from './fee-schedule.service';
import { SCHEDULE_USAGE } from './schedule-usage';
import { FakeBackend, stored } from './testing';

const schedule2027: FeeSchedule = { ...SCHEDULE_2026_27, associationYear: 2027, label: '2027/28' };

function setup(backend = new FakeBackend()) {
  TestBed.configureTestingModule({
    providers: [
      { provide: FEE_SCHEDULE_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'Utente@Example.org' }) } },
    ],
  });
  return { backend, service: TestBed.inject(FeeScheduleService) };
}

describe('FeeScheduleService – elenco e apertura', () => {
  it('elenca i listini dal più recente', async () => {
    const { service } = setup(new FakeBackend([stored(), stored(schedule2027)]));
    await service.load();
    expect(service.schedules().map((s) => s.schedule.associationYear)).toEqual([2027, 2026]);
    expect(service.error()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('apre un anno e ne espone ultima modifica', async () => {
    const { service } = setup();
    const opened = await service.open(2026);
    expect(opened?.schedule).toEqual(SCHEDULE_2026_27);
    expect(opened?.updatedBy).toBe('gestore@example.org');
  });

  it('un anno senza listino non si apre', async () => {
    const { service } = setup();
    expect(await service.open(2030)).toBeUndefined();
  });

  it('un errore del backend imposta il messaggio e non espone dati', async () => {
    const backend = new FakeBackend();
    backend.failWith = new Error('boom');
    const { service } = setup(backend);
    await service.load();
    expect(service.error()).toBe(MESSAGES.load);
    expect(service.schedules()).toEqual([]);
    expect(await service.open(2026)).toBeUndefined();
    expect(service.error()).toBe(MESSAGES.load);
  });
});

describe('FeeScheduleService – creazione', () => {
  const validDraft = () => scheduleToDraft(copyForNextYear(SCHEDULE_2026_27));

  it('l’anno proposto è l’ultimo + 1 (2027, poi 2028)', async () => {
    const one = setup();
    await one.service.load();
    expect(one.service.proposedYear()).toBe(2027);
    TestBed.resetTestingModule();
    const two = setup(new FakeBackend([stored(), stored(schedule2027)]));
    await two.service.load();
    expect(two.service.proposedYear()).toBe(2028);
  });

  it('senza listini non c’è un anno proposto né una copia', async () => {
    const { service } = setup(new FakeBackend([]));
    await service.load();
    expect(service.proposedYear()).toBeUndefined();
    expect(service.startNew()).toBeUndefined();
  });

  it('startNew copia l’ultimo listino per l’anno dopo, con le stesse quote e regole', async () => {
    const { service } = setup();
    await service.load();
    const copy = service.startNew();
    expect(copy?.associationYear).toBe(2027);
    expect(copy?.label).toBe('2027/28');
    expect(copy?.bands).toEqual(SCHEDULE_2026_27.bands);
    expect(copy?.minAge).toBe(6);
    expect(copy?.maxHouseholdSize).toBe(4);
  });

  it('create salva quote valide, con l’email dell’utente, e non tocca gli altri anni', async () => {
    const { backend, service } = setup();
    await service.load();
    const base = service.startNew()!;
    const draft: ScheduleDraft = {
      ...validDraft(),
      bands: { ...validDraft().bands, adulti: { full: '27,00', discounted: '22' } },
    };
    expect(await service.create(draft, base)).toEqual({ status: 'saved' });
    const saved = backend.items.find((i) => i.schedule.associationYear === 2027)!;
    expect(saved.schedule.bands.find((b) => b.band === 'adulti')?.fullCents).toBe(2700);
    expect(saved.schedule.bands.find((b) => b.band === 'adulti')?.discountedCents).toBe(2200);
    expect(saved.updatedBy).toBe('utente@example.org');
    expect(backend.items.find((i) => i.schedule.associationYear === 2026)?.schedule).toEqual(SCHEDULE_2026_27);
    expect(backend.calls.filter((c) => c.startsWith('create'))).toEqual(['create:2027']);
  });

  it('create non chiama il backend se ci sono errori e li restituisce tutti insieme', async () => {
    const { backend, service } = setup();
    await service.load();
    const base = service.startNew()!;
    const draft: ScheduleDraft = {
      acrPackage: '',
      bands: { ...validDraft().bands, acr: { full: '26,555', discounted: '0' } },
    };
    const result = await service.create(draft, base);
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          { field: 'acrPackage', code: 'required' },
          { field: 'acr.full', code: 'tooManyDecimals' },
          { field: 'acr.discounted', code: 'notPositive' },
        ]),
      );
    }
    expect(backend.calls.some((c) => c.startsWith('create'))).toBe(false);
  });

  it('un errore del backend (anche senza connessione) lascia tutto com’è e mostra il messaggio', async () => {
    const { backend, service } = setup();
    await service.load();
    const base = service.startNew()!;
    backend.failWith = new Error('offline');
    const result = await service.create(validDraft(), base);
    expect(result).toEqual({ status: 'error', message: MESSAGES.save });
    backend.failWith = undefined;
    expect(backend.items).toHaveLength(1);
  });

  it('un rifiuto delle regole dà il messaggio sull’anno non consentito', async () => {
    const { backend, service } = setup();
    await service.load();
    const base = service.startNew()!;
    backend.failWith = Object.assign(new Error('denied'), { code: 'permission-denied' });
    expect(await service.create(validDraft(), base)).toEqual({ status: 'error', message: MESSAGES.yearNotAllowed });
  });

  it('senza utente non salva', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: FEE_SCHEDULE_BACKEND, useValue: new FakeBackend() },
        { provide: AuthService, useValue: { user: signal(null) } },
      ],
    });
    const service = TestBed.inject(FeeScheduleService);
    await service.load();
    const result = await service.create(validDraft(), service.startNew()!);
    expect(result.status).toBe('error');
  });
});

describe('FeeScheduleService – modifica', () => {
  const draftWith = (full: string): ScheduleDraft => {
    const d = scheduleToDraft(SCHEDULE_2026_27);
    return { ...d, bands: { ...d.bands, adulti: { ...d.bands.adulti, full } } };
  };
  const adultFull = (backend: FakeBackend, year = 2026) =>
    backend.items
      .find((i) => i.schedule.associationYear === year)
      ?.schedule.bands.find((b) => b.band === 'adulti')?.fullCents;

  it('salva quote valide con l’email dell’utente e aggiorna ultima modifica', async () => {
    const { backend, service } = setup();
    const current = (await service.open(2026))!;
    expect(await service.update(draftWith('27,50'), current)).toEqual({ status: 'saved' });
    expect(adultFull(backend)).toBe(2750);
    expect(backend.items[0]?.updatedBy).toBe('utente@example.org');
    expect(backend.items[0]?.updatedAt.getTime()).toBeGreaterThan(current.updatedAt.getTime());
  });

  it('non salva valori non validi e li restituisce tutti', async () => {
    const { backend, service } = setup();
    const current = (await service.open(2026))!;
    const result = await service.update(draftWith('26,555'), current);
    expect(result.status).toBe('invalid');
    expect(backend.calls.some((c) => c.startsWith('update'))).toBe(false);
  });

  it('se il listino è cambiato dopo l’apertura segnala il conflitto e non scrive', async () => {
    const { backend, service } = setup();
    const current = (await service.open(2026))!;
    backend.touchByOther(2026);
    expect(await service.update(draftWith('27'), current)).toEqual({ status: 'conflict' });
    expect(adultFull(backend)).toBe(2600);
  });

  it('"sovrascrivi" salva anche dopo un conflitto', async () => {
    const { backend, service } = setup();
    const current = (await service.open(2026))!;
    backend.touchByOther(2026);
    expect(await service.update(draftWith('27'), current, { overwrite: true })).toEqual({ status: 'saved' });
    expect(adultFull(backend)).toBe(2700);
    expect(backend.calls).toContain('update:2026:overwrite');
  });

  it('"annulla e ricarica": riaprire il listino dà i valori aggiornati', async () => {
    const { backend, service } = setup();
    const current = (await service.open(2026))!;
    backend.touchByOther(2026);
    const fresh = (await service.open(2026))!;
    expect(fresh.updatedBy).toBe('altro@example.org');
    expect(fresh.updatedAt.getTime()).toBeGreaterThan(current.updatedAt.getTime());
  });

  it('con adesioni per l’anno chiede conferma prima di salvare; senza adesioni no', async () => {
    const backend = new FakeBackend();
    TestBed.configureTestingModule({
      providers: [
        { provide: FEE_SCHEDULE_BACKEND, useValue: backend },
        { provide: AuthService, useValue: { user: signal({ email: 'utente@example.org' }) } },
        { provide: SCHEDULE_USAGE, useValue: { isInUse: async () => true } },
      ],
    });
    const service = TestBed.inject(FeeScheduleService);
    const current = (await service.open(2026))!;
    expect(await service.update(draftWith('27'), current)).toEqual({ status: 'confirmNeeded' });
    expect(adultFull(backend)).toBe(2600);
    expect(await service.update(draftWith('27'), current, { confirmed: true })).toEqual({ status: 'saved' });
    expect(adultFull(backend)).toBe(2700);
  });

  it('senza adesioni (impostazione di base) salva subito, senza conferma', async () => {
    const { service } = setup();
    const current = (await service.open(2026))!;
    expect(await service.update(draftWith('27'), current)).toEqual({ status: 'saved' });
  });

  it('gli altri anni restano invariati', async () => {
    const { backend, service } = setup(new FakeBackend([stored(), stored(schedule2027)]));
    const current = (await service.open(2027))!;
    await service.update(draftWith('27'), current);
    expect(backend.items.find((i) => i.schedule.associationYear === 2026)?.schedule).toEqual(SCHEDULE_2026_27);
  });

  it('un errore del backend dà il messaggio di salvataggio e non cambia nulla', async () => {
    const { backend, service } = setup();
    const current = (await service.open(2026))!;
    backend.failWith = new Error('offline');
    expect(await service.update(draftWith('27'), current)).toEqual({ status: 'error', message: MESSAGES.save });
  });
});
