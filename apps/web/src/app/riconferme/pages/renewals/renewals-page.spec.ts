import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { RENEWALS_BACKEND } from '../../renewals-backend';
import { renewalsFixture } from '../../testing';
import { RenewalsPage } from './renewals-page';

async function render(backend = renewalsFixture(), params: Record<string, string> = {}) {
  TestBed.configureTestingModule({
    imports: [RenewalsPage],
    providers: [
      provideRouter([]),
      { provide: RENEWALS_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'segreteria@example.org' }) } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } },
    ],
  });
  const component = TestBed.createComponent(RenewalsPage);
  component.detectChanges();
  await component.whenStable();
  component.detectChanges();
  const settle = async () => {
    await component.whenStable();
    component.detectChanges();
  };
  return { el: component.nativeElement as HTMLElement, backend, settle };
}

function button(root: Element, text: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim().startsWith(text));
}

describe('RenewalsPage', () => {
  it('riepilogo, gruppo, righe e avvisi (US1)', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-testid="summary"]')?.textContent).toContain('Da decidere: 7 · Già iscritti nel 2027/28: 0');
    const group = el.querySelector('[data-testid="group"]')!;
    expect(group.textContent).toContain('N. Legame 900003 · C4');
    expect(group.textContent).toContain('GALLO TOMMASO · 13 anni · ACR');
    expect(el.textContent).toContain('Passa da ACR a Giovani');
    expect(el.textContent).toContain("Sotto l'età minima del listino (6 anni): quota non prevista");
    expect(button(el, 'Riconferma')!.disabled).toBe(true);
  });

  it('listino mancante con il collegamento a Listini', async () => {
    const backend = renewalsFixture();
    backend.schedules.clear();
    const { el } = await render(backend, { anno: '2027' });
    expect(el.textContent).toContain('Manca il listino 2027/28. Crealo nella sezione Listini.');
    expect(el.querySelector('a[href="/listini"]')).not.toBeNull();
  });

  it('tutto il nucleo + Riconferma, poi Annulla riconferma (US2, US3)', async () => {
    const { el, settle, backend } = await render();
    const group = el.querySelector('[data-testid="group"]')!;
    group.querySelector<HTMLInputElement>('input[data-testid="group-check"]')!.click();
    await settle();
    const renew = button(el, 'Riconferma')!;
    expect(renew.textContent).toContain('Riconferma (4)');
    renew.click();
    await settle();
    expect(el.textContent).toContain('4 persone riconfermate per il 2027/28.');
    expect(backend.members.get(2027)).toHaveLength(4);

    const renewed = el.querySelector('[data-testid="renewed"]')!;
    expect(renewed.textContent).toContain('GALLO TOMMASO · ACR · riconferma del 17/11/2026');
    button(renewed, 'Annulla riconferma')!.click();
    await settle();
    const dialog = el.querySelector('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('Annullare la riconferma di CONTI MARTA?');
    button(dialog, 'Annulla riconferma')!.click();
    await settle();
    expect(el.textContent).toContain('Riconferma annullata.');
    expect(backend.members.get(2027)).toHaveLength(3);
  });
});

describe('RenewalsPage – nuovi tesserati (009)', () => {
  it('sezione "Nuovi tesserati" con il pulsante che apre il modulo', async () => {
    const { NEW_MEMBER_BACKEND } = await import('../../../nuovo-tesserato/new-member-backend');
    const { newMemberFixture } = await import('../../../nuovo-tesserato/testing');
    TestBed.configureTestingModule({ providers: [{ provide: NEW_MEMBER_BACKEND, useValue: newMemberFixture() }] });
    const backend = renewalsFixture();
    backend.members.set(2027, [
      { personId: 'bianco', lastName: 'BIANCO', firstName: 'LUCA', birthDate: '2019-05-10', list: 'ACR', origin: 'nuovo' },
    ]);
    const { el, settle } = await render(backend, { anno: '2027' });
    const section = el.querySelector('[data-testid="new-members"]')!;
    expect(section.textContent).toContain('Nuovi tesserati del 2027/28');
    expect(section.textContent).toContain('BIANCO LUCA · ACR');
    button(section, 'Nuovo tesserato')!.click();
    await settle();
    expect(el.querySelector('[data-testid="new-member"]')?.textContent).toContain('Nuovo tesserato nel 2027/28');
  });
});
