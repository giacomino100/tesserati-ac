# Contract: rotte e schermate dell'app

**Feature**: [../spec.md](../spec.md) · Stati in [../data-model.md](../data-model.md)

## Rotte

| Percorso | Pagina | Accessibile quando | Altrimenti |
|---|---|---|---|
| `/accesso` | Accesso | stato `signedOut` | `allowed` → `/`; `denied` → `/non-autorizzato` |
| `/non-autorizzato` | Accesso negato | stato `denied` | `signedOut` → `/accesso`; `allowed` → `/` |
| `/` | Pagina iniziale | stato `allowed` | `signedOut` → `/accesso`; `denied` → `/non-autorizzato` |
| qualsiasi altro | — | — | come `/` (poi reindirizzamento in base allo stato) |

Durante `loading` si mostra solo un indicatore di caricamento: nessuna pagina e nessun dato.
Una rotta interna aperta da non autenticati porta all'accesso e, dopo l'accesso, torna alla
rotta richiesta (edge case della specifica).

## Schermate e testi (italiano)

| Pagina | Contenuto |
|---|---|
| Accesso | titolo dell'app, pulsante **"Accedi con Google"** |
| Accesso negato | messaggio **"Accesso non autorizzato"**, spiegazione breve ("Questo account non è abilitato. Chiedi di essere aggiunto all'elenco."), pulsante **"Esci / prova con un altro account"** |
| Pagina iniziale | barra con il **nome dell'utente** e il pulsante **"Esci"**; contenuto vuoto (le funzioni arrivano con le specifiche successive) |

## Messaggi di errore (FR-011)

| Situazione | Messaggio |
|---|---|
| Finestra di Google chiusa / accesso annullato | nessun errore bloccante: si resta sull'accesso; nota discreta "Accesso annullato. Riprova." |
| Nessuna connessione | "Impossibile connettersi. Controlla la connessione e riprova." con pulsante "Riprova" |
| Errore imprevisto | "Qualcosa è andato storto. Riprova tra poco." |
| Email non verificata o non in elenco | "Accesso non autorizzato" (pagina dedicata) |

## Comportamenti

- All'avvio e al ricaricamento si ripristina la sessione se l'ultimo accesso Google ha meno di
  7 giorni; altrimenti si esce (R5).
- Dopo l'accesso: se l'email non è verificata o il documento in `allowedEmails` non esiste, si
  cancella l'account Firebase appena creato, si esce e si mostra "Accesso non autorizzato" (R4).
- Un utente entrato la cui email viene tolta dall'elenco: la guardia riverifica l'autorizzazione
  a ogni cambio di pagina e quando la scheda torna in primo piano; al ricaricamento o al primo
  accesso ai dati successivo vede comunque "Accesso non autorizzato".
- Nessun dato personale (nome, email) nei log né nei messaggi di errore tecnici (FR-012).
- Nessuna larghezza fissa: usabile a 360 px senza scorrimento orizzontale (SC-004).
