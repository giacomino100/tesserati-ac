# Decisioni tecniche → input per `/speckit.constitution`

Le voci marcate **(proposta)** sono suggerimenti: confermare o cambiare prima di generare la constitution.

## Stack
- Frontend: **Angular** ultima versione stabile, componenti standalone, signals **(proposta)**
- UI: **Angular Material** **(proposta)**
- Backend: **Firebase** — Firestore, Authentication, Hosting
- Cloud Functions: **no** per ora; lettura Excel lato client con SheetJS **(proposta — evita il piano Blaze)**
- Linguaggio: TypeScript in modalità `strict`

## Qualità
- Il calcolo delle quote è una **funzione pura** in una libreria separata, senza dipendenze da Angular o Firebase.
- Ogni esempio di `docs/dominio/regole-quote.md` è un test automatico; i test devono passare prima di ogni merge.
- Test: **Vitest** **(proposta)**
- Security rules di Firestore testate con l'emulatore Firebase.

## Dati e privacy
- Dati di minori: accesso solo a utenti autenticati e autorizzati (ruoli in `docs/dominio/utenti.md`).
- Nessun dato reale nel repository né negli ambienti di sviluppo.
- Lo storico degli anni passati non si modifica: ogni anno associativo ha le sue adesioni e il suo listino.

## Convenzioni
- Interfaccia in **italiano**; codice, nomi di variabili e commit in **inglese** **(proposta)**
- Un solo progetto Firebase (produzione) ✅; sviluppo e test sull'emulatore Firebase in locale con dati finti
- Un branch e una PR per ogni specifica.

## Principi (per la constitution)
1. Le regole di dominio stanno in `docs/dominio/` e prevalgono su qualunque assunzione.
2. Semplicità: niente servizi o librerie che non servono a una specifica concreta.
3. Ogni specifica deve essere dimostrabile da sola.
