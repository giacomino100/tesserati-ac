# Contract: pagina Famiglie

## Rotta

| Percorso | Pagina | Note |
|---|---|---|
| `/famiglie` | Famiglie | stato `allowed`; query `anno` facoltativa (predefinito: anno importato più recente); `canDeactivate` se ci sono correzioni non confermate |

La home ottiene la voce **"Famiglie"**.

## Contenuto

| Sezione | Contenuto |
|---|---|
| Scelta anno | come Tesserati ("2026/27") |
| Riepilogo | "9 famiglie suggerite · 0 confermate · 10 tesserati senza famiglia"; pulsante "Conferma tutte" |
| Famiglie suggerite | per ogni famiglia: "N. Legame 900002 · C3"; componenti "VERDI PAOLO, 20/01/1980 · Adulti"; avvisi; note "VERDI SOFIA è nella famiglia di VERDI PAOLO"; pulsanti "Conferma", "Correggi" |
| Famiglie confermate | come sopra con "Confermata il 17/11/2026 da …"; aggiunte proposte "Aggiungi VERDI SOFIA (stesso N. Legame)"; pulsanti "Correggi", "Sciogli famiglia" |
| In correzione | ogni componente con "Togli"; elenco "Aggiungi un tesserato" con i soli tesserati senza famiglia; "Conferma" (disattivo con meno di 2 componenti), "Annulla" |
| Senza famiglia | elenco con selezione multipla e "Crea famiglia" |
| Vuoto | "Nessun tesserato importato per questo anno." con link a "Importa Excel" |

## Messaggi

| Situazione | Messaggio |
|---|---|
| Avviso numero | "Il Legame C3 indica 3 componenti, ne sono stati trovati 1." |
| Avviso Legame diversi | "I componenti hanno Legame diversi: C3, C4." |
| Meno di 2 | "Una famiglia ha almeno 2 componenti." |
| Già in un'altra famiglia | "VERDI SOFIA è già nella famiglia di VERDI PAOLO: toglila prima da lì." |
| Conferma tutte con famiglie da 1 | "Confermate 8 famiglie; 1 famiglia con un solo componente non confermata." |
| Conferma tutte interrotta | "Confermate 16 famiglie su 45. Impossibile salvare le altre: controlla la connessione e riprova." |
| Famiglia incoerente | "Dati incoerenti per VERDI SOFIA: è indicata anche in un'altra famiglia. Correggi e riconferma." |
| Sciogli | dialogo "Tutti i componenti resteranno senza famiglia." con "Sciogli" / "Annulla" |
| Dati cambiati (altro utente) | "Le famiglie sono state modificate da qualcun altro. La pagina è stata aggiornata." |
| Errore di rete | "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla." |
