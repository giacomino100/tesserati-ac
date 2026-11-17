import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth.service';
import { RENEWALS_BACKEND, RenewalInFamilyError } from './renewals-backend';
import { RenewalsService, RENEWALS_MESSAGES } from './renewals.service';
import { renewalsFixture, schedule2027 } from './testing';

function setup(backend = renewalsFixture()) {
  TestBed.configureTestingModule({
    providers: [
      { provide: RENEWALS_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'Segreteria@Example.org' }) } },
    ],
  });
  return { backend, service: TestBed.inject(RenewalsService) };
}

describe('RenewalsService – chi può rinnovare (US1)', () => {
  it("propone l'anno dopo l'ultimo con tesserati e mostra gruppi, righe e avvisi", async () => {
    const { service } = setup();
    await service.load();
    expect(service.years()).toEqual([2027, 2026]);
    expect(service.year()).toBe(2027);
    expect(service.summary()).toBe('Da decidere: 7 · Già iscritti nel 2027/28: 0');
    const [group] = service.view().groups;
    expect(service.groupTitle(group!)).toBe('N. Legame 900003 · C4');
    expect(group!.candidates.map((c) => service.rowText(c))).toEqual([
      'GALLO LUCA · 49 anni · Adulti',
      'CONTI MARTA · 46 anni · Adulti',
      'GALLO TOMMASO · 13 anni · ACR',
      'GALLO GIULIA · 8 anni · ACR',
    ]);
    const singles = service.view().singles;
    expect(singles.map((c) => c.member.lastName)).toEqual(['GATTI', 'MORETTI', 'RINALDI']);
    expect(service.warningTexts(singles[2]!)).toEqual(['Passa da ACR a Giovani']);
    expect(service.warningTexts(singles[0]!)).toEqual(["Sotto l'età minima del listino (6 anni): quota non prevista"]);
    expect(service.scheduleMissing()).toBe('');
  });

  it('anno richiesto, listino mancante, nessun tesserato nel precedente', async () => {
    const backend = renewalsFixture();
    backend.schedules.clear();
    const { service } = setup(backend);
    await service.load(2027);
    expect(service.scheduleMissing()).toBe('Manca il listino 2027/28. Crealo nella sezione Listini.');
    expect(service.canRenew()).toBe(false);
    await service.load(2030);
    expect(service.year()).toBe(2027);
    await service.load(2026);
    expect(service.year()).toBe(2026);
    expect(service.noPrevious()).toBe('Nessun tesserato nel 2025/26 da riconfermare.');

    const empty = renewalsFixture();
    empty.members.clear();
    TestBed.resetTestingModule();
    const other = setup(empty).service;
    await other.load();
    expect(other.noPrevious()).toBe('Nessun tesserato da riconfermare: importa prima un anno.');
  });

  it('data di nascita incoerente: avviso e nessuna riconferma', async () => {
    const backend = renewalsFixture();
    backend.members.get(2026)!.push({ ...backend.members.get(2026)![4]!, personId: 'futuro', lastName: 'ZETA', birthDate: '2030-01-01' });
    const { service } = setup(backend);
    await service.load();
    const zeta = service.view().singles.find((c) => c.member.lastName === 'ZETA')!;
    expect(service.warningTexts(zeta)).toEqual(['Data di nascita incoerente: non si può riconfermare']);
    expect(service.rowText(zeta)).toBe('ZETA CARLA');
  });
});

describe('RenewalsService – riconferma (US2)', () => {
  it('spunte singole, del nucleo e di tutti', async () => {
    const { service } = setup();
    await service.load();
    const group = service.view().groups[0]!;
    expect(service.groupState(group)).toBe('none');
    service.toggle('gallo-t');
    expect(service.groupState(group)).toBe('some');
    service.toggleGroup(group);
    expect(service.groupState(group)).toBe('all');
    service.toggleGroup(group);
    expect(service.groupState(group)).toBe('none');
    service.toggleAll();
    expect(service.selectedCount()).toBe(7);
    expect(service.allSelected()).toBe(true);
    service.toggleAll();
    expect(service.selectedCount()).toBe(0);
  });

  it('riconferma i selezionati con elenco nuovo e legame; messaggio e ricarica', async () => {
    const { service, backend } = setup();
    await service.load();
    service.toggleGroup(service.view().groups[0]!);
    service.toggle('rinaldi');
    expect(await service.renew()).toBe(true);
    expect(service.message()).toBe('5 persone riconfermate per il 2027/28.');
    expect(service.summary()).toBe('Da decidere: 2 · Già iscritti nel 2027/28: 5');
    const rinaldi = backend.members.get(2027)!.find((m) => m.personId === 'rinaldi')!;
    expect(rinaldi).toMatchObject({ list: 'GIOVANI', origin: 'riconferma' });
    expect(backend.members.get(2027)!.find((m) => m.personId === 'conti')).toMatchObject({ bondId: '900003', bond: 'C4' });
    expect(backend.info.get('2027_rinaldi')!.renewedBy).toBe('segreteria@example.org');
    expect(service.selectedCount()).toBe(0);
    service.toggle('moretti');
    await service.renew();
    expect(service.message()).toBe('1 persona riconfermata per il 2027/28.');
  });

  it('a gruppi di 15: interruzione dopo il primo gruppo', async () => {
    const backend = renewalsFixture();
    const base = backend.members.get(2026)![4]!;
    for (let i = 0; i < 30; i++) backend.members.get(2026)!.push({ ...base, personId: `p${i}`, lastName: `PERSONA${i}` });
    backend.failGroupAt = { group: 2, error: new Error('offline') };
    const { service } = setup(backend);
    await service.load();
    service.toggleAll();
    expect(await service.renew()).toBe(false);
    expect(backend.calls).toEqual(['renew:15', 'renew:15']);
    expect(service.message()).toBe(
      'Riconfermate 15 persone su 37. Le altre non sono state salvate: controlla la connessione e riprova.',
    );
    expect(service.summary()).toBe('Da decidere: 22 · Già iscritti nel 2027/28: 15');
  });

  it('nulla salvato e persona già iscritta nel frattempo', async () => {
    const backend = renewalsFixture();
    const { service } = setup(backend);
    await service.load();
    service.toggle('moretti');
    backend.failGroupAt = { group: 1, error: new Error('offline') };
    expect(await service.renew()).toBe(false);
    expect(service.message()).toBe(RENEWALS_MESSAGES.saveFailed);
    expect(service.selectedCount()).toBe(1);

    backend.failGroupAt = undefined;
    backend.members.set(2027, [{ ...backend.members.get(2026)![4]! }]);
    expect(await service.renew()).toBe(false);
    expect(service.message()).toBe(RENEWALS_MESSAGES.concurrent);
    expect(service.summary()).toBe('Da decidere: 6 · Già iscritti nel 2027/28: 1');
  });

  it('senza selezione o senza listino non si riconferma', async () => {
    const backend = renewalsFixture();
    const { service } = setup(backend);
    await service.load();
    expect(service.canRenew()).toBe(false);
    service.toggle('moretti');
    expect(service.canRenew()).toBe(true);
    backend.schedules.set(2027, schedule2027());
  });
});

describe('RenewalsService – eccezione dell’anno prima (011)', () => {
  it('avviso "L’anno scorso era un’eccezione"', async () => {
    const backend = renewalsFixture();
    backend.members.set(2026, backend.members.get(2026)!.map((m) => (m.personId === 'rinaldi' ? { ...m, exception: true as const } : m)));
    const { service } = setup(backend);
    await service.load(2027);
    const rinaldi = service.view().singles.find((c) => c.member.personId === 'rinaldi')!;
    expect(service.warningTexts(rinaldi)).toContain("L'anno scorso era un'eccezione: ACR");
  });
});

describe('RenewalsService – nuovi tesserati (009)', () => {
  it('sezione "Nuovi tesserati" con annullamento', async () => {
    const backend = renewalsFixture();
    backend.members.set(2027, [
      { personId: 'bianco', lastName: 'BIANCO', firstName: 'LUCA', birthDate: '2019-05-10', list: 'ACR', origin: 'nuovo' },
      { personId: 'nero', lastName: 'NERO', firstName: 'ALFA', birthDate: '1990-01-01', list: 'ADULTI', origin: 'nuovo' },
    ]);
    backend.links.set('2027_nero', 'fam-1');
    const { service } = setup(backend);
    await service.load(2027);
    expect(service.newTitle()).toBe('Nuovi tesserati del 2027/28');
    expect(service.newMembers().map((n) => [service.newText(n), n.undoable])).toEqual([
      ['BIANCO LUCA · ACR', true],
      ['NERO ALFA · Adulti', false],
    ]);
    expect(service.newBlockedText(service.newMembers()[1]!)).toBe('Prima togli questa persona dalla famiglia del 2027/28.');
    expect(service.summary()).toBe('Da decidere: 7 · Già iscritti nel 2027/28: 0');

    await service.startUndo('bianco');
    expect(service.undoing()).toEqual({ personId: 'bianco', kind: 'nuovo', question: "Annullare l'iscrizione di BIANCO LUCA?", feeWarning: '' });
    await service.confirmUndo();
    expect(service.message()).toBe('Iscrizione annullata.');
    expect(service.newMembers()).toHaveLength(1);
  });
});

describe('RenewalsService – annullare (US3)', () => {
  async function renewed() {
    const s = setup();
    await s.service.load();
    s.service.toggleAll();
    await s.service.renew();
    return s;
  }

  it('righe dei già iscritti: riconferma, import, famiglia', async () => {
    const { service, backend } = await renewed();
    backend.members.set(2027, backend.members.get(2027)!.map((m) => (m.personId === 'gatti' ? { ...m, origin: 'import' as const } : m)));
    backend.links.set('2027_conti', 'fam-1');
    await service.load(2027);
    const row = (id: string) => service.view().renewed.find((r) => r.member.personId === id)!;
    expect(service.renewedText(row('moretti'))).toBe('MORETTI CARLA · Adulti · riconferma del 17/11/2026 (segreteria@example.org)');
    expect(service.renewedText(row('gatti'))).toBe('GATTI MIA · ACR · da import');
    expect(row('gatti').undoable).toBe(false);
    expect(row('conti').undoable).toBe(false);
    expect(service.blockedText(row('conti'))).toBe('Prima togli questa persona dalla famiglia del 2027/28.');
  });

  it('annulla con conferma; avviso solo se c è una quota salvata', async () => {
    const { service, backend } = await renewed();
    await service.startUndo('moretti');
    expect(service.undoing()).toEqual({ personId: 'moretti', question: 'Annullare la riconferma di MORETTI CARLA?', feeWarning: '' });
    service.cancelUndo();
    expect(service.undoing()).toBeNull();

    backend.savedFees.add('2027_moretti');
    await service.startUndo('moretti');
    expect(service.undoing()!.feeWarning).toBe('La quota salvata del suo nucleo andrà ricalcolata in Quote.');
    await service.confirmUndo();
    expect(service.message()).toBe('Riconferma annullata.');
    expect(service.summary()).toBe('Da decidere: 1 · Già iscritti nel 2027/28: 6');
  });

  it('annulla rifiutato se nel frattempo è entrata in una famiglia', async () => {
    const { service, backend } = await renewed();
    await service.startUndo('moretti');
    backend.links.set('2027_moretti', 'fam-1');
    vi.spyOn(backend, 'undo').mockRejectedValueOnce(new RenewalInFamilyError());
    await service.confirmUndo();
    expect(service.message()).toBe('Prima togli questa persona dalla famiglia del 2027/28.');
  });
});
