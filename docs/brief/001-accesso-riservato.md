# 001 – Accesso riservato

**Chi:** le persone della parrocchia che gestiscono il tesseramento (2–5 utenti, da PC e da telefono).
**Cosa:** l'app si apre solo dopo l'accesso con un account Google. Entra chi ha l'indirizzo email
nell'elenco delle email autorizzate; chiunque altro, anche con un account Google valido, vede solo
un messaggio di accesso negato e nessun dato. L'utente può uscire (logout) e la sessione non dà
accesso a niente se l'email viene tolta dall'elenco.
Questa specifica crea anche lo scheletro dell'app (Angular + Firebase Authentication + Firestore +
Hosting, interfaccia in italiano) su cui poggiano tutte le specifiche successive.
**Perché:** i dati trattati includono minori: nessuno deve poter leggere o scrivere senza essere
autenticato e autorizzato (constitution, principio III).
**Regole:** `docs/dominio/utenti.md`; constitution principio III (Security Rules "nega tutto di
default", testate sull'emulatore Firebase); configurazione in `config/firebase.config.ts`.
**Criteri di accettazione:**
- Senza accesso si vede solo la pagina di accesso con il pulsante "Accedi con Google".
- Un utente con email in elenco entra e vede la pagina iniziale con il proprio nome e il pulsante "Esci".
- Un utente con account Google non in elenco vede "Accesso non autorizzato" e non può leggere né scrivere dati.
- Le Firestore Security Rules negano ogni lettura e scrittura per impostazione predefinita e consentono
  l'accesso solo agli utenti in elenco; sono coperte da test sull'emulatore Firebase.
- L'accesso funziona su PC e telefono (layout adattivo).
- Nessun dato reale nel repository o nei test: elenco e utenti dei test sono finti.
**Fuori ambito:**
- Ruoli distinti e permessi per ruolo (un solo ruolo per ora).
- Schermata di gestione dell'elenco delle email (si gestisce da console Firebase).
- Accesso con email e password, inviti via email, Cloud Functions (piano Blaze).
- Qualsiasi funzionalità di tesseramento (import, famiglie, quote).
- Informativa privacy (da definire con la parrocchia).
