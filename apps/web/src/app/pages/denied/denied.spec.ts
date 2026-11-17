import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth.service';
import { Denied } from './denied';

describe('Denied', () => {
  it('mostra titolo e spiegazione, e "Esci / prova con un altro account" chiama signOut()', () => {
    const fake = { signOut: vi.fn(async () => undefined) };
    TestBed.configureTestingModule({
      imports: [Denied],
      providers: [{ provide: AuthService, useValue: fake }],
    });
    const fixture = TestBed.createComponent(Denied);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Accesso non autorizzato');
    expect(el.textContent).toContain(
      'Questo account non è abilitato. Chiedi di essere aggiunto all’elenco.',
    );
    const button = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Esci / prova con un altro account'),
    );
    expect(button).toBeTruthy();
    button?.click();
    expect(fake.signOut).toHaveBeenCalledTimes(1);
  });
});
