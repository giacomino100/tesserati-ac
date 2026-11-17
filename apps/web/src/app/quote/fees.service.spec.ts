import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth.service';
import { FAMILIES_BACKEND } from '../famiglie/families-backend';
import { FEE_SCHEDULE_BACKEND } from '../listini/fee-schedule-backend';
import { HOUSEHOLD_FEES_BACKEND } from './fees-backend';
import { FeesService } from './fees.service';
import { quoteFixture } from './testing';

function setup(fixture = quoteFixture()) {
  TestBed.configureTestingModule({
    providers: [
      { provide: FAMILIES_BACKEND, useValue: fixture.families },
      { provide: FEE_SCHEDULE_BACKEND, useValue: fixture.schedules },
      { provide: HOUSEHOLD_FEES_BACKEND, useValue: fixture.fees },
      { provide: AuthService, useValue: { user: signal({ email: 'Segreteria@Example.org' }) } },
    ],
  });
  return { ...fixture, service: TestBed.inject(FeesService) };
}

/** Conferma le famiglie 900001 (ROSSI, BIANCHI) e 900002 (VERDI PAOLO, NERI, VERDI SOFIA). */
async function confirmFamilies(f: ReturnType<typeof quoteFixture>) {
  await f.families.confirm(
    [
      { associationYear: 2026, memberIds: ['rossi', 'bianchi'], origin: 'legame', bondId: '900001' },
      { associationYear: 2026, memberIds: ['verdi-p', 'neri', 'verdi-s'], origin: 'legame', bondId: '900002' },
    ],
    'segreteria@example.org',
  );
}

describe('FeesService – quote dell’anno (US1)', () => {
  it('famiglie confermate e singoli: totali e avvisi', async () => {
    const f = quoteFixture();
    await confirmFamilies(f);
    const { service } = setup(f);
    await service.load(2026);
    expect(service.totalsText()).toBe('Totale 2026/27: 199,00 € · 6 nuclei calcolati · 0 quote manuali · 1 nuclei da decidere');
    expect(service.unconfirmedText()).toBe('');
    const verdi = service.comparisons().find((c) => c.key.startsWith('f-') && c.current?.household.bondId === '900002')!;
    expect(service.title(verdi.current!.household)).toBe('Famiglia di VERDI PAOLO · N. Legame 900002');
    expect(service.lines(verdi.current!)).toEqual([
      'VERDI PAOLO · 46 anni · Adulti · 26,00 € · — · 26,00 €',
      'NERI ANNA · 44 anni · Adulti · 26,00 € · — · 26,00 €',
      'VERDI SOFIA · 10 anni · ACR · 15,00 € · sconto 20% · 12,00 €',
    ]);
  });

  it('famiglie suggerite non confermate: singoli con avviso', async () => {
    const { service } = setup();
    await service.load(2026);
    expect(service.unconfirmedText()).toBe('2 famiglie suggerite non confermate: i loro componenti sono calcolati come singoli.');
    expect(service.totals().calculated).toBe(9);
  });

  it('nucleo non previsto: motivo con l’età minima del listino', async () => {
    const { service } = setup();
    await service.load(2026);
    const gatti = service.comparisons().find((c) => c.key === 'p-gatti')!;
    expect(service.reasonText(gatti.current!.outcome)).toBe("Non previsto dal listino: c'è un componente sotto i 6 anni.");
  });

  it('anno senza listino: nessuna quota e messaggio', async () => {
    const f = quoteFixture();
    f.families.members.set(2027, [f.families.members.get(2026)![0]!]);
    const { service } = setup(f);
    await service.load(2027);
    expect(service.scheduleMissing()).toBe('Manca il listino 2027/28. Crealo nella sezione Listini.');
    expect(service.comparisons()).toEqual([]);
  });
});

describe('FeesService – quota manuale (US2)', () => {
  it('importo e nota obbligatoria; poi conta nel totale', async () => {
    const { service, fees } = setup();
    await service.load(2026);
    service.startManual('p-gatti');
    service.manualEuros.set('15,00');
    expect(await service.saveManual()).toBe('invalid');
    expect(service.manualErrors().note).toBe('Scrivi una nota che spieghi la quota.');
    service.manualNote.set('Iscritta come ACR su decisione del consiglio');
    expect(await service.saveManual()).toBe('saved');
    expect(fees.items[0]).toMatchObject({ key: 'p-gatti', kind: 'manual', manualCents: 1500, totalCents: 1500, reason: 'memberUnderMinAge', savedBy: 'segreteria@example.org' });
    expect(service.totals()).toMatchObject({ manual: 1, missing: 0 });
    expect(service.manualText(service.comparisons().find((c) => c.key === 'p-gatti')!.saved!)).toBe(
      'Quota manuale: 15,00 € — Iscritta come ACR su decisione del consiglio — inserita il 17/11/2026 da segreteria@example.org',
    );
  });

  it.each([
    ['', 'Inserisci un importo.'],
    ['abc', 'Inserisci un importo valido, per esempio 26,00.'],
    ['1,555', 'Usa al massimo due decimali.'],
    ['-5', "L'importo non può essere negativo."],
  ])('importo %j: %s', async (euros, message) => {
    const { service } = setup();
    await service.load(2026);
    service.startManual('p-gatti');
    service.manualEuros.set(euros);
    service.manualNote.set('nota');
    expect(await service.saveManual()).toBe('invalid');
    expect(service.manualErrors().euros).toBe(message);
  });

  it('zero: serve la conferma in più', async () => {
    const { service, fees } = setup();
    await service.load(2026);
    service.startManual('p-gatti');
    service.manualEuros.set('0');
    service.manualNote.set('Esente per decisione del consiglio');
    expect(await service.saveManual()).toBe('confirmZero');
    expect(fees.items).toEqual([]);
    expect(await service.saveManual(true)).toBe('saved');
    expect(fees.items[0]).toMatchObject({ manualCents: 0, totalCents: 0 });
  });

  it('errore di rete: messaggio, nulla salvato', async () => {
    const { service, fees } = setup();
    await service.load(2026);
    fees.failWith = new Error('offline');
    service.startManual('p-gatti');
    service.manualEuros.set('15');
    service.manualNote.set('nota');
    expect(await service.saveManual()).toBe('failed');
    expect(service.message()).toBe('Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.');
    expect(service.hasUnsavedChanges()).toBe(true);
  });
});

describe('FeesService – salva e aggiorna (US3)', () => {
  it('salva le quote dell’anno, poi listino cambiato: da ricalcolare, aggiorna una e poi tutte', async () => {
    const f = quoteFixture();
    await confirmFamilies(f);
    const { service, fees, schedules } = setup(f);
    await service.load(2026);
    expect(service.savedInfo()).toBe('Quote non ancora salvate');
    await service.updateAll();
    expect(fees.items).toHaveLength(6);
    expect(service.savedInfo()).toBe('Ultimo salvataggio il 17/11/2026 da segreteria@example.org');

    const current = schedules.items[0]!;
    schedules.items[0] = {
      ...current,
      schedule: { ...current.schedule, bands: current.schedule.bands.map((b) => (b.band === 'adulti' ? { ...b, fullCents: 2700 } : b)) },
    };
    await service.load(2026);
    expect(service.updateText()).toBe('Quote da ricalcolare: 4 nuclei sono cambiati.');
    const rossi = service.comparisons().find((c) => c.current?.household.bondId === '900001')!;
    expect(service.changeText(rossi)).toBe('Salvata: 52,00 € · Ora: 54,00 €');

    await service.updateOne(rossi.key);
    expect(fees.items.find((i) => i.key === rossi.key)?.totalCents).toBe(5400);
    expect(service.updateText()).toBe('Quote da ricalcolare: 3 nuclei sono cambiati.');

    await service.updateAll();
    expect(service.updateText()).toBe('');
    expect(service.totals().savedTotalCents).toBe(service.totals().totalCents);
  });

  it('famiglia sciolta: la sua quota sparisce con "Aggiorna tutte"; quota manuale invariata', async () => {
    const f = quoteFixture();
    await confirmFamilies(f);
    const { service, fees } = setup(f);
    await service.load(2026);
    service.startManual('p-gatti');
    service.manualEuros.set('15');
    service.manualNote.set('nota');
    await service.saveManual();
    await service.updateAll();
    await f.families.dissolve(f.families.families.find((x) => x.bondId === '900001')!.id);
    await service.load(2026);
    await service.updateAll();
    expect(fees.items.some((i) => i.key.startsWith('f-') && i.memberIds.includes('rossi'))).toBe(false);
    expect(fees.items.find((i) => i.key === 'p-gatti')?.kind).toBe('manual');
  });
});
