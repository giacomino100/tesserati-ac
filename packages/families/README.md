# @tesseramento/families

Logica **pura** delle famiglie per anno associativo (specifica 007) e dei nuclei con le loro quote (specifica 010).
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
