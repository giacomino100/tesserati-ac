# Contract: API pura di `@tesseramento/import`

**Feature**: [../spec.md](../spec.md) · Tipi: [../data-model.md](../data-model.md)

Pacchetto senza dipendenze di runtime, nessun accesso a rete, browser, data corrente o log.

```ts
/** Colonne necessarie, cercate per nome dopo la pulizia degli spazi (ordine ed extra ignorati). */
export const REQUIRED_COLUMNS: readonly string[]; // 'Anno Associativo','Cognome','Nome','Sesso','Data Nascita',
                                                   // 'Cod. Fiscale','Settore',"Fasce d'età",'Legame','N. Legame'
export const EXPECTED_SHEET = 'ElencoAdesioniExcel';

/** Testo pulito: trim, spazi multipli → uno; null, '', "''" e solo spazi → undefined. Numeri → testo senza decimali. */
export function cleanText(value: unknown): string | undefined;

/** Seriale Excel (epoca 1900 o 1904), "GG/MM/AAAA" o "AAAA-MM-GG" → "AAAA-MM-GG"; altrimenti undefined. */
export function toIsoDate(value: unknown, date1904: boolean): string | undefined;

/** "Anno 2026" → 2026; altrimenti undefined. */
export function parseAssociationYear(value: unknown): number | undefined;

/** COGNOME|NOME|AAAA-MM-GG: maiuscolo, senza accenti, spazi singoli. */
export function identityKey(lastName: string, firstName: string, birthDate: string): string;

/**
 * Righe del foglio (prima riga = intestazioni) → righe valide, saltate o errore di file.
 * `sheetNames` serve a verificare il foglio atteso; `rows` sono le righe di quel foglio.
 */
export function parseAdhesionSheet(input: {
  sheetNames: readonly string[];
  rows: readonly (readonly unknown[])[];
  date1904: boolean;
}): ParsedImport;

/** Righe valide + persone già archiviate (identityKey → personId) → cosa creare. */
export function planImport(
  parsed: ParsedImport & { ok: true },
  existing: ReadonlyMap<string, string>,
): ImportPlan;
```

## Garanzie verificate dai test

| # | Caso | Atteso |
|---|---|---|
| P1 | `ElencoAdesioni_ACR.xlsx` finto | `ok`, anno 2026, 15 righe valide, 0 saltate, `GIOVANNI ` → `GIOVANNI` |
| P2 | File Giovani / Adulti finti | errore `notAcr` |
| P3 | Colonne in ordine diverso e colonna extra | stesso risultato di P1 |
| P4 | Manca `Data Nascita` (o rinominata) | errore `missingColumns` con `['Data Nascita']` |
| P5 | Foglio con altro nome | errore `sheetNotFound` |
| P6 | Solo intestazioni | errore `noRows` |
| P7 | `Anno 2026` e `Anno 2027` nello stesso file; `2026` senza "Anno" | `mixedYears`; `invalidYear` |
| P8 | Riga senza nome / senza data / data "abc" | saltata con motivo e numero di riga, le altre importate |
| P9 | Due righe con `ROSSI  MARIO` e `rossi mario` stessa data | la seconda saltata come `duplicate` della prima |
| P10 | Tutte le righe saltate | errore `allRowsSkipped` |
| P11 | `''`, `"''"`, spazi, `null` nei testi; `N. Legame` 900002 numerico; codice fiscale corto | vuoti come `undefined`; `'900002'`; codice fiscale assente |
| P12 | Seriali 1900 e 1904, `12/03/1965`, `1965-03-12` | `1965-03-12` in tutti i casi, indipendente dal fuso |
| P13 | `planImport` con una persona già presente | riusata (nessuna nuova), adesione comunque creata |
| P14 | Oggetto riga | contiene solo i campi di `ImportRow`: nessuna colonna esclusa |
