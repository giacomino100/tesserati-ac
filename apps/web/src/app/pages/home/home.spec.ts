import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth.service';
import { Home } from './home';

describe('Home', () => {
  function setup() {
    const fake = {
      user: signal({ displayName: 'Utente Prova', email: 'x@example.org', emailVerified: true, lastSignInTime: undefined }),
      signOut: vi.fn(async () => undefined),
    };
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [{ provide: AuthService, useValue: fake }],
    });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return { fake, el: fixture.nativeElement as HTMLElement };
  }

  it('mostra il nome dell’utente', () => {
    expect(setup().el.textContent).toContain('Utente Prova');
  });

  it('il pulsante "Esci" chiama signOut()', () => {
    const { fake, el } = setup();
    const button = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Esci'));
    expect(button).toBeTruthy();
    button?.click();
    expect(fake.signOut).toHaveBeenCalledTimes(1);
  });
});
