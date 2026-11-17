import type { ImportPlan, ImportRow, ParsedImportOk } from './types';

/** ID del segno di import dell'elenco ACR di un anno (es. "2026-ACR"). */
export function acrImportId(year: number): string {
  return `${year}-ACR`;
}

/**
 * Righe valide + persone già in archivio (chiave di identità → ID) → cosa scrivere:
 * le persone nuove si creano, quelle già presenti si riusano senza modificarle (FR-010).
 */
export function planImport(parsed: ParsedImportOk, existing: ReadonlyMap<string, string>): ImportPlan {
  const newPersons: ImportRow[] = [];
  const reusedPersons: { row: ImportRow; personId: string }[] = [];
  for (const row of parsed.rows) {
    const personId = existing.get(row.identityKey);
    if (personId === undefined) newPersons.push(row);
    else reusedPersons.push({ row, personId });
  }
  return {
    associationYear: parsed.associationYear,
    importId: acrImportId(parsed.associationYear),
    newPersons,
    reusedPersons,
    adhesions: parsed.rows.length,
    skipped: parsed.skipped,
  };
}
