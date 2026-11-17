import { importId, type AdhesionList } from './lists';
import type { ImportPlan, ImportRow, ParsedImportOk, SkippedRow } from './types';

/** ID del segno di import dell'elenco ACR di un anno (es. "2026-ACR"); scorciatoia della 004. */
export function acrImportId(year: number): string {
  return importId(year, 'ACR');
}

/**
 * Righe valide + persone già in archivio + adesioni dell'anno → cosa scrivere (specifiche 004 e 005):
 * - persona nuova → si crea, con la sua adesione;
 * - persona già presente senza adesione nell'anno → si riusa senza modificarla (FR-010 della 004);
 * - persona già presente con un'adesione nell'anno da un altro elenco → riga saltata (FR-006 della 005).
 */
export function planImport(
  parsed: ParsedImportOk,
  list: AdhesionList,
  existingPersons: ReadonlyMap<string, string>,
  adhesionsOfYear: ReadonlyMap<string, AdhesionList> = new Map(),
): ImportPlan {
  const newPersons: ImportRow[] = [];
  const reusedPersons: { row: ImportRow; personId: string }[] = [];
  const alreadyInYear: SkippedRow[] = [];
  for (const row of parsed.rows) {
    const personId = existingPersons.get(row.identityKey);
    if (personId === undefined) {
      newPersons.push(row);
      continue;
    }
    const fromList = adhesionsOfYear.get(personId);
    if (fromList === undefined) reusedPersons.push({ row, personId });
    else alreadyInYear.push({ rowNumber: row.rowNumber, reason: 'alreadyInYear', fromList });
  }
  return {
    associationYear: parsed.associationYear,
    list,
    importId: importId(parsed.associationYear, list),
    newPersons,
    reusedPersons,
    adhesions: newPersons.length + reusedPersons.length,
    skipped: [...parsed.skipped, ...alreadyInYear].sort((a, b) => a.rowNumber - b.rowNumber),
  };
}
