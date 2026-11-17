import { InjectionToken } from '@angular/core';
import { EXPECTED_SHEET, type SheetInput } from '@tesseramento/import';

/** Il file non è un Excel leggibile. */
export class UnreadableFileError extends Error {
  constructor() {
    super('unreadable-file');
    this.name = 'UnreadableFileError';
  }
}

/** Lettura del file Excel sul dispositivo (FR-002): nessun invio in rete, nessun log del contenuto. */
export interface WorkbookReader {
  read(file: File): Promise<SheetInput>;
}

/**
 * SheetJS viene caricato solo qui, con `import()` dinamico, per tenerlo fuori dal bundle iniziale
 * (research R1). I valori sono grezzi: le date restano seriali Excel (research R4).
 */
export async function readWorkbook(file: File): Promise<SheetInput> {
  const XLSX = await import('xlsx');
  let workbook: import('xlsx').WorkBook;
  try {
    workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', dense: true });
  } catch {
    throw new UnreadableFileError();
  }
  const sheet = workbook.Sheets[EXPECTED_SHEET];
  const rows = sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null }) : [];
  return {
    sheetNames: workbook.SheetNames,
    rows,
    date1904: Boolean(workbook.Workbook?.WBProps?.date1904),
  };
}

export const WORKBOOK_READER = new InjectionToken<WorkbookReader>('WORKBOOK_READER', {
  providedIn: 'root',
  factory: (): WorkbookReader => ({ read: readWorkbook }),
});
