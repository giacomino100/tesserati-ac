import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService, type AuthState } from './core/auth.service';

function setup(initial: AuthState) {
  const fake = { state: signal<AuthState>(initial), revalidate: vi.fn(async () => undefined) };
  TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter([]), { provide: AuthService, useValue: fake }],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  return { fake, el: fixture.nativeElement as HTMLElement };
}

describe('App', () => {
  it('durante il caricamento mostra solo l’indicatore, senza pagine', () => {
    const { el } = setup('loading');
    expect(el.querySelector('mat-spinner')).toBeTruthy();
    expect(el.querySelector('router-outlet')).toBeNull();
  });

  it('a stato noto mostra la pagina (router-outlet) e non l’indicatore', () => {
    const { el } = setup('signedOut');
    expect(el.querySelector('mat-spinner')).toBeNull();
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('al ritorno della scheda in primo piano riverifica l’autorizzazione', () => {
    const { fake } = setup('allowed');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(fake.revalidate).toHaveBeenCalled();
  });
});
