# 005 – Import Giovani e Adulti

**Chi:** gli utenti autorizzati (segreteria), una volta all'anno per ciascun elenco, dopo o prima dell'ACR.
**Cosa:** dalla stessa schermata di import della 004 si caricano anche `ElencoAdesioni_Giovani.xlsx` e
`ElencoAdesioni_Adulti.xlsx`. L'app riconosce di quale elenco si tratta, mostra l'anteprima e, alla conferma,
salva persone e adesioni dell'anno come per l'ACR. Ogni elenco si importa una volta per anno; i tre elenchi
dello stesso anno convivono.
**Perché:** le famiglie (007) e le quote (010) servono su tutti i tesserati, e 20 nuclei su 43 hanno componenti
in più elenchi: senza Giovani e Adulti nessuna famiglia è completa.
**Regole:** `docs/dominio/excel-esempio/README.md` (stessa struttura e stessi difetti nei tre file; il file
coincide con la colonna `Settore`); `docs/dominio/glossario.md` (settore, fascia d'età dell'export: `15/18` =
Giovanissimi, `19/25` e `26/30` = Giovani, `AD` = Adulti); `docs/dominio/regole-famiglia.md` §0 e §2;
specifica 004 (comportamento dell'import, che resta identico); constitution principi III e IV.
**Criteri di accettazione:**
- Dalla schermata "Importa Excel" si può caricare uno qualsiasi dei tre elenchi; l'anteprima dice quale elenco è
  stato riconosciuto (ACR, Giovani o Adulti) oltre ad anno, righe e righe saltate.
- Ogni elenco si importa una sola volta per anno: riimportare lo stesso elenco dello stesso anno è rifiutato;
  importare un elenco diverso dello stesso anno è consentito, in qualsiasi ordine.
- Le persone già presenti in archivio (da un anno precedente o da un altro elenco) sono riusate, non duplicate.
- Le regole della 004 valgono per tutti gli elenchi: colonne per nome, solo colonne necessarie, righe saltate
  elencate, anno con listino obbligatorio, tutto o niente, solo utenti autorizzati (regole di sicurezza testate).
- Con i dati finti di `docs/dominio/excel-esempio/`: Giovani dà 8 adesioni, Adulti 14; dopo i tre import il 2026
  ha 37 adesioni e 37 persone, e i 9 nuclei del README hanno tutti i loro componenti.
- La sezione "Tesserati" mostra le adesioni di tutti gli elenchi dell'anno, con il settore di ciascuno.
- L'avviso "anno con adesioni" dei listini vale per qualsiasi elenco importato.
**Fuori ambito:**
- Segnalazione dettagliata di persone simili o duplicate tra elenchi e revisione manuale (specifica 006).
- Ricalcolo della fascia per le quote (es. i trentenni, che l'export mette nei GIOVANI e il PDF negli Adulti):
  si salva il settore dell'export, il ricalcolo è della 010/011.
- Famiglie (007), riconferma e quote (008–010).
- Annullare o correggere un import già fatto.

## Decisioni della revisione (2026-11-17: tutte le proposte accettate)

## Da decidere nella revisione (proposte approvate)

1. **Come si sceglie l'elenco**: (a) l'app lo riconosce dal settore delle righe (il più frequente: `RAGAZZI`
   → ACR, `GIOVANI` → Giovani, `ADULTI` → Adulti) e lo mostra in anteprima, oppure (b) l'utente sceglie prima
   l'elenco con tre pulsanti? Proposta: **(a) riconoscimento automatico**, con l'elenco ben visibile in anteprima;
   un file con un settore sconosciuto o senza un settore prevalente è rifiutato.
2. **Persona già presente nello stesso anno da un altro elenco** (lo stesso cognome + nome + data di nascita in
   due elenchi del 2026): Proposta: **la riga è saltata** con il motivo "già importata nell'elenco ACR del
   2026/27" ed elencata, perché una persona ha una sola adesione per anno; la revisione è della 006.
3. **Righe di un altro settore dentro un elenco** (es. un `ADULTI` nel file Giovani): Proposta: **importate con
   il loro settore**, come in 004.
4. **Pagina Tesserati**: basta la colonna Settore o serve anche un filtro per settore e i totali per settore?
   Proposta: **totali per settore sopra la tabella** ("ACR 15 · Giovani 8 · Adulti 14"), nessun filtro per ora.
