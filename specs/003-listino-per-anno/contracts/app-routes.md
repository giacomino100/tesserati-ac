# Contract: rotte e schermate dei listini

**Feature**: [../spec.md](../spec.md) · Base: [specifica 001](../../001-accesso-riservato/contracts/app-routes.md)

Tutte le rotte richiedono lo stato `allowed` (stessa guardia della specifica 001).

## Rotte

| Percorso | Pagina | Note |
|---|---|---|
| `/listini` | Elenco dei listini | dal più recente; pulsante "Nuovo listino" |
| `/listini/nuovo` | Nuovo listino | anno proposto = ultimo + 1, non modificabile; valori copiati dall'ultimo |
| `/listini/:anno` | Dettaglio | sola lettura; pulsante "Modifica"; data ed email dell'ultima modifica |
| `/listini/:anno` (modalità modifica) | Modifica | stessa rotta del dettaglio: "Modifica" passa il componente in modalità modifica (stato interno, nessun parametro); stesso modulo del nuovo listino. Il guard `canDeactivate` interroga `hasUnsavedChanges()` del componente, anche quando si esce dalla rotta in modalità modifica |

La pagina iniziale (`/`) ottiene un pulsante/voce **"Listini"** che porta a `/listini`.

## Schermate e testi (italiano)

| Pagina | Contenuto |
|---|---|
| Elenco | righe "2026/27" con data ed email dell'ultima modifica; se l'elenco è vuoto: "Nessun listino. Contatta chi gestisce il progetto." e il pulsante "Nuovo listino" non è disponibile (manca un listino da copiare) |
| Dettaglio | tabella ACR / Giovanissimi / Giovani / Adulti con età, quota piena, quota con sconto del 20%; riga "Pacchetto 2 ACR"; riquadro "Regole del PDF (non modificabili)": età minima, massimo del nucleo; "Ultima modifica: <data>, <email>" |
| Modulo (nuovo/modifica) | un campo per ogni quota in euro con suffisso "€", errori accanto al campo; pulsanti "Salva" e "Annulla"; nessun campo per fasce d'età, età minima, massimo del nucleo |

## Messaggi

| Situazione | Messaggio |
|---|---|
| Campo vuoto | "Inserisci un importo." |
| Non è un numero | "Inserisci un importo valido, per esempio 26,00." |
| Più di due decimali | "Usa al massimo due decimali." |
| Zero o negativo | "L'importo deve essere maggiore di zero." |
| Scontata maggiore della piena | "La quota con sconto non può superare la quota piena." |
| Anno già esistente / non consentito | "Il listino per questo anno non può essere creato. Crea prima gli anni precedenti." |
| Collisione | "Il listino è stato modificato da qualcun altro." con pulsanti "Sovrascrivi" e "Annulla e ricarica" |
| Anno con adesioni (FR-011) | "Le quote già calcolate per questo anno non cambiano finché non vengono ricalcolate." con "Conferma" / "Annulla" |
| Uscita con modifiche non salvate | "Hai modifiche non salvate. Vuoi uscire senza salvare?" |
| Nessuna connessione al salvataggio | "Impossibile salvare. Controlla la connessione e riprova." (nulla salvato a metà) |
| Accesso negato dalle regole | pagina "Accesso non autorizzato" (come in 001) |

## Comportamenti

- Gli importi si mostrano con virgola e due decimali ("26,00 €").
- Si salva solo se `draftToSchedule` non segnala errori; gli errori sono mostrati tutti insieme.
- Dopo il salvataggio si torna al dettaglio con i valori riletti dall'archivio.
- Nessuna quota viene calcolata dall'app (nemmeno la quota con sconto): l'utente scrive ogni valore.
- Nessun dato personale nei log; la sola email salvata è quella dell'ultima modifica (FR-016).
- Layout fluido, nessuno scorrimento orizzontale a 360 px.
