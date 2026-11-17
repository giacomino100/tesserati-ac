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
