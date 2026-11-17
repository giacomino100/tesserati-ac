# Data Model: Errori e duplicati nell'import

Base: data model della [004](../004-import-excel-acr/data-model.md) e della [005](../005-import-giovani-adulti/data-model.md).
**Nessun cambiamento in Firestore.** Tutto ciò che segue vive solo in memoria durante l'anteprima.

## `@tesseramento/import`

- **SkippedRow** + `lastName?`, `firstName?` (puliti, se presenti nella riga).
- **ArchivedPerson** = `{ id, lastName, firstName, birthDate, identityKey, taxCode?, lastAdhesion?: { year, list } }`.
- **DuplicateDecision** = `personId` (stessa persona) | `'new'` (persona diversa).
- **PossibleDuplicate** = `{ row: ImportRow, candidates: ArchivedPerson[], decision?: DuplicateDecision }`.
- **TaxCodeMatch** = `{ row: ImportRow, person: ArchivedPerson, sameKey: boolean }` (`sameKey` false = nome o data
  diversi, da segnalare).
- **ImportPlan** +
  - `duplicates: PossibleDuplicate[]` (tutti, con la scelta se c'è);
  - `pendingDuplicates: number` (senza scelta: bloccano l'import);
  - `taxCodeMatches: TaxCodeMatch[]` (solo quelli con `sameKey` false sono segnalati);
  - `confirmedSame: number` (doppioni decisi "Stessa persona").
  `newPersons`, `reusedPersons`, `adhesions`, `skipped` come prima, calcolati con le scelte; le righe in attesa di
  scelta non contano.

## App

- **YearContext** + `feeSchedule?: FeeSchedule`, `archive: ArchivedPerson[]` (al posto della sola mappa
  `persons`, che si ricava).
- **AgeWarning** = `{ row: ImportRow, age, kind: 'belowMinimumAge' | 'sectorMismatch', expectedSector? }`.
- **ImportSummary** + `byTaxCode`, `confirmedSame`, `warnings`.

## Regole di decisione per riga (ordine)

1. codice fiscale valido presente in archivio → quella persona (TaxCodeMatch);
2. chiave esatta in archivio → persona riusata (004);
3. candidati simili → possibile doppione → scelta dell'utente;
4. altrimenti → persona nuova.
Poi, per le persone esistenti: adesione già nell'anno → `alreadyInYear` (005); due righe sulla stessa persona →
la seconda `duplicate`.
