import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth.service';
import { IMPORT_BACKEND } from './import-backend';
import { ImportService } from './import.service';
import { FakeImportBackend, FakeReader, fakeFile, fakeRow, sheetInput, type FakeRow } from './testing';
import { WORKBOOK_READER } from './workbook-reader';

export function setupImport(reader = new FakeReader(), backend = new FakeImportBackend()) {
  TestBed.configureTestingModule({
    providers: [
      { provide: WORKBOOK_READER, useValue: reader },
      { provide: IMPORT_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'Segreteria@Example.org' }) } },
    ],
  });
  return { reader, backend, service: TestBed.inject(ImportService) };
}

describe('ImportService – anteprima (US1)', () => {
  it('parte da "idle"', () => {
    expect(setupImport().service.state().kind).toBe('idle');
  });

  it('legge il file e mostra anno, totali e le prime 10 righe', async () => {
    const { service } = setupImport();
    const pending = service.chooseFile(fakeFile());
    expect(service.state().kind).toBe('reading');
    await pending;
    const state = service.state();
    expect(state.kind).toBe('preview');
    expect(service.yearLabel()).toBe('2026/27');
    expect(service.totals()).toEqual({ inFile: 15, toImport: 15 });
    expect(service.firstRows()).toHaveLength(10);
    expect(service.skippedMessages()).toEqual([]);
  });

  it('elenca le righe saltate con numero e motivo', async () => {
    const reader = new FakeReader(
      sheetInput([
        fakeRow(1),
        fakeRow(2, { 'Data Nascita': null }),
        fakeRow(3, { Nome: '' }),
        fakeRow(4, { 'Data Nascita': 'abc' }),
        fakeRow(1),
        fakeRow(6, { Cognome: null }),
      ]),
    );
    const { service } = setupImport(reader);
    await service.chooseFile(fakeFile());
    expect(service.totals()).toEqual({ inFile: 6, toImport: 1 });
    expect(service.skippedMessages()).toEqual([
      'Riga 3 (PROVA02 ALFA): manca la data di nascita',
      'Riga 4 (PROVA03): manca il nome',
      'Riga 5 (PROVA04 ALFA): data di nascita non valida',
      'Riga 6 (PROVA01 ALFA): stessa persona della riga 2',
      'Riga 7 (ALFA): manca il cognome',
    ]);
  });

  it('"Annulla" torna alla scelta del file senza salvare nulla (FR-004, SC-003)', async () => {
    const { service, backend } = setupImport();
    await service.chooseFile(fakeFile());
    service.cancel();
    expect(service.state().kind).toBe('idle');
    expect(service.firstRows()).toEqual([]);
    expect(backend.commits).toEqual([]);
  });
});

describe('ImportService – salvataggio (US2)', () => {
  it('"Importa" salva con l’email dell’utente e mostra il riepilogo', async () => {
    const { service, backend } = setupImport();
    await service.chooseFile(fakeFile());
    await service.confirm();
    expect(backend.commits).toHaveLength(1);
    expect(backend.commits[0]?.email).toBe('Segreteria@Example.org');
    expect(backend.commits[0]?.plan.adhesions).toBe(15);
    expect(service.state().kind).toBe('done');
    expect(service.summary()).toEqual({
      year: 2026,
      yearLabel: '2026/27',
      listLabel: 'ACR',
      adhesions: 15,
      newPersons: 15,
      reusedPersons: 0,
      byTaxCode: 0,
      confirmedSame: 0,
      warnings: 0,
    });
  });

  it('riusa le persone già presenti', async () => {
    const backend = new FakeImportBackend();
    backend.persons.set('PROVA01|ALFA|2016-04-09', 'esistente');
    const { service } = setupImport(new FakeReader(), backend);
    await service.chooseFile(fakeFile());
    await service.confirm();
    expect(service.summary()).toMatchObject({ adhesions: 15, newPersons: 14, reusedPersons: 1 });
  });

  it('durante il salvataggio lo stato è "saving"', async () => {
    const backend = new FakeImportBackend();
    const { service } = setupImport(new FakeReader(), backend);
    await service.chooseFile(fakeFile());
    backend.pause();
    const pending = service.confirm();
    await Promise.resolve();
    await Promise.resolve();
    expect(service.state().kind).toBe('saving');
    expect(service.isSaving()).toBe(true);
    backend.release();
    await pending;
    expect(service.state().kind).toBe('done');
    expect(service.isSaving()).toBe(false);
  });

  it('errore di rete: "saveFailed" con il messaggio e si può riprovare', async () => {
    const backend = new FakeImportBackend();
    backend.failCommitWith = Object.assign(new Error('offline'), { code: 'unavailable' });
    const { service } = setupImport(new FakeReader(), backend);
    await service.chooseFile(fakeFile());
    await service.confirm();
    const state = service.state();
    expect(state.kind).toBe('saveFailed');
    expect(state.kind === 'saveFailed' && state.message).toBe(
      'Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.',
    );
    backend.failCommitWith = undefined;
    await service.confirm();
    expect(service.state().kind).toBe('done');
    expect(backend.commits).toHaveLength(1);
  });
});

describe('ImportService – rifiuti (US3)', () => {
  async function rejectedWith(reader: FakeReader, backend = new FakeImportBackend()) {
    const { service } = setupImport(reader, backend);
    await service.chooseFile(fakeFile());
    const state = service.state();
    expect(state.kind).toBe('rejected');
    expect(backend.commits).toEqual([]);
    return { service, message: state.kind === 'rejected' ? state.message : '' };
  }

  it('file non leggibile', async () => {
    const { message } = await rejectedWith(new FakeReader(new Error('zip rotto')));
    expect(message).toBe('Il file non è un Excel valido.');
  });

  it('foglio mancante', async () => {
    const { message } = await rejectedWith(new FakeReader(sheetInput([fakeRow(1)], { sheetNames: ['Foglio1'] })));
    expect(message).toBe('Nel file manca il foglio ElencoAdesioniExcel.');
  });

  it('colonne mancanti', async () => {
    const input = sheetInput([fakeRow(1)]);
    const rows = input.rows.map((r) => [...r]);
    rows[0] = rows[0]!.map((h) => (h === 'Data Nascita' || h === 'Settore' ? 'Altro' : h));
    const { message } = await rejectedWith(new FakeReader({ ...input, rows }));
    expect(message).toBe('Nel file mancano le colonne: Data Nascita, Settore.');
  });

  it('nessuna riga', async () => {
    const { message } = await rejectedWith(new FakeReader(sheetInput([])));
    expect(message).toBe('Il file non contiene righe da importare.');
  });

  it('anno non valido o misto', async () => {
    const expected =
      'Non riesco a leggere l\'anno associativo: la colonna Anno Associativo deve contenere "Anno 2026" uguale in tutte le righe.';
    expect((await rejectedWith(new FakeReader(sheetInput([fakeRow(1, { 'Anno Associativo': '2026' })])))).message).toBe(expected);
    TestBed.resetTestingModule();
    expect(
      (await rejectedWith(new FakeReader(sheetInput([fakeRow(1), fakeRow(2, { 'Anno Associativo': 'Anno 2027' })])))).message,
    ).toBe(expected);
  });

  it('elenco non riconoscibile (specifica 005)', async () => {
    const { message } = await rejectedWith(new FakeReader(sheetInput([fakeRow(1, { Settore: 'ALTRO' })])));
    expect(message).toBe(
      'Non riesco a capire di quale elenco si tratta: la colonna Settore deve contenere RAGAZZI, GIOVANI o ADULTI.',
    );
  });

  it('tutte le righe saltate: messaggio ed elenco', async () => {
    const { service, message } = await rejectedWith(new FakeReader(sheetInput([fakeRow(1, { Nome: null })])));
    expect(message).toBe('Nessuna riga valida da importare.');
    expect(service.skippedMessages()).toEqual(['Riga 2 (PROVA01): manca il nome']);
  });

  it('anno senza listino: messaggio con il collegamento ai Listini', async () => {
    const backend = new FakeImportBackend();
    backend.feeScheduleYears.clear();
    const { service, message } = await rejectedWith(new FakeReader(), backend);
    expect(message).toBe('Manca il listino 2026/27. Crealo prima nella sezione Listini.');
    expect(service.showListiniLink()).toBe(true);
  });

  it('anno già importato', async () => {
    const backend = new FakeImportBackend();
    backend.importedLists.add('2026-ACR');
    const { service, message } = await rejectedWith(new FakeReader(), backend);
    expect(message).toBe('L\'elenco ACR del 2026/27 è già stato importato.');
    expect(service.showListiniLink()).toBe(false);
  });

  it('anno importato da qualcun altro tra anteprima e conferma: rifiutato al salvataggio', async () => {
    const backend = new FakeImportBackend();
    const { service } = setupImport(new FakeReader(), backend);
    await service.chooseFile(fakeFile());
    backend.importedLists.add('2026-ACR');
    await service.confirm();
    const state = service.state();
    expect(state.kind === 'rejected' && state.message).toBe('L\'elenco ACR del 2026/27 è già stato importato.');
    expect(backend.commits).toEqual([]);
  });

  it('listino cancellato tra anteprima e conferma: rifiutato al salvataggio', async () => {
    const backend = new FakeImportBackend();
    const { service } = setupImport(new FakeReader(), backend);
    await service.chooseFile(fakeFile());
    backend.feeScheduleYears.clear();
    await service.confirm();
    const state = service.state();
    expect(state.kind === 'rejected' && state.message).toBe('Manca il listino 2026/27. Crealo prima nella sezione Listini.');
  });
});

/* ---- Specifica 005: elenchi Giovani e Adulti ---- */

const giovani = (n: number, over: FakeRow = {}) =>
  fakeRow(n, { Settore: 'GIOVANI', "Fasce d'età": '19/25', 'Data Nascita': '01/01/2001', ...over });
const adulti = (n: number, over: FakeRow = {}) =>
  fakeRow(n, { Settore: 'ADULTI', "Fasce d'età": 'AD', 'Data Nascita': '01/01/1970', ...over });

describe('ImportService – elenchi (005, US1)', () => {
  it('riconosce l’elenco Giovani e lo usa nel salvataggio', async () => {
    const backend = new FakeImportBackend();
    backend.addMember(2026, 'ALTRO|ACR|2016-01-01', 'ACR');
    const { service } = setupImport(new FakeReader(sheetInput([giovani(1), giovani(2)])), backend);
    await service.chooseFile(fakeFile());
    expect(service.state().kind).toBe('preview');
    expect(service.listLabel()).toBe('Giovani');
    expect(service.canConfirm()).toBe(true);
    await service.confirm();
    expect(backend.commits[0]?.plan.importId).toBe('2026-GIOVANI');
    expect(service.summary()).toMatchObject({ listLabel: 'Giovani', adhesions: 2 });
  });

  it('elenco già importato: rifiuto con il nome dell’elenco', async () => {
    const backend = new FakeImportBackend();
    backend.importedLists.add('2026-GIOVANI');
    const { service } = setupImport(new FakeReader(sheetInput([giovani(1)])), backend);
    await service.chooseFile(fakeFile());
    const state = service.state();
    expect(state.kind === 'rejected' && state.message).toBe("L'elenco Giovani del 2026/27 è già stato importato.");
  });

  it('parità: chiede l’elenco, "Importa" bloccato finché non si sceglie', async () => {
    const backend = new FakeImportBackend();
    const { service } = setupImport(
      new FakeReader(sheetInput([giovani(1), adulti(2), giovani(3), adulti(4)])),
      backend,
    );
    await service.chooseFile(fakeFile());
    expect(service.state().kind).toBe('preview');
    expect(service.tieCandidates()).toEqual(['GIOVANI', 'ADULTI']);
    expect(service.listLabel()).toBe('');
    expect(service.canConfirm()).toBe(false);
    service.choose('ADULTI');
    expect(service.listLabel()).toBe('Adulti');
    expect(service.canConfirm()).toBe(true);
    await service.confirm();
    expect(backend.commits[0]?.plan.importId).toBe('2026-ADULTI');
    expect(backend.commits[0]?.plan.adhesions).toBe(4);
  });

  it('parità con un elenco già importato: messaggio alla scelta e "Importa" bloccato', async () => {
    const backend = new FakeImportBackend();
    backend.importedLists.add('2026-ADULTI');
    const { service } = setupImport(new FakeReader(sheetInput([giovani(1), adulti(2)])), backend);
    await service.chooseFile(fakeFile());
    service.choose('ADULTI');
    expect(service.listMessage()).toBe("L'elenco Adulti del 2026/27 è già stato importato.");
    expect(service.canConfirm()).toBe(false);
    service.choose('GIOVANI');
    expect(service.listMessage()).toBe('');
    expect(service.canConfirm()).toBe(true);
  });

  it('elenco importato da qualcun altro tra anteprima e conferma', async () => {
    const backend = new FakeImportBackend();
    const { service } = setupImport(new FakeReader(sheetInput([adulti(1)])), backend);
    await service.chooseFile(fakeFile());
    backend.importedLists.add('2026-ADULTI');
    await service.confirm();
    const state = service.state();
    expect(state.kind === 'rejected' && state.message).toBe("L'elenco Adulti del 2026/27 è già stato importato.");
  });
});

describe('ImportService – persone già nell’anno (005, US2)', () => {
  it('salta e elenca chi è già stato importato da un altro elenco dell’anno', async () => {
    const backend = new FakeImportBackend();
    backend.addMember(2026, 'PROVA02|ALFA|1970-01-01', 'ACR');
    const { service } = setupImport(new FakeReader(sheetInput([adulti(1), adulti(2), adulti(3)])), backend);
    await service.chooseFile(fakeFile());
    expect(service.totals()).toEqual({ inFile: 3, toImport: 2 });
    expect(service.skippedMessages()).toEqual(["Riga 3 (PROVA02 ALFA): già importata nell'elenco ACR del 2026/27"]);
    expect(service.firstRows().map((r) => r.lastName)).toEqual(['PROVA01', 'PROVA03']);
    await service.confirm();
    expect(service.summary()).toMatchObject({ adhesions: 2, newPersons: 2, reusedPersons: 0 });
  });

  it('salta chi è già stato riconfermato nell’anno (008)', async () => {
    const backend = new FakeImportBackend();
    backend.addRenewed(2026, 'PROVA02|ALFA|1970-01-01', 'ADULTI');
    const { service } = setupImport(new FakeReader(sheetInput([adulti(1), adulti(2)])), backend);
    await service.chooseFile(fakeFile());
    expect(service.skippedMessages()).toEqual(["Riga 3 (PROVA02 ALFA): già presente nell'anno (riconferma)"]);
    await service.confirm();
    expect(service.summary()).toMatchObject({ adhesions: 1, newPersons: 1, reusedPersons: 0 });
  });

  it('riusa una persona di un anno precedente', async () => {
    const backend = new FakeImportBackend();
    backend.addMember(2025, 'PROVA01|ALFA|1970-01-01', 'ADULTI');
    const { service } = setupImport(new FakeReader(sheetInput([adulti(1)])), backend);
    await service.chooseFile(fakeFile());
    await service.confirm();
    expect(service.summary()).toMatchObject({ adhesions: 1, newPersons: 0, reusedPersons: 1 });
  });

  it('tutte le righe già importate nell’anno: rifiuto con l’elenco delle righe', async () => {
    const backend = new FakeImportBackend();
    backend.addMember(2026, 'PROVA01|ALFA|1970-01-01', 'ACR');
    const { service } = setupImport(new FakeReader(sheetInput([adulti(1)])), backend);
    await service.chooseFile(fakeFile());
    const state = service.state();
    expect(state.kind === 'rejected' && state.message).toBe('Nessuna riga valida da importare.');
    expect(service.skippedMessages()).toEqual(["Riga 2 (PROVA01 ALFA): già importata nell'elenco ACR del 2026/27"]);
    expect(backend.commits).toEqual([]);
  });

  it('dati cambiati durante il salvataggio: rifiuto e invito a ricaricare', async () => {
    const backend = new FakeImportBackend();
    backend.addMember(2025, 'PROVA01|ALFA|1970-01-01', 'ADULTI');
    const { service } = setupImport(new FakeReader(sheetInput([adulti(1)])), backend);
    await service.chooseFile(fakeFile());
    backend.addMember(2026, 'PROVA01|ALFA|1970-01-01', 'GIOVANI');
    backend.importedLists.delete('2026-GIOVANI');
    await service.confirm();
    const state = service.state();
    expect(state.kind === 'rejected' && state.message).toBe(
      'Nel frattempo sono stati importati altri tesserati di questo anno. Ricarica il file e riprova.',
    );
  });
});

/* ---- Specifica 006: doppioni, codice fiscale, righe saltate con nome, avvisi ---- */

describe('ImportService – possibili doppioni (006, US1)', () => {
  const rossiGrazia = (n = 1) =>
    fakeRow(n, { Cognome: 'ROSSI', Nome: 'MARIA GRAZIA', 'Data Nascita': '12/03/1965', Settore: 'ADULTI', "Fasce d'età": 'AD' });

  function withRossi() {
    const backend = new FakeImportBackend();
    const id = backend.addPerson('ROSSI', 'MARIA', '1965-03-12', { adhesion: { year: 2025, list: 'ADULTI' } });
    return { backend, id };
  }

  it('mostra il doppione con il candidato e blocca "Importa" finché non si decide', async () => {
    const { backend, id } = withRossi();
    const { service } = setupImport(new FakeReader(sheetInput([rossiGrazia(), fakeRow(2, { Settore: 'ADULTI', 'Data Nascita': '01/01/1970' })])), backend);
    await service.chooseFile(fakeFile());
    expect(service.duplicates()).toHaveLength(1);
    expect(service.duplicates()[0]?.candidates.map((c) => c.id)).toEqual([id]);
    expect(service.pendingDuplicates()).toBe(1);
    expect(service.canConfirm()).toBe(false);
    expect(service.totals()).toEqual({ inFile: 2, toImport: 1 });
  });

  it('"Stessa persona": nessuna persona nuova, riepilogo con il doppione confermato', async () => {
    const { backend, id } = withRossi();
    const { service } = setupImport(new FakeReader(sheetInput([rossiGrazia()])), backend);
    await service.chooseFile(fakeFile());
    service.decide(2, id);
    expect(service.canConfirm()).toBe(true);
    await service.confirm();
    expect(backend.commits[0]?.plan.reusedPersons.map((r) => r.personId)).toEqual([id]);
    expect(backend.commits[0]?.plan.newPersons).toEqual([]);
    expect(service.summary()).toMatchObject({ newPersons: 0, reusedPersons: 1, confirmedSame: 1 });
  });

  it('"Persona diversa": persona nuova; la scelta si può cambiare', async () => {
    const { backend, id } = withRossi();
    const { service } = setupImport(new FakeReader(sheetInput([rossiGrazia()])), backend);
    await service.chooseFile(fakeFile());
    service.decide(2, id);
    service.decide(2, 'new');
    expect(service.duplicates()[0]?.decision).toBe('new');
    await service.confirm();
    expect(service.summary()).toMatchObject({ newPersons: 1, reusedPersons: 0, confirmedSame: 0 });
  });

  it('candidato già importato quest’anno: scelto, la riga passa tra le saltate', async () => {
    const backend = new FakeImportBackend();
    const id = backend.addPerson('ROSSI', 'MARIA', '1965-03-12', { adhesion: { year: 2026, list: 'ACR' } });
    backend.importedLists.add('2026-ACR');
    const { service } = setupImport(new FakeReader(sheetInput([rossiGrazia(), fakeRow(2, { Settore: 'ADULTI', 'Data Nascita': '01/01/1970' })])), backend);
    await service.chooseFile(fakeFile());
    expect(service.duplicates()[0]?.candidates[0]?.lastAdhesion).toEqual({ year: 2026, list: 'ACR' });
    service.decide(2, id);
    expect(service.skippedMessages()).toEqual(["Riga 2 (ROSSI MARIA GRAZIA): già importata nell'elenco ACR del 2026/27"]);
    expect(service.canConfirm()).toBe(true);
  });
});

describe('ImportService – codice fiscale (006, US2)', () => {
  it('attribuita alla persona del codice fiscale e contata nel riepilogo', async () => {
    const backend = new FakeImportBackend();
    const id = backend.addPerson('NERI', 'ANNA', '1982-11-05', { taxCode: 'NRENNA82S45G348X' });
    const row = fakeRow(1, { Cognome: 'NERI', Nome: 'ANA', 'Data Nascita': '05/11/1982', 'Cod. Fiscale': 'NRENNA82S45G348X', Settore: 'ADULTI' });
    const { service } = setupImport(new FakeReader(sheetInput([row])), backend);
    await service.chooseFile(fakeFile());
    expect(service.duplicates()).toEqual([]);
    expect(service.taxCodeNotes()).toEqual(['Riga 2: NERI ANA → NERI ANNA, 05/11/1982 (stesso codice fiscale)']);
    await service.confirm();
    expect(backend.commits[0]?.plan.reusedPersons.map((r) => r.personId)).toEqual([id]);
    expect(service.summary()).toMatchObject({ byTaxCode: 1 });
  });
});

describe('ImportService – righe saltate con nome e avvisi (006, US3)', () => {
  it('righe saltate con cognome e nome, senza nome se mancano entrambi', async () => {
    const { service } = setupImport(
      new FakeReader(sheetInput([fakeRow(1), fakeRow(2, { 'Data Nascita': null }), fakeRow(3, { Cognome: null, Nome: null })])),
    );
    await service.chooseFile(fakeFile());
    expect(service.skippedMessages()).toEqual(['Riga 3 (PROVA02 ALFA): manca la data di nascita', 'Riga 4: manca il cognome']);
  });

  it('avvisi età/settore dal listino, non bloccanti, contati nel riepilogo', async () => {
    const { service } = setupImport(
      new FakeReader(
        sheetInput([
          fakeRow(1, { Cognome: 'GATTI', Nome: 'MIA', 'Data Nascita': '09/09/2022' }),
          fakeRow(2, { Cognome: 'PROVA', Nome: 'ALFA', 'Data Nascita': '01/05/1996', Settore: 'GIOVANI' }),
          fakeRow(3),
        ]),
      ),
    );
    await service.chooseFile(fakeFile());
    expect(service.warningMessages()).toEqual([
      "Riga 2 (GATTI MIA): 4 anni, sotto l'età minima di 6 anni del listino",
      "Riga 3 (PROVA ALFA): 30 anni: per il listino è Adulti, nell'export è GIOVANI",
    ]);
    expect(service.canConfirm()).toBe(true);
    await service.confirm();
    expect(service.summary()).toMatchObject({ adhesions: 3, warnings: 2 });
  });
});
