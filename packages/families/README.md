# @tesseramento/families

Logica **pura** delle famiglie per anno associativo (specifica 007), dei nuclei con le loro quote (specifica 010) e
delle riconferme (specifica 008).
Unica dipendenza: `@tesseramento/fees` (pura). Nessun accesso a rete, browser, data corrente o log. Regole: `docs/dominio/regole-famiglia.md` §0–§1.

## API

| Funzione | Cosa fa |
|---|---|
| `suggestFamilies(members, confirmed, memberships)` | tesserati dell'anno + famiglie confermate + appartenenze (personId → familyId) → famiglie confermate con i componenti effettivi, famiglie **suggerite** dal `N. Legame`, **aggiunte proposte** alle famiglie confermate, tesserati **senza famiglia** |
| `validateFamily(memberIds, members, memberships, familyId?)` | problemi di una famiglia da confermare: meno di 2 componenti, persona non tesserata nell'anno, persona già in un'altra famiglia |
| `parseBond("C3")` | `{ kind: 'C', size: 3 }`: lettera e numero di componenti del `Legame` |
| `householdsOfYear(yearFamilies)` | nuclei dell'anno (specifica 010): famiglie confermate (`f-{id}`) + ogni tesserato senza famiglia confermata (`p-{personId}`), e quante famiglie suggerite non sono confermate |
| `householdFees(households, schedule)` | quota di ogni nucleo con **solo** `calculateHouseholdFee` di `@tesseramento/fees` e il listino dell'anno: calcolata, non prevista (con motivo) o errore interno |
| `compareWithSaved(current, saved)`, `yearTotals`, `toSavedCalculated` | confronto con le quote salvate (`new` / `unchanged` / `changed` / `removed`, validità delle quote manuali) e totali dell'anno |
| `renewalView({ year, previous, current, memberships, schedule? })` | riconferme (specifica 008): tesserati dell'anno precedente da decidere, raggruppati per `N. Legame` e poi singoli, con età ed elenco del nuovo anno dalle fasce del listino (`listForBand`), avvisi (cambio di elenco, sotto l'età minima, data incoerente) e già iscritti (annullabili se riconfermati e fuori da famiglie) |
| `listForAge(birthDate, year, schedule)`, `listStatus(row, year, schedule?)`, `alignAllPlan(rows, year, schedule)` | elenco per età (specifica 011; usato anche da riconferma e iscrizione), stato dell'elenco di un'adesione (allineata / non allineata / eccezione / sconosciuto) e piano di "Allinea tutte" (escluse le eccezioni); `renewalView` avvisa con `previousException` chi era un'eccezione l'anno prima |
| `YearMember.origin` | `'import'` (assente), `'riconferma'` (008) o `'nuovo'` (009) |
| `renewalDraft(candidate, year)` | adesione da creare: elenco del nuovo anno e legame dell'anno precedente, nessun dato anagrafico |

## Regole principali

- **Famiglia suggerita** = tesserati dell'anno con lo stesso `N. Legame` non ancora in una famiglia confermata; diventa
  famiglia solo con la conferma di una persona. Componenti dal più anziano al più giovane.
- **Avvisi** (non bloccanti): numero del `Legame` diverso dai componenti trovati (contando anche quelli già confermati
  con lo stesso `N. Legame`); `Legame` diversi tra i componenti.
- **Appartenenza = fonte di verità** (research R8): una persona sta nella famiglia indicata dalla sua appartenenza;
  se compare anche nei `memberIds` di un'altra famiglia, lì è ignorata e la famiglia ha l'avviso `inconsistent`.
- Almeno 2 componenti; al massimo una famiglia per persona per anno.

## Test

```bash
npm test -w @tesseramento/families    # sintetici + i tre file finti (letti con @tesseramento/import, solo nei test)
```
