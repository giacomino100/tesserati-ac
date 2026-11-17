import { describe, expect, it } from 'vitest';
import { suggestFamilies } from '../src/index';
import { allSamples, family, member, membershipsOf, sampleMembers } from './helpers';

describe('suggestFamilies – file finti (F2, F3, F11)', () => {
  it('tre elenchi del 2026: 9 famiglie suggerite, nessun avviso, 10 senza famiglia', () => {
    const result = suggestFamilies(allSamples(), [], new Map());
    expect(result.suggested.map((f) => f.bondId)).toEqual([
      '900001', '900002', '900003', '900004', '900005', '900006', '900007', '900008', '900009',
    ]);
    expect(result.suggested.map((f) => f.members.length)).toEqual([2, 3, 4, 6, 2, 3, 2, 3, 2]);
    expect(result.suggested.every((f) => f.warnings.length === 0 && f.confirmable)).toBe(true);
    expect(result.withoutFamily).toHaveLength(10);
    expect(result.additions).toEqual([]);
    expect(result.confirmed).toEqual([]);
  });

  it('componenti dal più anziano al più giovane', () => {
    const f = suggestFamilies(allSamples(), [], new Map()).suggested.find((s) => s.bondId === '900004')!;
    const dates = f.members.map((m) => m.birthDate);
    expect(dates).toEqual([...dates].sort());
    expect(f.bond).toBe('C6');
  });

  it('solo l’ACR: la famiglia 900002 ha 1 componente e l’avviso sul Legame', () => {
    const result = suggestFamilies(sampleMembers('ElencoAdesioni_ACR.xlsx', 'ACR'), [], new Map());
    const f = result.suggested.find((s) => s.bondId === '900002')!;
    expect(f.members).toHaveLength(1);
    expect(f.confirmable).toBe(false);
    expect(f.warnings).toEqual([{ kind: 'sizeMismatch', expected: 3, found: 1 }]);
  });
});

describe('suggestFamilies – avvisi (F4)', () => {
  it('Legame diversi nello stesso N. Legame', () => {
    const result = suggestFamilies(
      [member('a', { bond: 'C3', bondId: '1' }), member('b', { bond: 'C4', bondId: '1' }), member('c', { bond: 'C3', bondId: '1' })],
      [],
      new Map(),
    );
    expect(result.suggested[0]?.warnings).toEqual([
      { kind: 'bondMismatch', bonds: ['C3', 'C4'] },
    ]);
  });
});

describe('suggestFamilies – famiglie confermate (F5, F6, F12)', () => {
  const members = [
    member('p1', { bond: 'C4', bondId: '900003', birthDate: '1978-06-30' }),
    member('p2', { bond: 'C4', bondId: '900003', birthDate: '1981-02-14' }),
    member('p3', { bond: 'C4', bondId: '900003', birthDate: '2014-09-01' }),
    member('p4', { bond: 'C4', bondId: '900003', birthDate: '2019-12-24' }),
    member('s1'),
  ];

  it('famiglia confermata con 3 dei 4: il 4° è un’aggiunta proposta, non una nuova suggerita', () => {
    const f = family('fam-1', ['p1', 'p2', 'p3'], { bondId: '900003' });
    const result = suggestFamilies(members, [f], membershipsOf(f));
    expect(result.suggested).toEqual([]);
    expect(result.additions.map((a) => [a.familyId, a.member.personId])).toEqual([['fam-1', 'p4']]);
    expect(result.confirmed.map((c) => c.members.map((m) => m.personId))).toEqual([['p1', 'p2', 'p3']]);
    expect(result.withoutFamily.map((m) => m.personId)).toEqual(['s1']);
  });

  it('persona in una famiglia manuale: fuori dalla suggerita del suo N. Legame, indicata in elsewhere', () => {
    const manual = family('man', ['p4', 's1'], { origin: 'manuale' });
    const result = suggestFamilies(members, [manual], membershipsOf(manual));
    const suggested = result.suggested[0]!;
    expect(suggested.members.map((m) => m.personId)).toEqual(['p1', 'p2', 'p3']);
    expect(suggested.elsewhere.map((e) => [e.member.personId, e.familyId])).toEqual([['p4', 'man']]);
    expect(suggested.warnings).toEqual([]);
    expect(result.withoutFamily).toEqual([]);
  });

  it('memberIds incoerenti: conta l’appartenenza; appartenenze orfane ignorate', () => {
    const a = family('A', ['p1', 'p2', 's1'], { bondId: '900003' });
    const b = family('B', ['s1', 'p3'], { origin: 'manuale' });
    const memberships = new Map([
      ['p1', 'A'],
      ['p2', 'A'],
      ['s1', 'B'],
      ['p3', 'B'],
      ['p4', 'inesistente'],
    ]);
    const result = suggestFamilies(members, [a, b], memberships);
    const viewA = result.confirmed.find((c) => c.family.id === 'A')!;
    expect(viewA.members.map((m) => m.personId)).toEqual(['p1', 'p2']);
    expect(viewA.warnings).toEqual([{ kind: 'inconsistent', personIds: ['s1'] }]);
    expect(result.confirmed.find((c) => c.family.id === 'B')!.warnings).toEqual([]);
    expect(result.additions.map((x) => x.member.personId)).toEqual(['p4']);
  });
});
