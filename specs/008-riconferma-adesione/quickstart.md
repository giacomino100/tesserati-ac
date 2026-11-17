# Quickstart: Riconferma adesione

Solo dati finti. Prerequisiti come le specifiche precedenti (JDK 21 per regole e integrazione).

## Test automatici

| Comando | Cosa verifica |
|---|---|
| `npm test -w @tesseramento/families` | R1–R10 di [contracts/renewals-api.md](./contracts/renewals-api.md) (37 da decidere, 14/8/15, 2 cambi) |
| `npm test -w @tesseramento/import` | I1–I3 (elenco dell'adesione, righe `alreadyRenewed`) |
| `npm test -w web` | pagina e servizio con backend finti (gruppi, selezione, riconferma, gruppi parziali, annulla, avvisi) |
| `npm run test:rules` | L1–L10 di [contracts/firestore-renewals.md](./contracts/firestore-renewals.md) + precedenti |
| `npm run test:integration -w web` | E1–E4 sugli emulatori + test precedenti |

## Prova a mano in locale

1. Emulatori, utente autorizzato, listino 2026; importa i tre elenchi del 2026; in Listini crea il 2027/28.
2. **M1** Riconferme → anno 2027/28: 37 da decidere (9 gruppi + 10 singoli), RINALDI e RIZZO con cambio di elenco,
   GATTI MIA con l'avviso di età (misura: meno di 3 secondi).
3. **M2** Spunta "tutto il nucleo" su 900003 e riconferma → "4 persone riconfermate per il 2027/28.".
4. **M3** "Seleziona tutti" → riconferma le altre 33 (meno di 10 secondi). Tesserati 2027/28: 37 (14/8/15).
5. **M4** Famiglie 2027/28: 9 famiglie suggerite; conferma 900003; in Riconferme GALLO TOMMASO non è annullabile.
6. **M5** Quote 2027/28 → salva; annulla la riconferma di MORETTI CARLA: avviso sulla quota; in Quote il suo nucleo
   non c'è più ed è da sistemare con "Aggiorna tutte".
7. **M6** Importa un Excel ACR (finto) come 2027: le righe riconfermate sono "già presente nell'anno (riconferma)".
8. **M7** Telefono a 360 px; DevTools: nessun nome in console.

## Rilascio

Regole e hosting, con test verdi e l'ok dell'utente:
`npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`.
