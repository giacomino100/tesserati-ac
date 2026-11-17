# Quickstart: Quote nella famiglia

Solo dati finti. Prerequisiti come le specifiche precedenti.

## Test automatici

| Comando | Cosa verifica |
|---|---|
| `npm test -w @tesseramento/families` | H1–H12 di [contracts/households-api.md](./contracts/households-api.md), inclusi i 29 esempi (SC-001) e i file finti (565,00 €) |
| `npm test -w @tesseramento/fees` | calcolo invariato (197 test) |
| `npm test -w web` | pagina e servizio con backend finti (totali, dettaglio, avvisi, manuale, zero, salva, aggiorna) |
| `npm run test:rules` | K1–K8 di [contracts/firestore-fees.md](./contracts/firestore-fees.md) + precedenti |
| `npm run test:integration -w web` | salvataggio, aggiornamento, cancellazione dei nuclei spariti sugli emulatori |

## Prova a mano in locale

1. Emulatori, utente autorizzato, listino 2026; importa i tre elenchi; in "Famiglie" premi "Conferma tutte".
2. **M1** Quote 2026/27 → "Totale 2026/27: 565,00 €", 17 calcolati, 2 da decidere (misura: meno di 3 secondi).
3. **M2** Famiglia 900003 → 26,00 + 26,00 + 12,00 + 0,00 = 64,00 €; 900005 → pacchetto 2 ACR 25,00 €.
4. **M3** Nucleo 900004 → quota manuale 140,00 € con nota; GATTI MIA → 0,00 € con nota e conferma.
5. **M4** "Salva le quote dell'anno" → salvate con data ed email.
6. **M5** In Listini cambia la quota Adulti 2026 → Quote mostra "Quote da ricalcolare"; "Aggiorna questa quota" su un
   nucleo, poi "Aggiorna tutte".
7. **M6** In Famiglie togli un componente da una famiglia → la famiglia e il nuovo singolo risultano da ricalcolare.
8. **M7** Telefono a 360 px; DevTools: nessun nome in console.

## Rilascio

Regole e hosting, con test verdi e l'ok dell'utente:
`npx firebase deploy --only firestore:rules,hosting --project tesseramento-ac`.
