import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth.service';
import { Login } from './login';

function setup(errorMessage: string | null = null) {
  const fake = { errorMessage: signal(errorMessage), signIn: vi.fn(async () => undefined) };
  TestBed.configureTestingModule({
    imports: [Login],
    providers: [{ provide: AuthService, useValue: fake }],
  });
  const fixture = TestBed.createComponent(Login);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fake, el, fixture };
}

const buttons = (el: HTMLElement) => Array.from(el.querySelectorAll('button'));

describe('Login', () => {
  it('mostra il pulsante "Accedi con Google" e al clic chiama signIn()', () => {
    const { fake, el } = setup();
    const button = buttons(el).find((b) => b.textContent?.includes('Accedi con Google'));
    expect(button).toBeTruthy();
    button?.click();
    expect(fake.signIn).toHaveBeenCalledTimes(1);
  });

  it('mostra il messaggio d’errore del servizio', () => {
    const { el } = setup('Accesso annullato. Riprova.');
    expect(el.textContent).toContain('Accesso annullato. Riprova.');
  });

  it('con errore di connessione mostra anche "Riprova", che richiama signIn()', () => {
    const { fake, el } = setup('Impossibile connettersi. Controlla la connessione e riprova.');
    const retry = buttons(el).find((b) => b.textContent?.includes('Riprova'));
    expect(retry).toBeTruthy();
    retry?.click();
    expect(fake.signIn).toHaveBeenCalledTimes(1);
  });

  it('senza errori non mostra "Riprova"', () => {
    const { el } = setup();
    expect(buttons(el).some((b) => b.textContent?.includes('Riprova'))).toBe(false);
  });
});
