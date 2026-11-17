# Feature Specification: Famiglie

**Feature Branch**: `007-famiglie`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Brief `docs/brief/007-famiglie.md` (decisioni di revisione approvate il 2026-11-17) — una sezione
"Famiglie" che per ogni anno suggerisce le famiglie dai `N. Legame` dell'export, le fa confermare o correggere da
una persona e le salva per l'anno.

**Regole di riferimento**: `docs/dominio/regole-famiglia.md` §0 (`N. Legame` = nucleo; `Legame` = lettera + numero di
componenti; indirizzo e cognome non identificano la famiglia) e §1 (famiglia = stesso `N. Legame` come
suggerimento, confermata da una persona; per anno; al massimo una famiglia per persona per anno — aggiornato il
2026-11-17); `docs/dominio/regole-quote.md` (il nucleo è la base dello sconto); `docs/dominio/glossario.md`;
constitution, principi I, III e IV.

## Clarifications

### Session 2026-11-17

- Q: Una famiglia confermata deve avere almeno 2 componenti, oppure si può confermare anche una famiglia di una sola persona? → A: almeno 2 componenti; una persona sola resta "senza famiglia" (nucleo da 1, come in `regole-famiglia.md` §1).

- Q: Si deve poter sciogliere una famiglia già confermata, in modo che tutti i componenti tornino senza famiglia? → A: sì, con il pulsante "Sciogli famiglia" e una conferma ("Tutti i componenti resteranno senza famiglia"); persone e adesioni non cambiano.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vedere le famiglie suggerite dell'anno (Priority: P1)

Un utente autorizzato apre "Famiglie" e sceglie l'anno. Vede le famiglie suggerite: i tesserati dell'anno con lo
stesso `N. Legame`, anche se sono in elenchi diversi, con cognome e nome, data di nascita ed elenco di ciascuno, e il
`Legame` dell'export (es. `C3`). Se il numero di componenti trovati non corrisponde al `Legame`, la famiglia mostra
un avviso. Sotto, i tesserati dell'anno senza famiglia.

**Why this priority**: è il punto di partenza per lo sconto famiglia; senza vedere i nuclei non si può controllarli.

**Independent Test**: con i tre elenchi finti del 2026 importati, "Famiglie" 2026/27 mostra 9 famiglie suggerite
(2, 3, 4, 6, 2, 3, 2, 3, 2 componenti), nessun avviso, e 10 tesserati senza famiglia.

**Acceptance Scenarios**:

1. **Given** i tre elenchi finti del 2026 importati, **When** si apre "Famiglie" 2026/27, **Then** compaiono 9
   famiglie suggerite con i loro componenti e il `Legame`, e 10 tesserati senza famiglia.
2. **Given** solo l'elenco ACR 2026 importato, **When** si apre "Famiglie", **Then** la famiglia `C3` (900002) mostra
   1 componente e l'avviso "Il Legame C3 indica 3 componenti, ne sono stati trovati 1".
3. **Given** un anno senza import, **When** si apre "Famiglie", **Then** compare "Nessun tesserato importato per
   questo anno." con il collegamento a "Importa Excel".

---

### User Story 2 - Confermare le famiglie (Priority: P1)

L'utente conferma una famiglia suggerita così com'è, oppure tutte quelle suggerite insieme ("Conferma tutte").
Le famiglie confermate sono salvate per l'anno, con data ed email di chi le ha confermate per ultimo.

**Why this priority**: la famiglia confermata da una persona è quella che userà il calcolo delle quote (010).

**Independent Test**: con i tre elenchi finti, "Conferma tutte" salva 9 famiglie del 2026; ricaricando la pagina
risultano confermate, con data ed email; un altro utente autorizzato le vede.

**Acceptance Scenarios**:

1. **Given** una famiglia suggerita, **When** l'utente preme "Conferma", **Then** la famiglia risulta confermata con
   data ed email di chi ha confermato.
2. **Given** 9 famiglie suggerite, **When** l'utente preme "Conferma tutte", **Then** tutte e 9 risultano confermate.
3. **Given** famiglie confermate nel 2026, **When** si apre l'anno 2027, **Then** nel 2027 non c'è nessuna famiglia
   confermata (le famiglie valgono per anno).
4. **Given** una famiglia confermata e un nuovo elenco importato dopo con un tesserato che ha lo stesso `N. Legame`,
   **When** si apre "Famiglie", **Then** la famiglia confermata resta com'era e mostra il suggerimento "Aggiungi
   COGNOME NOME (stesso N. Legame)".

---

### User Story 3 - Correggere le famiglie (Priority: P2)

Prima di confermare, o riaprendo una famiglia già confermata, l'utente può togliere un componente (resta senza
famiglia), aggiungere un tesserato dell'anno senza famiglia, o creare una famiglia nuova scegliendo tesserati senza
famiglia. Poi conferma.

**Why this priority**: l'export può essere incompleto o sbagliato; la decisione finale è di una persona.

**Independent Test**: togliere un componente da una famiglia suggerita e confermare: la famiglia salvata non lo
contiene e lui risulta senza famiglia; creare una famiglia con due tesserati senza famiglia e confermarla.

**Acceptance Scenarios**:

1. **Given** la famiglia 900003 suggerita (4 componenti), **When** l'utente toglie un figlio e conferma, **Then** la
   famiglia salvata ha 3 componenti e il figlio compare tra i tesserati senza famiglia.
2. **Given** due tesserati senza famiglia, **When** l'utente crea una famiglia con loro e la conferma, **Then** la
   famiglia è salvata con 2 componenti e indicata come "creata a mano".
3. **Given** un tesserato già in una famiglia (suggerita o confermata), **When** l'utente prova ad aggiungerlo a
   un'altra famiglia, **Then** l'app non lo consente e spiega che deve prima toglierlo dalla sua famiglia.
4. **Given** una famiglia confermata, **When** l'utente la riapre, la corregge e la riconferma, **Then** la famiglia
   salvata è quella nuova, con data ed email aggiornate.
5. **Given** una famiglia con un solo componente rimasto, **When** l'utente prova a confermarla, **Then** l'app non lo
   consente: una famiglia ha almeno 2 componenti.
6. **Given** una famiglia confermata, **When** l'utente preme "Sciogli famiglia" e conferma l'avviso "Tutti i
   componenti resteranno senza famiglia", **Then** la famiglia non è più salvata e i suoi componenti compaiono tra i
   tesserati senza famiglia (o di nuovo come famiglia suggerita, se hanno un `N. Legame`).

---

### Edge Cases

- `N. Legame` presente in un solo tesserato dell'anno (gli altri non tesserati o non ancora importati): famiglia
  suggerita da 1 con l'avviso sul `Legame`; confermarla non è possibile finché non ha almeno 2 componenti.
- `Legame` diverso tra componenti con lo stesso `N. Legame` (es. `C3` e `C4`): la famiglia mostra un avviso.
- Famiglie con 5 o più componenti: si confermano normalmente; il fatto che il listino non le preveda è affare della
  010.
- Un tesserato con il `N. Legame` di una famiglia suggerita è già in un'altra famiglia confermata: non viene
  proposto due volte; la famiglia suggerita mostra la nota "VERDI SOFIA è nella famiglia di VERDI PAOLO".
- "Conferma tutte" conferma tutte le famiglie suggerite con almeno 2 componenti (anche quelle con avviso) e salta le
  altre, dicendo quante e perché ("1 famiglia con un solo componente non confermata").
- Due persone confermano la stessa famiglia suggerita quasi insieme: vale la prima conferma; chi conferma dopo vede
  "Le famiglie sono state modificate da qualcun altro" e la pagina si aggiorna; nessuna famiglia duplicata.
- Su una famiglia già confermata, due correzioni quasi insieme: vale l'ultima (riconferma della stessa famiglia).
- "Conferma tutte" con molte famiglie (dati reali: ~45) conferma le famiglie a gruppi; se un gruppo non riesce, le
  famiglie dei gruppi precedenti restano confermate e il messaggio dice quante sono state confermate.
- I dati importati (persone, adesioni) non vengono mai modificati da questa sezione.
- Utente non autorizzato: nessun accesso.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Gli utenti autorizzati MUST poter aprire una sezione "Famiglie" e scegliere un anno associativo tra
  quelli importati.
- **FR-002**: Il sistema MUST suggerire come famiglia l'insieme dei tesserati dell'anno con lo stesso `N. Legame`, di
  tutti gli elenchi importati, esclusi quelli già in una famiglia confermata dell'anno.
- **FR-003**: Per ogni famiglia il sistema MUST mostrare i componenti (cognome e nome, data di nascita, elenco), il
  `Legame` dell'export e, se il numero di componenti non corrisponde a quello del `Legame` o i `Legame` differiscono,
  un avviso non bloccante.
- **FR-004**: Il sistema MUST mostrare i tesserati dell'anno senza famiglia (né suggerita né confermata).
- **FR-005**: Gli utenti MUST poter confermare una famiglia suggerita, oppure tutte quelle suggerite insieme.
- **FR-006**: Gli utenti MUST poter togliere un componente da una famiglia, aggiungere un tesserato dell'anno senza
  famiglia, creare una famiglia con tesserati senza famiglia, riaprire, correggere e riconfermare una famiglia
  confermata, e sciogliere una famiglia confermata dopo una conferma esplicita.
- **FR-007**: Il sistema MUST impedire che una persona stia in più di una famiglia nello stesso anno e che si confermi
  una famiglia con meno di 2 componenti.
- **FR-008**: Le famiglie confermate MUST essere salvate per anno associativo, con i componenti, l'origine
  (suggerita dal `N. Legame` o creata a mano), il `N. Legame` se c'è, la data e l'email di chi ha confermato per
  ultimo; non MUST cambiare quando si importano altri elenchi o si lavora su un altro anno.
- **FR-009**: Se dopo la conferma compaiono tesserati dell'anno con lo stesso `N. Legame` di una famiglia confermata,
  il sistema MUST proporli come aggiunta alla famiglia, senza aggiungerli da solo.
- **FR-010**: Il sistema MUST NOT modificare persone e adesioni importate.
- **FR-011**: Solo gli utenti autorizzati MUST poter leggere e scrivere le famiglie; le regole di sicurezza MUST
  impedire famiglie con meno di 2 componenti, campi non previsti e date o email non corrispondenti a chi salva.
- **FR-012**: Con i tre elenchi finti del 2026 importati il sistema MUST suggerire 9 famiglie (2, 3, 4, 6, 2, 3, 2,
  3, 2 componenti), nessun avviso, e mostrare 10 tesserati senza famiglia.

### Key Entities *(include if feature involves data)*

- **Famiglia (dell'anno)**: un gruppo di almeno 2 tesserati dell'anno associativo, con origine (suggerita dal
  `N. Legame` o creata a mano), `N. Legame` se c'è, data ed email dell'ultima conferma. Una persona è in al massimo
  una famiglia per anno.
- **Famiglia suggerita**: calcolata dalle adesioni dell'anno, non salvata finché non viene confermata.
- **Tesserato dell'anno**: persona con un'adesione nell'anno (004–006), con il suo `Legame` e `N. Legame`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con i tre elenchi finti del 2026, il 100% dei 9 nuclei del README è suggerito con tutti i componenti, 0
  avvisi.
- **SC-002**: Con "Conferma tutte" la segreteria conferma le famiglie di un anno in meno di 1 minuto.
- **SC-003**: 0 persone risultano in due famiglie dello stesso anno.
- **SC-004**: Confermare o correggere le famiglie di un anno non cambia nessuna persona, adesione o famiglia di un
  altro anno.
- **SC-005**: Gli utenti non autorizzati non riescono mai a leggere o scrivere famiglie (test delle regole).

## Assumptions

- Gli elenchi dell'anno sono importati con 004–006; la sezione funziona anche con elenchi mancanti (con avvisi).
- Il `N. Legame` identifica il nucleo solo dentro lo stesso anno; il suo uso tra anni diversi è della 008.
- "Famiglia" e "nucleo" sono la stessa cosa nell'interfaccia; si usa "Famiglia".
- Collegare un tesserato nuovo inserito a mano (009), quote (010), riporto delle famiglie all'anno dopo (008) e
  stampa (012) sono fuori ambito.
