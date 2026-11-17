import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { FAMILIES_BACKEND } from '../../../famiglie/families-backend';
import { FEE_SCHEDULE_BACKEND } from '../../../listini/fee-schedule-backend';
import { HOUSEHOLD_FEES_BACKEND } from '../../fees-backend';
import { quoteFixture } from '../../testing';
import { FeesPage } from './fees-page';

async function render(fixture = quoteFixture(), params: Record<string, string> = { anno: '2026' }) {
  TestBed.configureTestingModule({
    imports: [FeesPage],
    providers: [
      provideRouter([]),
      { provide: FAMILIES_BACKEND, useValue: fixture.families },
      { provide: FEE_SCHEDULE_BACKEND, useValue: fixture.schedules },
      { provide: HOUSEHOLD_FEES_BACKEND, useValue: fixture.fees },
      { provide: AuthService, useValue: { user: signal({ email: 'segreteria@example.org' }) } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } },
    ],
  });
  const component = TestBed.createComponent(FeesPage);
  component.detectChanges();
  await component.whenStable();
  component.detectChanges();
  const settle = async () => {
    await component.whenStable();
    component.detectChanges();
  };
  return { component, el: component.nativeElement as HTMLElement, fixture, settle };
}

function button(root: Element, text: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);
}

function household(el: HTMLElement, text: string): HTMLElement {
  const found = Array.from(el.querySelectorAll<HTMLElement>('[data-testid="household"]')).find((h) => h.textContent?.includes(text));
  if (!found) throw new Error(`nucleo "${text}" non trovato`);
  return found;
}

describe('FeesPage', () => {
  it('totali, avviso famiglie non confermate, righe del calcolo (US1)', async () => {
    const { el } = await render();
    expect(el.querySelector('[data-testid="totals"]')?.textContent).toContain('Totale 2026/27: 202,00 € · 9 nuclei calcolati · 0 quote manuali · 1 nuclei da decidere');
    expect(el.textContent).toContain('2 famiglie suggerite non confermate');
    expect(el.querySelector('a[href="/famiglie?anno=2026"]')).not.toBeNull();
    const moretti = household(el, 'MORETTI CARLA');
    expect(moretti.textContent).toContain('MORETTI CARLA · 71 anni · Adulti · 26,00 € · — · 26,00 €');
    expect(moretti.textContent).toContain('Da salvare');
  });

  it('nessun tesserato: messaggio con il collegamento a Importa Excel', async () => {
    const f = quoteFixture();
    f.families.members.clear();
    const { el } = await render(f);
    expect(el.textContent).toContain('Nessun tesserato importato per questo anno.');
    expect(el.querySelector('a[href="/importa"]')).not.toBeNull();
  });

  it('quota manuale con nota e conferma dello zero (US2)', async () => {
    const { el, settle, component } = await render();
    const gatti = household(el, 'GATTI MIA');
    expect(gatti.textContent).toContain("Non previsto dal listino: c'è un componente sotto i 6 anni.");
    button(gatti, 'Inserisci la quota')!.click();
    await settle();
    expect(component.componentInstance.hasUnsavedChanges()).toBe(true);
    const form = el.querySelector('[data-testid="manual"]')!;
    const [euros] = Array.from(form.querySelectorAll('input'));
    const note = form.querySelector('textarea')!;
    euros!.value = '0';
    euros!.dispatchEvent(new Event('input'));
    note.value = 'Esente per decisione del consiglio';
    note.dispatchEvent(new Event('input'));
    button(form, 'Salva quota manuale')!.click();
    await settle();
    const dialog = el.querySelector('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('Il nucleo non paga nulla: confermi?');
    button(dialog, 'Conferma')!.click();
    await settle();
    expect(household(el, 'GATTI MIA').textContent).toContain('Quota manuale: 0,00 € — Esente per decisione del consiglio');
  });

  it('salva le quote dell’anno (US3)', async () => {
    const { el, settle, fixture } = await render();
    button(el, "Salva le quote dell'anno")!.click();
    await settle();
    expect(fixture.fees.items).toHaveLength(9);
    expect(el.textContent).toContain('Ultimo salvataggio il 17/11/2026 da segreteria@example.org');
    expect(household(el, 'MORETTI CARLA').textContent).toContain('Salvata');
  });
});
