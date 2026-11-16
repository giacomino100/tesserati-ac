# @tesseramento/fees

Calcolo della quota associativa di un nucleo familiare (Azione Cattolica, Parrocchia San Gioacchino).
Logica pura in TypeScript: nessuna dipendenza, nessun accesso a rete, archivi o data corrente.

- Contratto pubblico: [`specs/002-calcolo-quote-famiglia/contracts/fees-api.md`](../../specs/002-calcolo-quote-famiglia/contracts/fees-api.md)
- Regole e esempi: [`docs/dominio/regole-quote.md`](../../docs/dominio/regole-quote.md) (unica fonte: il PDF del listino)

## Comandi

```bash
npm test -w @tesseramento/fees          # test (include gli esempi di regole-quote.md)
npm run typecheck -w @tesseramento/fees # TypeScript strict
```

## Regola d'oro

**Le quote si cambiano nel listino, non nel codice.** Gli importi stanno in
`src/schedules/<anno>.ts` (es. `2026-27.ts`); `calculateHouseholdFee` li legge e non calcola
percentuali né arrotondamenti. Per un nuovo anno si aggiunge un nuovo listino.

I casi che il PDF non prevede (nucleo di più di 4 persone, componente sotto i 6 anni) non vengono
calcolati: l'esito è `notCovered`.
