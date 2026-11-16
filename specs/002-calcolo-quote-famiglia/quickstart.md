# Quickstart: verificare il calcolo quota famiglia

**Feature**: [spec.md](./spec.md)

## Prerequisiti

- Node.js 22 LTS (≥ 22.12) e npm
- Repository clonato, branch `002-calcolo-quote-famiglia`

## Installazione

```bash
npm install
```

## Verifiche

| # | Comando | Risultato atteso | Verifica |
|---|---|---|---|
| 1 | `npm test -w @tesseramento/fees` | tutti i test passano | SC-001…SC-003 |
| 2 | stesso comando, sezione "examples" | 29 casi passati, numerati come in `docs/dominio/regole-quote.md` §3 | SC-001 |
| 3 | stesso comando, sezione "examples sync" | numeri di caso e totali della fixture coincidono con le tabelle di `regole-quote.md` | principio I |
| 4 | stesso comando, sezione "not covered" | nucleo da 5, da 6 e con bambino nato nel 2022 → `notCovered`, nessun importo | SC-002 |
| 5 | stesso comando, sezione "sample households" | ogni nucleo e singolo degli Excel finti ha un esito; sono `notCovered` solo il nucleo 900004 (6 persone) e la bambina singola nata nel 2022 | SC-003 |
| 6 | `npm run typecheck -w @tesseramento/fees` | nessun errore in modalità `strict` | constitution, qualità |

## Prova di regressione manuale

Modificare un totale in `docs/dominio/regole-quote.md` §3 (es. caso 18 da 73,00 a 74,00) e
rieseguire il comando 1: il test "examples sync" deve fallire. Ripristinare il valore.
