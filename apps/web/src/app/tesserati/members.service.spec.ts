import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth.service';
import { MembersService, MEMBERS_MESSAGES } from './members.service';
import { yearFixture } from './testing';
import { TODAY, YEAR_BACKEND } from './year-backend';

async function setup(backend = yearFixture(), year?: number) {
  TestBed.configureTestingModule({
    providers: [
      MembersService,
      { provide: YEAR_BACKEND, useValue: backend },
      { provide: TODAY, useValue: () => new Date(2026, 10, 17, 12) },
      { provide: AuthService, useValue: { user: signal({ email: 'Segreteria@Example.org' }) } },
    ],
  });
  const service = TestBed.inject(MembersService);
  await service.load(year);
  return { service, backend };
}

const row = (service: MembersService, id: string) => service.view().rows.find((r) => r.member.personId === id)!;

describe('MembersService – elenco unico (US1)', () => {
  it('anno dopo l’ultimo con tesserati, conteggi, righe da confermare', async () => {
    const { service } = await setup();
    expect(service.years()).toEqual([2027, 2026]);
    expect(service.year()).toBe(2027);
    expect(service.paidOn()).toBe('2026-11-17');
    expect(service.countsText()).toBe('7 da confermare · 0 iscritti');
    expect(service.rowText(row(service, 'gallo-t'))).toBe('GALLO TOMMASO · 01/09/2014 · ACR');
    expect(service.statusText(row(service, 'gallo-t'))).toBe('Da confermare');
    expect(service.warningTexts(row(service, 'rinaldi'))).toEqual(['Passa da ACR a Giovani']);
  });

  it('filtro e ricerca', async () => {
    const { service } = await setup();
    service.search.set('gallo');
    expect(service.visibleRows().map((r) => r.member.personId)).toEqual(['gallo-g', 'gallo-l', 'gallo-t']);
    service.search.set('');
    await service.confirm('moretti');
    service.filter.set('enrolled');
    expect(service.visibleRows().map((r) => r.member.personId)).toEqual(['moretti']);
    service.filter.set('pending');
    expect(service.visibleRows()).toHaveLength(6);
  });

  it('Conferma = pagato con la data scelta', async () => {
    const { service, backend } = await setup();
    expect(await service.confirm('moretti')).toBe(true);
    expect(service.message()).toBe('Conferma salvata: MORETTI CARLA, pagato il 17/11/2026.');
    expect(service.countsText()).toBe('6 da confermare · 1 iscritto');
    expect(service.statusText(row(service, 'moretti'))).toBe('Pagato il 17/11/2026');
    expect(backend.members.get(2027)![0]).toMatchObject({ personId: 'moretti', list: 'ADULTI', paidOn: '2026-11-17' });
    expect(service.panel()).toBeNull();
  });

  it('data di pagamento futura: nulla salvato', async () => {
    const { service, backend } = await setup();
    service.paidOn.set('2026-11-18');
    expect(await service.confirm('moretti')).toBe(false);
    expect(service.message()).toBe('La data di pagamento non può essere nel futuro.');
    expect(backend.calls).toEqual([]);
  });

  it('errori: rete, già confermata da altri, senza listino', async () => {
    const backend = yearFixture();
    const { service } = await setup(backend);
    backend.failWith = new Error('offline');
    await service.confirm('moretti');
    expect(service.message()).toBe(MEMBERS_MESSAGES.saveFailed);
    backend.failWith = undefined;
    backend.members.set(2027, [{ ...backend.members.get(2026)![4]!, origin: 'riconferma' }]);
    await service.confirm('moretti');
    expect(service.message()).toBe(MEMBERS_MESSAGES.concurrent);
    expect(service.countsText()).toBe('6 da confermare · 1 iscritto');

    backend.schedules.clear();
    await service.load(2027);
    expect(service.scheduleMissing()).toBe('Manca il listino 2027/28. Crealo nella sezione Listini.');
    expect(service.canConfirm(row(service, 'rinaldi'))).toBe(false);
  });

  it('Annulla conferma e Registra pagamento', async () => {
    const { service, backend } = await setup();
    await service.confirm('moretti');
    await service.startUndo('moretti');
    expect(service.undoing()?.question).toBe('Annullare la conferma di MORETTI CARLA?');
    await service.confirmUndo();
    expect(service.countsText()).toBe('7 da confermare · 0 iscritti');

    backend.members.set(2027, [{ ...backend.members.get(2026)![4]!, origin: 'riconferma' }]);
    await service.load(2027);
    expect(service.statusText(row(service, 'moretti'))).toBe('Pagamento non registrato');
    await service.registerPayment('moretti');
    expect(service.statusText(row(service, 'moretti'))).toBe('Pagato il 17/11/2026');
  });
});

describe('MembersService – famiglia (US2)', () => {
  async function confirmGallo() {
    const s = await setup();
    await s.service.confirm('gallo-l');
    return s;
  }
  const states = (service: MembersService) =>
    service.panel()!.members.map((m) => [m.member.personId, m.status, m.inFamily]);

  it('il pannello si apre con i 4 componenti del N. Legame', async () => {
    const { service } = await confirmGallo();
    expect(service.panelTitle()).toBe('Famiglia · N. Legame 900003');
    expect(states(service)).toEqual([
      ['gallo-l', 'enrolled', false],
      ['conti', 'pending', false],
      ['gallo-t', 'pending', false],
      ['gallo-g', 'pending', false],
    ]);
  });

  it('seconda conferma: la famiglia nasce; terza: si aggiunge', async () => {
    const { service, backend } = await confirmGallo();
    await service.confirm('conti');
    expect(service.message()).toBe('Conferma salvata: CONTI MARTA, pagato il 17/11/2026. Famiglia aggiornata: 2 componenti.');
    expect(backend.families[0]).toMatchObject({ memberIds: ['gallo-l', 'conti'], bondId: '900003', origin: 'legame' });
    await service.confirm('gallo-t');
    expect(backend.families[0]!.memberIds).toEqual(['gallo-l', 'conti', 'gallo-t']);
    expect(states(service).filter(([, , inFamily]) => inFamily)).toHaveLength(3);
  });

  it('Togli: non viene riaggiunta; la famiglia resta con gli altri', async () => {
    const { service, backend } = await confirmGallo();
    await service.confirm('conti');
    await service.confirm('gallo-t');
    await service.removeFromFamily('gallo-t');
    expect(backend.families[0]!.memberIds).toEqual(['gallo-l', 'conti']);
    expect(backend.calls).toContain('optOut:gallo-t:true');
    await service.confirm('gallo-g');
    expect(backend.families[0]!.memberIds).toEqual(['gallo-l', 'conti', 'gallo-g']);
  });

  it('Togli da una famiglia di 2: la famiglia si scioglie', async () => {
    const { service, backend } = await confirmGallo();
    await service.confirm('conti');
    await service.removeFromFamily('conti');
    expect(backend.families).toEqual([]);
  });

  it('Aggiungi un tesserato e Crea famiglia', async () => {
    const { service, backend } = await setup();
    await service.confirm('moretti');
    await service.confirm('rinaldi');
    service.openPanel('moretti');
    expect(service.panelTitle()).toBe('Nessuna famiglia');
    expect(service.panel()!.addable.map((m) => m.personId)).toEqual(['rinaldi']);
    await service.addToFamily('rinaldi');
    expect(backend.families[0]).toMatchObject({ memberIds: ['moretti', 'rinaldi'], origin: 'manuale' });
    expect(service.message()).toBe('Famiglia aggiornata: 2 componenti.');
  });

  it('famiglia non salvata: la conferma resta', async () => {
    const { service, backend } = await confirmGallo();
    backend.failFamilyWith = new Error('offline');
    await service.confirm('conti');
    expect(service.message()).toBe('Conferma salvata, ma la famiglia non è stata aggiornata: riprova dal pannello.');
    expect(service.countsText()).toBe('5 da confermare · 2 iscritti');
  });

  it('correzione: iscritti senza famiglia (riconfermati prima della 013) → "Conferma famiglia"', async () => {
    const backend = yearFixture();
    const old = (id: string) => ({ ...backend.members.get(2026)!.find((m) => m.personId === id)!, origin: 'riconferma' as const });
    backend.members.set(2027, [old('gallo-l'), old('conti'), old('gallo-t')]);
    const { service } = await setup(backend);
    service.openPanel('gallo-l');
    expect(service.canConfirmPanelFamily()).toBe(true);
    await service.confirmPanelFamily();
    expect(backend.families[0]).toMatchObject({ memberIds: ['gallo-l', 'conti', 'gallo-t'], bondId: '900003', origin: 'legame' });
    expect(service.message()).toBe('Famiglia aggiornata: 3 componenti.');
    expect(service.canConfirmPanelFamily()).toBe(false);
  });
});
