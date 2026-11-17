# Contract: Tesserati e Riconferme

## Tesserati (`/tesserati?anno=`)

| Parte | Contenuto |
|---|---|
| In cima | "1 adesione non allineata all'età" / "N adesioni non allineate all'età" (solo con listino e N > 0) + "Allinea tutte" |
| Colonne | Cognome e nome · Data di nascita · **Elenco** · Fascia d'età (export) · Legame · azioni |
| Elenco | "Giovani" + avviso "Per età: Adulti" + "Allinea all'età"; eccezione: "ACR · eccezione: resta in ACR un anno in più" + "Togli eccezione"; sempre "Cambia elenco"; settore dell'export se diverso: "(export: GIOVANI)" |
| Cambia elenco | scelta ACR / Giovani / Adulti + "Nota (obbligatoria)" + "Salva" / "Annulla" |
| Senza listino | nessun avviso, nessun "Allinea"; "Cambia elenco" e "Togli eccezione" restano |

## Messaggi

| Situazione | Messaggio |
|---|---|
| Allinea tutte (conferma) | "2 adesioni cambieranno elenco. Confermi?" con "Allinea" / "Annulla" |
| Allineamento riuscito | "Elenco aggiornato." / "2 adesioni allineate all'età." |
| Nota mancante | "Scrivi una nota che spieghi l'eccezione." |
| Nota troppo lunga | "La nota può avere al massimo 200 caratteri." |
| Errore di rete | "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla." |

## Riconferme

- Avviso per riga: "L'anno scorso era un'eccezione: ACR".
