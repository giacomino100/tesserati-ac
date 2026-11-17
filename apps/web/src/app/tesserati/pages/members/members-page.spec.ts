import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { NEW_MEMBER_BACKEND } from '../../../nuovo-tesserato/new-member-backend';
import { newMemberFixture } from '../../../nuovo-tesserato/testing';
import { yearFixture } from '../../testing';
import { TODAY, YEAR_BACKEND } from '../../year-backend';
import { MembersPage } from './members-page';

async function render(backend = yearFixture(), params: Record<string, string> = {}) {
  TestBed.configureTestingModule({
    imports: [MembersPage],
    providers: [
      provideRouter([]),
      { provide: YEAR_BACKEND, useValue: backend },
      { provide: NEW_MEMBER_BACKEND, useValue: newMemberFixture() },
      { provide: TODAY, useValue: () => new Date(2026, 10, 17, 12) },
      { provide: AuthService, useValue: { user: signal({ email: 'segreteria@example.org' }) } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } },
    ],
  });
  const fixture = TestBed.createComponent(MembersPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { el: fixture.nativeElement as HTMLElement, backend, settle };
}

const button = (root: Element, text: string) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);
const rowOf = (el: HTMLElement, name: string) =>
  Array.from(el.querySelectorAll<HTMLElement>('[data-testid="member"]')).find((li) => li.textContent?.includes(name))!;

describe('MembersPage (013)', () => {
  it('nessun tesserato: messaggio', async () => {
    const backend = yearFixture();
    backend.members.clear();
    const { el } = await render(backend);
    expect(el.textContent).toContain('Nessun tesserato.');
  });

  it('elenco unico con conteggi, data di pagamento, filtro e ricerca', async () => {
    const { el, settle } = await render();
    expect(el.querySelector('[data-testid="counts"]')?.textContent).toContain('7 da confermare · 0 iscritti');
    expect((el.querySelector('input[name="paidOn"]') as HTMLInputElement).value).toBe('2026-11-17');
    expect(rowOf(el, 'RINALDI PIETRO').textContent).toContain('Passa da ACR a Giovani');
    const search = el.querySelector('input[name="search"]') as HTMLInputElement;
    search.value = 'gallo';
    search.dispatchEvent(new Event('input'));
    await settle();
    expect(el.querySelectorAll('[data-testid="member"]')).toHaveLength(3);
  });

  it('Conferma: stato pagato; il pannello della famiglia si apre per chi ha un N. Legame', async () => {
    const { el, settle, backend } = await render();
    button(rowOf(el, 'MORETTI CARLA'), 'Conferma')!.click();
    await settle();
    expect(el.textContent).toContain('Conferma salvata: MORETTI CARLA, pagato il 17/11/2026.');
    expect(rowOf(el, 'MORETTI CARLA').textContent).toContain('Pagato il 17/11/2026');
    expect(el.querySelector('[data-testid="family-panel"]')).toBeNull();

    button(rowOf(el, 'GALLO LUCA'), 'Conferma')!.click();
    await settle();
    const panel = el.querySelector('[data-testid="family-panel"]')!;
    expect(panel.textContent).toContain('Famiglia · N. Legame 900003');
    button(panel, 'Conferma')!.click();
    await settle();
    expect(backend.families).toHaveLength(1);
    expect(el.textContent).toContain('Famiglia aggiornata: 2 componenti.');
    expect(button(el.querySelector('[data-testid="family-panel"]')!, 'Togli')).toBeDefined();
  });

  it('"Nuovo tesserato" apre il modulo con la data di pagamento', async () => {
    const { el, settle } = await render();
    button(el, 'Nuovo tesserato')!.click();
    await settle();
    expect(el.querySelector('[data-testid="new-member"]')?.textContent).toContain('Nuovo tesserato nel 2027/28');
  });
});
