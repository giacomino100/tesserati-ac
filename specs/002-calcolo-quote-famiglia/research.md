# Research: Calcolo quota famiglia

**Feature**: [spec.md](./spec.md) · **Date**: 2026-11-16

## R1. Dove vive il codice del calcolo

- **Decision**: npm workspaces nella radice del repository; il calcolo è il pacchetto
  `packages/fees` (`@tesseramento/fees`), TypeScript puro. L'app Angular arriverà in `apps/web`
  (specifiche 001/004) e importerà il pacchetto.
- **Rationale**: la constitution (principio II) chiede una libreria senza dipendenze da Angular,
  Firebase o browser. Un pacchetto separato rende la regola verificabile (nessun import Angular
  possibile) e testabile senza avviare l'app.
- **Alternatives considered**:
  - Libreria Angular (`ng generate library`): porta con sé ng-packagr e la build Angular, inutili
    per codice puro.
  - Cartella `src/app/domain` dentro l'app: l'isolamento dipenderebbe solo dalla disciplina.

## R2. Versioni

- **Decision**: Node.js 22 LTS, **TypeScript 6.0.x** (`strict`), Vitest 5.x.
- **Rationale**: Angular 22.2 (ultima stabile) richiede `typescript >=6.0 <6.1`; usare la stessa
  versione in tutto il workspace evita due compilatori. Vitest 5 richiede Node ≥ 22.12 ed è lo
  strumento di test scelto nella constitution.
- **Alternatives considered**: TypeScript 7.0 (ultima versione) — non compatibile con Angular 22.

## R3. Rappresentazione degli importi

- **Decision**: interi in **centesimi** (`2600` = 26,00 €); formattazione in euro solo in
  visualizzazione (fuori ambito).
- **Rationale**: constitution II; nessun errore di virgola mobile; FR-012 (esatti al centesimo).
- **Alternatives considered**: `number` in euro con decimali (errori di arrotondamento); librerie
  decimali (dipendenza inutile: si fanno solo somme di interi).

## R4. Date di nascita ed età

- **Decision**: data di nascita come stringa ISO `YYYY-MM-DD`; anno associativo come anno di
  inizio (`2026` per il 2026/27). Età = `annoInizio − anno di nascita`.
- **Rationale**: FR-001 usa solo l'anno; le stringhe ISO evitano problemi di fuso orario degli
  oggetti `Date` e si ordinano correttamente come testo. Il calcolo non legge mai la data
  corrente (funzione pura).
- **Alternatives considered**: oggetti `Date` (fusi orari, mutabilità); solo l'anno di nascita
  (insufficiente: l'ordine "più giovane" usa la data completa, FR-003).

## R5. Come applicare le regole del PDF

- **Decision**: una regola esplicita per ciascuna dimensione del nucleo (1, 2, 3, 4) e per i casi
  2 ACR / 3 ACR, esattamente come FR-004…FR-010. Nessuna ricerca della "combinazione migliore".
- **Rationale**: constitution I (nessuna regola non scritta). Verificato con uno script in fase
  di specifica: le regole alla lettera danno 18/18 casi della Casistica e gli 11 casi derivati.
- **Alternatives considered**: algoritmo di ottimizzazione (minimo totale) — produce gli stessi
  numeri sulla Casistica ma introduce un principio non presente nel PDF.

## R6. Listino

- **Decision**: il listino è un **parametro** del calcolo (tipo `FeeSchedule`). Il listino
  2026/27 del PDF è fornito come costante `SCHEDULE_2026_27` nel pacchetto, usata da test e come
  valore iniziale. La gestione dei listini per anno (archiviazione, modifica) è la specifica 003.
- **Rationale**: FR-002 (valori letti dal listino, mai calcolati); principio IV (ogni anno il suo
  listino); il calcolo resta puro.
- **Alternatives considered**: quote scritte nel codice delle regole (violazione FR-002);
  lettura da Firestore nel calcolo (violazione principio II).

## R7. Forma del risultato

- **Decision**: unione discriminata su `status`: `calculated` | `notCovered` | `invalidInput`.
  Nessuna eccezione per i casi previsti dalla specifica.
- **Rationale**: i casi "non previsto" ed errori di input sono esiti normali (US3, Edge Cases); il
  chiamante (UI) deve gestirli tutti e TypeScript lo obbliga con il controllo di esaustività.
- **Alternatives considered**: eccezioni (facili da dimenticare nell'interfaccia).

## R8. Test degli esempi

- **Decision**: i 29 esempi di `docs/dominio/regole-quote.md` §3 sono riportati in un file di
  fixture con lo stesso numero di caso; un test aggiuntivo legge le tabelle di `regole-quote.md`
  e verifica che numeri di caso e totali coincidano con la fixture.
- **Rationale**: i documenti di dominio restano la fonte (principio I) e se qualcuno modifica
  un totale nel documento senza aggiornare i test, il test di allineamento fallisce.
- **Alternatives considered**: generare i casi analizzando il testo delle composizioni ("2 Adulti +
  1 Giovane") — fragile; solo fixture senza controllo — rischio di divergenza silenziosa.

## R9. Verifica sui dati di esempio (SC-003)

- **Decision**: fixture con i nuclei degli Excel finti (`docs/dominio/excel-esempio/`, nuclei
  900001–900009 e i singoli), scritta a mano in TypeScript; nessuna lettura di Excel in questa
  specifica.
- **Rationale**: la lettura Excel è la specifica 004; qui basta verificare che ogni nucleo
  ottenga un esito.
