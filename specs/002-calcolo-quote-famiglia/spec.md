# Feature Specification: Calcolo quota famiglia

**Feature Branch**: `002-calcolo-quote-famiglia`

**Created**: 2026-11-16

**Status**: Draft

**Input**: Brief `docs/brief/002-calcolo-quota-famiglia.md` — dati i componenti di un nucleo con
un'adesione nell'anno e il listino dell'anno, determinare fascia, quota, agevolazione e totale
secondo il PDF ufficiale delle quote; segnalare i casi che il PDF non prevede.

**Regole di riferimento**: `docs/dominio/regole-quote.md` (unica fonte: PDF quote 2026/27).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quota di un nucleo fino a 3 persone (Priority: P1)

La segreteria indica i componenti di un nucleo (o un tesserato singolo) per l'anno associativo
e ottiene, per ciascuno, la fascia, la quota dovuta e l'eventuale agevolazione, più il totale
del nucleo. Copre quote piene, pacchetto 2 ACR e sconto del 20% sul più giovane.

**Why this priority**: copre la grande maggioranza dei casi reali (nell'export 2026: 58 singoli,
28 nuclei da 2, 12 da 3) e tutta la tabella "Casistica" del PDF.

**Independent Test**: si verifica eseguendo i casi 1–24 e 29 di `regole-quote.md` §3 e confrontando
il totale atteso; non richiede interfaccia né archivio dati.

**Acceptance Scenarios**:

1. **Given** il listino 2026/27 e un tesserato singolo nato nel 1980, **When** si calcola la
   quota, **Then** la fascia è Adulti e il totale è 26,00 €.
2. **Given** un nucleo di 2 ACR, **When** si calcola, **Then** il totale è 25,00 € con
   agevolazione "pacchetto 2 ACR".
3. **Given** un nucleo di 1 Adulto + 1 ACR, **When** si calcola, **Then** non c'è agevolazione e
   il totale è 41,00 €.
4. **Given** un nucleo di 2 Adulti + 1 Giovane, **When** si calcola, **Then** il Giovane (il più
   giovane) paga 18,00 € e il totale è 70,00 €.
5. **Given** un nucleo di 1 Adulto + 2 ACR, **When** si calcola, **Then** i 2 ACR pagano il
   pacchetto (25,00 €), l'Adulto 26,00 €, totale 51,00 €.
6. **Given** un nucleo di 3 ACR, **When** si calcola, **Then** i due ACR più grandi pagano il
   pacchetto (25,00 €), il più giovane 12,00 €, totale 37,00 €.
7. **Given** ognuno dei 18 casi della tabella "Casistica" del PDF, **When** si calcola, **Then**
   il totale coincide con quello del PDF.

---

### User Story 2 - Quota di un nucleo di 4 persone (Priority: P2)

La segreteria ottiene la quota di un nucleo di 4 tesserati: il terzo componente (il secondo più
giovane) ha lo sconto del 20% e il quarto (il più giovane) non paga.

**Why this priority**: casi meno frequenti (2 nuclei reali nel 2026) ma con l'agevolazione più
consistente, quindi più soggetti a errori manuali.

**Independent Test**: si verifica con i casi 25–28 di `regole-quote.md` §3.

**Acceptance Scenarios**:

1. **Given** un nucleo di 2 Adulti + 1 Giovane + 1 ACR, **When** si calcola, **Then** il Giovane
   paga 18,00 €, l'ACR 0,00 € e il totale è 70,00 €.
2. **Given** un nucleo di 2 Adulti + 2 ACR, **When** si calcola, **Then** si applica la regola
   dei 4 (non il pacchetto 2 ACR): 26 + 26 + 12 + 0 = 64,00 €.
3. **Given** un nucleo di 1 Adulto + Giovane nato nel 2000 + Giovane nato nel 2003 +
   1 Giovanissimo, **When** si calcola, **Then** il Giovane del 2003 paga 18,00 €, il
   Giovanissimo 0,00 €, totale 66,00 €.

---

### User Story 3 - Segnalazione dei casi non previsti dal PDF (Priority: P3)

Quando il nucleo non rientra nelle regole del PDF, la segreteria riceve l'esito "non previsto
dal listino" con il motivo, senza importi, così da decidere a mano.

**Why this priority**: riguarda pochi casi (nel 2026: 1 nucleo da 6 e 1 bambino sotto i 6
anni) ma impedisce che l'app produca quote inventate (Constitution, principio I).

**Independent Test**: si verifica con un nucleo da 5, uno da 6 e un nucleo con un componente
sotto i 6 anni: nessun importo, motivo esplicito.

**Acceptance Scenarios**:

1. **Given** un nucleo di 6 tesserati, **When** si calcola, **Then** l'esito è "non previsto"
   con motivo "nucleo con più di 4 componenti" e nessun importo.
2. **Given** un nucleo che contiene un bambino nato nel 2022 (4 anni nel 2026/27), **When** si
   calcola, **Then** l'esito è "non previsto" con motivo "componente sotto i 6 anni"
   [NEEDS CLARIFICATION: l'intero nucleo è "non previsto", oppure si esclude il bambino e si
   calcola il resto del nucleo?].

---

### Edge Cases

- **Nucleo vuoto** (nessun componente con adesione nell'anno): totale 0,00 €, nessuna agevolazione.
- **Stessa data di nascita** (gemelli): il totale non cambia perché hanno la stessa fascia;
  l'ordine tra loro è comunque stabile (per cognome e nome) così che l'agevolazione sia sempre
  attribuita alla stessa persona.
- **Confine di fascia**: età calcolata come anno associativo − anno di nascita, ignorando giorno e
  mese (es. nato il 31/12/1996 → 30 anni nel 2026/27 → Adulto).
- **Listino dell'anno mancante**: il calcolo non avviene e viene segnalato l'errore "listino non
  disponibile per l'anno".
- **Componente oltre l'età massima plausibile** o data di nascita futura: dato non valido,
  segnalato come errore di input (non come "non previsto").

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Il sistema MUST determinare la fascia di ogni componente dall'età = anno
  associativo − anno di nascita: 6–14 ACR, 15–18 Giovanissimi, 19–29 Giovani, 30 e oltre Adulti.
- **FR-002**: Il sistema MUST leggere quote piene, quote con sconto del 20% e importo del
  pacchetto 2 ACR dal listino dell'anno associativo; MUST NOT calcolare percentuali né arrotondare.
- **FR-003**: Il sistema MUST ordinare i componenti del nucleo dal più anziano al più giovane per
  data di nascita, con ordine stabile a parità di data.
- **FR-004**: Nucleo di 1 persona, o di 2 persone non entrambe ACR: ogni componente paga la quota
  piena della propria fascia.
- **FR-005**: Nucleo di 2 persone entrambe ACR: il nucleo paga l'importo del pacchetto 2 ACR
  (25,00 € nel 2026/27).
- **FR-006**: Nucleo di 3 persone con meno di 2 ACR: il più giovane paga la quota con sconto del
  20%, gli altri la quota piena.
- **FR-007**: Nucleo di 3 persone con esattamente 2 ACR: i 2 ACR pagano il pacchetto 2 ACR e il
  terzo componente paga la quota piena (Casistica del PDF: 51, 47, 41 €).
- **FR-008**: Nucleo di 3 ACR: i due più grandi pagano il pacchetto 2 ACR e il più giovane la
  quota ACR con sconto del 20% (Casistica del PDF: 37 €).
- **FR-009**: Nucleo di 4 persone: il terzo componente (secondo più giovane) paga la quota con
  sconto del 20%, il quarto (il più giovane) paga 0,00 €, gli altri la quota piena; il pacchetto
  2 ACR non si applica.
- **FR-010**: Nucleo di 5 o più persone, o con un componente sotto i 6 anni: il sistema MUST
  restituire l'esito "non previsto dal listino" con il motivo e MUST NOT restituire importi.
- **FR-011**: Per ogni nucleo calcolato il sistema MUST restituire, per ogni componente: fascia,
  quota piena, agevolazione applicata (nessuna / sconto 20% / gratuito / pacchetto 2 ACR) e
  importo dovuto; e il totale del nucleo.
- **FR-012**: Gli importi MUST essere esatti al centesimo e il totale MUST essere uguale alla somma
  degli importi dei componenti (il pacchetto 2 ACR conta una sola volta).
- **FR-013**: Il calcolo MUST essere deterministico: stessi componenti, stesso anno e stesso
  listino producono sempre lo stesso risultato.

### Key Entities *(include if feature involves data)*

- **Componente**: tesserato con adesione nell'anno associativo; attributi rilevanti per il
  calcolo: identificativo, cognome e nome (solo per ordine stabile), data di nascita.
- **Nucleo**: insieme dei componenti con lo stesso identificativo di nucleo nell'anno; un
  tesserato senza nucleo forma un nucleo da solo.
- **Listino**: per un anno associativo, quota piena e quota con sconto del 20% per ogni fascia,
  importo del pacchetto 2 ACR, fasce d'età.
- **Esito del calcolo**: "calcolato" (dettaglio per componente + totale) oppure "non previsto"
  (motivo, nessun importo).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Il 100% dei 29 esempi di `regole-quote.md` §3 produce esattamente il totale atteso.
- **SC-002**: Nessun nucleo fuori dalle regole del PDF riceve un importo: il 100% dei nuclei da 5+
  e con componenti sotto i 6 anni risulta "non previsto".
- **SC-003**: Sui dati di esempio anonimizzati (`docs/dominio/excel-esempio/`) ogni nucleo e ogni
  singolo ottiene un esito (calcolato o non previsto), senza errori.
- **SC-004**: Per ogni nucleo calcolato, la segreteria può capire dal solo dettaglio chi ha
  ricevuto quale agevolazione e perché, senza consultare il PDF.

## Assumptions

- Il PDF delle quote 2026/27 è l'unica fonte delle regole (Constitution, principio I).
- La composizione del nucleo e le date di nascita arrivano già pronte (da import e anagrafica,
  specifiche 004–009); questa funzionalità non legge Excel né archivi.
- Contano solo i componenti con adesione nell'anno: chi non rinnova non fa parte del nucleo.
- L'inserimento manuale della quota per i casi "non previsti" è fuori ambito (specifica
  successiva); qui si produce solo la segnalazione.
- La ripartizione per componente nei casi FR-007 e FR-008 (chi è nel pacchetto, chi ha lo sconto)
  segue il testo del PDF; il PDF fissa solo i totali, che sono rispettati.
- Interfaccia grafica, salvataggio, pagamenti e ricevute sono fuori ambito.
