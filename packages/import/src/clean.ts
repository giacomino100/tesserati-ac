/**
 * Testo pulito di una cella: spazi iniziali, finali e doppi tolti; cella vuota, stringa vuota e
 * stringa `''` (due apici, difetto dell'export) diventano `undefined`. I numeri diventano testo
 * senza decimali inutili (es. `N. Legame` 900002 → "900002").
 */
export function cleanText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  let text: string;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined;
    text = Number.isInteger(value) ? value.toFixed(0) : String(value);
  } else if (typeof value === 'string') {
    text = value;
  } else if (typeof value === 'boolean') {
    text = String(value);
  } else {
    return undefined;
  }
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned === '' || cleaned === "''") return undefined;
  return cleaned;
}

/**
 * Anno associativo (anno di inizio) dalla colonna "Anno Associativo" dell'export: "Anno N" = (N−1)/N, quindi
 * "Anno 2026" → 2025 (glossario, corretto il 2026-11-17, specifica 008). Qualsiasi altra forma → `undefined`.
 */
export function parseAssociationYear(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^Anno (\d{4})$/i.exec(cleanText(value) ?? '');
  return match ? Number(match[1]) - 1 : undefined;
}
