import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SCHEDULE_2026_27 } from '@tesseramento/fees';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth.service';
import { FEE_SCHEDULE_BACKEND } from '../../fee-schedule-backend';
import { MESSAGES } from '../../fee-schedule.service';
import { FakeBackend } from '../../testing';
import { ListinoNew } from './new';

async function render(backend = new FakeBackend()) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: FEE_SCHEDULE_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'utente@example.org' }) } },
    ],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ListinoNew);
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const input = (field: string) => el.querySelector(`input[data-field="${field}"]`) as HTMLInputElement;
  const type = (field: string, value: string) => {
    const i = input(field);
    i.value = value;
    i.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const save = async () => {
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Salva')) as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, el, input, type, save, backend, navigate };
}

describe('ListinoNew', () => {
  it('propone l’anno 2027, non modificabile, con le quote copiate dal 2026/27', async () => {
    const { el, input } = await render();
    expect(el.textContent).toContain('2027/28');
    expect(el.querySelector('input[data-field="year"]')).toBeNull();
    expect(input('adulti.full').value).toBe('26,00');
    expect(input('acrPackage').value).toBe('25,00');
  });

  it('salva e va al dettaglio del nuovo anno; il 2026/27 resta uguale', async () => {
    const { type, save, backend, navigate } = await render();
    type('adulti.full', '27,00');
    await save();
    const saved = backend.items.find((i) => i.schedule.associationYear === 2027);
    expect(saved?.schedule.bands.find((b) => b.band === 'adulti')?.fullCents).toBe(2700);
    expect(backend.items.find((i) => i.schedule.associationYear === 2026)?.schedule).toEqual(SCHEDULE_2026_27);
    expect(navigate).toHaveBeenCalledWith(['/listini', 2027]);
  });

  it('con errori di campo non salva né cambia pagina', async () => {
    const { type, save, backend, navigate, el } = await render();
    type('adulti.full', '26,555');
    await save();
    expect(backend.calls.some((c) => c.startsWith('create'))).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Usa al massimo due decimali.');
  });

  it('se le regole rifiutano, mostra il messaggio sull’anno non consentito', async () => {
    const { save, backend, el, navigate } = await render();
    backend.failWith = Object.assign(new Error('denied'), { code: 'permission-denied' });
    await save();
    expect(el.textContent).toContain(MESSAGES.yearNotAllowed);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('senza listini da copiare mostra un avviso e nessun modulo', async () => {
    const { el } = await render(new FakeBackend([]));
    expect(el.textContent).toContain('Nessun listino da copiare');
    expect(el.querySelector('input')).toBeNull();
  });
});
