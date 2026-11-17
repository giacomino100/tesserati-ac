# Quickstart: Cambio categoria per età

Solo dati finti e persone inventate. Prerequisiti come le specifiche precedenti (JDK 21 per regole e integrazione).

## Test automatici

| Comando | Cosa verifica |
|---|---|
| `npm test -w @tesseramento/families` | C1–C8 di [contracts/categories-api.md](./contracts/categories-api.md) |
| `npm test -w @tesseramento/import` | C9 |
| `npm test -w web` | Tesserati (colonna Elenco, avvisi, allinea, allinea tutte, eccezione, togli), avviso in Riconferme |
| `npm run test:rules` | N1–N6 di [contracts/firestore-list-change.md](./contracts/firestore-list-change.md) + precedenti |
| `npm run test:integration -w web` | E1–E3 + precedenti |

## Prova a mano in locale

1. Emulatori, utente autorizzato, listino 2026; importa i tre file finti (2026/27).
2. **M1** Tesserati 2026/27 → colonna Elenco, nessun avviso (0 non allineate).
3. **M2** Con "Nuovo tesserato" (009) iscrivi ROSSI ELENA 1996 e, con "Cambia elenco", mettila in Giovani con una nota;
   "Togli eccezione" → torna Adulti. Ripeti senza nota → messaggio di errore.
4. **M3** GRECO NICOLO → "Cambia elenco" ACR con nota "resta in ACR un anno in più" → riga con l'eccezione; Quote
   2026/27 invariate.
5. **M4** Listino 2027/28, Riconferme 2027/28 → GRECO NICOLO con "L'anno scorso era un'eccezione: ACR".
6. **M5** Telefono a 360 px; DevTools: nessun nome in console.

## Rilascio

Regole e hosting, con test verdi e l'ok dell'utente:
`npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`.
