# Contract: modifiche a `@tesseramento/import`

Base: contratti della [004](../../004-import-excel-acr/contracts/import-api.md) e della
[005](../../005-import-giovani-adulti/contracts/import-api-changes.md).

```ts
export function editDistance(a: string, b: string): number;
/** Nomi normalizzati diversi: distanza ≤ 2 o uno contenuto nell'altro come parole intere, in qualsiasi posizione. */
export function namesSimilar(a: string, b: string): boolean;
/** Date "AAAA-MM-GG" diverse: una sola cifra diversa, o giorno e mese scambiati. */
export function datesSimilar(a: string, b: string): boolean;
/** Persone dell'archivio simili alla riga (research R3). */
export function findCandidates(row: ImportRow, archive: readonly ArchivedPerson[]): ArchivedPerson[];

/** Avvisi età/settore dal listino (research R7). Dipende solo da funzioni pure di @tesseramento/fees. */
export function ageWarnings(rows: readonly ImportRow[], schedule: FeeSchedule): AgeWarning[];

export function planImport(
  parsed: ParsedImportOk,
  list: AdhesionList,
  archive: readonly ArchivedPerson[],
  adhesionsOfYear?: ReadonlyMap<string, AdhesionList>,
  decisions?: ReadonlyMap<number, DuplicateDecision>,   // rowNumber → personId | 'new'
): ImportPlan;
```

Il terzo parametro di `planImport` passa da `Map<identityKey, personId>` ad `ArchivedPerson[]` (l'app è l'unico
chiamante; i test della 004/005 si aggiornano costruendo l'archivio).

## Garanzie verificate dai test

| # | Caso | Atteso |
|---|---|---|
| D1 | `namesSimilar`: MARIA/MARA (1 lettera), ANNA/ANA (1), LUCA/LUCIA (1), MARCO/MARTA (2) | simili |
| D2 | `namesSimilar`: MARIA/MARIA GRAZIA, GRAZIA/MARIA GRAZIA, ANNA/MARIA ANNA LUISA (parole intere) | simili; ANNA/GIOVANNA, LUCA/MATTEO, MARIA/MARIA (uguali) non simili |
| D3 | `datesSimilar`: 1965-03-12/1965-03-13, 1982-11-05/1983-11-05, 1982-11-05/1982-05-11 | simili; 1982-11-05/1984-12-05 non simile; date uguali non simili |
| D4 | Riga ROSSI MARIA GRAZIA 1965-03-12, archivio ROSSI MARIA 1965-03-12 | possibile doppione con 1 candidato, in attesa |
| D5 | D4 con scelta = id di ROSSI MARIA | riusata, `confirmedSame` 1, nessuna persona nuova |
| D6 | D4 con scelta `'new'` | persona nuova |
| D7 | Riga con due candidati | entrambi tra i candidati |
| D8 | Riga con codice fiscale di una persona in archivio e nome diverso | attribuita, `TaxCodeMatch` con `sameKey` false |
| D9 | Chiave di A ma codice fiscale di B | attribuita a B |
| D10 | Due righe con lo stesso codice fiscale nello stesso file | seconda `duplicate` |
| D11 | Due righe decise "Stessa persona" della stessa persona | seconda `duplicate` |
| D12 | Scelta "Stessa persona" verso chi ha già un'adesione nell'anno | `alreadyInYear` |
| D13 | Riga saltata con cognome e nome | `skipped` con `lastName`, `firstName` |
| D14 | I tre file finti in sequenza (archivio cumulato) | 0 possibili doppioni, 37/37 come in 005 |
| D15 | `ageWarnings` sul file ACR finto con il listino 2026/27 | esattamente 1 avviso: GATTI MIA, 4 anni, `belowMinimumAge` |
