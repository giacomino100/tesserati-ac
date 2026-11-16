# 002 – Calcolo quota famiglia

**Chi:** la segreteria, quando registra le adesioni di una famiglia per l'anno associativo.
**Cosa:** dati i componenti di una famiglia con un'adesione nell'anno (categoria e data di nascita) e il listino dell'anno, il sistema calcola la quota di ciascuno, chi riceve lo sconto famiglia, l'importo dello sconto e il totale della famiglia.
**Perché:** oggi il calcolo è manuale ed è facile sbagliare chi riceve lo sconto.
**Regole:** `docs/dominio/regole-quote.md` (listino, regola dello sconto, tabella esempi).
**Criteri di accettazione:**
- Tutti i casi della tabella "Esempi" in `regole-quote.md` producono esattamente le quote e il totale attesi.
- Il risultato indica in modo esplicito chi riceve lo sconto e perché.
- Una famiglia senza adesioni nell'anno ha totale 0.
**Fuori ambito:**
- Interfaccia grafica, salvataggio su database, import da Excel.
- Pagamenti e ricevute.
