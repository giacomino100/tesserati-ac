# Quickstart: verificare l'accesso riservato

**Feature**: [spec.md](./spec.md)

## Prerequisiti

- Node.js 24.x (o ≥ 22.22.3) e npm
- **JDK** installato (serve all'emulatore Firestore): sul PC `java` oggi non c'è; installare un JDK
  recente (es. 21 LTS) e verificare con `java -version`
- Repository sul ramo `001-accesso-riservato`, dopo l'unione della specifica 002 (vedi plan.md)

## Passi manuali una tantum nella console Firebase (progetto `tesseramento-ac`)

1. Authentication → abilitare il provider **Google**.
2. Verificare che il dominio di Hosting sia tra i domini autorizzati.
3. Creare il database Firestore in modalità produzione, regione europea.
4. Aggiungere il primo documento in `allowedEmails` (ID = email in minuscolo di chi gestisce l'app).
5. Pubblicare le regole **solo dopo** i test verdi: `npx firebase deploy --only firestore:rules`.

## Verifiche automatiche

| # | Comando | Risultato atteso | Verifica |
|---|---|---|---|
| 1 | `npm install` | nessun errore | — |
| 2 | `npm run typecheck` | nessun errore `strict` in tutti i workspace | qualità |
| 3 | `npm test -w web` | test di `session.ts`, `AuthService` e componenti passano | FR-001…FR-011 |
| 4 | `npm run test:rules` (avvia l'emulatore ed esegue `firebase/tests/rules.test.ts`) | garanzie A1…A8 di [contracts/firestore-access.md](./contracts/firestore-access.md) passano | SC-002, SC-003 |
| 5 | `npm run test:integration -w web` (avvia emulatori Auth e Firestore): account non in elenco → dopo il rifiuto l'account risulta cancellato dall'emulatore Auth; account in elenco → entra | nessuna traccia dell'email in Auth | FR-012, R4 |
| 6 | `npm test -w @tesseramento/fees` | invariato (126 test) | nessuna regressione |

## Verifiche manuali (emulatore Auth + app in locale)

Avvio: `npm run emulators` e, in un altro terminale, `npm start -w web` (l'app si collega
automaticamente agli emulatori in sviluppo, progetto `demo-tesseramento`). Annotare i tempi
misurati in M2 (< 30 s) e M4 (< 5 s) per SC-001 e SC-005.

| # | Scenario | Atteso |
|---|---|---|
| M1 | Aprire l'app senza accedere | solo pagina di accesso con "Accedi con Google" |
| M2 | Accedere con `autorizzato@example.org` (account finto dell'emulatore) | pagina iniziale con nome e "Esci"; ricaricando si resta dentro |
| M3 | Premere "Esci" | torna all'accesso; per rientrare serve un nuovo accesso |
| M4 | Accedere con `estraneo@example.org` | "Accesso non autorizzato" entro 5 s; nessun dato; account cancellato dall'emulatore Auth |
| M5 | Con M2 attivo, cancellare il documento da `allowedEmails` (UI dell'emulatore), poi cambiare pagina o tornare sulla scheda (senza ricaricare) | "Accesso non autorizzato" |
| M6 | Aprire la pagina da telefono (o strumenti sviluppatore a 360 px) | nessuno scorrimento orizzontale, tutto utilizzabile |
| M7 | Accesso con Google reale sul progetto di produzione (dopo i passi manuali) con la propria email in elenco | come M2 |

Nessuna email o dato reale nei test: solo gli indirizzi `example.org` finti dell'emulatore.
