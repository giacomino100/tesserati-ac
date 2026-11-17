# Roadmap

Stati: ⬜ da fare · 📝 brief pronto · 🔍 spec in revisione · 🚧 in sviluppo · ✅ fatto

| # | Specifica | Demo in una frase | Stato |
|---|---|---|---|
| 001 | Accesso riservato | Solo utenti autorizzati entrano nell'app | ✅ |
| 002 | Calcolo quota famiglia (solo logica) | Dati i componenti di una famiglia ottengo quote, sconto e totale corretti | ✅ |
| 003 | Listino per anno | Imposto le quote ACR/Giovani/Adulti dell'anno | ✅ |
| 004 | Import Excel ACR | Carico l'Excel ACR, vedo l'anteprima, salvo e vedo i tesserati | ✅ |
| 005 | Import Giovani e Adulti | Come 004 per gli altri elenchi | ✅ |
| 006 | Errori e duplicati nell'import | Righe errate e persone già presenti vengono segnalate | ✅ |
| 007 | Famiglie | Raggruppo i tesserati in famiglie (suggerimento + conferma) | ✅ |
| 010 | Quote nella famiglia | Apro una famiglia e vedo quote, sconto e totale | ✅ |
| 008 | Riconferma adesione | Vedo i tesserati dell'anno scorso e spunto chi rinnova | ✅ |
| 009 | Nuovo tesserato | Aggiungo chi non c'era l'anno scorso | ✅ |
| 011 | Cambio categoria per età | Chi passa di fascia viene spostato e la quota ricalcolata | ✅ |
| 013 | Tesserati semplificati | Apro i tesserati dell'anno, confermo chi paga e sistemo la sua famiglia | 🔍 |
| 012 | Riepilogo ed export | Totali per categoria e incassi, export Excel | ⬜ |

La lista è viva: va rivista dopo ogni 3–4 specifiche completate.

- Revisione del 2026-11-17 (dopo 003–007): la **010** passa prima di 008–009, perché ha già tutto quello che le
  serve e non dipende dai TODO aperti di `regole-famiglia.md` (`N. Legame` tra anni, collegamento dei nuovi tesserati).
- Revisione del 2026-11-17 (dopo 010, 008, 009 e la correzione dell'anno dell'export): ordine confermato 011 → 012. La
  011 si riduce: il ricalcolo dall'età alla riconferma e all'iscrizione è già fatto (008, 009) e le quote dipendono
  solo dall'età (010); restano elenchi non allineati all'età e le eccezioni decise a mano.
- Revisione del 2026-11-17 (richiesta dell'utente): la **013** corregge 008, 009 e 011 (una sola pagina Tesserati,
  conferma = pagato, famiglia nel pannello della persona, import solo per l'amministratore) e passa prima della 012.
