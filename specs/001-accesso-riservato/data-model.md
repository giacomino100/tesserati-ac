# Data Model: Accesso riservato

**Feature**: [spec.md](./spec.md) · **Date**: 2026-11-17

L'app **non salva dati dell'utente** (FR-012). L'unico dato è l'elenco delle email autorizzate;
nome ed email dell'utente entrato vengono solo letti dall'account Google della sessione.

## Collezione `allowedEmails` (Cloud Firestore)

| Aspetto | Valore |
|---|---|
| Documento | uno per indirizzo email autorizzato |
| ID del documento | **email in minuscolo**, senza spazi (es. `nome.cognome@example.org`) |
| Campi | nessuno obbligatorio; opzionali: `note` (testo libero, es. chi è) |
| Autorizzato | il documento **esiste** |
| Chi scrive | solo chi gestisce il progetto, dalla console Firebase (le regole negano ogni scrittura dall'app) |
| Chi legge | ogni utente può leggere **solo il documento della propria email** (per sapere se è autorizzato); nessuna lettura di elenco |

**Regole di validità**: l'ID deve essere l'email in minuscolo; un ID con maiuscole non verrà mai
trovato (le regole confrontano `request.auth.token.email.lower()`). Rimuovere il documento revoca
l'accesso al primo accesso ai dati successivo.

**Dati di prova (solo emulatore)**: `autorizzato@example.org` (in elenco), `estraneo@example.org`
(non in elenco). Nessuna email reale in test o repository.

## Stato di accesso nell'app (in memoria, non persistito)

| Stato | Significato | Pagina mostrata |
|---|---|---|
| `loading` | controllo di sessione in corso | indicatore di caricamento |
| `signedOut` | nessun utente, o sessione scaduta (> 7 giorni) | accesso |
| `denied` | account Google valido ma email non verificata o non in elenco | accesso negato |
| `allowed` | email verificata, in elenco, sessione valida | home (nome + "Esci") |

**Transizioni**: `loading → signedOut | allowed | denied`; `signedOut → allowed | denied` (dopo
l'accesso con Google); `allowed → signedOut` ("Esci", scadenza a 7 giorni); `allowed → denied`
(email tolta dall'elenco: al successivo accesso ai dati o al ricaricamento); `denied → signedOut`
("Esci / prova con un altro account", dopo la cancellazione dell'account Firebase, R4).

**Dati letti dalla sessione** (mai salvati): nome visualizzato, email, istante dell'ultimo accesso
Google (`metadata.lastSignInTime`).
