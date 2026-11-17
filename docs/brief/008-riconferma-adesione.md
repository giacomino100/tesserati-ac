# 008 – Riconferma adesione

**Chi:** gli utenti autorizzati (segreteria), all'inizio di un nuovo anno associativo.
**Cosa:** una sezione **Riconferme** mostra, per l'anno scelto, i tesserati dell'anno precedente che non hanno ancora
un'adesione nel nuovo anno. Per ciascuno si vedono età e settore nel nuovo anno (con l'avviso se cambia, es. "passa da
ACR a Giovani"); si spuntano quelli che rinnovano e con "Riconferma" si crea la loro adesione per il nuovo anno, senza
reimportare nulla. Le persone riconfermate compaiono poi in Tesserati, Famiglie e Quote come quelle importate.
**Perché:** oggi l'unico modo per avere i tesserati di un anno è importare l'Excel; la riconferma permette di
preparare l'anno nuovo partendo da chi c'era, senza ribattere le anagrafiche.
**Regole:** `docs/dominio/glossario.md` (Riconferma, Nuova adesione, Settore); `docs/dominio/regole-famiglia.md` §1
(`N. Legame`), §2 (identità: la persona è la stessa, nessuna nuova anagrafica), §3 (cambio di categoria: fascia solo
dall'anno di nascita, fasce del PDF); `docs/dominio/regole-quote.md` (fasce e età minima del listino); specifiche 003
(listino), 004–006 (persone e adesioni, una sola adesione per persona per anno), 007 (famiglie), 010 (quote).
**Criteri di accettazione:**
- Scelto l'anno nuovo, la sezione elenca i tesserati dell'anno precedente senza adesione nel nuovo anno, con età e
  settore del nuovo anno e l'avviso di cambio settore.
- Si possono spuntare uno, alcuni o tutti; "Riconferma" crea un'adesione per ciascuno nel nuovo anno (tutto o niente),
  con data ed email; la persona non viene duplicata.
- Una persona ha al massimo un'adesione per anno, anche se poi si importa l'Excel dello stesso anno.
- Solo gli utenti autorizzati leggono e creano le riconferme (regole di sicurezza testate).
- Con i dati finti di `docs/dominio/excel-esempio/` (37 tesserati del 2026) e un listino 2027/28: la sezione per il
  2027 elenca 37 persone; riconfermandole tutte il 2027 ha 37 tesserati e i cambi di settore sono quelli dovuti
  all'età (calcolati con le fasce del PDF).
**Fuori ambito:**
- Nuovo tesserato che non c'era l'anno prima (009); chi torna dopo due o più anni (vedi decisione 1).
- Forzare a mano il settore (es. un ragazzo che resta in ACR un anno in più): specifica 011.
- Incassi e pagamenti; riepilogo ed export (012).
- Copiare le famiglie confermate dell'anno prima: le famiglie si rifanno in "Famiglie" (007), aiutate dal `N. Legame`.

## Decisioni della revisione (2026-11-17: tutte le proposte accettate; glossario e `regole-famiglia.md` §3 aggiornati)

## Da decidere nella revisione (proposte approvate)

1. **Chi compare nell'elenco**: solo i tesserati dell'anno **immediatamente precedente**? Chi torna dopo due o più anni
   è una **nuova adesione** (009)? Proposta: **sì** (risolve il TODO del glossario "Nuova adesione").
2. **Settore nel nuovo anno**: ricalcolato in automatico dall'età con le fasce del listino del nuovo anno (ACR 6–14 →
   ACR; Giovanissimi e Giovani 15–29 → Giovani; Adulti 30+ → Adulti), mostrando chi cambia? Proposta: **sì, sempre
   automatico** (risolve il TODO di `regole-famiglia.md` §3; la forzatura a mano resta alla 011). Chi è sotto l'età
   minima del listino resta in ACR con l'avviso "non previsto dal listino".
3. **Listino del nuovo anno**: obbligatorio per riconfermare (come per l'import), perché le fasce vengono da lì?
   Proposta: **sì**, con il messaggio "Manca il listino 2027/28. Crealo nella sezione Listini."
4. **Cosa si salva**: l'adesione del nuovo anno con l'origine "riconferma" (non un import), data ed email, e il
   `Legame` / `N. Legame` copiati dall'anno precedente, così in "Famiglie" tornano le stesse famiglie suggerite da
   confermare? Proposta: **sì** (le regole di sicurezza vanno estese: oggi un'adesione nasce solo da un import).
5. **Annullare**: si può togliere una riconferma fatta per errore? Proposta: **sì, "Annulla riconferma"**, solo per le
   adesioni nate da riconferma e solo se la persona non è ancora in una famiglia confermata del nuovo anno.
6. **Import dopo la riconferma**: se poi si importa l'Excel dello stesso anno, le persone già riconfermate? Proposta:
   **righe saltate** come "già presente nell'anno (riconferma)", come per le persone già importate da un altro elenco
   (005); l'adesione riconfermata non cambia.
7. **Chi non rinnova**: si segna esplicitamente ("Non rinnova") o resta semplicemente non spuntato? Proposta:
   **resta non spuntato**, nessun dato salvato; l'elenco mostra quanti sono ancora da decidere.
