# Research: Quote nella famiglia

## R1. Nuclei dell'anno

- **Decision**: `householdsOfYear(families: YearFamilies)` → per ogni famiglia confermata un nucleo con chiave
  `f-{familyId}` e i componenti effettivi (007, R8); per ogni tesserato fuori da una famiglia confermata (anche se in
  una famiglia **suggerita**) un nucleo da 1 con chiave `p-{personId}`. Conteggio delle famiglie suggerite
  confermabili per l'avviso.
- **Rationale**: FR-002 e decisione 1 del brief; la chiave stabile permette di confrontare con le quote salvate.

## R2. Calcolo

- **Decision**: `householdFees(households, schedule)` chiama `calculateHouseholdFee({ associationYear, members,
  schedule })` per ogni nucleo; esito `calculated` (righe, pacchetto ACR, totale), `notCovered` (motivi) o
  `invalidInput`: solo gli errori sulle date (`invalidBirthDate`, `birthDateAfterYear`) diventano "non previsto, data
  di nascita incoerente" (`regole-quote.md` §4); gli altri (es. listino di un altro anno) sono un **errore interno**
  ("Impossibile calcolare: dati incoerenti, contatta chi gestisce il progetto."), senza quota manuale. Il totale
  dell'anno somma i calcolati e le quote manuali valide; se ci sono quote salvate e il loro totale è diverso, la pagina
  mostra anche "Totale salvato" (analisi A1/U1, decise in implementazione).
- **Rationale**: principio II: un solo calcolo, quello della 002.

## R3. Confronto con le quote salvate

- **Decision**: `compareWithSaved(current, saved)` per chiave: `new` (non salvato), `unchanged` (stessi componenti e,
  se calcolato, stesse righe/pacchetto/totale; se manuale, stessi componenti), `changed` (diverso: mostra salvato e
  attuale), `removed` (salvato ma il nucleo non esiste più). Una quota manuale resta valida finché i componenti sono
  gli stessi (FR-009); se cambiano → `changed` e il nucleo torna da decidere (se ancora non previsto) o calcolato.
- **Rationale**: FR-008/FR-009; nessun aggiornamento automatico.

## R4. Archivio

- **Decision**: `householdFees/{anno}_{chiave}` (chiave `f-{familyId}` o `p-{personId}` per evitare `:` negli ID).
  Campi: `associationYear`, `householdKey`, `memberIds`, `kind: 'calculated' | 'manual'`, per i calcolati `lines`
  (lista di mappe `memberId, age, band, fullCents, benefit, amountCents?`) e `acrPackageCents?`, per i manuali
  `manualCents`, `note`, `reason`; `totalCents`, `savedAt`, `savedBy`.
- **Rationale**: istantanea per nucleo (constitution IV); niente nomi copiati.
- **Alternatives considered**: un documento per anno (limite 1 MB e conflitti di scrittura tra utenti).

## R5. Scritture

- **Decision**: `save(entries, removedKeys, email)` in una `runTransaction` di sole scritture (`set` delle quote,
  `delete` di quelle `removed`); "Salva le quote dell'anno" e "Aggiorna tutte" mandano tutti i nuclei da salvare;
  "Aggiorna questa quota" e la quota manuale ne mandano uno.
- **Rationale**: tutto o niente, fallisce offline invece di restare in coda (come le specifiche precedenti); le regole
  non leggono altri documenti per le quote, quindi niente limite delle 20 letture.

## R6. Regole

- **Decision**: `householdFees/{id}`: get/list/delete `isAllowed()`; create/update con campi ammessi, `id ==
  string(anno) + '_' + householdKey`, `householdKey.matches('(f|p)-.+')`, `memberIds` lista 1–20, `kind in
  ['calculated','manual']`, `totalCents is int && >= 0`; se `manual`: `manualCents == totalCents`, `note` non vuota,
  `reason` testo; se `calculated`: `lines` lista; `savedAt == request.time`, `savedBy == ownEmail()`.
- **Rationale**: FR-010.

## R7. Quota manuale

- **Decision**: importo con `parseEuros` della 003 (virgola o punto, max due decimali, mai arrotondato), ≥ 0; nota
  obbligatoria (testo non vuoto dopo il trim, al massimo 500 caratteri); con 0,00 € conferma in più (chiarimento).
- **Rationale**: riuso, nessun nuovo parsing di importi.

## R8. Prestazioni

- **Decision**: letture in parallelo (tesserati, famiglie, appartenenze, listino, quote salvate) e calcolo in memoria
  (~120 nuclei, istantaneo).
- **Rationale**: SC-005 (< 3 s).
