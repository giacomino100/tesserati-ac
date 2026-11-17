# Contract: modulo "Nuovo tesserato"

## Dove

- **Riconferme** (`/riconferme?anno=`): pulsante "Nuovo tesserato" e sezione "Nuovi tesserati del 2026/27" (iscritti a
  mano dell'anno, con "Annulla iscrizione" alle condizioni della 008).
- **Tesserati** (`/tesserati?anno=`): pulsante "Nuovo tesserato" per l'anno mostrato.

## Modulo

| Campo | Note |
|---|---|
| Cognome *, Nome * | testo; puliti e maiuscoli |
| Data di nascita * | campo data |
| Sesso | — / M / F |
| Codice fiscale | 16 lettere e numeri |

Sotto i campi: "7 anni · ACR" (+ avviso "Sotto l'età minima del listino (6 anni): quota non prevista").

## Esiti della verifica (prima di "Iscrivi")

| Esito | Testo | "Iscrivi" |
|---|---|---|
| Nuova | — | attivo |
| Esistente | "Già in archivio: ultima adesione nel 2023/24. Verrà usata questa persona." (per codice fiscale: "Già in archivio con questo codice fiscale: ROSSI MARIO, 12/03/1965.") | attivo |
| Simile | "Possibile doppione: ROSSI MARIO, 12/03/1965 (ultima adesione 2026/27)" + "Stessa persona" / "Persona diversa" | dopo la scelta |
| Anno precedente | "Ha un'adesione nel 2025/26: usa Riconferme." + link | disattivo |
| Già nell'anno | "Ha già un'adesione nel 2026/27." | disattivo |
| Senza listino | "Manca il listino 2027/28. Crealo nella sezione Listini." | disattivo |

## Messaggi

| Situazione | Messaggio |
|---|---|
| Iscrizione riuscita | "Iscrizione salvata: BIANCO LUCA nel 2026/27." |
| Nulla salvato | "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla." |
| Iscritta nel frattempo | "Ha già un'adesione nel 2026/27." |
| Annulla (conferma) | "Annullare l'iscrizione di BIANCO LUCA?" (+ avviso quota salvata) con "Annulla iscrizione" / "Indietro" |
| Annulla riuscito | "Iscrizione annullata." |
| Quote, anno prima del primo listino | "Nessun listino 2025/26: le quote si calcolano solo negli anni con un listino." |
| Import | riga saltata "già presente nell'anno (inserita a mano)" |
