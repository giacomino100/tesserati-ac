# Contract: pagina Tesserati e rotte

## Rotte

| Percorso | Cambia |
|---|---|
| `/tesserati?anno=` | pagina unica (sotto) |
| `/riconferme` | rimanda a `/tesserati` |
| `/importa` | solo amministratore (`requireAdmin`); gli altri tornano alla home |

Home: voci Tesserati, Famiglie, Quote, Listini; **Importa Excel** solo per l'amministratore; niente Riconferme.

## Tesserati

| Parte | Contenuto |
|---|---|
| In cima | "Anno associativo"; "Data di pagamento" (oggi); "37 da confermare · 0 iscritti"; filtro Tutti / Da confermare / Iscritti; "Cerca per nome"; "Nuovo tesserato" |
| Riga da confermare | "MORETTI CARLA · 30/01/1955 · Adulti" + avvisi ("Passa da ACR a Giovani", "Sotto l'età minima…", "Data di nascita incoerente: non si può confermare") + "Conferma" |
| Riga iscritto | nome · data · elenco (+ "Per età: …" se non allineato) · "Pagato il 17/11/2026" o "Pagamento non registrato" (+ "Registra pagamento") · "Nuovo" se iscritto a mano · "Famiglia" · "Altre azioni": "Annulla conferma", "Cambia elenco" |
| Pannello Famiglia | "Famiglia · N. Legame 900003" (o "Nessuna famiglia"); righe dei componenti con "Da confermare" + "Conferma" o "Pagato il …" + "Togli"; "Aggiungi un tesserato" (scelta tra gli iscritti fuori da famiglie); "Chiudi" |

## Messaggi

| Situazione | Messaggio |
|---|---|
| Conferma | "Conferma salvata: MORETTI CARLA, pagato il 17/11/2026." (testo neutro) |
| Famiglia aggiornata | "Famiglia aggiornata: 3 componenti." |
| Famiglia non salvata | "Conferma salvata, ma la famiglia non è stata aggiornata: riprova dal pannello." |
| Già confermata da altri | "Qualcuno ha appena confermato questa persona: elenco aggiornato." |
| Data futura | "La data di pagamento non può essere nel futuro." |
| Errore di rete | "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla." |
| Annulla (conferma) | "Annullare la conferma di MORETTI CARLA?" |
| Senza listino | "Manca il listino 2027/28. Crealo nella sezione Listini." |
