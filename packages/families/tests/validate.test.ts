import { describe, expect, it } from 'vitest';
import { validateFamily } from '../src/index';
import { member } from './helpers';

describe('validateFamily (F7–F10)', () => {
  const members = [member('a'), member('b'), member('c'), member('d')];
  const memberships = new Map([
    ['c', 'fam-1'],
    ['d', 'fam-1'],
  ]);

  it('almeno 2 componenti (anche contando i doppioni una volta)', () => {
    expect(validateFamily(['a'], members, memberships)).toEqual([{ kind: 'tooFew' }]);
    expect(validateFamily(['a', 'a'], members, memberships)).toEqual([{ kind: 'tooFew' }]);
    expect(validateFamily(['a', 'b'], members, memberships)).toEqual([]);
  });

  it('persona già in un’altra famiglia', () => {
    expect(validateFamily(['a', 'c'], members, memberships)).toEqual([
      { kind: 'inOtherFamily', personId: 'c', familyId: 'fam-1' },
    ]);
  });

  it('modificando la propria famiglia i propri componenti non contano', () => {
    expect(validateFamily(['c', 'd', 'a'], members, memberships, 'fam-1')).toEqual([]);
  });

  it('persona che non è un tesserato dell’anno', () => {
    expect(validateFamily(['a', 'x'], members, memberships)).toEqual([{ kind: 'notInYear', personId: 'x' }]);
  });
});
