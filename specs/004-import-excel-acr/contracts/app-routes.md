# Contract: rotta e schermata di import

**Feature**: [../spec.md](../spec.md) · Base: [specifica 001](../../001-accesso-riservato/contracts/app-routes.md)

## Rotta

| Percorso | Pagina | Note |
|---|---|---|
| `/importa` | Importa Excel ACR | stato `allowed` richiesto; `canDeactivate` chiede conferma solo durante il salvataggio |

| `/tesserati` | Tesserati (sola lettura) | stato `allowed` richiesto; parametro di query `anno` facoltativo (predefinito: l'anno importato più recente) |

La pagina iniziale (`/`) ottiene le voci **"Importa Excel"** (`/importa`) e **"Tesserati"** (`/tesserati`).

## Pagina Tesserati (FR-019)

| Elemento | Contenuto |
|---|---|
| Scelta anno | elenco degli anni con un import (da `importBatches`), dal più recente, mostrati come "2026/27" |
| Tabella | Cognome e nome · Data di nascita (GG/MM/AAAA) · Settore · Fascia d'età (export) · Legame (`C3 · 900002`, vuoto se assente); ordinata per cognome, nome |
| Totale | "15 tesserati nel 2026/27" |
| Vuoto | "Nessun tesserato importato. Usa Importa Excel." (link a `/importa`) |
| Azioni | nessuna: niente modifica né cancellazione |

## Stati della schermata

| Stato | Contenuto |
|---|---|
| `idle` | testo "Scegli il file ElencoAdesioni_ACR.xlsx esportato dal sistema nazionale." e pulsante "Scegli file" (`.xlsx`) |
| `reading` | indicatore "Lettura del file…" |
| `rejected` | messaggio d'errore (tabella sotto) e pulsante "Scegli un altro file"; nulla salvato |
| `preview` | "Anno associativo 2026/27"; "15 righe nel file, 15 da importare"; tabella delle prime 10 righe (Cognome e nome, Data di nascita GG/MM/AAAA, Fascia d'età (export), Legame `C3 · 900002`); se ci sono righe saltate: elenco "Riga 7: manca la data di nascita"; pulsanti "Importa" e "Annulla" |
| `saving` | "Salvataggio in corso…", pulsanti disattivati |
| `done` | "Import completato: 15 adesioni 2026/27, 15 persone nuove, 0 già presenti." + righe saltate; pulsanti "Vedi i tesserati" (`/tesserati?anno=2026`) e "Torna alla home" |
| `saveFailed` | messaggio d'errore; si può riprovare (nulla salvato a metà) |

## Messaggi

| Situazione | Messaggio |
|---|---|
| Non è un Excel leggibile | "Il file non è un Excel valido." |
| Foglio mancante | "Nel file manca il foglio ElencoAdesioniExcel." |
| Colonne mancanti | "Nel file mancano le colonne: Data Nascita, Settore." |
| Nessuna riga | "Il file non contiene righe da importare." |
| Anno non valido / misto | "Non riesco a leggere l'anno associativo: la colonna Anno Associativo deve contenere \"Anno 2026\" uguale in tutte le righe." |
| Non è l'elenco ACR | "Il file non sembra l'elenco ACR: nessuna riga ha il settore RAGAZZI." |
| Tutte le righe saltate | "Nessuna riga valida da importare." + elenco delle righe saltate |
| Anno senza listino | "Manca il listino 2026/27. Crealo prima nella sezione Listini." (con link) |
| Anno già importato | "L'elenco ACR del 2026/27 è già stato importato." |
| Errore di rete al salvataggio | "Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla." |
| Accesso negato | pagina "Accesso non autorizzato" (come in 001) |

Motivi delle righe saltate: "manca il cognome", "manca il nome", "manca la data di nascita", "data di nascita
non valida", "stessa persona della riga N".

## Comportamenti

- Il file è letto solo in memoria nel browser; non viene caricato né salvato da nessuna parte.
- I controlli "anno senza listino" e "anno già importato" si fanno già in anteprima (lettura) e di nuovo nella
  transazione di salvataggio.
- Nessun dato personale nei log; i messaggi di riga citano numero di riga e motivo.
- Layout fluido, nessuno scorrimento orizzontale a 360 px (tabella dell'anteprima con colonne essenziali).
