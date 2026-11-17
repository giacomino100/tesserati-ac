# Research: Tesserati semplificati

## R1. Righe dell'elenco

- **Decision**: `memberYearView({ year, previous, current, memberships, schedule, paid })` → righe ordinate per
  cognome e nome: tesserati dell'anno precedente senza adesione nell'anno (`pending`, con elenco per età e avvisi come
  la 008) e tesserati dell'anno (`enrolled`, con origine, data di pagamento o "non registrato"); conteggi; filtro e
  ricerca nell'app (testo normalizzato, senza accenti).
- **Rationale**: FR-001; riusa `renewalView` della 008 per età, elenco e avvisi.

## R2. Pagamento

- **Decision**: sull'adesione `paidOn` ("AAAA-MM-GG", giorno del pagamento, non futuro), `paidAt` (`request.time`),
  `paidBy` (email). Si scrivono alla creazione (riconferma e nuovo, facoltativi per compatibilità) o dopo con
  "Registra pagamento" (aggiornamento dei soli tre campi). La pagina ha un campo "Data di pagamento" (oggi) usato da
  "Conferma", "Registra pagamento" e "Nuovo tesserato".
- **Rationale**: FR-002, FR-006, FR-007, FR-010; nessun importo (012).

## R3. Famiglia automatica

- **Decision**: `familyAfterConfirm({ personId, year, current, families, memberships, optOut })` → `{ kind: 'none' }`
  | `{ kind: 'add', family, memberIds }` | `{ kind: 'create', bondId, memberIds }`: con il `N. Legame` della persona,
  aggiunta alla famiglia confermata dell'anno con quel `bondId`; altrimenti famiglia nuova con gli iscritti dell'anno
  con lo stesso `N. Legame` fuori da famiglie e senza `familyOptOut` (almeno 2); niente se la persona ha
  `familyOptOut`. L'app la salva con `FamiliesBackend.confirm` (007) subito dopo la conferma.
- **Rationale**: chiarimento B; regole della 007 invariate.
- **Alternatives considered**: tutto in una transazione (le regole di famiglie e appartenenze leggono già molti
  documenti: due scritture separate, con messaggio se la seconda fallisce).

## R4. Pannello Famiglia

- **Decision**: `familyPanel(personId, …)` → famiglia confermata dell'anno (se c'è) e componenti: membri effettivi +
  tesserati dell'anno prima con lo stesso `N. Legame`, ognuno con stato (`pending` / `enrolled` / `inFamily`).
  Azioni: "Conferma" (come nell'elenco), "Togli" (famiglia aggiornata, o sciolta se resta 1; `familyOptOut` sulla
  persona), "Aggiungi un tesserato" (iscritti dell'anno fuori da famiglie; toglie `familyOptOut`), "Crea famiglia"
  per chi non ne ha.
- **Rationale**: FR-004b, FR-005.

## R5. Amministratore

- **Decision**: campo `admin: true` in `allowedEmails/{email}` (solo console). Regole: `isAdmin()` = `isAllowed()` e
  quel documento con `admin == true` (stesso documento già letto da `isAllowed`); obbligatorio per creare
  `importBatches` (e quindi persone e adesioni importate). App: `AuthBackend.isAdmin?(email)`, `AuthService.admin`,
  guardia `requireAdmin` su `/importa`, voce "Importa Excel" solo per l'amministratore.
- **Rationale**: FR-009; `utenti.md` aggiornato; nessuna email nel codice.

## R6. Cosa si toglie

- **Decision**: pagina e servizio `riconferme` (restano `renewals-backend.ts` e `firestore-renewals-backend.ts`);
  rotta `riconferme` → `redirectTo: 'tesserati'`; voce in home; "Allinea tutte" e conteggio delle non allineate del
  servizio di Tesserati; il rimando del modulo 009 diventa "È tra i tesserati del {anno}: usa Conferma nell'elenco.".
- **Rationale**: FR-008.

## R7. Anni proposti

- **Decision**: come la 009 R6: anni con tesserati e l'anno dopo ciascuno; predefinito l'anno dopo l'ultimo con
  tesserati se ha un listino, altrimenti l'ultimo con tesserati.
- **Rationale**: si apre subito sull'anno da confermare.
