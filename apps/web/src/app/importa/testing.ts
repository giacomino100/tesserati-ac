import { REQUIRED_COLUMNS, type ImportPlan, type SheetInput } from '@tesseramento/import';
import { AlreadyImportedError, NoFeeScheduleError, type ImportBackend, type YearStatus } from './import-backend';
import type { WorkbookReader } from './workbook-reader';

/** Strumenti di prova condivisi dagli spec dell'import (nessun dato reale). */

export type FakeRow = Partial<Record<(typeof REQUIRED_COLUMNS)[number], unknown>>;

/** Riga ACR inventata; `over` sostituisce singole colonne. */
export function fakeRow(n: number, over: FakeRow = {}): FakeRow {
  return {
    'Anno Associativo': 'Anno 2026',
    Cognome: `PROVA${String(n).padStart(2, '0')}`,
    Nome: 'ALFA',
    Sesso: 'F',
    'Data Nascita': '09/04/2016',
    'Cod. Fiscale': null,
    Settore: 'RAGAZZI',
    "Fasce d'età": '9/11',
    Legame: 'C3',
    'N. Legame': 900002,
    ...over,
  };
}

/** Foglio con le sole colonne necessarie. */
export function sheetInput(rows: FakeRow[], over: Partial<SheetInput> = {}): SheetInput {
  const header = [...REQUIRED_COLUMNS];
  return {
    sheetNames: ['ElencoAdesioniExcel'],
    rows: [header, ...rows.map((r) => header.map((h) => r[h] ?? null))],
    date1904: false,
    ...over,
  };
}

/** Lettore finto: restituisce il foglio dato, o lancia l'errore dato. */
export class FakeReader implements WorkbookReader {
  constructor(
    public result: SheetInput | Error = sheetInput(Array.from({ length: 15 }, (_, i) => fakeRow(i + 1))),
  ) {}

  async read(): Promise<SheetInput> {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

export function fakeFile(): File {
  return new File(['finto'], 'ElencoAdesioni_ACR.xlsx');
}

export interface FakeCommit {
  readonly plan: ImportPlan;
  readonly email: string;
}

/** Backend finto in memoria con la stessa logica di rifiuto del backend Firestore. */
export class FakeImportBackend implements ImportBackend {
  /** Anni con listino. */
  feeScheduleYears = new Set<number>([2026]);
  /** Anni con l'elenco ACR già importato. */
  importedYears = new Set<number>();
  persons = new Map<string, string>();
  commits: FakeCommit[] = [];
  failCommitWith: Error | undefined;
  /** Se impostato, `commit` resta in attesa finché non viene chiamato. */
  hold: (() => void) | undefined;
  private nextId = 1;

  async yearStatus(year: number): Promise<YearStatus> {
    return { hasFeeSchedule: this.feeScheduleYears.has(year), alreadyImported: this.importedYears.has(year) };
  }

  async existingPersons(): Promise<Map<string, string>> {
    return new Map(this.persons);
  }

  async commit(plan: ImportPlan, email: string): Promise<void> {
    if (this.hold) await new Promise<void>((resolve) => (this.hold = resolve));
    if (this.failCommitWith) throw this.failCommitWith;
    if (this.importedYears.has(plan.associationYear)) throw new AlreadyImportedError();
    if (!this.feeScheduleYears.has(plan.associationYear)) throw new NoFeeScheduleError();
    for (const row of plan.newPersons) this.persons.set(row.identityKey, `p${this.nextId++}`);
    this.importedYears.add(plan.associationYear);
    this.commits.push({ plan, email });
  }
}
