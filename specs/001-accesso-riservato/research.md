# Research: Accesso riservato

**Feature**: [spec.md](./spec.md) · **Date**: 2026-11-17

Versioni verificate sul registro npm il 2026-11-17.

## R1 – Firebase nell'app Angular: SDK diretto, non `@angular/fire`

- **Decisione**: usare `firebase` `^13.4` (API modulare) con un piccolo servizio Angular; non installare `@angular/fire`.
- **Motivazione**: `@angular/fire` stabile è la 21.0.0 e richiede Angular `^21.2` e TypeScript `<6.0`; per Angular 22 (che richiede TypeScript `>=6.0 <6.1`) esiste solo `22.0.0-rc.1`. Usare l'SDK diretto evita un conflitto di dipendenze e un livello in più (principio V). Servono pochissime chiamate: `signInWithPopup`, `onAuthStateChanged`, `signOut`, `getDoc`, `deleteUser`.
- **Alternative scartate**: `@angular/fire` rc (instabile); restare su Angular 21 (contrasta con "ultima versione stabile" della constitution e con la specifica 002 che già richiede TypeScript 6).

## R2 – Come si decide chi è autorizzato

- **Decisione**: collezione Firestore `allowedEmails`, un documento per email, **id = email in minuscolo**. Il documento esiste → autorizzata. L'elenco si gestisce dalla console Firebase (FR-013).
- **Motivazione**: le Security Rules possono controllare `exists(/databases/$(database)/documents/allowedEmails/$(request.auth.token.email.lower()))` a ogni richiesta; così togliere un documento chiude l'accesso al primo accesso ai dati successivo (FR-006, SC-003), senza ritardi e senza aggiornare token o claim. Il confronto in minuscolo soddisfa FR-003.
- **Alternative scartate**: *custom claims* (richiedono Cloud Functions/Admin SDK e un refresh del token: ritardo e piano Blaze); elenco nel codice o in un file di configurazione (richiede un nuovo rilascio per ogni modifica).

## R3 – Dove si applica davvero l'autorizzazione

- **Decisione**: le **Security Rules** sono l'unica barriera reale; la guardia delle rotte e le pagine sono solo UX. Regola generale: `allow read, write: if false` su tutto; eccezioni esplicite descritte in [contracts/firestore-access.md](./contracts/firestore-access.md).
- **Motivazione**: constitution, principio III, e FR-005: ogni accesso ai dati va negato indipendentemente dall'interfaccia usata. Un utente che aggira l'app deve incontrare le stesse regole.
- La stessa funzione di controllo (`isAllowed()`) sarà il modello per le collezioni delle specifiche successive: ogni nuova regola parte da `isAllowed()`.

## R4 – Nessuna traccia per chi non è in elenco (FR-012)

- **Problema**: Firebase Auth crea e conserva l'account (uid, email, nome) di **chiunque** completi l'accesso con Google, anche se poi non è in elenco. Resterebbe quindi una traccia dell'email nel progetto, in contrasto con la chiarificazione "nessuna traccia". Bloccare l'accesso a monte richiederebbe le *blocking functions* (Identity Platform, piano Blaze): escluso.
- **Decisione**: dopo l'accesso, l'app legge il proprio documento in `allowedEmails`. Se non esiste, **cancella subito l'account Firebase appena creato** (`deleteUser`, consentito all'utente stesso e valido perché l'accesso è appena avvenuto) e poi mostra "Accesso non autorizzato". Se la cancellazione fallisce, esce comunque (`signOut`) e il caso resta documentato come limite noto.
- **Limiti noti**: (a) Google/Firebase possono mantenere log tecnici propri, fuori dal controllo dell'app; (b) se il browser viene chiuso tra l'accesso e la cancellazione, l'account resta fino a una pulizia manuale dalla console. Da dichiarare all'utente e da rivedere con l'informativa privacy.
- **Alternative scartate**: lasciare l'account (viola la chiarificazione); blocking functions (Blaze, principio V).

## R5 – Durata della sessione: 7 giorni dall'ultimo accesso Google

- **Decisione**: doppio controllo.
  - *Regole (autorevole)*: la richiesta è consentita solo se `request.time` − `request.auth.token.auth_time` ≤ 7 giorni. `auth_time` è l'istante dell'ultimo accesso effettivo con Google e **non** cambia quando il token viene rinnovato.
  - *App (comodità)*: all'avvio, se `user.metadata.lastSignInTime` è più vecchio di 7 giorni, esce e mostra la pagina di accesso.
- **Motivazione**: Firebase Auth di per sé non scade finché non si esce; con le regole la scadenza vale anche per chi aggira l'interfaccia (FR-009).
- **Da dimostrare**: che l'emulatore esponga `auth_time` nei token di prova; se non lo facesse, il test delle regole userà il token con claim esplicito (`withAuthenticatedUser`) e resta il controllo lato app (rischio basso, vedi quickstart).

## R6 – Test delle regole

- **Decisione**: `@firebase/rules-unit-testing` `^6` (compatibile con `firebase ^13`) con Vitest, contro l'emulatore Firestore avviato da `firebase emulators:exec`. Casi: nessun accesso senza login; email non verificata; email non in elenco; email in elenco ok; maiuscole/minuscole; sessione oltre 7 giorni; elenco non modificabile dagli utenti; elenco non enumerabile (solo il proprio documento); qualunque altra collezione negata.
- **Prerequisito**: l'emulatore Firestore richiede un JDK. Sul PC dello sviluppatore `java` **non è installato** (verificato): va installato un JDK recente (la versione minima richiesta da `firebase-tools` 15 va controllata con `firebase emulators:start`; in dubbio, JDK 21 LTS).

## R7 – Test dell'app

- **Decisione**: Vitest, il runner predefinito di Angular 22, per `session.ts` (funzioni pure), `AuthService` (con SDK simulato) e componenti. Nessun test end-to-end con Google in questa specifica: l'accesso con popup di Google non è automatizzabile in modo affidabile; si verifica a mano (quickstart) e le regole sono testate a parte.

## R8 – Configurazione e rilascio

- **Decisione**: `firebase.config.ts` (già salvato in `config/` sul ramo 002) si sposta in `apps/web/src/app/core/` e si importa da lì (importarlo da fuori dalla cartella dell'app complicherebbe la compilazione). Hosting con `firebase.json` (SPA con riscrittura verso `index.html`); regole pubblicate solo dopo test verdi.
- **Passi manuali una tantum nella console Firebase** (non automatizzabili senza Blaze): abilitare il provider Google in Authentication; verificare che il dominio di Hosting sia tra i domini autorizzati; creare Firestore (modalità produzione, regione europea); aggiungere almeno il primo documento in `allowedEmails`.

## R9 – Interfaccia

- **Decisione**: Angular Material (`MatButton`, `MatToolbar`, `MatCard`), tre pagine con caricamento pigro, layout fluido senza larghezze fisse (verifica a 360 px). Lingua italiana: testi nei componenti, nessuna libreria di traduzione (una sola lingua).
- **Stati dell'accesso** (signals): `loading` → `signedOut` | `denied` | `allowed`; messaggi in [contracts/app-routes.md](./contracts/app-routes.md).
