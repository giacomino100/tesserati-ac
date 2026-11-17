# Contract: nuovo tesserato in Firestore

## Documenti

- `persons/{id}` (forma manuale): `lastName`, `firstName`, `birthDate` ("AAAA-MM-GG"), `identityKey`, `sex?` (`M`/`F`),
  `taxCode?` (16 alfanumerici), `createdInYear` (int), `createdAt` (timestamp), `createdBy` (email minuscola).
- `adhesions/{anno}_{personId}` (origine nuovo): `personId`, `associationYear`, `origin: 'nuovo'`, `list`, `sector`
  (`ACR`→`RAGAZZI`, `GIOVANI`→`GIOVANI`, `ADULTI`→`ADULTI`), `addedAt`, `addedBy`.

## Regole

- `persons` `create` (manuale): campi ammessi/obbligatori, stessi controlli di forma della persona importata,
  `createdAt == request.time`, `createdBy == ownEmail()`, `existsAfter(adhesions/{createdInYear}_{id})` e quell'adesione
  dopo la scrittura ha `origin == 'nuovo'`, `!exists(adhesions/{createdInYear}_{id})` prima.
- `adhesions` `create` (nuovo): campi ammessi/obbligatori, ID, `list`/`sector`, `exists(feeSchedules/{anno})`,
  `exists(persons/{personId}) || existsAfter(persons/{personId})`, `!exists(adhesions/{anno−1}_{personId})`,
  `addedAt == request.time`, `addedBy == ownEmail()`.
- `adhesions` `delete`: `origin in ['riconferma', 'nuovo']` e nessuna `familyMemberships/{id}`.

### Test (sezione M)

- **M1** Persona nuova + adesione "nuovo" nella stessa scrittura: consentito; non autorizzato: negato.
- **M2** Persona manuale senza adesione nella stessa scrittura: negata.
- **M3** Adesione "nuovo" di una persona esistente senza adesione nell'anno precedente: consentita; con adesione
  nell'anno precedente: negata.
- **M4** Senza listino dell'anno: negata; seconda adesione dello stesso anno: negata.
- **M5** Campi in più (es. `address`), settore incoerente, data/email non di chi salva: negati.
- **M6** Cancellazione di un'adesione "nuovo" senza famiglia: consentita; con famiglia: negata; la persona non si
  cancella.
- **M7** Query `origin in ['riconferma', 'nuovo']`: consentita a chi è autorizzato.

## Integrazione (emulatore)

- **E1** `add` di una persona nuova: persona + adesione con i campi attesi.
- **E2** `add` di una persona esistente (ultima adesione 2 anni prima): solo l'adesione.
- **E3** Seconda `add` nello stesso anno → `AlreadyEnrolledError`; persona con adesione l'anno prima →
  `RenewableError`.
- **E4** `memberYears()` include un anno con soli nuovi; `undo` (backend 008) cancella l'adesione "nuovo".
