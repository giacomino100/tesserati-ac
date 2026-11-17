# Quickstart: Import Excel ACR

Solo dati finti di `docs/dominio/excel-esempio/`. Prerequisiti: Node 22+, JDK 21 (`JAVA_HOME` se `java` non è
nel PATH), dipendenze installate (`npm install`, include SheetJS dal CDN ufficiale).

## Test automatici

| Comando | Cosa verifica |
|---|---|
| `npm test -w @tesseramento/import` | P1–P14 di [contracts/import-api.md](./contracts/import-api.md), inclusi i tre file finti |
| `npm test -w web` | schermata e servizio con backend finto (stati, messaggi, annulla, righe saltate) |
| `npm run test:rules` | I1–I11 di [contracts/firestore-import.md](./contracts/firestore-import.md) |
| `npm run test:integration -w web` | backend Firestore sugli emulatori: import completo, riimporto rifiutato, anno senza listino |
| `npm run typecheck` | tipi `strict` in tutti i workspace |

## Prova a mano in locale

1. `npm run emulators` e `npm start`; accedi con un utente autorizzato dell'emulatore.
2. Crea il listino 2026 (seed sull'emulatore: `node firebase/scripts/seed-fee-schedule.cjs --emulator --email prova@example.org`).
3. **M1** Importa → scegli `ElencoAdesioni_ACR.xlsx` → anteprima "2026/27", 15 righe, nessuna saltata.
4. **M2** Annulla → "Tesserati" mostra "Nessun tesserato importato"; nell'emulatore nessun documento in `persons`,
   `adhesions`, `importBatches`.
5. **M3** Ripeti e conferma (misura: anteprima entro 5 s, SC-001) → "15 adesioni, 15 persone nuove"; "Vedi i
   tesserati" → 15 righe del 2026/27; in Firestore 15 `adhesions/2026_*`, nessun campo escluso (indirizzo,
   telefono, Pagato, MLAC/MSAC…).
6. **M4** Ricarica lo stesso file → "già stato importato".
7. **M5** Carica `ElencoAdesioni_Giovani.xlsx` → "non sembra l'elenco ACR".
8. **M6** Copia del file ACR con `Data Nascita` rinominata → "mancano le colonne: Data Nascita".
9. **M7** Copia con "Anno 2030" → "Manca il listino 2030/31".
10. **M8** Listini → 2026/27 → Modifica: compare l'avviso "anno con adesioni" (non più l'indicatore di prova).
11. **M9** Telefono a 360 px: anteprima leggibile senza scorrimento orizzontale; DevTools: nessuna richiesta di
    rete con il contenuto del file e nessun dato personale in console.

## Rilascio

Solo con tutti i test verdi: `npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`.
Il primo import reale lo fa la segreteria dall'app con il file vero, che non entra mai nel repository.
