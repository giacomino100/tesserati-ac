# 004 – Import Excel ACR

**Chi:** gli utenti autorizzati (segreteria), una volta all'anno (e di nuovo se arriva un export aggiornato),
quando si apre il tesseramento.
**Cosa:** dall'app si carica il file Excel `ElencoAdesioni_ACR.xlsx` esportato dal sistema nazionale. L'app
legge il file nel browser, mostra un'**anteprima** (anno associativo letto dal file, numero di righe, prime
righe con nome, data di nascita, fascia e legame) e solo dopo la conferma dell'utente salva i tesserati e le
loro adesioni dell'anno. Dal file si importano solo le colonne necessarie; quelle escluse non vengono salvate.
**Perché:** oggi l'elenco vive solo nell'Excel; senza i dati nell'app non si possono fare riconferme, famiglie
e quote. Servono dati puliti e per anno, senza dover ricopiare a mano 89 righe (e poi gli altri elenchi).
**Regole:** `docs/dominio/excel-esempio/README.md` (struttura del file, colonne, difetti da gestire);
`docs/dominio/glossario.md` (anno associativo, settore, fascia); `docs/dominio/regole-famiglia.md` §0 e §2
(nucleo = `N. Legame`; identità = cognome + nome + data di nascita normalizzati); constitution principi III
(solo colonne necessarie, solo dati finti nei test) e IV (anagrafica condivisa tra gli anni, adesione per anno).
**Criteri di accettazione:**
- Un utente autorizzato sceglie un file `.xlsx` e vede un'anteprima prima di qualsiasi salvataggio; se
  annulla, non viene salvato nulla.
- Il file viene letto nel browser (SheetJS): nessun file lascia il dispositivo e nessun dato personale finisce
  nei log.
- L'anno associativo è ricavato dalla colonna `Anno Associativo` (`Anno 2026` → 2026) e mostrato in anteprima.
- Le colonne attese vengono verificate: se mancano o hanno un nome diverso, l'import è rifiutato con un
  messaggio chiaro che dice quali colonne mancano; un file di altro tipo (non Excel, foglio diverso) è rifiutato.
- I difetti noti vengono puliti: spazi iniziali, finali e doppi in nomi e altri testi; celle vuote e stringa
  `''` trattate come vuote; nome e cognome normalizzati per l'identità; `N. Legame` vuoto = nessun legame.
- Si importano solo le colonne marcate necessarie (identità, data di nascita, settore, fascia d'età dell'export,
  legame e n. legame, anno) più quelle decise nella revisione (vedi "Da decidere"); le colonne marcate come
  escluse (Frazione, SR, LM, A–E, Incarico) non vengono lette né salvate.
- Dopo la conferma, per ogni riga si salva la persona (anagrafica condivisa tra gli anni) e la sua adesione
  dell'anno; il numero di persone e di adesioni salvate è mostrato a fine import.
- Con i dati finti di `docs/dominio/excel-esempio/` l'import dell'ACR dà 15 adesioni dell'anno 2026 (l'export reale ne ha 89).
- Solo gli utenti autorizzati leggono e scrivono tesserati e adesioni (regole di sicurezza testate).
**Fuori ambito:**
- Import degli Excel Giovani e Adulti (specifica 005: stessa struttura, riuso della 004).
- Segnalazione dettagliata di righe errate e di persone duplicate (specifica 006); in 004 si definisce solo il
  comportamento minimo sul riimporto (vedi "Da decidere").
- Raggruppare i tesserati in famiglie con suggerimenti e conferma (specifica 007): qui si salva solo `N. Legame`.
- Riconferma, nuovo tesserato, calcolo delle quote nella famiglia (specifiche 008–010).
- Modifica o cancellazione di tesserati dopo l'import.

## Decisioni della revisione (2026-11-17: tutte le proposte accettate)

Le cinque proposte qui sotto sono state approvate così come scritte.

## Da decidere nella revisione (proposte approvate)

1. **Riimporto dello stesso anno**: se l'anno ha già adesioni, la 004 (a) rifiuta l'import, (b) aggiorna le
   persone già presenti (chiave cognome + nome + data di nascita) e aggiunge le nuove, o (c) chiede di scegliere?
   Proposta: **(a) rifiuta** con messaggio, finché la 006 non gestisce i duplicati.
2. **Colonne anagrafiche** (sesso, città di nascita, indirizzo, CAP, città, provincia, telefoni, cod. fiscale,
   professione, stato civile): servono già in questa fase? Proposta: **solo codice fiscale (se presente) e sesso**
   per ora; indirizzo e contatti si aggiungono con una specifica che ne abbia bisogno (YAGNI, principio III).
3. **`Pagato`** (sempre `Sì` nell'export): si salva come stato di pagamento dell'adesione? Proposta: **no**, il
   pagamento non è ancora una funzione dell'app.
4. **`MLAC`/`MSAC`**: ignorarle? Proposta: **sì, escluse**.
5. **Righe di tesserati fuori dall'ACR nel file ACR** (es. età oltre i 14): importarle comunque (il settore è
   quello dell'export) o segnalarle? Proposta: **importarle**, la verifica spetta alla 006.
