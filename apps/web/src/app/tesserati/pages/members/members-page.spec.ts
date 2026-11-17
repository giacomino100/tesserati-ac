import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MEMBERS_BACKEND, type MemberRow, type MembersBackend } from '../../members-backend';
import { MembersPage } from './members-page';

class FakeMembers implements MembersBackend {
  constructor(public byYear: Record<number, MemberRow[]> = {}) {}
  async importedYears(): Promise<number[]> {
    return Object.keys(this.byYear).map(Number);
  }
  async membersOfYear(year: number): Promise<MemberRow[]> {
    return this.byYear[year] ?? [];
  }
}

const member = (lastName: string, firstName: string, over: Partial<MemberRow> = {}): MemberRow => ({
  lastName,
  firstName,
  birthDate: '2016-04-09',
  sector: 'RAGAZZI',
  exportAgeBand: '9/11',
  bond: 'C3',
  bondId: '900002',
  ...over,
});

async function render(backend: MembersBackend, anno?: string) {
  TestBed.configureTestingModule({
    imports: [MembersPage],
    providers: [
      provideRouter([]),
      { provide: MEMBERS_BACKEND, useValue: backend },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(anno ? { anno } : {}) } } },
    ],
  });
  const fixture = TestBed.createComponent(MembersPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

function rows(el: HTMLElement): string[][] {
  return Array.from(el.querySelectorAll('tbody tr')).map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? ''),
  );
}

describe('MembersPage (FR-019)', () => {
  it('nessun import: messaggio e collegamento a Importa Excel', async () => {
    const { el } = await render(new FakeMembers());
    expect(el.textContent).toContain('Nessun tesserato importato. Usa Importa Excel.');
    expect(el.querySelector('a[href="/importa"]')).not.toBeNull();
    expect(el.querySelector('table')).toBeNull();
  });

  it('mostra l’anno più recente, ordinato per cognome e nome', async () => {
    const backend = new FakeMembers({
      2026: [member('ROSSI', 'MARIO'), member('BIANCHI', 'LIA', { bond: undefined, bondId: undefined }), member('ROSSI', 'ANNA')],
      2025: [member('VECCHIO', 'ANNO')],
    });
    const { el } = await render(backend);
    expect(el.textContent).toContain('3 tesserati nel 2026/27');
    const headers = Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Cognome e nome', 'Data di nascita', 'Settore', "Fascia d'età (export)", 'Legame']);
    expect(rows(el)).toEqual([
      ['BIANCHI LIA', '09/04/2016', 'RAGAZZI', '9/11', ''],
      ['ROSSI ANNA', '09/04/2016', 'RAGAZZI', '9/11', 'C3 · 900002'],
      ['ROSSI MARIO', '09/04/2016', 'RAGAZZI', '9/11', 'C3 · 900002'],
    ]);
  });

  it('elenca gli anni importati dal più recente e cambia anno', async () => {
    const backend = new FakeMembers({ 2025: [member('VECCHIO', 'ANNO')], 2026: [member('ROSSI', 'MARIO')] });
    const { fixture, el } = await render(backend);
    const select = el.querySelector('select') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual(['2026/27', '2025/26']);
    select.value = '2025';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(rows(el)).toEqual([['VECCHIO ANNO', '09/04/2016', 'RAGAZZI', '9/11', 'C3 · 900002']]);
    expect(el.textContent).toContain('1 tesserati nel 2025/26');
  });

  it('apre l’anno indicato in ?anno=', async () => {
    const backend = new FakeMembers({ 2025: [member('VECCHIO', 'ANNO')], 2026: [member('ROSSI', 'MARIO')] });
    const { el } = await render(backend, '2025');
    expect(rows(el)[0]?.[0]).toBe('VECCHIO ANNO');
  });

  it('totali per settore nell’ordine ACR, Giovani, Adulti, poi gli altri (005, FR-010)', async () => {
    const backend = new FakeMembers({
      2026: [
        member('A', 'UNO', { sector: 'ADULTI' }),
        member('B', 'DUE'),
        member('C', 'TRE', { sector: 'ALTRO' }),
        member('D', 'QUATTRO', { sector: 'GIOVANI' }),
        member('E', 'CINQUE'),
      ],
    });
    const { el } = await render(backend);
    expect(el.querySelector('[data-testid="totals"]')?.textContent?.trim()).toBe('ACR 2 · Giovani 1 · Adulti 1 · ALTRO 1');
    expect(el.textContent).toContain('5 tesserati nel 2026/27');
  });

  it('totali: solo i settori presenti', async () => {
    const { el } = await render(new FakeMembers({ 2026: [member('A', 'UNO', { sector: 'ADULTI' })] }));
    expect(el.querySelector('[data-testid="totals"]')?.textContent?.trim()).toBe('Adulti 1');
  });

  it('nessun pulsante di modifica o cancellazione', async () => {
    const { el } = await render(new FakeMembers({ 2026: [member('ROSSI', 'MARIO')] }));
    expect(el.querySelectorAll('tbody button')).toHaveLength(0);
    expect(el.textContent).not.toMatch(/Modifica|Elimina|Cancella/);
  });
});
