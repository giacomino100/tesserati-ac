import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SCHEDULE_2026_27, type FeeSchedule } from '@tesseramento/fees';
import { AuthService } from '../../../core/auth.service';
import { FEE_SCHEDULE_BACKEND } from '../../fee-schedule-backend';
import { FakeBackend, stored } from '../../testing';
import { ListiniList } from './list';

async function render(backend: FakeBackend) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: FEE_SCHEDULE_BACKEND, useValue: backend }, { provide: AuthService, useValue: { user: signal(null) } }],
  });
  const fixture = TestBed.createComponent(ListiniList);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const schedule2027: FeeSchedule = { ...SCHEDULE_2026_27, associationYear: 2027, label: '2027/28' };

describe('ListiniList', () => {
  it('mostra gli anni dal più recente con l’email dell’ultima modifica', async () => {
    const el = await render(new FakeBackend([stored(), stored(schedule2027, { updatedBy: 'altro@example.org' })]));
    const rows = Array.from(el.querySelectorAll('[data-testid="row"]'));
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('2027/28'),
      expect.stringContaining('2026/27'),
    ]);
    expect(rows[0]?.textContent).toContain('altro@example.org');
    expect(rows[1]?.textContent).toContain('gestore@example.org');
  });

  it('ogni riga porta al dettaglio dell’anno', async () => {
    const el = await render(new FakeBackend());
    const link = el.querySelector('[data-testid="row"] a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/listini/2026');
  });

  it('il pulsante "Nuovo listino" porta a /listini/nuovo', async () => {
    const el = await render(new FakeBackend());
    const button = el.querySelector('[data-testid="new"]') as HTMLAnchorElement;
    expect(button.textContent).toContain('Nuovo listino');
    expect(button.getAttribute('href')).toBe('/listini/nuovo');
  });

  it('elenco vuoto: messaggio e nessun pulsante "Nuovo listino"', async () => {
    const el = await render(new FakeBackend([]));
    expect(el.textContent).toContain('Nessun listino. Contatta chi gestisce il progetto.');
    expect(el.querySelector('[data-testid="new"]')).toBeNull();
  });

  it('errore di lettura: mostra il messaggio', async () => {
    const backend = new FakeBackend();
    backend.failWith = new Error('boom');
    const el = await render(backend);
    expect(el.textContent).toContain('Impossibile leggere i listini');
    expect(el.querySelector('[data-testid="row"]')).toBeNull();
  });
});
