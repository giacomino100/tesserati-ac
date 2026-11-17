# Contract: API pura di `@tesseramento/families`

Pacchetto senza dipendenze di runtime; nessun accesso a rete, browser, data corrente o log.

```ts
export function parseBond(bond: string | undefined): Bond | undefined;

/** Famiglie dell'anno: confermate, suggerite dal N. Legame, aggiunte proposte, senza famiglia. */
export function suggestFamilies(
  members: readonly YearMember[],
  confirmed: readonly ConfirmedFamily[],
): YearFamilies;

/** Problemi di una famiglia da confermare (memberIds) rispetto alle altre famiglie confermate dell'anno. */
export function validateFamily(
  memberIds: readonly string[],
  members: readonly YearMember[],
  confirmed: readonly ConfirmedFamily[],
  familyId?: string,   // la famiglia che si sta modificando (le sue appartenenze non contano come "altra famiglia")
): FamilyIssue[];
```

## Garanzie verificate dai test

| # | Caso | Atteso |
|---|---|---|
| F1 | `parseBond`: "C3" → `{ kind: 'C', size: 3 }`; " n2 " → `{ kind: 'N', size: 2 }`; "X", "", undefined → undefined | come indicato |
| F2 | Tre file finti del 2026, nessuna conferma | 9 suggerite (2,3,4,6,2,3,2,3,2), 0 avvisi, 10 senza famiglia, 0 aggiunte |
| F3 | Solo il file ACR finto | famiglia 900002 con 1 componente, avviso `sizeMismatch` 3/1, `confirmable` false |
| F4 | Componenti con Legame `C3` e `C4` | avviso `bondMismatch` |
| F5 | Famiglia 900003 confermata con 3 dei 4 componenti | il 4° non è suggerito di nuovo come famiglia: compare tra le `additions` di quella famiglia |
| F6 | Persona in una famiglia confermata manuale e con `N. Legame` di un'altra | non compare nella suggerita |
| F7 | `validateFamily` con 1 componente | `tooFew` |
| F8 | `validateFamily` con una persona già in un'altra famiglia confermata | `inOtherFamily` |
| F9 | `validateFamily` modificando la propria famiglia | i propri componenti non sono "in un'altra famiglia" |
| F10 | `validateFamily` con un ID che non è un tesserato dell'anno | `notInYear` |
| F11 | Ordine | famiglie suggerite per `N. Legame`, componenti dal più anziano al più giovane |
