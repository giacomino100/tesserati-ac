# 006 – Errori e duplicati nell'import

**Chi:** gli utenti autorizzati (segreteria), durante l'import degli elenchi (004, 005).
**Cosa:** prima di salvare, l'anteprima dell'import segnala meglio cosa non va e cosa è dubbio: le righe saltate
con cognome e nome per ritrovarle nel file, le persone riconosciute dal codice fiscale, i **possibili doppioni**
(una riga che somiglia a una persona già in archivio) da decidere a mano, e gli **avvisi** su età e settore che non
tornano con le regole del PDF. Le righe con avvisi si importano comunque.
**Perché:** con 004 e 005 una persona scritta in modo leggermente diverso da un anno all'altro (refuso nel nome,
data sbagliata) diventa una persona nuova: la riconferma (008) e le famiglie (007) partirebbero da doppioni. Gli
errori di età/settore oggi passano inosservati e falserebbero le quote (010).
**Regole:** `docs/dominio/regole-famiglia.md` §2 (identità: cognome + nome + data di nascita; il codice fiscale, se
presente in entrambi, prevale; casi dubbi da rivedere a mano — confermati in questa revisione) e §3
(fascia = anno associativo − anno di nascita; fasce del PDF); `docs/dominio/regole-quote.md` (età minima, fasce);
`docs/dominio/glossario.md`; specifiche 004 e 005; constitution principi I, III e IV.
**Criteri di accettazione:**
- In anteprima ogni riga saltata mostra numero di riga, motivo e (se presenti) cognome e nome, solo a schermo.
- Una riga con un codice fiscale uguale a quello di una persona già in archivio è riconosciuta come quella persona
  anche se nome o data di nascita sono scritti diversamente; l'anteprima lo segnala.
- Una riga che non corrisponde esattamente a nessuna persona ma somiglia a una già in archivio (vedi "Da decidere")
  compare tra i **possibili doppioni**, con i dati della persona già presente; per ciascuno l'utente sceglie
  "Stessa persona" o "Persona diversa" prima di poter importare.
- Le righe la cui età (anno associativo − anno di nascita) non corrisponde al settore secondo il PDF, o è sotto
  l'età minima, compaiono tra gli **avvisi** e vengono importate comunque con i dati dell'export.
- Nulla viene scritto nei log; le scelte sui doppioni valgono solo per l'import in corso.
- Con i dati finti di `docs/dominio/excel-esempio/` non ci sono doppioni e c'è **1 avviso** (la bambina di 4 anni
  nell'elenco ACR, sotto l'età minima di 6); i casi di doppione e di codice fiscale si provano con dati sintetici.
**Fuori ambito:**
- Correggere o unire persone già salvate (modifica dell'anagrafica): una specifica futura.
- Annullare un import già fatto.
- Ricalcolare settore e fascia per le quote (010/011): qui si segnala soltanto.
- Famiglie (007), riconferma (008).

## Decisioni della revisione (2026-11-17: tutte le proposte accettate; `regole-famiglia.md` §2 aggiornato)

## Da decidere nella revisione (proposte approvate)

1. **Codice fiscale che non torna con il nome** (stesso codice fiscale, nome o data diversi): Proposta: **è la
   stessa persona** (il codice fiscale prevale, come in `regole-famiglia.md` §2); l'anagrafica salvata non cambia e
   l'anteprima lo segnala come "riconosciuta dal codice fiscale".
2. **Cos'è un possibile doppione** (oggi **TODO** nel dominio): Proposta: una riga senza corrispondenza esatta è un
   possibile doppione di una persona in archivio se (a) **stessa data di nascita e stesso cognome**, e il nome
   differisce di al massimo 2 lettere o uno contiene l'altro ("MARIA" / "MARIA GRAZIA"); oppure (b) **stesso
   cognome e nome** e la data differisce per una sola cifra o per giorno e mese scambiati.
3. **Come si decide un doppione**: Proposta: **scelta obbligatoria** per ogni caso in anteprima ("Stessa persona" /
   "Persona diversa"), "Importa" bloccato finché non sono tutti decisi; nessuna scelta predefinita.
4. **Nomi nelle righe saltate**: mostrare cognome e nome accanto al numero di riga? Proposta: **sì, solo a
   schermo** (l'utente è autorizzato e deve ritrovare la riga nel file); mai nei log.
5. **Avvisi età/settore**: bloccano l'import o no? Proposta: **non bloccano**, si importano con i dati
   dell'export; servono a correggere il file o a saperlo prima delle quote.
