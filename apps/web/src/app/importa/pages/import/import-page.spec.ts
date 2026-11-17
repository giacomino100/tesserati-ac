import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { IMPORT_BACKEND } from '../../import-backend';
import { FakeImportBackend, FakeReader, fakeFile, fakeRow, sheetInput } from '../../testing';
import { WORKBOOK_READER } from '../../workbook-reader';
import { ImportPage } from './import-page';

export async function renderImport(reader = new FakeReader(), backend = new FakeImportBackend()) {
  TestBed.configureTestingModule({
    imports: [ImportPage],
    providers: [
      provideRouter([]),
      { provide: WORKBOOK_READER, useValue: reader },
      { provide: IMPORT_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'segreteria@example.org' }) } },
    ],
  });
  const fixture = TestBed.createComponent(ImportPage);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement, reader, backend };
}

export async function chooseFile(fixture: ComponentFixture<ImportPage>): Promise<void> {
  const input = (fixture.nativeElement as HTMLElement).querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [fakeFile()], configurable: true });
  input.dispatchEvent(new Event('change'));
  await fixture.whenStable();
  fixture.detectChanges();
}

export function button(el: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(el.querySelectorAll<HTMLButtonElement>('button, a')).find((b) => b.textContent?.trim() === text);
}

describe('ImportPage – scelta e anteprima (US1)', () => {
  it('chiede il file .xlsx', async () => {
    const { el } = await renderImport();
    expect(el.textContent).toContain('Scegli uno degli elenchi esportati dal sistema nazionale (ACR, Giovani o Adulti).');
    expect(el.textContent).toContain('Importa Excel');
    const input = el.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('.xlsx');
  });

  it('mostra anno, totali e le prime righe', async () => {
    const reader = new FakeReader(
      sheetInput([
        fakeRow(1, { Cognome: 'VERDI', Nome: 'SOFIA', 'Data Nascita': '09/04/2016', "Fasce d'età": '9/11' }),
        fakeRow(2, { Legame: null, 'N. Legame': null }),
      ]),
    );
    const { fixture, el } = await renderImport(reader);
    await chooseFile(fixture);
    expect(el.textContent).toContain('Elenco ACR · anno associativo 2026/27');
    expect(el.textContent).toContain('2 righe nel file, 2 da importare');
    const headers = Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Cognome e nome', 'Data di nascita', "Fascia d'età (export)", 'Legame']);
    const cells = Array.from(el.querySelectorAll('tbody tr')[0]!.querySelectorAll('td')).map((td) => td.textContent?.trim());
    expect(cells).toEqual(['VERDI SOFIA', '09/04/2016', '9/11', 'C3 · 900002']);
    const second = Array.from(el.querySelectorAll('tbody tr')[1]!.querySelectorAll('td')).map((td) => td.textContent?.trim());
    expect(second?.[3]).toBe('');
    expect(button(el, 'Importa')).toBeDefined();
    expect(button(el, 'Annulla')).toBeDefined();
  });

  it('mostra al massimo 10 righe', async () => {
    const { fixture, el } = await renderImport();
    await chooseFile(fixture);
    expect(el.textContent).toContain('15 righe nel file, 15 da importare');
    expect(el.querySelectorAll('tbody tr')).toHaveLength(10);
  });

  it('elenca le righe saltate', async () => {
    const reader = new FakeReader(sheetInput([fakeRow(1), fakeRow(2, { 'Data Nascita': null })]));
    const { fixture, el } = await renderImport(reader);
    await chooseFile(fixture);
    expect(el.textContent).toContain('2 righe nel file, 1 da importare');
    expect(el.textContent).toContain('Riga 3 (PROVA02 ALFA): manca la data di nascita');
  });

  it('"Annulla" torna alla scelta del file', async () => {
    const { fixture, el, backend } = await renderImport();
    await chooseFile(fixture);
    button(el, 'Annulla')!.click();
    fixture.detectChanges();
    expect(el.querySelector('table')).toBeNull();
    expect(el.textContent).toContain('Scegli uno degli elenchi');
    expect(backend.commits).toEqual([]);
  });
});

describe('ImportPage – salvataggio (US2)', () => {
  it('"Importa" mostra il riepilogo e i collegamenti', async () => {
    const { fixture, el, backend } = await renderImport();
    await chooseFile(fixture);
    button(el, 'Importa')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(backend.commits).toHaveLength(1);
    expect(el.textContent).toContain('Import completato: elenco ACR, 15 adesioni 2026/27, 15 persone nuove, 0 già presenti.');
    expect(button(el, 'Torna alla home')?.getAttribute('href')).toBe('/');
    expect(button(el, 'Vedi i tesserati')?.getAttribute('href')).toBe('/tesserati?anno=2026');
  });

  it('durante il salvataggio i pulsanti sono disattivati', async () => {
    const { fixture, el, backend } = await renderImport();
    await chooseFile(fixture);
    backend.pause();
    button(el, 'Importa')!.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Salvataggio in corso…');
    expect(Array.from(el.querySelectorAll('button')).every((b) => b.disabled)).toBe(true);
    backend.release();
    await fixture.whenStable();
  });

  it('errore di rete: messaggio e "Riprova"', async () => {
    const { fixture, el, backend } = await renderImport();
    backend.failCommitWith = new Error('offline');
    await chooseFile(fixture);
    button(el, 'Importa')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.');
    backend.failCommitWith = undefined;
    button(el, 'Riprova')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('Import completato');
  });

  it('chiede conferma prima di uscire solo durante il salvataggio', async () => {
    const { fixture, el, backend } = await renderImport();
    const page = fixture.componentInstance;
    expect(page.hasUnsavedChanges()).toBe(false);
    await chooseFile(fixture);
    expect(page.hasUnsavedChanges()).toBe(false);
    backend.pause();
    button(el, 'Importa')!.click();
    expect(page.hasUnsavedChanges()).toBe(true);
    backend.release();
    await fixture.whenStable();
    expect(page.hasUnsavedChanges()).toBe(false);
  });
});

describe('ImportPage – rifiuti (US3)', () => {
  it('mostra il messaggio e "Scegli un altro file", che riporta alla scelta', async () => {
    const reader = new FakeReader(sheetInput([fakeRow(1, { Settore: 'ALTRO' })]));
    const { fixture, el } = await renderImport(reader);
    await chooseFile(fixture);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Non riesco a capire di quale elenco si tratta');
    expect(el.querySelector('table')).toBeNull();
    button(el, 'Scegli un altro file')!.click();
    fixture.detectChanges();
    expect(el.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('anno senza listino: collegamento ai Listini', async () => {
    const backend = new FakeImportBackend();
    backend.feeScheduleYears.clear();
    const { fixture, el } = await renderImport(new FakeReader(), backend);
    await chooseFile(fixture);
    expect(el.textContent).toContain('Manca il listino 2026/27. Crealo prima nella sezione Listini.');
    expect(el.querySelector('a[href="/listini"]')?.textContent).toContain('Listini');
  });
});

describe('ImportPage – elenchi (005)', () => {
  const giovani = (n: number) => fakeRow(n, { Settore: 'GIOVANI', 'Data Nascita': '01/01/2001' });
  const adulti = (n: number) => fakeRow(n, { Settore: 'ADULTI', 'Data Nascita': '01/01/1970' });

  it('anteprima con l’elenco riconosciuto e riepilogo con l’elenco', async () => {
    const { fixture, el } = await renderImport(new FakeReader(sheetInput([giovani(1), giovani(2)])));
    await chooseFile(fixture);
    expect(el.textContent).toContain('Elenco Giovani · anno associativo 2026/27');
    button(el, 'Importa')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('Import completato: elenco Giovani, 2 adesioni 2026/27, 2 persone nuove, 0 già presenti.');
  });

  it('parità: domanda, scelta e "Importa" attivo solo dopo la scelta', async () => {
    const { fixture, el, backend } = await renderImport(new FakeReader(sheetInput([giovani(1), adulti(2)])));
    await chooseFile(fixture);
    expect(el.textContent).toContain('Di quale elenco si tratta?');
    expect(button(el, 'Importa')!.disabled).toBe(true);
    button(el, 'Adulti')!.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Elenco Adulti · anno associativo 2026/27');
    expect(button(el, 'Importa')!.disabled).toBe(false);
    button(el, 'Importa')!.click();
    await fixture.whenStable();
    expect(backend.commits[0]?.plan.importId).toBe('2026-ADULTI');
  });

  it('riga già importata da un altro elenco: elencata in anteprima', async () => {
    const backend = new FakeImportBackend();
    backend.addMember(2026, 'PROVA02|ALFA|1970-01-01', 'ACR');
    const { fixture, el } = await renderImport(new FakeReader(sheetInput([adulti(1), adulti(2)])), backend);
    await chooseFile(fixture);
    expect(el.textContent).toContain('2 righe nel file, 1 da importare');
    expect(el.textContent).toContain("Riga 3 (PROVA02 ALFA): già importata nell'elenco ACR del 2026/27");
    expect(el.querySelectorAll('tbody tr')).toHaveLength(1);
  });
});

describe('ImportPage – revisione dell’import (006)', () => {
  it('possibili doppioni: sezione, candidato, Importa bloccato, scelta evidenziata', async () => {
    const backend = new FakeImportBackend();
    backend.addPerson('ROSSI', 'MARIA', '1965-03-12', { adhesion: { year: 2025, list: 'ACR' } });
    const reader = new FakeReader(
      sheetInput([fakeRow(1, { Cognome: 'ROSSI', Nome: 'MARIA GRAZIA', 'Data Nascita': '12/03/1965', Settore: 'ADULTI' })]),
    );
    const { fixture, el } = await renderImport(reader, backend);
    await chooseFile(fixture);
    expect(el.textContent).toContain('Possibili doppioni (1 da decidere)');
    expect(el.textContent).toContain('Riga 2: ROSSI MARIA GRAZIA, 12/03/1965');
    expect(el.textContent).toContain('ROSSI MARIA, 12/03/1965 · ACR 2025/26');
    expect(el.textContent).toContain('Decidi i possibili doppioni prima di importare.');
    expect(button(el, 'Importa')!.disabled).toBe(true);
    button(el, 'Stessa persona')!.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Possibili doppioni (0 da decidere)');
    expect(button(el, 'Importa')!.disabled).toBe(false);
    button(el, 'Importa')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('1 doppioni confermati');
  });

  it('codice fiscale, avvisi e righe saltate con nome', async () => {
    const backend = new FakeImportBackend();
    backend.addPerson('NERI', 'ANNA', '1982-11-05', { taxCode: 'NRENNA82S45G348X' });
    const reader = new FakeReader(
      sheetInput([
        fakeRow(1, { Cognome: 'NERI', Nome: 'ANA', 'Data Nascita': '05/11/1982', 'Cod. Fiscale': 'NRENNA82S45G348X', Settore: 'ADULTI' }),
        fakeRow(2, { Cognome: 'GATTI', Nome: 'MIA', 'Data Nascita': '09/09/2022' }),
        fakeRow(3, { 'Data Nascita': null }),
      ]),
    );
    const { fixture, el } = await renderImport(reader, backend);
    await chooseFile(fixture);
    expect(el.textContent).toContain('Riconosciute dal codice fiscale');
    expect(el.textContent).toContain('Riga 2: NERI ANA → NERI ANNA, 05/11/1982 (stesso codice fiscale)');
    expect(el.textContent).toContain('Avvisi');
    expect(el.textContent).toContain("Riga 3 (GATTI MIA): 4 anni, sotto l'età minima di 6 anni del listino");
    expect(el.textContent).toContain('Riga 4 (PROVA03 ALFA): manca la data di nascita');
    expect(button(el, 'Importa')!.disabled).toBe(false);
  });
});
