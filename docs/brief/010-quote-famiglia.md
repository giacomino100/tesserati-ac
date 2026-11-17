# 010 – Quote nella famiglia

> Anticipata rispetto a 008–009 nella revisione della roadmap del 2026-11-17: ha tutto quello che serve (listino 003,
> tesserati 004–006, famiglie 007, calcolo 002) e non dipende dai TODO di dominio aperti.

**Chi:** gli utenti autorizzati (segreteria), dopo aver importato gli elenchi e confermato le famiglie dell'anno.
**Cosa:** una sezione **Quote** mostra, per un anno associativo, la quota di ogni **nucleo**: le famiglie confermate
(007) e ogni tesserato senza famiglia (nucleo da 1). Per ogni nucleo si vedono i componenti con età, fascia del
listino, quota piena e beneficio (sconto 20%, gratis, pacchetto 2 ACR) e il totale; in cima il totale dell'anno. Il
calcolo è quello della specifica 002 con il listino dell'anno (003). Per i nuclei **non previsti** dal PDF (5 o più
persone, un bambino sotto i 6 anni) l'app non calcola: la segreteria inserisce a mano la quota con una **nota
obbligatoria**. Le quote si **salvano** per l'anno, così non cambiano da sole se cambiano listino o famiglie.
**Perché:** è lo scopo dell'app: sapere quanto chiedere a ogni famiglia, applicando le regole del PDF senza errori di
calcolo a mano.
**Regole:** `docs/dominio/regole-quote.md` (listino, età = anno associativo − anno di nascita, fasce del PDF e non
quelle dell'export, pacchetti familiari, 29 esempi, §4 casi non previsti con quota manuale e nota obbligatoria);
`docs/dominio/regole-famiglia.md` §1 (nucleo = famiglia confermata; chi non ne ha è un nucleo da 1); specifiche
002 (calcolo), 003 (listino; "le quote già calcolate per questo anno non cambiano finché non vengono ricalcolate"),
007 (famiglie); constitution principi I, II e IV.
**Criteri di accettazione:**
- La sezione "Quote" mostra, per l'anno scelto, ogni nucleo con componenti, età, fascia, quota piena, beneficio,
  importo e totale del nucleo, e il totale dell'anno.
- Il calcolo usa solo `calculateHouseholdFee` della 002 con il listino dell'anno salvato (003): nessun importo o
  percentuale scritto nel codice dell'app.
- I nuclei non previsti dal PDF sono segnalati con il motivo; per ciascuno si inserisce a mano l'importo del nucleo e
  una nota (obbligatoria); fino ad allora il totale dell'anno indica quanti nuclei mancano.
- Le quote calcolate (e quelle manuali) si salvano per l'anno con data ed email; se dopo cambiano il listino, le
  famiglie o i tesserati, la sezione lo segnala ("quote da ricalcolare") e il ricalcolo si fa solo su richiesta.
- Solo gli utenti autorizzati leggono e scrivono le quote (regole di sicurezza testate).
- Con i dati finti di `docs/dominio/excel-esempio/` (tre elenchi del 2026 importati e le 9 famiglie confermate)
  ogni nucleo ha una quota o è segnalato: **2 non previsti** (il nucleo 900004 da 6 persone e la bambina di 4 anni),
  gli altri calcolati come negli esempi di `regole-quote.md`.
**Fuori ambito:**
- Incassi e pagamenti (chi ha pagato): specifica futura.
- Riconferma (008), nuovo tesserato (009), cambio categoria forzato a mano (011), riepilogo ed export (012).
- Modificare le regole del calcolo: si cambiano solo il listino (003) e il PDF.

## Decisioni della revisione (2026-11-17: tutte le proposte accettate; `regole-quote.md` §4 aggiornato)

## Da decidere nella revisione (proposte approvate)

1. **Famiglie suggerite non ancora confermate**: nel calcolo i loro componenti sono singoli (nucleo da 1) o il calcolo
   è bloccato finché non si confermano? Proposta: **si calcolano come singoli, con un avviso** in cima ("3 famiglie
   suggerite non confermate: i loro componenti sono calcolati come singoli. Vai a Famiglie").
2. **Salvare le quote**: si salvano per l'anno (istantanea con data ed email) e si ricalcolano solo su richiesta?
   Proposta: **sì**, come già promesso dalla 003; la pagina mostra "quote da ricalcolare" se listino, famiglie o
   tesserati sono cambiati dopo l'ultimo salvataggio.
3. **Quota manuale dei non previsti**: un solo importo per il nucleo (non per componente) più la nota? Proposta:
   **sì, un importo per il nucleo** con nota obbligatoria (come `regole-quote.md` §4).
4. **Dove**: nuova pagina "Quote" o dentro "Famiglie"? Proposta: **nuova pagina "Quote"** con il totale dell'anno;
   da ogni famiglia un collegamento al suo dettaglio.
5. **Persona con data di nascita incoerente** con l'anno (esito "dati non validi" del calcolo): Proposta: **trattata
   come non prevista** (quota manuale con nota), con il motivo mostrato.
