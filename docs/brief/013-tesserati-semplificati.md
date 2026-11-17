# 013 – Tesserati semplificati (correzione di 008, 009, 011 e accesso all'import)

> Richiesta dell'utente del 2026-11-17: Riconferme e Tesserati creano confusione; il lavoro reale è "apro i tesserati
> del 2026/27, vedo quelli dell'anno prima e li confermo man mano che pagano, oppure ne aggiungo di nuovi"; per ogni
> persona confermata devo vedere la sua famiglia e poterla sistemare; l'import Excel lo vedo solo io. Le specifiche
> 008, 009 e 011 hanno aggiunto più del necessario.

**Chi:** gli utenti autorizzati (segreteria); l'import solo l'amministratore.
**Cosa:** una sola pagina **Tesserati**. Scelto l'anno (es. 2026/27), un **unico elenco** con tutti: i tesserati
dell'anno precedente ancora **da confermare** e gli **iscritti** dell'anno (confermati e nuovi), con uno stato e un
filtro (Tutti / Da confermare / Iscritti) e la ricerca per nome. **"Conferma"** su una persona vuol dire che **ha
pagato**: nasce la sua adesione dell'anno con la data del pagamento. Accanto alla persona confermata si apre la sua
**famiglia** (dal `N. Legame` dell'anno prima o dalla famiglia confermata): si vedono gli altri componenti con il loro
stato, si possono confermare anche loro, togliere o aggiungere qualcuno e confermare la famiglia dell'anno nello stesso
pannello. "Nuovo tesserato" resta nella pagina. La pagina **Riconferme sparisce**. **Importa Excel** è visibile e
usabile solo dall'amministratore.
**Perché:** meno pagine e meno passaggi; la segreteria segue un solo elenco mentre le persone pagano.
**Regole:** `docs/dominio/glossario.md` (Riconferma: diventa "conferma = pagato"), `regole-famiglia.md` §1–§3,
`utenti.md` (oggi un solo ruolo: si aggiunge l'amministratore per l'import); specifiche 004–011.
**Criteri di accettazione:**
- Tesserati 2026/27 mostra in un solo elenco i 37 tesserati finti del 2025/26 "da confermare" e, dopo le conferme, gli
  "iscritti"; il filtro e la ricerca funzionano; Riconferme non c'è più (home e rotta).
- "Conferma" su una persona crea la sua adesione 2026/27 con elenco per età, data di pagamento ed email; "Annulla
  conferma" la toglie (se la persona non è in una famiglia confermata).
- Confermando una persona con famiglia, il pannello mostra i componenti (stato di ciascuno) e permette di confermarli,
  correggere la famiglia e confermarla per l'anno.
- "Nuovo tesserato" come nella 009, con data di pagamento.
- L'elenco del nuovo anno si ricalcola dall'età; "Cambia elenco" con nota resta come azione secondaria della riga; niente
  "Allinea tutte" né conteggi di non allineate.
- Solo l'amministratore vede "Importa Excel" e può importare (regole di sicurezza testate); gli altri non vedono la voce
  né la pagina.

## Decisioni della revisione (2026-11-17: tutte le proposte accettate; glossario e `utenti.md` aggiornati)

## Da decidere nella revisione (proposte approvate)

1. **Chi è l'amministratore**: un campo `admin: true` nel documento dell'email in `allowedEmails`, messo dalla console
   Firebase (nessuna email nel codice o nel repository). Proposta: **sì**, e lo imposto io sul tuo indirizzo solo con
   il tuo ok esplicito al rilascio.
2. **Conferma = pagato**: si salva la data del pagamento (oggi, modificabile) e chi ha confermato; nessun importo (la
   quota resta della pagina Quote). Proposta: **sì**; gli iscritti mostrano "pagato il 17/11/2026".
3. **Nuovi tesserati**: anche l'iscrizione di un nuovo tesserato vale come pagamento (stessa data). Proposta: **sì**.
4. **Cosa sparisce**: la pagina Riconferme (la conferma "tutti insieme" e i gruppi per `N. Legame` diventano il pannello
   famiglia), "Allinea tutte" e il conteggio delle non allineate. Restano: avviso del cambio di elenco sulla riga,
   "Cambia elenco" con nota, "Annulla conferma". Proposta: **sì**.
5. **Pagina Famiglie**: resta per vedere tutte le famiglie dell'anno, ma la conferma normale si fa dal pannello in
   Tesserati. Proposta: **sì**.
6. **Dati esistenti**: le adesioni già riconfermate o inserite a mano (se ce ne sono in produzione) restano valide e
   risultano "iscritte" senza data di pagamento ("pagamento non registrato"). Proposta: **sì**.
