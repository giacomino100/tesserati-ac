import {
  ADHESION_LISTS,
  importId,
  REQUIRED_COLUMNS,
  type AdhesionList,
  type ImportPlan,
  type SheetInput,
} from '@tesseramento/import';
import {
  AlreadyImportedError,
  ImportContextChangedError,
  NoFeeScheduleError,
  type ImportBackend,
  type YearContext,
} from './import-backend';
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
  /** Elenchi già importati, come ID del segno ("2026-ACR"). */
  importedLists = new Set<string>();
  /** Persone in archivio: chiave di identità → ID. */
  persons = new Map<string, string>();
  /** Adesioni per anno: ID persona → elenco. */
  adhesions = new Map<number, Map<string, AdhesionList>>();
  commits: FakeCommit[] = [];
  failCommitWith: Error | undefined;
  private gate: { promise: Promise<void>; resolve: () => void } | undefined;
  private nextId = 1;

  /** Da qui in poi `commit` resta in attesa finché non si chiama `release()`. */
  pause(): void {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => (resolve = r));
    this.gate = { promise, resolve };
  }

  release(): void {
    this.gate?.resolve();
    this.gate = undefined;
  }

  /** Una persona già importata nell'anno da un elenco (con il suo segno di import). */
  addMember(year: number, identity: string, list: AdhesionList): string {
    const id = this.persons.get(identity) ?? `p${this.nextId++}`;
    this.persons.set(identity, id);
    this.yearAdhesions(year).set(id, list);
    this.importedLists.add(importId(year, list));
    return id;
  }

  async yearContext(year: number): Promise<YearContext> {
    return {
      hasFeeSchedule: this.feeScheduleYears.has(year),
      importedLists: ADHESION_LISTS.filter((l) => this.importedLists.has(importId(year, l))),
      persons: new Map(this.persons),
      adhesions: new Map(this.yearAdhesions(year)),
    };
  }

  async commit(plan: ImportPlan, email: string): Promise<void> {
    if (this.gate) await this.gate.promise;
    if (this.failCommitWith) throw this.failCommitWith;
    if (this.importedLists.has(plan.importId)) throw new AlreadyImportedError(plan.list);
    if (!this.feeScheduleYears.has(plan.associationYear)) throw new NoFeeScheduleError();
    const year = this.yearAdhesions(plan.associationYear);
    if (plan.reusedPersons.some(({ personId }) => year.has(personId))) throw new ImportContextChangedError();
    for (const row of plan.newPersons) {
      const id = `p${this.nextId++}`;
      this.persons.set(row.identityKey, id);
      year.set(id, plan.list);
    }
    for (const { personId } of plan.reusedPersons) year.set(personId, plan.list);
    this.importedLists.add(plan.importId);
    this.commits.push({ plan, email });
  }

  private yearAdhesions(year: number): Map<string, AdhesionList> {
    let map = this.adhesions.get(year);
    if (!map) this.adhesions.set(year, (map = new Map()));
    return map;
  }
}
