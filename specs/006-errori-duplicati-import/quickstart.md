# Quickstart: Errori e duplicati nell'import

Solo dati finti. Prerequisiti come 004/005.

## Test automatici

| Comando | Cosa verifica |
|---|---|
| `npm test -w @tesseramento/import` | D1–D14 di [contracts/import-api-changes.md](./contracts/import-api-changes.md) + test 004/005 |
| `npm test -w @tesseramento/fees` | 195 test invariati + esportazioni nuove |
| `npm test -w web` | sezioni dell'anteprima, scelte, "Importa" bloccato, avvisi, riepilogo |
| `npm run test:integration -w web` | contesto dell'anno con archivio e ultime adesioni; import con "Stessa persona" |
| `npm run test:rules` | invariati (nessuna regola cambiata) |

## Prova a mano in locale

1. Emulatori, utente autorizzato, listino 2026 e 2027 (seed + creazione da "Listini").
2. **M1** Importa l'ACR finto 2026 → 1 avviso (GATTI MIA, 4 anni), 15 da importare → importa.
3. **M2** Copia dell'ACR con "Anno 2027" e una riga modificata (es. "VERDI SOFIA" → "VERDI SOFIA MARIA") →
   "Possibili doppioni (1 da decidere)", "Importa" disattivato; "Stessa persona" → importa → nessuna persona nuova
   per quella riga.
4. **M3** Copia con una data cambiata di una cifra → possibile doppione; "Persona diversa" → persona nuova.
5. **M4** Copia con un nome cambiato ma lo stesso codice fiscale di una persona con codice fiscale → "Riconosciute
   dal codice fiscale".
6. **M5** Riga senza data → "Riga N (COGNOME NOME): manca la data di nascita".
7. **M6** Telefono a 360 px: sezioni leggibili, pulsanti di scelta raggiungibili; DevTools: nessun nome in console.

## Rilascio

Solo hosting (regole invariate), dopo test verdi e con l'ok dell'utente:
`npx firebase deploy --only hosting --project tesseramento-ac`.
