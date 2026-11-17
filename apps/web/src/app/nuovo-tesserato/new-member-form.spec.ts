import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { NEW_MEMBER_BACKEND } from './new-member-backend';
import { NewMemberForm } from './new-member-form';
import { newMemberFixture } from './testing';

async function render(backend = newMemberFixture(), year = 2026) {
  TestBed.configureTestingModule({
    imports: [NewMemberForm],
    providers: [
      provideRouter([]),
      { provide: NEW_MEMBER_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'segreteria@example.org' }) } },
    ],
  });
  const fixture = TestBed.createComponent(NewMemberForm);
  fixture.componentRef.setInput('year', year);
  const saved: string[] = [];
  fixture.componentInstance.saved.subscribe((m: string) => saved.push(m));
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const type = (name: string, value: string) => {
    const input = el.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
  };
  return { el, backend, saved, settle, type };
}

const button = (root: Element, text: string) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);

describe('NewMemberForm', () => {
  it('compila, mostra età ed elenco, iscrive', async () => {
    const { el, saved, settle, type, backend } = await render();
    type('lastName', 'BIANCO');
    type('firstName', 'LUCA');
    type('birthDate', '2019-05-10');
    await settle();
    expect(el.textContent).toContain('7 anni · ACR');
    button(el, 'Iscrivi')!.click();
    await settle();
    expect(saved).toEqual(['Iscrizione salvata: BIANCO LUCA nel 2026/27.']);
    expect(backend.added).toHaveLength(1);
  });

  it('possibile doppione con i pulsanti di scelta; rimando a Riconferme con il collegamento', async () => {
    const backend = newMemberFixture();
    backend.schedules.set(2028, backend.schedules.get(2026)!);
    const { el, settle, type } = await render(backend, 2028);
    type('lastName', 'ROSSI');
    type('firstName', 'MARIO');
    type('birthDate', '1965-03-13');
    await settle();
    expect(el.textContent).toContain('ROSSI MARIO, 12/03/1965 (ultima adesione 2026/27)');
    expect(button(el, 'Iscrivi')!.disabled).toBe(true);
    button(el, 'Persona diversa')!.click();
    await settle();
    expect(button(el, 'Iscrivi')!.disabled).toBe(false);

    type('lastName', 'ROSSI');
    type('birthDate', '1965-03-12');
    await settle();
    expect(el.textContent).not.toContain('usa Conferma');
  });

  it('errori accanto ai campi', async () => {
    const { el, settle } = await render();
    button(el, 'Iscrivi')!.click();
    await settle();
    expect(el.textContent).toContain('Inserisci il cognome.');
    expect(el.textContent).toContain('Inserisci la data di nascita.');
  });
});
