# Contract: Firestore — famiglie

Forma dei documenti: [../data-model.md](../data-model.md). Base: `isAllowed()` della 001.

## Matrice di accesso

| Collezione | get / list | create / update | delete |
|---|---|---|---|
| `families/{id}` | `isAllowed()` | `isAllowed()` ∧ campi esatti (`bondId` facoltativo) ∧ `associationYear is int` ∧ `memberIds is list` ∧ `2 ≤ size ≤ 20` ∧ `origin in ['legame','manuale']` ∧ `confirmedAt == request.time` ∧ `confirmedBy == email`; in update `associationYear` invariato | `isAllowed()` |
| `familyMemberships/{id}` | `isAllowed()` | `isAllowed()` ∧ campi esatti ∧ `id == string(associationYear) + '_' + personId` ∧ `getAfter(families/familyId)` esiste, stesso anno, `memberIds` contiene `personId` | `isAllowed()` ∧ (la famiglia di `resource.data.familyId` dopo la scrittura non esiste o non contiene più la persona) |

## Scritture dell'app (transazioni)

- **confirm(families, email)**: per ogni famiglia: legge `familyMemberships/{anno}_{p}` di ogni componente (se di
  un'altra famiglia → `MemberInOtherFamilyError`); scrive `families/{id}` (nuovo ID se suggerita/manuale nuova);
  `set` delle appartenenze; `delete` delle appartenenze dei componenti tolti (letti dalla versione precedente).
- **dissolve(familyId)**: legge la famiglia, cancella famiglia e appartenenze.

## Test sull'emulatore (`firebase/tests/rules.test.ts`)

| # | Caso | Atteso |
|---|---|---|
| J1 | Non autorizzato: lettura/scrittura di famiglie e appartenenze | negato |
| J2 | Autorizzato: lettura | consentito |
| J3 | Famiglia da 3 + 3 appartenenze in una scrittura | consentito |
| J4 | Famiglia con 1 componente o 21 | negato |
| J5 | Campo in più, `origin` sconosciuto, anno come testo | negato |
| J6 | `confirmedBy` di un altro o `confirmedAt` del client | negato |
| J7 | Appartenenza per una persona non nella famiglia, o con ID incoerente | negato |
| J8 | Appartenenza spostata verso una famiglia che non contiene la persona | negato; spostamento da A a B in una sola scrittura (A senza la persona, B con la persona, appartenenza aggiornata): consentito |
| J9 | Correzione: togliere un componente (update famiglia + delete appartenenza) | consentito; delete dell'appartenenza di una persona ancora nella famiglia: negato |
| J10 | Scioglimento: delete famiglia + appartenenze | consentito; update che cambia `associationYear`: negato |
