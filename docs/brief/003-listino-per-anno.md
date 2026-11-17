# 003 – Listino per anno

**Chi:** gli utenti autorizzati (segreteria), una volta all'anno, quando arriva il nuovo PDF delle quote.
**Cosa:** da una schermata dell'app si imposta il listino di un anno associativo: quota piena e quota
scontata del 20% per ogni fascia (ACR, Giovanissimi, Giovani, Adulti) e quota del pacchetto 2 ACR.
Si può partire dal listino dell'anno precedente e correggerlo. Per il 2026/27 il listino di partenza
è quello ufficiale del PDF. L'app mostra i listini degli anni e per ognuno le quote in euro. Il
listino salvato è quello che il calcolo della quota famiglia (specifica 002) legge: nessuna quota
sta più scritta nel codice.
**Perché:** ogni anno cambiano le quote; oggi il listino 2026/27 è scritto nel codice e per cambiarlo
servirebbe uno sviluppatore. Le quote devono essere dati, non codice (constitution, principi II e IV).
**Regole:** `docs/dominio/regole-quote.md` (listino 2026/27 e fonte unica: il PDF); constitution
principio IV (storico per anno: il listino di un anno non cambia quando cambiano quelli successivi).
**Criteri di accettazione:**
- Un utente autorizzato vede l'elenco dei listini per anno associativo e apre quello di un anno.
- Può creare il listino di un nuovo anno partendo da una copia dell'anno precedente (o dal listino
  ufficiale 2026/27 se è il primo) e modificarne le quote in euro; le quote sono salvate in centesimi interi.
- Il sistema rifiuta valori non validi: quota non positiva, quota scontata maggiore della piena,
  importi con più di due decimali, campi vuoti.
- Un listino già in uso (esistono adesioni dell'anno) si può ancora modificare, ma l'app mostra prima
  un avviso: le quote già calcolate restano quelle di prima finché non vengono ricalcolate.
- Il listino di un anno non cambia quando si modifica o si crea quello di un altro anno.
- Il listino salvato ha la stessa forma attesa dal calcolo della quota famiglia (specifica 002).
- Solo gli utenti autorizzati leggono e scrivono i listini (regole di sicurezza testate).
**Fuori ambito:**
- Modificare le fasce di età, l'età minima o il numero massimo di componenti del nucleo: si copiano
  dall'anno precedente (cambiarli richiede una specifica a parte, perché sono regole del PDF).
- Ricalcolo automatico delle quote già calcolate.
- Import del listino dal PDF.
- Cancellazione di un listino.
