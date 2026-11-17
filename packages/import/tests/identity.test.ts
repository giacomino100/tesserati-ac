import { describe, expect, it } from 'vitest';
import { identityKey } from '../src/index';

describe('identityKey', () => {
  it('normalizza maiuscole e spazi', () => {
    expect(identityKey('Rossi ', 'mario', '1965-03-12')).toBe('ROSSI|MARIO|1965-03-12');
    expect(identityKey('ROSSI', ' MARIO', '1965-03-12')).toBe('ROSSI|MARIO|1965-03-12');
  });

  it('toglie gli accenti', () => {
    expect(identityKey('GRECO', 'NICOLÒ', '2011-11-11')).toBe('GRECO|NICOLO|2011-11-11');
    expect(identityKey('Pàolì', 'José', '2000-01-01')).toBe('PAOLI|JOSE|2000-01-01');
  });

  it('riduce gli spazi interni', () => {
    expect(identityKey('DE  LUCA', 'ANNA  MARIA', '1990-01-01')).toBe('DE LUCA|ANNA MARIA|1990-01-01');
  });
});
