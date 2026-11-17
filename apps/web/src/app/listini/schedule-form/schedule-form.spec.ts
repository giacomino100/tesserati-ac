import { TestBed } from '@angular/core/testing';
import { SCHEDULE_2026_27, type ScheduleDraft } from '@tesseramento/fees';
import { ScheduleForm } from './schedule-form';

function setup() {
  const fixture = TestBed.createComponent(ScheduleForm);
  fixture.componentRef.setInput('base', SCHEDULE_2026_27);
  fixture.detectChanges();
  const saved: ScheduleDraft[] = [];
  const cancelled: number[] = [];
  fixture.componentInstance.save.subscribe((d) => saved.push(d));
  fixture.componentInstance.cancelled.subscribe(() => cancelled.push(1));
  const el = fixture.nativeElement as HTMLElement;

  const input = (field: string) => el.querySelector(`input[data-field="${field}"]`) as HTMLInputElement;
  const type = (field: string, value: string) => {
    const i = input(field);
    i.value = value;
    i.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const error = (field: string) =>
    (el.querySelector(`[data-error-for="${field}"]`)?.textContent ?? '').trim();
  const button = (label: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(label)) as HTMLButtonElement;
  const submit = () => {
    button('Salva').click();
    fixture.detectChanges();
  };
  return { fixture, el, input, type, error, button, submit, saved, cancelled };
}

const FIELDS = [
  'acr.full',
  'acr.discounted',
  'giovanissimi.full',
  'giovanissimi.discounted',
  'giovani.full',
  'giovani.discounted',
  'adulti.full',
  'adulti.discounted',
  'acrPackage',
];

describe('ScheduleForm', () => {
  it('ha un campo per ogni quota, precompilato in euro, e nessun campo per età o nucleo', () => {
    const { el, input } = setup();
    expect(el.querySelectorAll('input').length).toBe(FIELDS.length);
    expect(input('acr.full').value).toBe('15,00');
    expect(input('adulti.discounted').value).toBe('21,00');
    expect(input('acrPackage').value).toBe('25,00');
    expect(el.textContent).toContain('€');
    expect(input('acr.full').getAttribute('inputmode')).toBe('decimal');
  });

  it('mostra le regole del PDF in sola lettura', () => {
    const { el } = setup();
    const text = (el.querySelector('[data-testid="rules"]')?.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('Regole del PDF (non modificabili)');
    expect(text).toMatch(/Età minima.*6/);
    expect(text).toMatch(/Massimo componenti del nucleo.*4/);
  });

  it('salva le quote scritte, con virgola o punto', () => {
    const { type, submit, saved } = setup();
    type('adulti.full', '27,00');
    type('adulti.discounted', '22.50');
    submit();
    expect(saved).toHaveLength(1);
    expect(saved[0]?.bands.adulti).toEqual({ full: '27,00', discounted: '22.50' });
    expect(saved[0]?.acrPackage).toBe('25,00');
  });

  it.each([
    ['', 'Inserisci un importo.'],
    ['abc', 'Inserisci un importo valido, per esempio 26,00.'],
    ['26,555', 'Usa al massimo due decimali.'],
    ['0', "L'importo deve essere maggiore di zero."],
    ['-3', "L'importo deve essere maggiore di zero."],
  ])('valore "%s": errore accanto al campo e nessun salvataggio', (value, message) => {
    const { type, error, submit, saved } = setup();
    type('adulti.full', value);
    submit();
    expect(error('adulti.full')).toBe(message);
    expect(saved).toHaveLength(0);
  });

  it('quota con sconto maggiore della piena: errore sul campo scontato', () => {
    const { type, error, submit, saved } = setup();
    type('giovani.discounted', '23');
    submit();
    expect(error('giovani.discounted')).toBe('La quota con sconto non può superare la quota piena.');
    expect(saved).toHaveLength(0);
  });

  it('pacchetto non positivo: errore sul campo del pacchetto', () => {
    const { type, error, submit } = setup();
    type('acrPackage', '0');
    submit();
    expect(error('acrPackage')).toBe("L'importo deve essere maggiore di zero.");
  });

  it('mostra tutti gli errori insieme', () => {
    const { type, error, submit } = setup();
    type('acr.full', '');
    type('giovanissimi.full', 'x');
    type('acrPackage', '-1');
    submit();
    expect(error('acr.full')).not.toBe('');
    expect(error('giovanissimi.full')).not.toBe('');
    expect(error('acrPackage')).not.toBe('');
    expect(error('adulti.full')).toBe('');
  });

  it('dopo la correzione l’errore sparisce e il salvataggio riesce', () => {
    const { type, error, submit, saved } = setup();
    type('adulti.full', 'abc');
    submit();
    expect(error('adulti.full')).not.toBe('');
    type('adulti.full', '26,00');
    submit();
    expect(error('adulti.full')).toBe('');
    expect(saved).toHaveLength(1);
  });

  it('"Annulla" emette l’annullamento', () => {
    const { button, cancelled } = setup();
    button('Annulla').click();
    expect(cancelled).toHaveLength(1);
  });

  it('hasUnsavedChanges è vero solo dopo una modifica', () => {
    const { fixture, type } = setup();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    type('acr.full', '16,00');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    type('acr.full', '15,00');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('mostra il messaggio di errore del salvataggio ricevuto dal genitore', () => {
    const { fixture, el } = setup();
    fixture.componentRef.setInput('errorMessage', 'Impossibile salvare. Controlla la connessione e riprova.');
    fixture.detectChanges();
    expect(el.textContent).toContain('Impossibile salvare. Controlla la connessione e riprova.');
  });
});
