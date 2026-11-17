import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { FAMILIES_BACKEND } from '../../families-backend';
import { FakeFamiliesBackend, sampleBackend } from '../../testing';
import { FamiliesPage } from './families-page';

async function render(backend: FakeFamiliesBackend = sampleBackend(), anno = '2026') {
  TestBed.configureTestingModule({
    imports: [FamiliesPage],
    providers: [
      provideRouter([]),
      { provide: FAMILIES_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'segreteria@example.org' }) } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ anno }) } } },
    ],
  });
  const fixture = TestBed.createComponent(FamiliesPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, el: fixture.nativeElement as HTMLElement, backend, settle };
}

function button(root: Element, text: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);
}

function card(el: HTMLElement, text: string): HTMLElement {
  const found = Array.from(el.querySelectorAll<HTMLElement>('[data-testid="family"]')).find((c) => c.textContent?.includes(text));
  if (!found) throw new Error(`famiglia "${text}" non trovata`);
  return found;
}

describe('FamiliesPage', () => {
  it('famiglie suggerite, avvisi e senza famiglia (US1)', async () => {
    const { el } = await render();
    expect(el.textContent).toContain('3 famiglie suggerite · 0 confermate · 3 tesserati senza famiglia');
    const verdi = card(el, 'N. Legame 900002 · C3');
    expect(verdi.textContent).toContain('VERDI PAOLO, 20/01/1980 · Adulti');
    expect(verdi.textContent).toContain('VERDI SOFIA, 09/04/2016 · ACR');
    expect(card(el, 'N. Legame 900005').textContent).toContain('Il Legame N2 indica 2 componenti, ne sono stati trovati 1.');
    expect(el.querySelector('[data-testid="without-family"]')?.textContent).toContain('MORETTI CARLA');
  });

  it('anno senza tesserati: messaggio con il collegamento a Importa Excel', async () => {
    const backend = new FakeFamiliesBackend();
    const { el } = await render(backend);
    expect(el.textContent).toContain('Nessun tesserato importato per questo anno.');
    expect(el.querySelector('a[href="/importa"]')).not.toBeNull();
  });

  it('conferma e "Conferma tutte" (US2)', async () => {
    const { el, backend, settle } = await render();
    button(card(el, 'N. Legame 900001'), 'Conferma')!.click();
    await settle();
    expect(card(el, 'ROSSI MARIO').textContent).toContain('Confermata il 17/11/2026 da segreteria@example.org');
    button(el, 'Conferma tutte')!.click();
    await settle();
    expect(backend.families).toHaveLength(2);
    expect(el.textContent).toContain('Confermate 1 famiglie; 1 famiglia con un solo componente non confermata.');
  });

  it('correggi, crea a mano, sciogli (US3)', async () => {
    const { el, backend, settle, fixture } = await render();
    button(card(el, 'N. Legame 900002'), 'Correggi')!.click();
    await settle();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    const editor = el.querySelector('[data-testid="editor"]')!;
    const sofia = Array.from(editor.querySelectorAll('li')).find((li) => li.textContent?.includes('VERDI SOFIA'))!;
    button(sofia, 'Togli')!.click();
    await settle();
    button(editor, 'Conferma')!.click();
    await settle();
    expect(backend.families[0]?.memberIds).toEqual(['verdi-p', 'neri']);

    const without = el.querySelector('[data-testid="without-family"]')!;
    for (const name of ['MORETTI CARLA', 'BARBIERI SALVATORE']) {
      const box = Array.from(without.querySelectorAll('label')).find((l) => l.textContent?.includes(name))!.querySelector('input')!;
      box.click();
    }
    await settle();
    button(without, 'Crea famiglia')!.click();
    await settle();
    expect(backend.families.find((f) => f.origin === 'manuale')?.memberIds).toEqual(['barbieri', 'moretti']);
    expect(card(el, 'MORETTI CARLA').textContent).toContain('Creata a mano');

    button(card(el, 'MORETTI CARLA'), 'Sciogli famiglia')!.click();
    await settle();
    const dialog = el.querySelector('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('Tutti i componenti resteranno senza famiglia.');
    button(dialog, 'Sciogli')!.click();
    await settle();
    expect(backend.families.some((f) => f.origin === 'manuale')).toBe(false);
  });
});
