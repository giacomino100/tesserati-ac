# Quickstart: Nuovo tesserato

Solo dati finti. Prerequisiti come le specifiche precedenti (JDK 21 per regole e integrazione).

## Test automatici

| Comando | Cosa verifica |
|---|---|
| `npm test -w @tesseramento/import` | N1–N12 di [contracts/new-member-api.md](./contracts/new-member-api.md) |
| `npm test -w web` | modulo, verifica, iscrizione, sezione "Nuovi tesserati", annulla, testo di Quote |
| `npm run test:rules` | M1–M7 di [contracts/firestore-new-member.md](./contracts/firestore-new-member.md) + precedenti |
| `npm run test:integration -w web` | E1–E4 + precedenti |

## Prova a mano in locale

1. Emulatori, utente autorizzato, listino 2026; importa i tre file finti (2026/27).
2. **M1** Tesserati 2026/27 → "Nuovo tesserato": BIANCO LUCA 10/05/2019 → "7 anni · ACR" →
   Iscrivi → 38 tesserati.
3. **M2** Di nuovo BIANCO LUCA nello stesso anno → "Ha già un'adesione nel 2026/27.".
4. **M3** ROSSI MARIO 21/03/1965 → possibile doppione; "Stessa persona" → "Ha già un'adesione nel 2026/27.".
5. **M4** Famiglie 2026/27 → BIANCO LUCA tra i "Senza famiglia"; Correggi la famiglia 900003 e aggiungilo.
6. **M5** Riconferme → sezione "Nuovi tesserati del 2026/27": "Annulla iscrizione" di BIANCO LUCA non disponibile
   finché è in famiglia; toltolo, annulla → 37 tesserati.
7. **M6** Quote 2025/26 (dopo un import "Anno 2026") → "Nessun listino 2025/26: le quote si calcolano solo negli anni con
   un listino.".
8. **M7** Telefono a 360 px; DevTools: nessun nome in console.

## Rilascio

Regole e hosting, con test verdi e l'ok dell'utente:
`npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`.
