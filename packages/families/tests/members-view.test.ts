import { describe, expect, it } from 'vitest';
import { SCHEDULE_2026_27, type FeeSchedule } from '@tesseramento/fees';
import { familyAfterConfirm, familyPanel, memberYearView, type YearMember } from '../src/index';
import { allSamples, family, member, membershipsOf } from './helpers';

/** Specifica 013 (contracts/members-api.md). Dati finti 2026/27 come anno precedente del 2027/28. */

const schedule2027 = (): FeeSchedule =>
  ({ ...(JSON.parse(JSON.stringify(SCHEDULE_2026_27)) as FeeSchedule), associationYear: 2027 }) as FeeSchedule;

const previous = allSamples();
const byName = (last: string, first: string) => previous.find((m) => m.lastName === last && m.firstName === first)!;
const enrolled = (m: YearMember, over: Partial<YearMember> = {}): YearMember => ({ ...m, origin: 'riconferma', paidOn: '2026-11-17', ...over });

describe('memberYearView (P1–P4)', () => {
  it('P1: 37 da confermare, nessun iscritto, in ordine di nome', () => {
    const v = memberYearView({ year: 2027, previous, current: [], memberships: new Map(), schedule: schedule2027() });
    expect([v.pendingCount, v.enrolledCount]).toEqual([37, 0]);
    const names = v.rows.map((r) => `${r.member.lastName} ${r.member.firstName}`);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'it')));
    expect(v.rows.every((r) => r.status === 'pending' && r.candidate !== undefined)).toBe(true);
  });

  it('P2: dopo la conferma di MORETTI CARLA', () => {
    const moretti = enrolled(byName('MORETTI', 'CARLA'));
    const v = memberYearView({ year: 2027, previous, current: [moretti], memberships: new Map(), schedule: schedule2027() });
    expect([v.pendingCount, v.enrolledCount]).toEqual([36, 1]);
    const row = v.rows.find((r) => r.member.personId === moretti.personId)!;
    expect(row).toMatchObject({ status: 'enrolled', origin: 'riconferma', paidOn: '2026-11-17', undoable: true });
  });

  it('P3: nuovi e importati sono iscritti; riconferma senza data → senza paidOn', () => {
    const nuovo = member('bianco', { lastName: 'BIANCO', firstName: 'LUCA', birthDate: '2019-05-10', list: 'ACR', origin: 'nuovo', paidOn: '2026-11-17' });
    const { paidOn: _unused, ...vecchia } = enrolled(byName('ROSSI', 'MARIO'));
    void _unused;
    const v = memberYearView({ year: 2027, previous, current: [nuovo, vecchia], memberships: new Map(), schedule: schedule2027() });
    expect(v.rows.find((r) => r.member.personId === 'bianco')).toMatchObject({ status: 'enrolled', origin: 'nuovo' });
    expect(v.rows.find((r) => r.member.personId === vecchia.personId)?.paidOn).toBeUndefined();
    expect(v.enrolledCount).toBe(2);
  });

  it('P4: annullabile solo riconferma o nuovo fuori da famiglie', () => {
    const a = enrolled(byName('GALLO', 'LUCA'));
    const b = enrolled(byName('CONTI', 'MARTA'));
    const c = { ...byName('ROSSI', 'MARIO'), origin: 'import' as const };
    const fam = family('F', [a.personId, b.personId], { associationYear: 2027 });
    const v = memberYearView({ year: 2027, previous, current: [a, b, c], memberships: membershipsOf(fam), schedule: schedule2027() });
    const row = (id: string) => v.rows.find((r) => r.member.personId === id)!;
    expect(row(a.personId)).toMatchObject({ undoable: false, familyId: 'F' });
    expect(row(c.personId).undoable).toBe(false);
  });
});

describe('familyAfterConfirm (P5–P7)', () => {
  const gallo = enrolled(byName('GALLO', 'LUCA'));
  const conti = enrolled(byName('CONTI', 'MARTA'));
  const tommaso = enrolled(byName('GALLO', 'TOMMASO'));

  it('P5: primo → nessuna; secondo → nuova famiglia; terzo → aggiunto', () => {
    expect(familyAfterConfirm({ personId: gallo.personId, current: [gallo], families: [], memberships: new Map() })).toEqual({ kind: 'none' });
    expect(familyAfterConfirm({ personId: conti.personId, current: [gallo, conti], families: [], memberships: new Map() })).toEqual({
      kind: 'create',
      bondId: '900003',
      memberIds: [gallo.personId, conti.personId],
    });
    const fam = family('F', [gallo.personId, conti.personId], { associationYear: 2027, bondId: '900003' });
    expect(
      familyAfterConfirm({ personId: tommaso.personId, current: [gallo, conti, tommaso], families: [fam], memberships: membershipsOf(fam) }),
    ).toEqual({ kind: 'add', familyId: 'F', memberIds: [gallo.personId, conti.personId, tommaso.personId] });
  });

  it('P6: chi ha familyOptOut non entra e non fa entrare', () => {
    const giulia = enrolled(byName('GALLO', 'GIULIA'), { familyOptOut: true });
    expect(familyAfterConfirm({ personId: giulia.personId, current: [gallo, giulia], families: [], memberships: new Map() })).toEqual({ kind: 'none' });
    expect(
      familyAfterConfirm({ personId: conti.personId, current: [giulia, conti], families: [], memberships: new Map() }),
    ).toEqual({ kind: 'none' });
  });

  it('P7: senza N. Legame o già in famiglia → nessuna', () => {
    const moretti = enrolled(byName('MORETTI', 'CARLA'));
    expect(familyAfterConfirm({ personId: moretti.personId, current: [moretti], families: [], memberships: new Map() })).toEqual({ kind: 'none' });
    const fam = family('F', [gallo.personId, conti.personId], { associationYear: 2027, bondId: '900003' });
    expect(familyAfterConfirm({ personId: gallo.personId, current: [gallo, conti], families: [fam], memberships: membershipsOf(fam) })).toEqual({
      kind: 'none',
    });
  });
});

describe('familyPanel (P8–P10)', () => {
  it('P8: GALLO LUCA → i 4 componenti del 900003 con lo stato', () => {
    const gallo = enrolled(byName('GALLO', 'LUCA'));
    const p = familyPanel({ personId: gallo.personId, previous, current: [gallo], families: [], memberships: new Map() });
    expect(p.bondId).toBe('900003');
    expect(p.familyId).toBeUndefined();
    expect(p.members.map((m) => [m.member.firstName, m.status, m.inFamily])).toEqual([
      ['LUCA', 'enrolled', false],
      ['MARTA', 'pending', false],
      ['TOMMASO', 'pending', false],
      ['GIULIA', 'pending', false],
    ]);
  });

  it('P8: con la famiglia confermata i componenti effettivi sono nella famiglia', () => {
    const gallo = enrolled(byName('GALLO', 'LUCA'));
    const conti = enrolled(byName('CONTI', 'MARTA'));
    const fam = family('F', [gallo.personId, conti.personId], { associationYear: 2027, bondId: '900003' });
    const p = familyPanel({ personId: conti.personId, previous, current: [gallo, conti], families: [fam], memberships: membershipsOf(fam) });
    expect(p.familyId).toBe('F');
    expect(p.members.filter((m) => m.inFamily).map((m) => m.member.firstName)).toEqual(['LUCA', 'MARTA']);
    expect(p.members).toHaveLength(4);
  });

  it('P9/P10: aggiungibili = iscritti fuori da famiglie; senza famiglia né legame solo la persona', () => {
    const moretti = enrolled(byName('MORETTI', 'CARLA'));
    const barbieri = enrolled(byName('BARBIERI', 'SALVATORE'));
    const gallo = enrolled(byName('GALLO', 'LUCA'));
    const conti = enrolled(byName('CONTI', 'MARTA'));
    const fam = family('F', [gallo.personId, conti.personId], { associationYear: 2027, bondId: '900003' });
    const p = familyPanel({ personId: moretti.personId, previous, current: [moretti, barbieri, gallo, conti], families: [fam], memberships: membershipsOf(fam) });
    expect(p.members.map((m) => m.member.lastName)).toEqual(['MORETTI']);
    expect(p.addable.map((m) => m.lastName)).toEqual(['BARBIERI']);
  });
});

describe('familyPanel – iscritti senza famiglia (correzione 013, P11)', () => {
  it('tutti iscritti senza famiglia → tutti riuniscibili', () => {
    const gallo = enrolled(byName('GALLO', 'LUCA'));
    const conti = enrolled(byName('CONTI', 'MARTA'));
    const tommaso = enrolled(byName('GALLO', 'TOMMASO'));
    const p = familyPanel({ personId: gallo.personId, previous, current: [gallo, conti, tommaso], families: [], memberships: new Map() });
    expect(p.joinable).toEqual([gallo.personId, conti.personId, tommaso.personId]);
  });

  it('famiglia di 2 e un iscritto fuori → solo lui; chi è in un’altra famiglia no', () => {
    const gallo = enrolled(byName('GALLO', 'LUCA'));
    const conti = enrolled(byName('CONTI', 'MARTA'));
    const tommaso = enrolled(byName('GALLO', 'TOMMASO'));
    const giulia = enrolled(byName('GALLO', 'GIULIA'));
    const fam = family('F', [gallo.personId, conti.personId], { associationYear: 2027, bondId: '900003' });
    const other = family('G', [giulia.personId, 'x'], { associationYear: 2027 });
    const p = familyPanel({
      personId: gallo.personId,
      previous,
      current: [gallo, conti, tommaso, giulia],
      families: [fam, other],
      memberships: membershipsOf(fam, other),
    });
    expect(p.joinable).toEqual([tommaso.personId]);
  });
});
