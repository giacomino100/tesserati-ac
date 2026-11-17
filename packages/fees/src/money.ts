export type MoneyErrorCode = 'required' | 'notNumber' | 'tooManyDecimals' | 'notPositive';

export type ParseEurosResult =
  | { ok: true; cents: number }
  | { ok: false; code: MoneyErrorCode };

const AMOUNT_RE = /^(-)?(\d+)(?:[.,](\d+))?$/;

/**
 * Importo scritto dall'utente in euro → centesimi interi.
 * Virgola o punto come separatore decimale, al massimo due decimali, niente separatori delle
 * migliaia, solo importi positivi. Lavora sulle cifre del testo: nessun numero decimale, nessun
 * arrotondamento ("26,555" è un errore, non 26,56).
 */
export function parseEuros(text: string): ParseEurosResult {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, code: 'required' };
  const m = AMOUNT_RE.exec(trimmed);
  if (!m) return { ok: false, code: 'notNumber' };
  const [, minus, whole = '', fraction = ''] = m;
  if (fraction.length > 2) return { ok: false, code: 'tooManyDecimals' };
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return { ok: false, code: 'notNumber' };
  if (minus || cents === 0) return { ok: false, code: 'notPositive' };
  return { ok: true, cents };
}

/** Centesimi interi → euro con virgola e due decimali (2600 → "26,00"). */
export function formatEuros(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = String(Math.abs(cents % 100)).padStart(2, '0');
  return `${whole},${fraction}`;
}
