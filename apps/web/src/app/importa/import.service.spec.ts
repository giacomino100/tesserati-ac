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
