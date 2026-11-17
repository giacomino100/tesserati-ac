# Quickstart: Import Giovani e Adulti

Solo dati finti di `docs/dominio/excel-esempio/`. Prerequisiti come la 004 (Node 22+, JDK 21 con `JAVA_HOME`).

## Test automatici

| Comando | Cosa verifica |
|---|---|
| `npm test -w @tesseramento/import` | Q1–Q10 di [contracts/import-api-changes.md](./contracts/import-api-changes.md) + test della 004 |
| `npm test -w web` | anteprima con elenco, scelta in parità, righe già importate, riepilogo, totali per settore |
| `npm run test:rules` | I1–I16 |
| `npm run test:integration -w web` | tre elenchi del 2026 in sequenza: 37 persone, 37 adesioni; riimporto rifiutato; "anno con adesioni" |
| `npm run typecheck` | tipi `strict` |

## Prova a mano in locale

1. `npm run emulators`, `npm start`, utente autorizzato, listino 2026 (seed sull'emulatore).
2. **M1** Importa Adulti → "Elenco Adulti · anno associativo 2026/27", 14 righe → conferma → "elenco Adulti, 14 adesioni".
3. **M2** Importa ACR → 15; **M3** Importa Giovani → 8.
4. **M4** "Tesserati" 2026/27 → "ACR 15 · Giovani 8 · Adulti 14", 37 righe.
5. **M5** Ricarica il file Giovani → "L'elenco Giovani del 2026/27 è già stato importato."
6. **M6** Su emulatori ripuliti: importa l'ACR, poi una copia del file Adulti con in più una riga di un tesserato
   ACR (stesso cognome, nome e data, settore `ADULTI`) → in anteprima "Riga 16: già importata nell'elenco ACR del
   2026/27", 14 da importare.
7. **M7** Listini → 2026/27 → Modifica: avviso "anno con adesioni".
8. **M8** Telefono a 360 px: anteprima, scelta in parità e totali leggibili.

## Rilascio

Solo con tutti i test verdi: `npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`.
