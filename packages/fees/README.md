# @tesseramento/fees

Calcolo della quota associativa di un nucleo familiare (Azione Cattolica, Parrocchia San Gioacchino).
Logica pura in TypeScript: nessuna dipendenza, nessun accesso a rete, archivi o data corrente.

- Contratto pubblico: [`specs/002-calcolo-quote-famiglia/contracts/fees-api.md`](../../specs/002-calcolo-quote-famiglia/contracts/fees-api.md)
- Aggiunte della specifica 003 (importi, bozza in euro, anni): [`specs/003-listino-per-anno/contracts/fees-api-additions.md`](../../specs/003-listino-per-anno/contracts/fees-api-additions.md)
- Regole e esempi: [`docs/dominio/regole-quote.md`](../../docs/dominio/regole-quote.md) (unica fonte: il PDF del listino)

## Funzioni

- Calcolo: `calculateHouseholdFee`, `bandFor`, `ageFor`, `bandForAge` (esportate dalla 006 per gli avvisi dell'import), listino `SCHEDULE_2026_27`.
- Importi (spec. 003): `parseEuros` (virgola o punto, al massimo due decimali, mai arrotondati) e `formatEuros` (2600 → "26,00").
- Bozza del listino (spec. 003): `scheduleToDraft` / `draftToSchedule` (tutti gli errori di campo insieme, solo le quote cambiano), `validateFeeSchedule`.
- Anni (spec. 003): `labelFor` (2027 → "2027/28"), `nextAssociationYear`, `copyForNextYear`.

## Comandi

```bash
npm test -w @tesseramento/fees          # test (include gli esempi di regole-quote.md)
npm run typecheck -w @tesseramento/fees # TypeScript strict
```

## Regola d'oro

**Le quote si cambiano nel listino, non nel codice.** Gli importi stanno in
`src/schedules/<anno>.ts` (es. `2026-27.ts`); `calculateHouseholdFee` li legge e non calcola
percentuali né arrotondamenti. Dalla specifica 003 i listini degli anni nuovi stanno in Firestore
(`feeSchedules`) e si creano dall'app; `2026-27.ts` resta il riferimento dei test e del seed.

Dalla specifica 010 il calcolo dei nuclei dell'anno passa da `@tesseramento/families` (`householdFees`), che usa solo
`calculateHouseholdFee` e il listino salvato.

I casi che il PDF non prevede (nucleo di più di 4 persone, componente sotto i 6 anni) non vengono
calcolati: l'esito è `notCovered`.
