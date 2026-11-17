import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { FEE_SCHEDULE_BACKEND } from '../../fee-schedule-backend';
import { SCHEDULE_USAGE } from '../../schedule-usage';
import { unsavedChangesGuard } from '../../unsaved-changes.guard';
import { FakeBackend } from '../../testing';
import { ListinoDetail } from './detail';

async function render(options: { inUse?: boolean; backend?: FakeBackend } = {}) {
  const backend = options.backend ?? new FakeBackend();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: FEE_SCHEDULE_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'utente@example.org' }) } },
      { provide: SCHEDULE_USAGE, useValue: { isInUse: async () => options.inUse ?? false } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ anno: '2026' }) } } },
    ],
  });
  const fixture = TestBed.createComponent(ListinoDetail);
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const click = async (label: string) => {
    const b = Array.from(el.querySelectorAll('button')).find((x) => x.textContent?.includes(label));
    if (!b) throw new Error(`pulsante "${label}" non trovato`);
    b.click();
    await settle();
  };
  const type = (field: string, value: string) => {
    const i = el.querySelector(`input[data-field="${field}"]`) as HTMLInputElement;
    i.value = value;
    i.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const text = () => (el.textContent ?? '').replace(/\s+/g, ' ');
  return { fixture, el, backend, settle, click, type, text };
}

describe('ListinoDetail – modifica', () => {
  it('"Modifica" apre il modulo con i valori del listino', async () => {
    const { click, el } = await render();
    await click('Modifica');
    expect((el.querySelector('input[data-field="adulti.full"]') as HTMLInputElement).value).toBe('26,00');
  });

  it('salva e torna al dettaglio con i valori nuovi e l’ultima modifica aggiornata', async () => {
    const { click, type, el, text, backend } = await render();
    await click('Modifica');
    type('adulti.full', '27,00');
    await click('Salva');
    expect(el.querySelector('input')).toBeNull();
    const adulti = el.querySelector('[data-band="adulti"]');
    expect(adulti?.textContent).toContain('27,00 €');
    expect(text()).toContain('utente@example.org');
    expect(backend.calls).toContain('update:2026');
  });

  it('"Annulla" nel modulo torna al dettaglio senza salvare', async () => {
    const { click, type, el, backend } = await render();
    await click('Modifica');
    type('adulti.full', '27,00');
    await click('Annulla');
    expect(el.querySelector('input')).toBeNull();
    expect(backend.calls.some((c) => c.startsWith('update'))).toBe(false);
  });

  it('con errori di campo non salva', async () => {
    const { click, type, backend, text } = await render();
    await click('Modifica');
    type('adulti.full', '26,555');
    await click('Salva');
    expect(text()).toContain('Usa al massimo due decimali.');
    expect(backend.calls.some((c) => c.startsWith('update'))).toBe(false);
  });

  it('collisione: avviso con "Sovrascrivi" e "Annulla e ricarica"; senza scelta nulla viene sovrascritto', async () => {
    const { click, type, backend, text } = await render();
    await click('Modifica');
    type('adulti.full', '27,00');
    backend.touchByOther(2026);
    await click('Salva');
    expect(text()).toContain('Il listino è stato modificato da qualcun altro.');
    expect(text()).toContain('Sovrascrivi');
    expect(text()).toContain('Annulla e ricarica');
    expect(backend.items[0]?.schedule.bands.find((b) => b.band === 'adulti')?.fullCents).toBe(2600);
  });

  it('collisione → "Sovrascrivi" salva le quote scritte', async () => {
    const { click, type, backend, el } = await render();
    await click('Modifica');
    type('adulti.full', '27,00');
    backend.touchByOther(2026);
    await click('Salva');
    await click('Sovrascrivi');
    expect(backend.items[0]?.schedule.bands.find((b) => b.band === 'adulti')?.fullCents).toBe(2700);
    expect(el.querySelector('[data-band="adulti"]')?.textContent).toContain('27,00 €');
  });

  it('collisione → "Annulla e ricarica" mostra il listino aggiornato da altri, senza scrivere', async () => {
    const { click, type, backend, text } = await render();
    await click('Modifica');
    type('adulti.full', '27,00');
    backend.touchByOther(2026);
    await click('Salva');
    await click('Annulla e ricarica');
    expect(text()).toContain('altro@example.org');
    expect(backend.items[0]?.schedule.bands.find((b) => b.band === 'adulti')?.fullCents).toBe(2600);
    expect(backend.calls.some((c) => c.includes('overwrite'))).toBe(false);
  });

  it('anno con adesioni: avviso con "Conferma" / "Annulla"; si salva solo dopo la conferma', async () => {
    const { click, type, backend, text } = await render({ inUse: true });
    await click('Modifica');
    type('adulti.full', '27,00');
    await click('Salva');
    expect(text()).toContain('Le quote già calcolate per questo anno non cambiano finché non vengono ricalcolate.');
    expect(backend.calls.some((c) => c.startsWith('update'))).toBe(false);
    await click('Conferma');
    expect(backend.items[0]?.schedule.bands.find((b) => b.band === 'adulti')?.fullCents).toBe(2700);
  });

  it('anno con adesioni → "Annulla" nell’avviso non salva e lascia il modulo aperto', async () => {
    const { click, type, backend, text, el, settle } = await render({ inUse: true });
    await click('Modifica');
    type('adulti.full', '27,00');
    await click('Salva');
    const inDialog = Array.from(el.querySelectorAll('[role="alertdialog"] button')).find((b) => b.textContent?.trim() === 'Annulla') as HTMLButtonElement;
    inDialog.click();
    await settle();
    expect(text()).not.toContain('Le quote già calcolate');
    expect(el.querySelector('input[data-field="adulti.full"]')).not.toBeNull();
    expect(backend.calls.some((c) => c.startsWith('update'))).toBe(false);
  });

  it('errore di salvataggio: messaggio comprensibile e modulo ancora aperto', async () => {
    const { click, type, backend, text, el } = await render();
    await click('Modifica');
    type('adulti.full', '27,00');
    backend.failWith = new Error('offline');
    await click('Salva');
    expect(text()).toContain('Impossibile salvare. Controlla la connessione e riprova.');
    expect(el.querySelector('input[data-field="adulti.full"]')).not.toBeNull();
  });
});

describe('ListinoDetail – uscita con modifiche non salvate', () => {
  it('hasUnsavedChanges è falso in lettura e subito dopo "Modifica", vero dopo una modifica', async () => {
    const { fixture, click, type } = await render();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    await click('Modifica');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    type('adulti.full', '27,00');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });

  it('il guard chiede conferma con il messaggio previsto e rispetta la risposta', async () => {
    const { fixture, click, type } = await render();
    const confirm = vi.spyOn(window, 'confirm');
    const run = () =>
      TestBed.runInInjectionContext(() =>
        unsavedChangesGuard(fixture.componentInstance, null as never, null as never, null as never),
      );
    expect(run()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    await click('Modifica');
    type('adulti.full', '27,00');
    confirm.mockReturnValueOnce(false);
    expect(run()).toBe(false);
    expect(confirm).toHaveBeenCalledWith('Hai modifiche non salvate. Vuoi uscire senza salvare?');
    confirm.mockReturnValueOnce(true);
    expect(run()).toBe(true);
    confirm.mockRestore();
  });

  it('beforeunload è bloccato solo con modifiche in sospeso', async () => {
    const { click, type } = await render();
    const fire = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(fire()).toBe(false);
    await click('Modifica');
    type('adulti.full', '27,00');
    expect(fire()).toBe(true);
  });
});
