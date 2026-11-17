# Contract: pagina Quote

## Rotta

| Percorso | Pagina | Note |
|---|---|---|
| `/quote` | Quote | stato `allowed`; query `anno` (predefinito: ultimo importato) e `nucleo` (apre e porta al dettaglio di quel nucleo); `canDeactivate` se c'è una quota manuale in modifica |

La home ottiene la voce **"Quote"**; ogni famiglia confermata in "Famiglie" ha il collegamento "Vedi la quota".

## Contenuto

| Sezione | Contenuto |
|---|---|
| Scelta anno | come Tesserati |
| Totali | "Totale 2026/27: 565,00 € · 17 nuclei calcolati · 0 quote manuali · 2 nuclei da decidere" |
| Avvisi | "3 famiglie suggerite non confermate: i loro componenti sono calcolati come singoli." + link "Famiglie"; "Manca il listino 2027/28. Crealo nella sezione Listini."; "Quote da ricalcolare: N nuclei sono cambiati." + "Aggiorna tutte" |
| Stato salvataggio | "Quote non ancora salvate" + "Salva le quote dell'anno" / "Quote salvate il 17/11/2026 da …" |
| Nuclei | per ciascuno: titolo ("Famiglia di VERDI PAOLO · N. Legame 900002" o "MORETTI CARLA"), totale, stato (salvata / da salvare / da ricalcolare / quota manuale / da decidere); dettaglio con righe "VERDI PAOLO · 46 anni · Adulti · 26,00 € · —  · 26,00 €", "VERDI SOFIA · 10 anni · ACR · 15,00 € · sconto 20% · 12,00 €", "· gratis · 0,00 €", riga "Pacchetto 2 ACR · 25,00 €" |
| Da ricalcolare | "Salvata: 64,00 € · Ora: 66,00 €" + "Aggiorna questa quota" |
| Non previsto | "Non previsto dal listino: il nucleo ha più di 4 persone." + campi "Quota del nucleo (€)" e "Nota (obbligatoria)" + "Salva quota manuale" |
| Quota manuale salvata | "Quota manuale: 140,00 € — nota — inserita il … da …" + "Modifica" |

## Messaggi

| Situazione | Messaggio |
|---|---|
| Importo vuoto / non valido / più di due decimali / negativo | testi di `parseEuros` della 003 ("Inserisci un importo.", "Inserisci un importo valido, per esempio 26,00.", "Usa al massimo due decimali.", "L'importo non può essere negativo.") |
| Nota mancante | "Scrivi una nota che spieghi la quota." |
| Zero | dialogo "Il nucleo non paga nulla: confermi?" con "Conferma" / "Annulla" |
| Errore di rete | "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla." |
| Nessun tesserato | "Nessun tesserato importato per questo anno." con link a "Importa Excel" |
