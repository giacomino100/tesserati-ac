# Research: Riconferma adesione

## R1. Dove sta una riconferma

- **Decision**: è un documento di `adhesions/{anno}_{personId}` (come quelli importati), con `origin: 'riconferma'`,
  `list` (`ACR` | `GIOVANI` | `ADULTI`), `sector` (settore dell'export corrispondente: `RAGAZZI`, `GIOVANI`, `ADULTI`),
  `bond`/`bondId` copiati dall'anno precedente se presenti, `renewedFrom` (= anno − 1), `renewedAt`, `renewedBy`. Niente
  `importId` né `exportAgeBand`.
- **Rationale**: l'ID `{anno}_{personId}` garantisce già "una sola adesione per persona per anno" (FR-006) anche in
  contemporanea; Tesserati, Famiglie e Quote leggono già `adhesions` (FR-010).
- **Alternatives considered**: collezione `renewals` separata (tutte le pagine dovrebbero unire due fonti e il vincolo
  di unicità andrebbe rifatto).

## R2. Elenco di un'adesione

- **Decision**: `listOfAdhesion(importId, list)` in `@tesseramento/import`: `listOfImportId(importId)` se c'è un
  `importId`, altrimenti `list` se valido. Usato da import, famiglie (e quindi quote) e dove oggi si usa
  `listOfImportId` sulle adesioni.
- **Rationale**: un solo punto; le adesioni importate non cambiano.

## R3. Anni con tesserati

- **Decision**: `memberYears()` in `apps/web/src/app/core/member-years.ts` = anni di `importBatches` ∪ anni delle
  adesioni con `origin == 'riconferma'` (query su un campo: indice automatico). Lo usano Tesserati, Famiglie (e
  Quote) al posto di `importedYears()`; `schedule-usage` (003) considera in uso anche un anno con sole riconferme.
- **Rationale**: senza questo un anno fatto solo di riconferme non comparirebbe da nessuna parte (FR-010).
- **Alternatives considered**: leggere tutte le adesioni (più letture a ogni pagina); un documento "segno" per anno
  (resterebbe anche dopo aver annullato tutto).

## R4. Elenco del nuovo anno

- **Decision**: età = `ageFor(birthDate, anno)`; fascia = `bandForAge(età, listino dell'anno nuovo)`; `acr` → `ACR`,
  `giovanissimi` e `giovani` → `GIOVANI`, `adulti` → `ADULTI`; sotto l'età minima → `ACR` con avviso `underMinAge`;
  età negativa o data non valida → `invalidBirthDate`, non riconfermabile. Cambio di elenco = elenco del nuovo anno ≠
  elenco dell'adesione dell'anno precedente.
- **Rationale**: `regole-famiglia.md` §3 (aggiornato); i 30enni vanno in Adulti come dice il PDF.

## R5. Scrittura e limite delle letture delle regole

- **Decision**: `renew(drafts, year, email)` divide le persone in gruppi di **15**; ogni gruppo è una
  `runTransaction` che prima legge le adesioni dell'anno nuovo delle persone del gruppo (se una esiste →
  `AlreadyRenewedError`, nulla salvato del gruppo) e poi le crea. Le regole leggono, per ogni adesione, l'adesione
  dell'anno precedente (1 lettura diversa per persona) e il listino dell'anno nuovo (stesso documento, 1 lettura):
  15 + 1 = 16 ≤ 20. Se un gruppo fallisce, i gruppi già salvati restano e la pagina dice quante persone sono state
  riconfermate; le altre restano "da decidere" e si riprova.
- **Rationale**: FR-005/FR-006/FR-011; stesso schema di "Conferma tutte" (007). Con 37 persone: 3 gruppi.
- **Alternatives considered**: una sola transazione senza controllo dell'anno precedente nelle regole (FR-011 lo
  chiede); Cloud Function (principio V).

## R6. Annullare

- **Decision**: `undo(year, personId)` cancella `adhesions/{anno}_{personId}`. Regola: `delete` solo se
  `resource.data.origin == 'riconferma'` e non esiste `familyMemberships/{anno}_{personId}` (stesso formato di ID).
  L'app, prima di chiedere conferma, guarda se esiste `householdFees/{anno}_p-{personId}` (una persona riconfermata non
  in famiglia confermata è un nucleo da 1): se sì, la conferma avvisa che la quota andrà ricalcolata (chiarimento).
- **Rationale**: FR-008; le quote salvate non si toccano (010 le segnala come da ricalcolare / rimosse).

## R7. Import dopo la riconferma

- **Decision**: il contesto dell'anno dell'import (`yearContext`) restituisce anche `renewedIds` (persone con
  adesione dell'anno di origine "riconferma"); `planImport` le salta con il nuovo motivo `alreadyRenewed` ("già
  presente nell'anno (riconferma)") invece di `alreadyInYear`. Il controllo in transazione dell'import (persona
  riusata con adesione dell'anno → `ImportContextChangedError`) resta valido.
- **Rationale**: FR-009.

## R8. Gruppi e ordinamento

- **Decision**: da decidere = tesserati dell'anno precedente senza adesione nell'anno nuovo. Gruppi per `bondId`
  dell'anno precedente (ordine numerico/lessicale del `bondId`), componenti dal più anziano al più giovane (come la
  007); poi i singoli in ordine di cognome, nome. Già iscritti = tesserati dell'anno precedente con adesione nell'anno
  nuovo, in ordine di cognome e nome, con origine (riconferma / import) e, per le riconferme, se si possono annullare
  (no se hanno un'appartenenza a una famiglia dell'anno nuovo).
- **Rationale**: chiarimento della specifica (opzione B).

## R9. Anni proposti

- **Decision**: la pagina propone gli anni `y + 1` per ogni anno `y` con tesserati (R3); predefinito il più alto; con
  `?anno=` si apre quello richiesto se l'anno precedente ha tesserati.
- **Rationale**: FR-001; l'anno nuovo non ha ancora tesserati, quindi non può venire da `memberYears()`.
