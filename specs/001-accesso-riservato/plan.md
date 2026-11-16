# Implementation Plan: Accesso riservato

**Branch**: `001-accesso-riservato` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-accesso-riservato/spec.md`

## Summary

Crea lo scheletro dell'app (Angular + Firebase) con accesso tramite account Google e autorizzazione
basata su un elenco di email. L'**autorizzazione vera** sta nelle Firestore Security Rules (nega tutto
per impostazione predefinita; consente solo a utenti con email verificata presente in `allowedEmails`
e con accesso Google più recente di 7 giorni); l'interfaccia (guardia delle rotte, pagine di accesso,
accesso negato, home) è solo un comodo riflesso di quelle regole. Le regole sono coperte da test
sull'emulatore Firebase. Si usa direttamente l'SDK modulare di Firebase, senza `@angular/fire`
(research R1). Un accesso negato cancella subito l'account Firebase appena creato, per non lasciare
tracce (research R4).

## Technical Context

**Language/Version**: TypeScript `~6.0` in modalità `strict` (richiesto da Angular 22); Node.js ≥ 22.22.3 o 24.x (richiesto da Angular 22; sul PC dello sviluppatore 24.19)

**Primary Dependencies**: `@angular/core|router|…` `^22.2`, `@angular/material` `^22.2`, `firebase` `^13.4` (SDK modulare: `firebase/app`, `firebase/auth`, `firebase/firestore`); dev: `@angular/cli`/`@angular/build` `^22.2`, `firebase-tools` `^15`, `@firebase/rules-unit-testing` `^6`, `vitest` `^5.1`

**Storage**: Cloud Firestore, una sola collezione `allowedEmails`; nessun dato utente salvato dall'app

**Testing**: Vitest (logica e componenti, runner predefinito di Angular 22); Vitest + `@firebase/rules-unit-testing` sull'emulatore Firestore/Auth per le Security Rules

**Target Platform**: browser moderni su PC e telefono (layout adattivo, 360 px), ospitato su Firebase Hosting

**Project Type**: web application (SPA Angular, solo frontend + servizi Firebase gestiti)

**Performance Goals**: accesso completo < 30 s (SC-001); messaggio di accesso negato < 5 s (SC-005)

**Constraints**: nessun piano Blaze né Cloud Functions; interfaccia in italiano; nessun dato reale in repository, test o log; sviluppo e test sull'emulatore (richiede un JDK: vedi quickstart)

**Scale/Scope**: 2–5 utenti, 3 schermate (accesso, accesso negato, home)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Valutazione | Note |
|---|---|---|
| I. Dominio fonte di verità | ✅ | Ruolo unico, accesso Google, elenco email: tutto da `docs/dominio/utenti.md`. Nessuna regola di quota coinvolta |
| II. Calcolo quote puro | ✅ n/a | Nessun calcolo; `packages/fees` non viene toccato né importato |
| III. Riservatezza (NON-NEGOTIABLE) | ✅ | Regole "nega tutto" + test su emulatore (R3, R6); solo dati finti; nessun dato utente salvato; tentativi negati senza traccia (R4); niente log di dati personali |
| IV. Storico per anno | ✅ n/a | Nessun dato legato all'anno associativo |
| V. Semplicità | ✅ | Niente `@angular/fire`, niente Functions/Blaze, una sola collezione, nessuna libreria di stato. Angular Material perché imposto dai vincoli tecnologici, usato solo per pulsanti, barra e scheda |

**Vincoli tecnologici**: Angular + Material, Firebase (Auth, Firestore, Hosting), TypeScript strict, Vitest + Emulator Suite ✅. **Ambienti**: un solo progetto Firebase (produzione); le regole si pubblicano solo dopo test verdi sull'emulatore ✅ (quickstart).

**Esito**: nessuna violazione; la sezione Complexity Tracking non serve.

**Ri-verifica dopo la fase 1 (design)**: invariata. Il dettaglio R4 (cancellazione dell'account dopo un rifiuto) è l'unico punto che dipende da un comportamento da dimostrare sull'emulatore (vedi quickstart, verifica 5).

## Project Structure

### Documentation (this feature)

```text
specs/001-accesso-riservato/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── firestore-access.md   # matrice di accesso delle Security Rules
│   └── app-routes.md         # rotte, stati e messaggi dell'interfaccia
└── tasks.md                  # creato da /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/                          # app Angular (nuovo workspace)
├── src/
│   ├── main.ts
│   ├── index.html
│   ├── styles.scss
│   └── app/
│       ├── app.ts / app.config.ts / app.routes.ts
│       ├── core/
│       │   ├── firebase.ts            # init SDK + collegamento agli emulatori in sviluppo
│       │   ├── firebase.config.ts     # configurazione web (spostata da config/)
│       │   ├── session.ts             # funzioni pure: sessione scaduta? email normalizzata
│       │   ├── auth.service.ts        # stato (signals), accesso, uscita, controllo elenco
│       │   └── auth.guard.ts          # guardia delle rotte
│       └── pages/
│           ├── login/                 # "Accedi con Google"
│           ├── denied/                # "Accesso non autorizzato"
│           └── home/                  # nome + "Esci"
├── angular.json, tsconfig*.json, package.json
└── (test accanto ai file: *.spec.ts)

firebase/                          # configurazione e test delle regole (nuovo workspace)
├── firestore.rules
├── tests/rules.test.ts
└── package.json

firebase.json, .firebaserc         # Hosting, Firestore, emulatori
package.json                       # workspaces: packages/*, apps/*, firebase
packages/fees/                     # invariato (specifica 002)
```

**Structure Decision**: app web in `apps/web`, regole Firestore e relativi test in un workspace
`firebase/` separato; `packages/fees` resta isolato (principio II). I test delle regole girano con
Vitest in Node contro l'emulatore, senza passare dall'app.

**Prerequisito di ramo**: questa specifica aggiunge `package.json` e `tsconfig.base.json` alla
radice, gli stessi file creati dalla specifica 002. Conviene **unire prima la PR della 002** e poi
rifare la base della 001 su `main`, per evitare conflitti. Alla radice si porta `engines.node` a
`^22.22.3 || ^24.15.0`.

## Complexity Tracking

Nessuna violazione da giustificare.
