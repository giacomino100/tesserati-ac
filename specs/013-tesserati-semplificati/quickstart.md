# Quickstart: Tesserati semplificati

Solo dati finti. Prerequisiti come le specifiche precedenti (JDK 21 per regole e integrazione).

## Test automatici

| Comando | Cosa verifica |
|---|---|
| `npm test -w @tesseramento/families` | P1–P10 di [contracts/members-api.md](./contracts/members-api.md) |
| `npm test -w web` | pagina Tesserati (elenco, filtro, ricerca, conferma, pannello, pagamento), home, guardia dell'import |
| `npm run test:rules` | O1–O5 di [contracts/firestore-changes.md](./contracts/firestore-changes.md) + precedenti |
| `npm run test:integration -w web` | E1–E3 + precedenti |

## Prova a mano in locale

1. Emulatori; nell'emulatore metti `admin: true` sull'email di prova; listino 2026; importa i tre file finti (2026/27);
   crea il listino 2027/28.
2. **M1** Tesserati 2027/28 → "37 da confermare · 0 iscritti"; filtro e ricerca.
3. **M2** Conferma GALLO LUCA → pannello 900003; conferma CONTI MARTA dal pannello → famiglia con 2; conferma gli altri
   due → 4. "Togli" GALLO GIULIA → famiglia con 3.
4. **M3** Nuovo tesserato BIANCO LUCA → iscritto con la data di pagamento.
5. **M4** Annulla conferma di MORETTI CARLA → torna da confermare.
6. **M5** Utente senza `admin`: niente "Importa Excel"; `/importa` torna alla home; `/riconferme` porta a Tesserati.
7. **M6** Telefono a 360 px; DevTools: nessun nome in console.

## Rilascio

Regole e hosting con test verdi e l'ok dell'utente; poi, con il suo ok esplicito, `admin: true` sul suo documento in
`allowedEmails` dalla console (senza quello nessuno può più importare).
