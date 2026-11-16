import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './fixtures/examples';

const DOC = fileURLToPath(new URL('../../../docs/dominio/regole-quote.md', import.meta.url));

/** Righe `| <n> | <nucleo> | <totale> | ...` delle tabelle di §3 (totale tipo `70,00`). */
function parseDocTotals(): Map<number, number> {
  const text = readFileSync(DOC, 'utf8');
  const start = text.indexOf('## 3. Esempi');
  const end = text.indexOf('## 4.');
  const section = text.slice(start, end);
  const totals = new Map<number, number>();
  for (const line of section.split(/\r?\n/)) {
    const m = /^\|\s*(\d+)\s*\|[^|]*\|\s*(\d+),(\d{2})\s*\|/.exec(line);
    if (m) totals.set(Number(m[1]), Number(m[2]) * 100 + Number(m[3]));
  }
  return totals;
}

describe('examples sync', () => {
  const docTotals = parseDocTotals();

  it('il documento contiene esattamente i casi 1–29', () => {
    expect([...docTotals.keys()].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 29 }, (_, i) => i + 1),
    );
  });

  it('la fixture contiene esattamente i casi 1–29', () => {
    expect(EXAMPLES.map((e) => e.caseNumber)).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
  });

  it.each(EXAMPLES.map((e) => [e.caseNumber, e] as const))(
    'caso %i: totale della fixture = totale del documento',
    (n, example) => {
      expect(example.expectedTotalCents).toBe(docTotals.get(n));
    },
  );
});
