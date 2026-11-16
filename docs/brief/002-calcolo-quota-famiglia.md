# 002 – Calcolo quota famiglia

**Chi:** la segreteria, quando registra le adesioni di un nucleo familiare per l'anno associativo.
**Cosa:** dati i componenti di un nucleo con un'adesione nell'anno (data di nascita) e il listino dell'anno, il sistema
determina la fascia di ciascuno, applica il pacchetto familiare previsto dal PDF delle quote e restituisce
la quota di ogni componente, l'agevolazione applicata e il totale del nucleo.
Se il nucleo è un caso non previsto dal PDF, il sistema non calcola la quota e lo segnala.
**Perché:** oggi il calcolo è manuale ed è facile sbagliare chi riceve lo sconto.
**Regole:** solo `docs/dominio/regole-quote.md` (che riporta il PDF ufficiale `docs/dominio/fonti/`).
**Criteri di accettazione:**
- Tutti gli esempi delle sezioni 3.1 e 3.2 di `regole-quote.md` producono esattamente il totale atteso.
- Il risultato indica per ogni componente: fascia, quota, eventuale agevolazione (−20%, gratuito, pacchetto 2 ACR).
- Nuclei da 5 o più persone e componenti sotto i 6 anni restituiscono l'esito "non previsto dal listino", senza importi.
- Le quote (piene e scontate) vengono lette dal listino dell'anno, mai calcolate o arrotondate dal sistema.
**Fuori ambito:**
- Interfaccia grafica, salvataggio su database, import da Excel.
- Inserimento manuale della quota per i casi non previsti (specifica successiva).
- Pagamenti e ricevute.
