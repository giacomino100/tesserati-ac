# Contract: accesso ai dati (Firestore Security Rules)

**Feature**: [../spec.md](../spec.md) · Modello dati in [../data-model.md](../data-model.md)

Le regole stanno in `firebase/firestore.rules` e sono l'**unica barriera** di accesso ai dati
(R3). Principio: tutto è negato, salvo le eccezioni qui elencate.

## Condizione di base `isAllowed()`

Una richiesta è "di un utente autorizzato" solo se **tutte** queste condizioni sono vere:

1. la richiesta è autenticata (`request.auth != null`);
2. `request.auth.token.email_verified == true`;
3. esiste `allowedEmails/<email in minuscolo>`, con `<email>` = `request.auth.token.email.lower()`;
4. la sessione è recente: `request.time` meno `request.auth.token.auth_time` ≤ 7 giorni.

Ogni collezione delle specifiche future parte da `isAllowed()`.

## Matrice di accesso

| Risorsa | Non autenticato | Autenticato, email non verificata | Autenticato, non in elenco | Utente autorizzato, sessione valida | Utente autorizzato, sessione > 7 giorni |
|---|---|---|---|---|---|
| `allowedEmails/{propria email}` – `get` | ❌ | ❌ | ✅ (il documento non esiste: serve a sapere di non essere in elenco) | ✅ | ❌ |
| `allowedEmails/{altra email}` – `get` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `allowedEmails` – `list` (elenco completo) | ❌ | ❌ | ❌ | ❌ | ❌ |
| `allowedEmails/*` – `create` / `update` / `delete` | ❌ | ❌ | ❌ | ❌ | ❌ |
| qualsiasi altra collezione – lettura/scrittura | ❌ | ❌ | ❌ | ❌ (finché una specifica non la abilita) | ❌ |

Note:

- Per il `get` del proprio documento valgono le condizioni 1, 2 e 4 e `docId == email in minuscolo`;
  non serve la 3 (altrimenti un utente non in elenco non potrebbe nemmeno scoprire di non esserlo).
- La scrittura dell'elenco è riservata alla console/Admin (che aggira le regole): da qui FR-013.

## Garanzie (da coprire con test sull'emulatore)

| # | Garanzia | Requisito |
|---|---|---|
| A1 | Senza accesso nessuna lettura e nessuna scrittura è possibile, su alcuna collezione | FR-005, SC-002 |
| A2 | Un account non in elenco, o con email non verificata, non legge né scrive nulla oltre al proprio documento (inesistente) di `allowedEmails` | FR-004, FR-005 |
| A3 | Il confronto dell'email ignora maiuscole/minuscole | FR-003 |
| A4 | Rimuovere il documento dell'email revoca l'accesso alla richiesta successiva | FR-006, SC-003 |
| A5 | Dopo 7 giorni dall'ultimo accesso Google ogni richiesta è negata | FR-009 |
| A6 | Nessun utente può creare, modificare o cancellare documenti di `allowedEmails`, né elencarli | FR-013 |
| A7 | Una collezione non prevista dalle regole è negata a tutti | principio III |
| A8 | Elenco vuoto → nessuno è autorizzato | edge case |
