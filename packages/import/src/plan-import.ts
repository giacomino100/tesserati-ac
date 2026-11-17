import { importId, type AdhesionList } from './lists';
import { findCandidates } from './similarity';
import type {
  ArchivedPerson,
  DuplicateDecision,
  ImportPlan,
  ImportRow,
  ParsedImportOk,
  PossibleDuplicate,
  SkippedRow,
  TaxCodeMatch,
} from './types';

/** ID del segno di import dell'elenco ACR di un anno (es. "2026-ACR"); scorciatoia della 004. */
export function acrImportId(year: number): string {
  return importId(year, 'ACR');
}

/**
 * Righe valide + archivio + adesioni dell'anno + scelte dell'utente → cosa scrivere (specifiche 004–006).
 * Ordine per ogni riga (data-model.md della 006):
 * 1. codice fiscale valido presente in archivio → quella persona (prevale, regole-famiglia.md §2);
 * 2. chiave cognome + nome + data in archivio → persona riusata;
 * 3. persone simili → possibile doppione: senza scelta resta in attesa, poi "Stessa persona" o "Persona diversa";
 * 4. altrimenti → persona nuova.
 * Una persona esistente con un'adesione nell'anno → riga saltata `alreadyInYear` (`alreadyRenewed` se l'adesione è
 * una riconferma, specifica 008; `alreadyAdded` se inserita a mano, specifica 009); due righe sulla stessa
 * persona → la seconda `duplicate`. L'anagrafica salvata non cambia mai.
 */
export function planImport(
  parsed: ParsedImportOk,
  list: AdhesionList,
  archive: readonly ArchivedPerson[],
  adhesionsOfYear: ReadonlyMap<string, AdhesionList> = new Map(),
  decisions: ReadonlyMap<number, DuplicateDecision> = new Map(),
  manualIds: ReadonlyMap<string, 'riconferma' | 'nuovo'> = new Map(),
): ImportPlan {
  const byKey = new Map(archive.map((p) => [p.identityKey, p]));
  const byTaxCode = new Map<string, ArchivedPerson>();
  for (const p of archive) if (p.taxCode) byTaxCode.set(p.taxCode, p);

  const newPersons: ImportRow[] = [];
  const reusedPersons: { row: ImportRow; personId: string }[] = [];
  const extraSkipped: SkippedRow[] = [];
  const duplicates: PossibleDuplicate[] = [];
  const taxCodeMatches: TaxCodeMatch[] = [];
  const rowOfPerson = new Map<string, number>();
  let pendingDuplicates = 0;
  let confirmedSame = 0;

  const names = (row: ImportRow) => ({ lastName: row.lastName, firstName: row.firstName });

  /** Adesione alla persona esistente, se non ne ha già una nell'anno né un'altra riga del file. */
  const reuse = (row: ImportRow, personId: string): void => {
    const fromList = adhesionsOfYear.get(personId);
    const firstRow = rowOfPerson.get(personId);
    const manual = manualIds.get(personId);
    if (manual) {
      extraSkipped.push({ rowNumber: row.rowNumber, reason: manual === 'riconferma' ? 'alreadyRenewed' : 'alreadyAdded', ...names(row) });
    } else if (fromList !== undefined) {
      extraSkipped.push({ rowNumber: row.rowNumber, reason: 'alreadyInYear', fromList, ...names(row) });
    } else if (firstRow !== undefined) {
      extraSkipped.push({ rowNumber: row.rowNumber, reason: 'duplicate', duplicateOf: firstRow, ...names(row) });
    } else {
      rowOfPerson.set(personId, row.rowNumber);
      reusedPersons.push({ row, personId });
    }
  };

  for (const row of parsed.rows) {
    const byCode = row.taxCode ? byTaxCode.get(row.taxCode) : undefined;
    if (byCode) {
      taxCodeMatches.push({ row, person: byCode, sameKey: byCode.identityKey === row.identityKey });
      reuse(row, byCode.id);
      continue;
    }
    const exact = byKey.get(row.identityKey);
    if (exact) {
      reuse(row, exact.id);
      continue;
    }
    const candidates = findCandidates(row, archive);
    if (candidates.length === 0) {
      newPersons.push(row);
      continue;
    }
    const chosen = decisions.get(row.rowNumber);
    const decision = chosen === 'new' || candidates.some((c) => c.id === chosen) ? chosen : undefined;
    duplicates.push({ row, candidates, ...(decision === undefined ? {} : { decision }) });
    if (decision === undefined) pendingDuplicates++;
    else if (decision === 'new') newPersons.push(row);
    else {
      confirmedSame++;
      reuse(row, decision);
    }
  }

  return {
    associationYear: parsed.associationYear,
    list,
    importId: importId(parsed.associationYear, list),
    newPersons,
    reusedPersons,
    adhesions: newPersons.length + reusedPersons.length,
    skipped: [...parsed.skipped, ...extraSkipped].sort((a, b) => a.rowNumber - b.rowNumber),
    duplicates,
    pendingDuplicates,
    taxCodeMatches,
    confirmedSame,
  };
}
