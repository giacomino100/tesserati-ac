import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth.service';
import { FAMILIES_BACKEND } from './families-backend';
import { FamiliesService, FAMILIES_MESSAGES } from './families.service';
import { FakeFamiliesBackend, sampleBackend, yearMember } from './testing';

export function setupFamilies(backend = sampleBackend()) {
  TestBed.configureTestingModule({
    providers: [
      { provide: FAMILIES_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'Segreteria@Example.org' }) } },
    ],
  });
  return { backend, service: TestBed.inject(FamiliesService) };
}

describe('FamiliesService – famiglie suggerite (US1)', () => {
  it('carica l’anno più recente se non indicato, poi quello scelto', async () => {
    const { service } = setupFamilies();
    await service.load();
    expect(service.year()).toBe(2027);
    await service.load(2026);
    expect(service.year()).toBe(2026);
    const view = service.view();
    expect(view.suggested.map((s) => [s.bondId, s.members.length, s.confirmable])).toEqual([
      ['900001', 2, true],
      ['900002', 3, true],
      ['900005', 1, false],
    ]);
    expect(view.withoutFamily.map((m) => m.lastName)).toEqual(['BARBIERI', 'MARIANI', 'MORETTI']);
    expect(service.summary()).toBe('3 famiglie suggerite · 0 confermate · 3 tesserati senza famiglia');
  });

  it('testi degli avvisi', async () => {
    const { service } = setupFamilies();
    await service.load(2026);
    const marino = service.view().suggested[2]!;
    expect(marino.warnings.map((w) => service.warningText(w, marino.bond))).toEqual([
      'Il Legame N2 indica 2 componenti, ne sono stati trovati 1.',
    ]);
    expect(service.warningText({ kind: 'bondMismatch', bonds: ['C3', 'C4'] })).toBe('I componenti hanno Legame diversi: C3, C4.');
  });
});

describe('FamiliesService – conferma (US2)', () => {
  it('conferma una famiglia suggerita con l’email dell’utente', async () => {
    const { service, backend } = setupFamilies();
    await service.load(2026);
    await service.confirmSuggested(service.view().suggested[1]!);
    expect(backend.families).toEqual([
      expect.objectContaining({ associationYear: 2026, memberIds: ['verdi-p', 'neri', 'verdi-s'], origin: 'legame', bondId: '900002', confirmedBy: 'segreteria@example.org' }),
    ]);
    expect(service.view().confirmed).toHaveLength(1);
    expect(service.view().suggested.map((s) => s.bondId)).toEqual(['900001', '900005']);
  });

  it('"Conferma tutte" salta le famiglie da 1 e lo dice', async () => {
    const { service, backend } = setupFamilies();
    await service.load(2026);
    await service.confirmAll();
    expect(backend.families).toHaveLength(2);
    expect(service.message()).toBe('Confermate 2 famiglie; 1 famiglia con un solo componente non confermata.');
  });

  it('"Conferma tutte" a gruppi di 8; se un gruppo fallisce dice quante sono state confermate', async () => {
    const backend = new FakeFamiliesBackend();
    backend.members.set(
      2026,
      Array.from({ length: 20 }, (_, i) => [
        yearMember(`a${i}`, { bondId: `9${i}`, bond: 'C2' }),
        yearMember(`b${i}`, { bondId: `9${i}`, bond: 'C2', birthDate: '1990-01-01' }),
      ]).flat(),
    );
    backend.failConfirmAt = { call: 2, error: new Error('offline') };
    const { service } = setupFamilies(backend);
    await service.load(2026);
    await service.confirmAll();
    expect(backend.calls).toEqual(['confirm:8', 'confirm:8']);
    expect(backend.families).toHaveLength(8);
    expect(service.message()).toBe('Confermate 8 famiglie su 20. Impossibile salvare le altre: controlla la connessione e riprova.');
  });

  it('famiglie per anno: nel 2027 nessuna famiglia confermata', async () => {
    const { service } = setupFamilies();
    await service.load(2026);
    await service.confirmAll();
    await service.load(2027);
    expect(service.view().confirmed).toEqual([]);
  });

  it('aggiunta proposta: chi arriva dopo con lo stesso N. Legame', async () => {
    const backend = sampleBackend();
    const { service } = setupFamilies(backend);
    await service.load(2026);
    await service.confirmSuggested(service.view().suggested[1]!); // VERDI PAOLO, NERI, VERDI SOFIA
    backend.members.get(2026)!.push(yearMember('verdi-m', { lastName: 'VERDI', firstName: 'MARCO', birthDate: '2018-01-01', bond: 'C4', bondId: '900002' }));
    await service.load(2026);
    const [addition] = service.view().additions;
    expect(service.additionText(addition!)).toBe('Aggiungi VERDI MARCO (stesso N. Legame)');
    await service.addProposed(addition!);
    expect(backend.families[0]?.memberIds).toEqual(['verdi-p', 'neri', 'verdi-s', 'verdi-m']);
  });

  it('errore di rete: messaggio, nulla salvato', async () => {
    const backend = sampleBackend();
    const { service } = setupFamilies(backend);
    await service.load(2026);
    backend.failWith = new Error('offline');
    await service.confirmSuggested(service.view().suggested[0]!);
    expect(service.message()).toBe(FAMILIES_MESSAGES.saveFailed);
    expect(backend.families).toEqual([]);
  });
});

describe('FamiliesService – correzioni (US3)', () => {
  it('togliere un componente e confermare', async () => {
    const { service, backend } = setupFamilies();
    await service.load(2026);
    service.startEditSuggested(service.view().suggested[1]!);
    service.removeMember('verdi-s');
    expect(service.hasUnsavedChanges()).toBe(true);
    await service.saveEdit();
    expect(backend.families[0]?.memberIds).toEqual(['verdi-p', 'neri']);
    expect(service.hasUnsavedChanges()).toBe(false);
    expect(service.view().additions.map((a) => a.member.personId)).toEqual(['verdi-s']);
  });

  it('meno di 2 componenti: non si conferma', async () => {
    const { service, backend } = setupFamilies();
    await service.load(2026);
    service.startEditSuggested(service.view().suggested[0]!);
    service.removeMember('rossi');
    expect(service.canSaveEdit()).toBe(false);
    await service.saveEdit();
    expect(service.message()).toBe('Una famiglia ha almeno 2 componenti.');
    expect(backend.families).toEqual([]);
  });

  it('crea una famiglia a mano con tesserati senza famiglia', async () => {
    const { service, backend } = setupFamilies();
    await service.load(2026);
    await service.createFamily(['moretti', 'barbieri']);
    expect(backend.families[0]).toMatchObject({ memberIds: ['moretti', 'barbieri'], origin: 'manuale' });
    expect(backend.families[0]).not.toHaveProperty('bondId');
  });

  it('aggiungere chi è già in un’altra famiglia: rifiutato con il nome della famiglia', async () => {
    const { service } = setupFamilies();
    await service.load(2026);
    await service.confirmSuggested(service.view().suggested[1]!);
    service.startEditSuggested(service.view().suggested[0]!);
    service.addMember('verdi-s');
    expect(service.message()).toBe('VERDI SOFIA è già nella famiglia di VERDI PAOLO: prima togli questa persona da quella famiglia.');
    expect(service.editing()?.memberIds).toEqual(['rossi', 'bianchi']);
  });

  it('riaprire una famiglia confermata, correggerla e riconfermarla', async () => {
    const { service, backend } = setupFamilies();
    await service.load(2026);
    await service.confirmSuggested(service.view().suggested[1]!);
    const confirmed = service.view().confirmed[0]!;
    service.startEditConfirmed(confirmed);
    service.removeMember('neri');
    service.addMember('mariani');
    await service.saveEdit();
    expect(backend.families).toHaveLength(1);
    expect(backend.families[0]).toMatchObject({ id: confirmed.family.id, memberIds: ['verdi-p', 'verdi-s', 'mariani'] });
  });

  it('sciogliere: i componenti tornano suggeriti', async () => {
    const { service, backend } = setupFamilies();
    await service.load(2026);
    await service.confirmSuggested(service.view().suggested[1]!);
    await service.dissolve(service.view().confirmed[0]!.family.id);
    expect(backend.families).toEqual([]);
    expect(service.view().suggested.map((s) => s.bondId)).toEqual(['900001', '900002', '900005']);
  });

  it('famiglia modificata da qualcun altro: la pagina si aggiorna', async () => {
    const backend = sampleBackend();
    const { service } = setupFamilies(backend);
    await service.load(2026);
    const suggested = service.view().suggested[1]!;
    await backend.confirm([{ associationYear: 2026, memberIds: ['verdi-p', 'neri'], origin: 'legame', bondId: '900002' }], 'altro@example.org');
    await service.confirmSuggested(suggested);
    expect(service.message()).toBe('Le famiglie sono state modificate da qualcun altro. La pagina è stata aggiornata.');
    expect(service.view().confirmed).toHaveLength(1);
  });
});
