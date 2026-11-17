# Contract: funzioni pure (`@tesseramento/families`)

| Funzione | Ingresso → uscita |
|---|---|
| `memberYearView({ year, previous, current, memberships, schedule? })` | righe `pending` / `enrolled` ordinate per nome, conteggi |
| `familyAfterConfirm({ personId, current, families, memberships })` | aggiornamento automatico della famiglia (research R3) |
| `familyPanel({ personId, previous, current, families, memberships })` | componenti con stato e iscritti aggiungibili |

## Test (P1–P10)

- **P1** Dati finti 2026/27 come anno precedente, 2027/28 vuoto → 37 `pending`, 0 `enrolled`, ordinati per nome.
- **P2** Dopo la riconferma di MORETTI CARLA con `paidOn` → 36 `pending`, 1 `enrolled` con `paidOn`.
- **P3** Iscritti senza anno precedente (nuovo o importato) → `enrolled`; riconferma senza `paidOn` → `enrolled` senza
  data.
- **P4** `undoable` solo per riconferme e nuovi fuori da famiglie.
- **P5** `familyAfterConfirm`: primo iscritto del `N. Legame` → `none`; secondo → `create` con i due; terzo con
  famiglia confermata → `add`.
- **P6** Persona con `familyOptOut` → `none`; iscritto con `familyOptOut` non entra in una `create`.
- **P7** Persona senza `N. Legame` → `none`; persona già in una famiglia → `none`.
- **P8** `familyPanel` di GALLO LUCA: 4 componenti (`N. Legame` 900003) con stato; con la famiglia confermata, i membri
  effettivi `inFamily`.
- **P9** `familyPanel.addable`: iscritti dell'anno fuori da famiglie, esclusa la persona.
- **P10** Persona senza famiglia né `N. Legame` → pannello con solo la persona e gli aggiungibili.
