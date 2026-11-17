import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { FEE_SCHEDULE_BACKEND } from '../../fee-schedule-backend';
import { FakeBackend } from '../../testing';
import { ListinoDetail } from './detail';

async function render(year: string, backend = new FakeBackend()) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { user: signal(null) } },
      { provide: FEE_SCHEDULE_BACKEND, useValue: backend },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ anno: year }) } } },
    ],
  });
  const fixture = TestBed.createComponent(ListinoDetail);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('ListinoDetail', () => {
  it('mostra le quote ufficiali del 2026/27 (regole-quote.md §1)', async () => {
    const el = await render('2026');
    const rows = Object.fromEntries(
      Array.from(el.querySelectorAll('[data-testid="band-row"]')).map((r) => [
        r.getAttribute('data-band'),
        text(r),
      ]),
    );
    expect(rows['acr']).toContain('ACR');
    expect(rows['acr']).toContain('6–14');
    expect(rows['acr']).toContain('15,00 €');
    expect(rows['acr']).toContain('12,00 €');
    expect(rows['giovanissimi']).toContain('15–18');
    expect(rows['giovanissimi']).toContain('16,00 €');
    expect(rows['giovanissimi']).toContain('13,00 €');
    expect(rows['giovani']).toContain('19–29');
    expect(rows['giovani']).toContain('22,00 €');
    expect(rows['giovani']).toContain('18,00 €');
    expect(rows['adulti']).toContain('30 e oltre');
    expect(rows['adulti']).toContain('26,00 €');
    expect(rows['adulti']).toContain('21,00 €');
    expect(text(el.querySelector('[data-testid="package"]'))).toContain('Pacchetto 2 ACR');
    expect(text(el.querySelector('[data-testid="package"]'))).toContain('25,00 €');
  });

  it('mostra le regole del PDF non modificabili e l’ultima modifica', async () => {
    const el = await render('2026');
    const rules = text(el.querySelector('[data-testid="rules"]'));
    expect(rules).toContain('Regole del PDF (non modificabili)');
    expect(rules).toMatch(/Età minima.*6/);
    expect(rules).toMatch(/Massimo componenti del nucleo.*4/);
    const last = text(el.querySelector('[data-testid="last-update"]'));
    expect(last).toContain('Ultima modifica:');
    expect(last).toContain('gestore@example.org');
  });

  it('mostra l’etichetta dell’anno', async () => {
    expect(text(await render('2026'))).toContain('2026/27');
  });

  it('anno senza listino: messaggio e nessuna tabella', async () => {
    const el = await render('2030');
    expect(text(el)).toContain('Listino non trovato');
    expect(el.querySelector('[data-testid="band-row"]')).toBeNull();
  });

  it('errore di lettura: messaggio e nessun dato', async () => {
    const backend = new FakeBackend();
    backend.failWith = new Error('boom');
    const el = await render('2026', backend);
    expect(text(el)).toContain('Impossibile leggere i listini');
    expect(el.querySelector('[data-testid="band-row"]')).toBeNull();
  });
});
