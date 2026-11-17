import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth.service';
import { MEMBERS_BACKEND } from './members-backend';
import { MembersService, MEMBERS_MESSAGES } from './members.service';
import { membersFixture } from './testing';

async function setup(backend = membersFixture(), year?: number) {
  TestBed.configureTestingModule({
    providers: [
      MembersService,
      { provide: MEMBERS_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'Segreteria@Example.org' }) } },
    ],
  });
  const service = TestBed.inject(MembersService);
  await service.load(year);
  return { service, backend };
}

const row = (service: MembersService, lastName: string, firstName: string) =>
  service.rows().find((r) => r.lastName === lastName && r.firstName === firstName)!;

describe('MembersService – non allineate (US1)', () => {
  it('conteggio, elenco e avviso per età', async () => {
    const { service } = await setup();
    expect(service.misalignedText()).toBe('2 adesioni non allineate all’età');
    const elena = row(service, 'ROSSI', 'ELENA');
    expect(service.listText(elena)).toBe('Giovani');
    expect(service.warningText(elena)).toBe('Per età: Adulti');
    expect(service.warningText(row(service, 'MORETTI', 'CARLA'))).toBe('');
  });

  it('senza listino: nessun avviso, nessun allineamento', async () => {
    const backend = membersFixture();
    backend.schedules.clear();
    const { service } = await setup(backend);
    expect(service.misalignedText()).toBe('');
    expect(service.warningText(row(service, 'ROSSI', 'ELENA'))).toBe('');
    expect(service.canAlign(row(service, 'ROSSI', 'ELENA'))).toBe(false);
  });
});

describe('MembersService – allineare (US2)', () => {
  it('allinea una riga: elenco per età, elenco di prima e settore dell’export conservati', async () => {
    const { service, backend } = await setup();
    await service.align(row(service, 'ROSSI', 'ELENA'));
    expect(service.message()).toBe('Elenco aggiornato.');
    const elena = row(service, 'ROSSI', 'ELENA');
    expect(elena).toMatchObject({ list: 'ADULTI', sector: 'ADULTI', exportSector: 'GIOVANI' });
    expect(elena.listChange).toMatchObject({ from: 'GIOVANI', by: 'segreteria@example.org' });
    expect(service.listText(elena)).toBe('Adulti (export: GIOVANI)');
    expect(service.misalignedText()).toBe('1 adesione non allineata all’età');
    expect(backend.calls).toEqual(['change:1']);
  });

  it('Allinea tutte con conferma, escluse le eccezioni', async () => {
    const { service, backend } = await setup();
    service.startEdit(row(service, 'GRECO', 'NICOLO'));
    service.editList.set('ACR');
    service.editNote.set('resta in ACR un anno in più');
    await service.saveEdit();
    service.askAlignAll();
    expect(service.alignAllQuestion()).toBe('2 adesioni cambieranno elenco. Confermi?');
    await service.alignAll();
    expect(service.message()).toBe('2 adesioni allineate all’età.');
    expect(service.misalignedText()).toBe('');
    expect(row(service, 'GRECO', 'NICOLO').list).toBe('ACR');
    expect(backend.calls).toEqual(['change:1', 'change:2']);
  });

  it('errore di rete: nulla cambia', async () => {
    const { service, backend } = await setup();
    backend.failWith = new Error('offline');
    await service.align(row(service, 'ROSSI', 'ELENA'));
    expect(service.message()).toBe(MEMBERS_MESSAGES.saveFailed);
    expect(row(service, 'ROSSI', 'ELENA').list).toBe('GIOVANI');
  });
});

describe('MembersService – eccezione (US3)', () => {
  it('nota obbligatoria, al massimo 200 caratteri; riga con l’eccezione', async () => {
    const { service } = await setup();
    service.startEdit(row(service, 'GRECO', 'NICOLO'));
    service.editList.set('ACR');
    expect(await service.saveEdit()).toBe(false);
    expect(service.editError()).toBe("Scrivi una nota che spieghi l'eccezione.");
    service.editNote.set('x'.repeat(201));
    expect(await service.saveEdit()).toBe(false);
    expect(service.editError()).toBe('La nota può avere al massimo 200 caratteri.');
    service.editNote.set('  resta in ACR un anno in più ');
    expect(await service.saveEdit()).toBe(true);
    const greco = row(service, 'GRECO', 'NICOLO');
    expect(service.listText(greco)).toBe('ACR · eccezione: resta in ACR un anno in più (export: GIOVANI)');
    expect(service.warningText(greco)).toBe('');
    expect(service.isException(greco)).toBe(true);
  });

  it('togli eccezione: con listino torna all’elenco per età, senza listino a quello di prima', async () => {
    const { service, backend } = await setup();
    service.startEdit(row(service, 'GRECO', 'NICOLO'));
    service.editList.set('ACR');
    service.editNote.set('resta in ACR');
    await service.saveEdit();
    await service.removeException(row(service, 'GRECO', 'NICOLO'));
    expect(row(service, 'GRECO', 'NICOLO').list).toBe('GIOVANI');
    expect(service.isException(row(service, 'GRECO', 'NICOLO'))).toBe(false);

    service.startEdit(row(service, 'GRECO', 'NICOLO'));
    service.editList.set('ADULTI');
    service.editNote.set('prova');
    await service.saveEdit();
    backend.schedules.clear();
    await service.load(2026);
    await service.removeException(row(service, 'GRECO', 'NICOLO'));
    expect(row(service, 'GRECO', 'NICOLO').list).toBe('GIOVANI');
  });
});
