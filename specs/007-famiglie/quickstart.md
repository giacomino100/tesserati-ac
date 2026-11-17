# Quickstart: Famiglie

Solo dati finti. Prerequisiti come le specifiche precedenti (Node 22+, JDK 21 con `JAVA_HOME`).

## Test automatici

| Comando | Cosa verifica |
|---|---|
| `npm test -w @tesseramento/families` | F1–F11 di [contracts/families-api.md](./contracts/families-api.md), inclusi i tre file finti |
| `npm test -w web` | pagina e servizio con backend finto (suggerite, conferma, correggi, crea, sciogli, messaggi) |
| `npm run test:rules` | J1–J10 di [contracts/firestore-families.md](./contracts/firestore-families.md) + test precedenti |
| `npm run test:integration -w web` | conferma tutte, correzione, scioglimento, una famiglia per persona sugli emulatori |
| `npm run typecheck` | tipi `strict` |

## Prova a mano in locale

1. Emulatori, utente autorizzato, listino 2026; importa i tre elenchi finti.
2. **M1** Famiglie 2026/27 → 9 suggerite, 10 senza famiglia, nessun avviso.
3. **M2** "Conferma tutte" → 9 confermate con data ed email.
4. **M3** Correggi la famiglia 900003: togli un figlio → conferma → 3 componenti; il figlio è tra le aggiunte proposte.
5. **M4** Crea una famiglia con due tesserati senza famiglia → confermata, "creata a mano".
6. **M5** Sciogli una famiglia → i componenti tornano suggeriti.
7. **M6** Su un emulatore pulito importa solo l'ACR → avviso "Il Legame C3 indica 3 componenti, ne sono stati trovati 1."
8. **M7** Telefono a 360 px; uscita con correzioni non confermate chiede conferma.

## Rilascio

Regole e hosting, con test verdi e l'ok dell'utente:
`npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`.
