# Contract: listini in Firestore (forma del documento e regole)

**Feature**: [../spec.md](../spec.md) · Modello in [../data-model.md](../data-model.md) · Base: `isAllowed()` della specifica 001 ([firestore-access](../../001-accesso-riservato/contracts/firestore-access.md))

Le regole stanno in `firebase/firestore.rules`, nel blocco `match /feeSchedules/{yearId}`, **prima**
della regola finale "nega tutto".

## Matrice di accesso

| Operazione su `feeSchedules/{anno}` | Non autenticato / non autorizzato / sessione scaduta | Utente autorizzato |
|---|---|---|
| `get` di un listino | ❌ | ✅ |
| `list` dell'elenco dei listini | ❌ | ✅ |
| `create` | ❌ | ✅ solo se valgono le condizioni di creazione |
| `update` | ❌ | ✅ solo se valgono le condizioni di modifica |
| `delete` | ❌ | ❌ |

## Condizioni di creazione dell'anno `Y`

1. `yearId` è di 4 cifre e `associationYear == int(yearId)`;
2. esiste `feeSchedules/(Y-1)` e **non** esiste `feeSchedules/Y` (si può solo proseguire dall'ultimo anno);
3. la forma è esatta (solo i campi di data-model.md) e i valori sono validi (importi interi `> 0`, `discountedCents ≤ fullCents`, `acrPackageCents > 0`, 4 fasce nell'ordine previsto);
4. `label` è quella dell'anno (`Y` → `"Y/ultime due cifre di Y+1"`); `minAge`, `maxHouseholdSize` e, per ogni fascia, `band`/`minAge`/`maxAge` sono **uguali** a quelli di `Y-1`;
5. `updatedBy == email dell'utente in minuscolo` e `updatedAt == request.time`.

## Condizioni di modifica

1. `associationYear` invariato;
2. forma e valori validi (punto 3 sopra);
3. `label`, `minAge`, `maxHouseholdSize` e i dati di fascia non modificabili **invariati** rispetto al documento esistente;
4. `updatedBy`/`updatedAt` aggiornati come al punto 5 sopra.

## Garanzie (da coprire con test sull'emulatore)

| # | Garanzia | Requisito |
|---|---|---|
| F1 | Senza accesso, o per un account non in elenco, nessuna lettura né scrittura di `feeSchedules` | FR-013, SC-006 |
| F2 | Un utente autorizzato legge un listino e l'elenco; un utente con sessione oltre 7 giorni no | FR-001, FR-013 |
| F3 | Creare `Y` con `Y-1` esistente e `Y` assente, con valori validi: consentito | FR-004 |
| F4 | Creare un anno saltato (es. 2028 senza 2027), un anno già esistente, o precedente (2025): negato | FR-004, FR-006 |
| F5 | Valori non validi (zero, negativi, non interi, scontata > piena, pacchetto ≤ 0, campi mancanti o in più, fasce in ordine diverso): negati in creazione e in modifica | FR-006, SC-003 |
| F6 | Cambiare fasce d'età, età minima, massimo del nucleo o etichetta: negato in creazione (diversi dal precedente) e in modifica | FR-005 |
| F7 | Modificare le sole quote con valori validi: consentito; `updatedAt` e `updatedBy` devono essere quelli della richiesta (email falsa o data vecchia: negato) | FR-005, FR-016 |
| F8 | Cancellare un listino: negato per tutti | FR-012 |
| F9 | Creare o modificare un anno non cambia gli altri listini (verifica dei valori prima e dopo) | FR-010, SC-004 |
| F10 | Il listino 2026 inizializzato (da seed) è leggibile e coincide con `SCHEDULE_2026_27` | FR-002, SC-002 |
