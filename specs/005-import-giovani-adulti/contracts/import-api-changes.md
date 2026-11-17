# Contract: modifiche a `@tesseramento/import`

Base: [contratto della 004](../../004-import-excel-acr/contracts/import-api.md).

```ts
export type AdhesionList = 'ACR' | 'GIOVANI' | 'ADULTI';
export const ADHESION_LISTS: readonly AdhesionList[];          // ['ACR', 'GIOVANI', 'ADULTI']
export function sectorOf(list: AdhesionList): string;          // 'RAGAZZI' | 'GIOVANI' | 'ADULTI'
export function listLabel(list: AdhesionList): string;         // 'ACR' | 'Giovani' | 'Adulti'
export function importId(year: number, list: AdhesionList): string;  // '2026-GIOVANI'
export function listOfImportId(id: string): AdhesionList | undefined;

/** Settori delle righe → elenco riconosciuto, parità, o undefined (sconosciuto). */
export function recognizeList(sectors: readonly (string | undefined)[]):
  | { kind: 'recognized'; list: AdhesionList }
  | { kind: 'tie'; candidates: AdhesionList[] }
  | undefined;

/** Invariata nella firma; ok → anche `recognition`; errore `notAcr` → `unknownList`. */
export function parseAdhesionSheet(input: SheetInput): ParsedImport;

/** Ora riceve l'elenco scelto e le adesioni dell'anno già in archivio. */
export function planImport(
  parsed: ParsedImportOk,
  list: AdhesionList,
  existingPersons: ReadonlyMap<string, string>,          // identityKey → personId
  adhesionsOfYear?: ReadonlyMap<string, AdhesionList>,   // personId → elenco
): ImportPlan;
```

`acrImportId(year)` resta per compatibilità (= `importId(year, 'ACR')`).

## Garanzie verificate dai test

| # | Caso | Atteso |
|---|---|---|
| Q1 | File Giovani finto | ok, 2026, 8 righe, `recognized GIOVANI` |
| Q2 | File Adulti finto | ok, 2026, 14 righe, `recognized ADULTI` |
| Q3 | File ACR finto | come P1 della 004, `recognized ACR` |
| Q4 | 5 GIOVANI + 5 ADULTI | ok con `tie` `['GIOVANI','ADULTI']` |
| Q5 | 3 GIOVANI + 1 ADULTI | `recognized GIOVANI`; la riga ADULTI resta con settore `ADULTI` |
| Q6 | Settore più frequente `ALTRO` (anche in parità con uno noto) | errore `unknownList` |
| Q7 | `planImport` con persona esistente che ha già un'adesione ACR nell'anno | riga saltata `alreadyInYear` `fromList: 'ACR'`, non conta nelle adesioni |
| Q8 | `planImport` con persona esistente senza adesione nell'anno | riusata, adesione creata |
| Q9 | `planImport` con elenco `ADULTI` | `importId` `2026-ADULTI`, `list` `ADULTI` |
| Q10 | I tre file finti in sequenza (persone e adesioni accumulate) | 37 persone, 37 adesioni, 9 nuclei completi |
