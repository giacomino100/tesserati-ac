# Contract: pagina Riconferme

## Rotta

| Percorso | Pagina | Note |
|---|---|---|
| `/riconferme` | Riconferme | stato `allowed`; query `anno` (predefinito: anno successivo all'ultimo con tesserati) |

La home ottiene la voce **"Riconferme"**.

## Contenuto

| Sezione | Contenuto |
|---|---|
| Scelta anno | "Anno associativo" con gli anni proposti (R9), etichetta "2027/28" |
| Riepilogo | "Da decidere: 37 · Già iscritti nel 2027/28: 0" |
| Avvisi | "Manca il listino 2027/28. Crealo nella sezione Listini." (+ link); "Nessun tesserato nel 2026/27 da riconfermare."; nessun anno con tesserati: "Nessun tesserato da riconfermare: importa prima un anno." + link "Importa Excel" |
| Azioni | casella "Seleziona tutti"; "Riconferma (N)" attivo con almeno 1 spunta e il listino |
| Gruppi | "N. Legame 900003 · C4" con casella "tutto il nucleo"; righe "GALLO TOMMASO · 13 anni · ACR" |
| Singoli | stesso formato, in ordine di cognome e nome |
| Avvisi per riga | "Passa da ACR a Giovani", "Sotto l'età minima del listino (6 anni): quota non prevista", "Data di nascita incoerente: non si può riconfermare" |
| Già iscritti | "MORETTI CARLA · Adulti · riconferma del 17/11/2026 (email)" + "Annulla riconferma"; per gli importati "· da import"; con famiglia: "Prima togli questa persona dalla famiglia del 2027/28." (testi neutri, senza genere) |

## Messaggi

| Situazione | Messaggio |
|---|---|
| Riconferma riuscita | "3 persone riconfermate per il 2027/28." |
| Salvataggio a gruppi interrotto | "Riconfermate 30 persone su 37. Le altre non sono state salvate: controlla la connessione e riprova." |
| Nulla salvato | "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla." |
| Già iscritta nel frattempo | "Qualcuno ha appena iscritto una di queste persone: elenco aggiornato, riprova." |
| Annulla (conferma) | dialogo "Annullare la riconferma di MORETTI CARLA?" (+ "La quota salvata del suo nucleo andrà ricalcolata in Quote." se esiste) con "Annulla riconferma" / "Indietro" |
| Annulla riuscito | "Riconferma annullata." |

## Altre pagine

- **Import**: riga saltata "già presente nell'anno (riconferma)".
- **Tesserati / Famiglie / Quote**: l'anno con sole riconferme compare nella scelta dell'anno.
