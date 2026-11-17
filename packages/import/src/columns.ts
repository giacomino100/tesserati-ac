import { cleanText } from './clean';

/** Foglio atteso nell'export nazionale (docs/dominio/excel-esempio/README.md). */
export const EXPECTED_SHEET = 'ElencoAdesioniExcel';

/**
 * Le sole colonne lette dall'import (constitution III): tutte le altre (indirizzo, contatti, Pagato,
 * MLAC/MSAC, colonne escluse) non vengono mai copiate.
 */
export const REQUIRED_COLUMNS = [
  'Anno Associativo',
  'Cognome',
  'Nome',
  'Sesso',
  'Data Nascita',
  'Cod. Fiscale',
  'Settore',
  "Fasce d'età",
  'Legame',
  'N. Legame',
] as const;

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

export type ColumnIndex = Readonly<Record<RequiredColumn, number>>;

/**
 * Posizione di ogni colonna necessaria, cercata per nome (ordine e colonne in più ignorati).
 * Restituisce le colonne mancanti nell'ordine di `REQUIRED_COLUMNS`.
 */
export function locateColumns(header: readonly unknown[]): { index: ColumnIndex } | { missing: RequiredColumn[] } {
  const names = header.map((h) => cleanText(h));
  const found: Partial<Record<RequiredColumn, number>> = {};
  const missing: RequiredColumn[] = [];
  for (const column of REQUIRED_COLUMNS) {
    const position = names.indexOf(column);
    if (position === -1) missing.push(column);
    else found[column] = position;
  }
  return missing.length > 0 ? { missing } : { index: found as ColumnIndex };
}
