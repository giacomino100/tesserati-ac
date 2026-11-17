import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MEMBERS_BACKEND, type MemberRow, type MembersBackend } from '../../members-backend';
import { FakeMembersBackend, memberRow, membersFixture } from '../../testing';
import { MembersPage } from './members-page';

const FakeMembers = FakeMembersBackend;

const member = (lastName: string, firstName: string, over: Partial<MemberRow> = {}): MemberRow => {
  const sector = over.sector ?? 'RAGAZZI';
  const list = sector === 'ADULTI' ? 'ADULTI' : sector === 'GIOVANI' ? 'GIOVANI' : 'ACR';
  return memberRow(lastName, firstName, { list, ...over });
};

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
    Array.from(tr.querySelectorAll('td'))
      .slice(0, 5)
      .map((td) => td.textContent?.trim() ?? ''),
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
    expect(headers).toEqual(['Cognome e nome', 'Data di nascita', 'Elenco', "Fascia d'età (export)", 'Legame', '']);
    expect(rows(el)).toEqual([
      ['BIANCHI LIA', '09/04/2016', 'ACR', '9/11', ''],
      ['ROSSI ANNA', '09/04/2016', 'ACR', '9/11', 'C3 · 900002'],
      ['ROSSI MARIO', '09/04/2016', 'ACR', '9/11', 'C3 · 900002'],
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
    expect(rows(el)).toEqual([['VECCHIO ANNO', '09/04/2016', 'ACR', '9/11', 'C3 · 900002']]);
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

  it('nessun pulsante di cancellazione; "Cambia elenco" su ogni riga (011)', async () => {
    const { el } = await render(new FakeMembers({ 2026: [member('ROSSI', 'MARIO')] }));
    expect(el.textContent).not.toMatch(/Elimina|Cancella/);
    expect(Array.from(el.querySelectorAll('tbody button')).map((b) => b.textContent?.trim())).toEqual(['Cambia elenco']);
  });
});

describe('MembersPage – elenco ed età (011)', () => {
  async function renderWithAuth(backend = membersFixture()) {
    const { AuthService } = await import('../../../core/auth.service');
    const { signal } = await import('@angular/core');
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { user: signal({ email: 'segreteria@example.org' }) } }] });
    return render(backend);
  }
  const button = (root: Element, text: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);
  const rowOf = (el: HTMLElement, name: string) =>
    Array.from(el.querySelectorAll<HTMLElement>('tbody tr')).find((tr) => tr.textContent?.includes(name))!;

  it('avvisi, Allinea all’età e Allinea tutte con conferma', async () => {
    const { el, fixture } = await renderWithAuth();
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    expect(el.textContent).toContain('2 adesioni non allineate all’età');
    expect(rowOf(el, 'ROSSI ELENA').textContent).toContain('Per età: Adulti');
    button(rowOf(el, 'ROSSI ELENA'), 'Allinea all’età')!.click();
    await settle();
    expect(rowOf(el, 'ROSSI ELENA').textContent).toContain('Adulti (export: GIOVANI)');
    button(el, 'Allinea tutte')!.click();
    await settle();
    const dialog = el.querySelector('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('1 adesione cambierà elenco. Confermi?');
    button(dialog, 'Allinea')!.click();
    await settle();
    expect(el.textContent).toContain('1 adesione allineata all’età.');
    expect(el.textContent).not.toContain('non allineat');
  });

  it('Cambia elenco con nota', async () => {
    const { el, fixture } = await renderWithAuth();
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    button(rowOf(el, 'GRECO NICOLO'), 'Cambia elenco')!.click();
    await settle();
    const form = el.querySelector('[data-testid="list-edit"]')!;
    const select = form.querySelector('select')!;
    select.value = 'ACR';
    select.dispatchEvent(new Event('change'));
    const note = form.querySelector('textarea')!;
    note.value = 'resta in ACR un anno in più';
    note.dispatchEvent(new Event('input'));
    button(form, 'Salva')!.click();
    await settle();
    expect(rowOf(el, 'GRECO NICOLO').textContent).toContain('ACR · eccezione: resta in ACR un anno in più');
    expect(button(rowOf(el, 'GRECO NICOLO'), 'Togli eccezione')).toBeDefined();
  });
});

describe('MembersPage – nuovo tesserato (009)', () => {
  it('"Nuovo tesserato" apre il modulo per l’anno mostrato', async () => {
    const { NEW_MEMBER_BACKEND } = await import('../../../nuovo-tesserato/new-member-backend');
    const { newMemberFixture } = await import('../../../nuovo-tesserato/testing');
    const { AuthService } = await import('../../../core/auth.service');
    const { signal } = await import('@angular/core');
    TestBed.configureTestingModule({
      providers: [
        { provide: NEW_MEMBER_BACKEND, useValue: newMemberFixture() },
        { provide: AuthService, useValue: { user: signal({ email: 'segreteria@example.org' }) } },
      ],
    });
    const { fixture, el } = await render(new FakeMembers({ 2026: [member('ROSSI', 'MARIO')] }));
    const open = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Nuovo tesserato')!;
    open.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="new-member"]')?.textContent).toContain('Nuovo tesserato nel 2026/27');
  });
});
