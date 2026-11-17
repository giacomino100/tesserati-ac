/**
 * Date di nascita come giorni di calendario "AAAA-MM-GG", calcolate con aritmetica intera senza
 * usare `Date` né il fuso orario (research R4).
 */

/** Giorni dal 1970-01-01 dell'epoca Excel: 1899-12-30 (sistema 1900) e 1904-01-01 (sistema 1904). */
const EPOCH_1900 = -25569;
const EPOCH_1904 = -24107;
/** Primo seriale affidabile nel sistema 1900 (1900-03-01): prima c'è il finto 29/02/1900 di Excel. */
const FIRST_SAFE_SERIAL_1900 = 61;

/** Giorni dal 1970-01-01 → anno, mese, giorno (algoritmo "civil from days" di H. Hinnant). */
function civilFromDays(days: number): [number, number, number] {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return [year, month, day];
}

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

function format(year: number, month: number, day: number): string | undefined {
  if (year < 1900 || year > 2999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return undefined;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Seriale Excel (sistema 1900 o 1904), testo "GG/MM/AAAA" o "AAAA-MM-GG" → "AAAA-MM-GG".
 * Tutto il resto (date inesistenti, testi, valori vuoti) → `undefined`.
 */
export function toIsoDate(value: unknown, date1904: boolean): string | undefined {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined;
    const serial = Math.floor(value);
    if (date1904 ? serial < 0 : serial < FIRST_SAFE_SERIAL_1900) return undefined;
    return format(...civilFromDays(serial + (date1904 ? EPOCH_1904 : EPOCH_1900)));
  }
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  const italian = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (italian) return format(Number(italian[3]), Number(italian[2]), Number(italian[1]));
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return format(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  return undefined;
}
