import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth.service';
import { IMPORT_BACKEND } from './import-backend';
import { ImportService } from './import.service';
import { FakeImportBackend, FakeReader, fakeFile, fakeRow, sheetInput } from './testing';
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
      'Riga 3: manca la data di nascita',
      'Riga 4: manca il nome',
      'Riga 5: data di nascita non valida',
      'Riga 6: stessa persona della riga 2',
      'Riga 7: manca il cognome',
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
    expect(service.summary()).toEqual({ year: 2026, yearLabel: '2026/27', adhesions: 15, newPersons: 15, reusedPersons: 0 });
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
