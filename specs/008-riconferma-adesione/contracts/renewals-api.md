# Contract: funzioni pure della riconferma

## `@tesseramento/families`

| Funzione | Ingresso → uscita |
|---|---|
| `listForBand(band)` | `acr` → `ACR`; `giovanissimi`, `giovani` → `GIOVANI`; `adulti` → `ADULTI` |
| `renewalView({ year, previous, current, memberships, schedule })` | tesserati dell'anno precedente, tesserati dell'anno nuovo (con `origin`), appartenenze dell'anno nuovo, listino dell'anno nuovo (assente → `list` calcolato senza listino non disponibile: `renewable = false`) → `RenewalView` |
| `renewalDraft(candidate, year)` | candidato riconfermabile → `RenewalDraft` con `list` del nuovo anno e `bond`/`bondId` dell'anno precedente |

### Test (R1–R10)

- **R1** `listForBand` sulle quattro fasce.
- **R2** Dati finti 2026 (letti con `@tesseramento/import` nei soli test) + listino 2027/28 → 37 da decidere: 9 gruppi
  900001–900009 (27 persone) + 10 singoli in ordine di cognome e nome.
- **R3** RINALDI PIETRO: 15 anni, `GIOVANI`, `listChange` ACR → GIOVANI; RIZZO VALERIA: 30, `ADULTI`, GIOVANI → ADULTI.
- **R4** GATTI MIA: 5 anni, `ACR`, `underMinAge` 6, riconfermabile.
- **R5** Elenchi del 2027 per tutti: 14 ACR, 8 Giovani, 15 Adulti; esattamente 2 `listChange`.
- **R6** Persona nata dopo l'anno nuovo → `invalidBirthDate`, `renewable = false`, nessun `list`.
- **R7** Persone già nell'anno nuovo (import o riconferma) → in `renewed`, non nei gruppi; conteggi coerenti.
- **R8** `undoable` solo per `origin = 'riconferma'` senza appartenenza; con appartenenza `inFamily = true`.
- **R9** Senza listino → nessun candidato riconfermabile.
- **R10** `renewalDraft` copia `bond`/`bondId` e mette l'elenco del nuovo anno; nessun dato anagrafico.

## `@tesseramento/import`

| Funzione | Comportamento |
|---|---|
| `listOfAdhesion(importId, list)` | `importId` valido → il suo elenco; altrimenti `list` se è uno dei tre; altrimenti `undefined` |
| `planImport(parsed, list, archive, adhesionsOfYear, decisions, renewedIds)` | persona riusata in `renewedIds` → riga saltata `alreadyRenewed` (non `alreadyInYear`) |

### Test (I1–I3)

- **I1** `listOfAdhesion` con import, con riconferma, con valori non validi.
- **I2** File ACR finto 2027 con 3 persone riconfermate → 3 righe `alreadyRenewed`, nessuna adesione per loro.
- **I3** Comportamento precedente invariato senza `renewedIds`.
