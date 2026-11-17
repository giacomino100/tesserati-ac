# Contract: modifiche a schermate e messaggi

Base: [contratto della 004](../../004-import-excel-acr/contracts/app-routes.md).

## Importa Excel (`/importa`)

| Elemento | Prima (004) | Ora |
|---|---|---|
| Titolo | "Importa Excel ACR" | "Importa Excel" |
| Testo iniziale | "Scegli il file ElencoAdesioni_ACR.xlsx…" | "Scegli uno degli elenchi esportati dal sistema nazionale (ACR, Giovani o Adulti)." |
| Anteprima | "Anno associativo 2026/27" | "Elenco Giovani · anno associativo 2026/27" |
| Parità | — | "Di quale elenco si tratta?" con un pulsante di scelta per elenco in parità ("Giovani", "Adulti"); "Importa" disattivato finché non si sceglie |
| Totali | "N righe nel file, M da importare" | invariato; M esclude anche le righe `alreadyInYear` |
| Riepilogo | "Import completato: 15 adesioni 2026/27, …" | "Import completato: elenco Giovani, 8 adesioni 2026/27, 8 persone nuove, 0 già presenti." |

## Messaggi

| Situazione | Messaggio |
|---|---|
| Elenco non riconoscibile | "Non riesco a capire di quale elenco si tratta: la colonna Settore deve contenere RAGAZZI, GIOVANI o ADULTI." |
| Elenco già importato | "L'elenco Giovani del 2026/27 è già stato importato." (con l'elenco) |
| Riga già importata | "Riga 7: già importata nell'elenco ACR del 2026/27" |
| Dati cambiati durante il salvataggio | "Nel frattempo sono stati importati altri tesserati di questo anno. Ricarica il file e riprova." |

Il messaggio `notAcr` della 004 non esiste più.

## Tesserati (`/tesserati`)

Sopra la tabella: "ACR 15 · Giovani 8 · Adulti 14" (solo i settori presenti, in quest'ordine, altri settori in
coda con il nome dell'export), poi "37 tesserati nel 2026/27" come in 004.
