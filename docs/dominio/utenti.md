# Utenti e permessi

| Ruolo | Chi è | Cosa può fare | Cosa NON può fare |
|---|---|---|---|
| Utente autorizzato | Le persone della parrocchia che gestiscono il tesseramento (segreteria e referenti) | Tutto quello che l'app offre: import, riconferme, famiglie, quote, riepiloghi | Niente, finché non è in elenco |

- **Un solo ruolo** nella prima versione: ogni utente autorizzato può fare tutto. Ruoli distinti
  (amministratore, segreteria, responsabile di settore) si introdurranno con una specifica dedicata
  se servirà.
- **Come si accede**: con un account Google. Entra solo chi ha l'indirizzo email nell'**elenco
  delle email autorizzate**; un account Google non in elenco non vede nessun dato.
- **Chi gestisce l'elenco**: per ora la persona che mantiene il progetto, dalla console Firebase
  (nessuna schermata di gestione utenti nella prima versione).
- **Quante persone**: poche, da 2 a 5.
- **Da quali dispositivi**: PC e telefono (interfaccia utilizzabile anche su schermo piccolo).
- **Privacy**: **TODO** — titolare del trattamento dei dati e informativa da definire con la parrocchia.
  I dati includono minori (constitution, principio III).
- **Limiti noti di "nessuna traccia"** per chi non è in elenco: l'app cancella subito l'account creato dal
  tentativo, ma (1) Google/Firebase possono conservare log tecnici propri; (2) se il browser si chiude a
  metà dell'accesso negato, l'account resta finché non viene eliminato a mano dalla console. Da riprendere
  nell'informativa privacy.
