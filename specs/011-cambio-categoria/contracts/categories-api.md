# Contract: funzioni pure del cambio categoria

## `@tesseramento/families`

| Funzione | Ingresso → uscita |
|---|---|
| `listForAge(birthDate, year, schedule)` | elenco per età (ACR / GIOVANI / ADULTI); sotto l'età minima ACR; data non valida → `undefined` |
| `listStatus({ list, birthDate, exception? }, year, schedule?)` | `aligned` / `misaligned` (con `expected`) / `exception` / `unknown` |
| `alignAllPlan(rows, year, schedule)` | righe `misaligned` (escluse le eccezioni) → `[{ row, to }]` |
| `renewalView(...)` | + avviso `previousException` per chi era un'eccezione l'anno prima |

### Test (C1–C8)

- **C1** `listForAge` ai confini: 5 → ACR (sotto il minimo), 6 → ACR, 14 → ACR, 15 → GIOVANI, 29 → GIOVANI,
  30 → ADULTI; data "2030-01-01" per il 2026 → `undefined`.
- **C2** Dati finti 2026/27 con il loro elenco dell'export → tutte `aligned` (0 non allineate, FR-011).
- **C3** ROSSI ELENA 1996 in GIOVANI → `misaligned` con `expected: 'ADULTI'`.
- **C4** Eccezione (GRECO NICOLO 2011 in ACR con `exception`) → `exception` con `expected: 'GIOVANI'`; non entra in
  `alignAllPlan`.
- **C5** Senza listino → `unknown` per tutti; `alignAllPlan` vuoto.
- **C6** `alignAllPlan` con 2 non allineate e 1 eccezione → 2 cambi verso ADULTI.
- **C7** `renewalView` con GRECO NICOLO eccezione nel 2026 → nel 2027 elenco GIOVANI e avviso
  `previousException` ACR.
- **C8** La vista delle riconferme dà gli stessi risultati della 008 (37 da decidere, 14/8/15).

## `@tesseramento/import`

- **C9** `listOfAdhesion('2026-GIOVANI', 'ADULTI')` → `ADULTI` (prima era `GIOVANI`); `listOfAdhesion('2026-ACR', undefined)`
  → `ACR`.
