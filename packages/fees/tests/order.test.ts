import { describe, expect, it } from 'vitest';
import { orderMembers } from '../src/order';
import type { HouseholdMember } from '../src/types';

const m = (id: string, lastName: string, firstName: string, birthDate: string): HouseholdMember => ({
  id,
  lastName,
  firstName,
  birthDate,
});

describe('orderMembers', () => {
  it('ordina dal più anziano al più giovane', () => {
    const r = orderMembers([m('a', 'X', 'X', '2010-01-01'), m('b', 'X', 'X', '1980-01-01')]);
    expect(r.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('a parità di data: cognome, poi nome, poi id', () => {
    const r = orderMembers([
      m('4', 'Rossi', 'Mario', '2015-01-01'),
      m('3', 'Rossi', 'Mario', '2015-01-01'),
      m('2', 'Rossi', 'Anna', '2015-01-01'),
      m('1', 'Bianchi', 'Zeno', '2015-01-01'),
    ]);
    expect(r.map((x) => x.id)).toEqual(['1', '2', '3', '4']);
  });

  it('non modifica l\'input', () => {
    const input = Object.freeze([m('a', 'X', 'X', '2010-01-01'), m('b', 'X', 'X', '1980-01-01')]);
    const r = orderMembers(input);
    expect(r).not.toBe(input);
    expect(input.map((x) => x.id)).toEqual(['a', 'b']);
  });
});
