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
    expect(el.textContent).toContain('Scegli il file ElencoAdesioni_ACR.xlsx esportato dal sistema nazionale.');
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
    expect(el.textContent).toContain('Anno associativo 2026/27');
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
    expect(el.textContent).toContain('Riga 3: manca la data di nascita');
  });

  it('"Annulla" torna alla scelta del file', async () => {
    const { fixture, el, backend } = await renderImport();
    await chooseFile(fixture);
    button(el, 'Annulla')!.click();
    fixture.detectChanges();
    expect(el.querySelector('table')).toBeNull();
    expect(el.textContent).toContain('Scegli il file');
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
    expect(el.textContent).toContain('Import completato: 15 adesioni 2026/27, 15 persone nuove, 0 già presenti.');
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
    const reader = new FakeReader(sheetInput([fakeRow(1, { Settore: 'ADULTI' })]));
    const { fixture, el } = await renderImport(reader);
    await chooseFile(fixture);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Il file non sembra l\'elenco ACR');
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
