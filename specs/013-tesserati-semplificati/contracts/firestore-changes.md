# Contract: Firestore (pagamento, familyOptOut, amministratore)

## Regole

- `isAdmin()`: `isAllowed()` e `get(allowedEmails/{ownEmail()}).data.get('admin', false) == true`.
- `importBatches` `create`: in più `isAdmin()` (persone e adesioni importate nascono solo con il segno).
- `adhesions` `create` (riconferma 008, nuovo 009): in più facoltativi `paidOn`, `paidAt`, `paidBy`, tutti o nessuno:
  `paidOn` stringa "AAAA-MM-GG" con data non successiva a `request.time`, `paidAt == request.time`,
  `paidBy == ownEmail()`.
- `adhesions` `update` (in più rispetto alla 011):
  - **pagamento**: `affectedKeys().hasOnly(['paidOn', 'paidAt', 'paidBy'])`, stessi controlli;
  - **famiglia**: `affectedKeys().hasOnly(['familyOptOut'])`, `familyOptOut is bool`.

### Test (sezione O)

- **O1** Import di un utente autorizzato non amministratore: negato; dell'amministratore: consentito.
- **O2** Riconferma e nuovo tesserato con pagamento valido: consentiti; con `paidOn` futuro, `paidAt` non del server o
  `paidBy` di altri, o solo una parte dei campi: negati.
- **O3** "Registra pagamento" su un'adesione esistente: consentito; insieme ad altri campi: negato.
- **O4** `familyOptOut` vero/falso: consentito; non booleano o insieme ad altri campi: negato.
- **O5** Non autorizzati: nulla.

## Integrazione (emulatore)

- **E1** Conferma con `paidOn`: adesione con i campi attesi; la famiglia del `N. Legame` nasce alla seconda conferma.
- **E2** "Registra pagamento" e `familyOptOut`.
- **E3** `isAdmin` del backend di accesso: vero solo con `admin: true`.
