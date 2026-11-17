# Contract: funzioni pure del nuovo tesserato (`@tesseramento/import`)

| Funzione | Ingresso → uscita |
|---|---|
| `validateNewMember(input, year)` | campi del modulo → `{ ok: true, member: NewMember }` o `{ ok: false, errors: NewMemberErrors }` |
| `matchNewMember(member, year, archive, yearIds, previousYearIds)` | persona pulita + archivio (con ultima adesione) + ID con adesione nell'anno e nell'anno precedente → `NewMemberMatch` |
| `resolveSimilar(personId, year, archive, yearIds, previousYearIds)` | dopo "Stessa persona": come `existing` ma con i controlli d'anno |

## Test (N1–N12)

- **N1** Cognome/nome con spazi e minuscole → puliti e maiuscoli; chiave uguale a quella dell'import.
- **N2** Campi obbligatori mancanti → errori per campo con i testi di research R3.
- **N3** Data inesistente, successiva all'anno, più di 120 anni prima → "Data di nascita non valida.".
- **N4** Codice fiscale di 15 caratteri o con simboli → errore; vuoto → assente; minuscolo → maiuscolo.
- **N5** Sesso vuoto → assente; "M"/"F" → presente.
- **N6** Nessuna persona simile → `new`.
- **N7** Stessa chiave, ultima adesione 2023 → `existing` (`identity`), con `lastAdhesion`.
- **N8** Stesso codice fiscale con nome diverso → `existing` (`taxCode`).
- **N9** ROSSI MARIO 1965-03-21 con ROSSI MARIO 1965-03-12 in archivio → `similar` con 1 candidato.
- **N10** Persona con adesione nell'anno precedente → `renewable`; nell'anno → `alreadyInYear` (anche dopo "Stessa
  persona" con `resolveSimilar`).
- **N11** `planImport` con `manualIds` → `alreadyRenewed` per le riconferme, `alreadyAdded` per i nuovi.
- **N12** Con i file finti come archivio: BIANCO LUCA 2019-05-10 → `new`.
