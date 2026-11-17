import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth.service';
import { NEW_MEMBER_BACKEND } from './new-member-backend';
import { NewMemberService, NEW_MEMBER_MESSAGES } from './new-member.service';
import { newMemberFixture } from './testing';

async function setup(backend = newMemberFixture(), year = 2026) {
  TestBed.configureTestingModule({
    providers: [
      NewMemberService,
      { provide: NEW_MEMBER_BACKEND, useValue: backend },
      { provide: AuthService, useValue: { user: signal({ email: 'Segreteria@Example.org' }) } },
    ],
  });
  const service = TestBed.inject(NewMemberService);
  await service.open(year);
  // 013: l'iscrizione vale come pagamento, con la data scelta nella pagina.
  service.paidOn.set('2026-11-17');
  return { service, backend };
}

function fill(service: NewMemberService, values: Partial<Record<'lastName' | 'firstName' | 'birthDate' | 'sex' | 'taxCode', string>>) {
  for (const [field, value] of Object.entries(values)) service.set(field as 'lastName', value);
}

describe('NewMemberService – iscrivere (US1)', () => {
  it('età ed elenco, poi iscrizione di una persona nuova', async () => {
    const { service, backend } = await setup();
    fill(service, { lastName: ' bianco', firstName: 'luca ', birthDate: '2019-05-10' });
    expect(service.ageText()).toBe('7 anni · ACR');
    expect(service.statusText()).toBe('');
    expect(service.canSave()).toBe(true);
    expect(await service.save()).toBe(true);
    expect(service.message()).toBe('Iscrizione salvata: BIANCO LUCA nel 2026/27.');
    expect(backend.added).toEqual([
      { year: 2026, list: 'ACR', paidOn: '2026-11-17', member: expect.objectContaining({ lastName: 'BIANCO', firstName: 'LUCA', birthDate: '2019-05-10' }) },
    ]);
  });

  it('sotto l’età minima: avviso, iscrivibile', async () => {
    const { service } = await setup();
    fill(service, { lastName: 'GATTI', firstName: 'MIA', birthDate: '2022-09-09' });
    expect(service.ageText()).toBe('4 anni · ACR');
    expect(service.ageWarning()).toBe("Sotto l'età minima del listino (6 anni): quota non prevista");
    expect(service.canSave()).toBe(true);
  });

  it('senza listino non si iscrive', async () => {
    const { service } = await setup(newMemberFixture(), 2027);
    expect(service.scheduleMissing()).toBe('Manca il listino 2027/28. Crealo nella sezione Listini.');
    fill(service, { lastName: 'BIANCO', firstName: 'LUCA', birthDate: '2019-05-10' });
    expect(service.canSave()).toBe(false);
  });

  it('errori per campo solo dopo il tentativo; nulla salvato', async () => {
    const { service, backend } = await setup();
    fill(service, { lastName: 'BIANCO', birthDate: '2019-02-30', taxCode: 'ABC' });
    expect(service.errors()).toEqual({});
    expect(await service.save()).toBe(false);
    expect(service.errors()).toEqual({
      firstName: 'Inserisci il nome.',
      birthDate: 'Data di nascita non valida.',
      taxCode: 'Il codice fiscale ha 16 lettere e numeri.',
    });
    expect(backend.added).toEqual([]);
  });

  it('errore di rete: messaggio, nulla salvato', async () => {
    const { service, backend } = await setup();
    backend.failWith = new Error('offline');
    fill(service, { lastName: 'BIANCO', firstName: 'LUCA', birthDate: '2019-05-10' });
    expect(await service.save()).toBe(false);
    expect(service.message()).toBe(NEW_MEMBER_MESSAGES.saveFailed);
  });
});

describe('NewMemberService – non duplicare (US2)', () => {
  it('stessa chiave: persona esistente con l’ultima adesione', async () => {
    const { service, backend } = await setup();
    fill(service, { lastName: 'VERDI', firstName: 'PAOLO', birthDate: '1980-01-20' });
    expect(service.statusText()).toBe('Già in archivio: ultima adesione nel 2023/24. Verrà usata questa persona.');
    expect(await service.save()).toBe(true);
    expect(backend.added).toEqual([{ year: 2026, list: 'ADULTI', paidOn: '2026-11-17', personId: 'verdi' }]);
  });

  it('stesso codice fiscale con un altro nome', async () => {
    const { service } = await setup(newMemberFixture(), 2027);
    fill(service, { lastName: 'NERI', firstName: 'ANNAMARIA', birthDate: '1982-11-15', taxCode: 'NRENNA82S45G348X' });
    expect(service.statusText()).toBe('Già in archivio con questo codice fiscale: NERI ANNA, 05/11/1982.');
  });

  it('possibile doppione: Iscrivi solo dopo la scelta', async () => {
    const { service, backend } = await setup(newMemberFixture(), 2028);
    backend.schedules.set(2028, backend.schedules.get(2026)!);
    await service.open(2028);
    fill(service, { lastName: 'ROSSI', firstName: 'MARIO', birthDate: '1965-03-13' });
    expect(service.statusText()).toBe('Possibile doppione:');
    expect(service.candidateTexts()).toEqual([{ id: 'rossi', text: 'ROSSI MARIO, 12/03/1965 (ultima adesione 2026/27)' }]);
    expect(service.canSave()).toBe(false);
    service.choose('rossi');
    expect(service.statusText()).toBe('Già in archivio: ultima adesione nel 2026/27. Verrà usata questa persona.');
    service.choose('new');
    expect(service.statusText()).toBe('');
    expect(service.canSave()).toBe(true);
  });

  it('adesione nell’anno precedente: rimando a Riconferme', async () => {
    const { service } = await setup(newMemberFixture(), 2026);
    fill(service, { lastName: 'NERI', firstName: 'ANNA', birthDate: '1982-11-05' });
    expect(service.statusText()).toBe('È tra i tesserati del 2025/26: usa Conferma nell’elenco.');
    expect(service.canSave()).toBe(false);
  });

  it('già nell’anno, anche se iscritta nel frattempo', async () => {
    const { service, backend } = await setup();
    fill(service, { lastName: 'ROSSI', firstName: 'MARIO', birthDate: '1965-03-12' });
    expect(service.statusText()).toBe("Ha già un'adesione nel 2026/27.");
    expect(service.canSave()).toBe(false);

    fill(service, { lastName: 'BIANCO', firstName: 'LUCA', birthDate: '2019-05-10' });
    backend.adhesions.add('2026_n1');
    expect(await service.save()).toBe(false);
    expect(service.message()).toBe("Ha già un'adesione nel 2026/27.");
  });
});
