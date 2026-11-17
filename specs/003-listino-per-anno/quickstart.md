# Quickstart: verificare il listino per anno

**Feature**: [spec.md](./spec.md)

## Prerequisiti

- Node.js 24.x e npm; branch `003-listino-per-anno`
- **JDK 21 installato** (`java -version`): senza, i test delle regole non girano e le regole non si
  rilasciano (constitution, principio III)
- La specifica 001 funzionante (accesso e elenco email)

## Verifiche automatiche

| # | Comando | Risultato atteso | Verifica |
|---|---|---|---|
| 1 | `npm install` | nessun errore | — |
| 2 | `npm run typecheck` | nessun errore `strict` in tutti i workspace | qualità |
| 3 | `npm test -w @tesseramento/fees` | i 126 test precedenti più quelli di importi, bozza e andata e ritorno (P1…P7) passano | FR-006…FR-009, SC-005 |
| 4 | `npm test -w web` | test del servizio dei listini, del modulo, delle pagine e dell'avviso di collisione passano | FR-001, FR-011, FR-014 |
| 5 | `npm run test:rules` (emulatore) | garanzie A1…A8 (001) e F1…F10 passano | FR-013, SC-003, SC-004, SC-006 |
| 6 | `npm test -w @tesseramento/rules` (script `test`: solo `seed.test.ts`, senza emulatore) | il JSON di seed coincide con `SCHEDULE_2026_27` | FR-002, SC-002 |

## Inizializzazione del listino 2026/27 (una sola volta, in produzione)

```bash
node firebase/scripts/seed-fee-schedule.cjs --email <email di chi gestisce il progetto>
```

Scrive `feeSchedules/2026` con i valori del PDF; richiede di essere collegati alla CLI Firebase
(`firebase login`). Non si rilancia: se il documento esiste già lo script si ferma.

## Verifiche manuali (emulatori + app in locale, progetto `demo-tesseramento`)

Avvio: `npm run emulators`, poi `npm start`. Il listino 2026 si inizializza sull'emulatore con lo
stesso script (opzioni `--emulator --email seed@example.org`).

| # | Scenario | Atteso |
|---|---|---|
| M1 | Dopo l'accesso aprire "Listini" | elenco con 2026/27 e il dettaglio coincide con `regole-quote.md` §1 (SC-002) |
| M2 | "Nuovo listino" | anno proposto 2027, non modificabile; valori copiati; nessun campo per fasce d'età |
| M3 | Cambiare la quota Adulti a 27,00 e salvare | 27,00 nel 2027; il 2026/27 mostra ancora 26,00 (SC-004) |
| M4 | Inserire "26,555", "0", "-3", vuoto, "abc"; scontata maggiore della piena | errore accanto a ogni campo, nulla salvato (SC-003) |
| M5 | Modificare una quota del 2027 e salvare | nuovo valore alla riapertura; data ed email aggiornate |
| M6 | Aprire lo stesso listino in due schede; salvare nella prima, poi nella seconda | avviso "modificato da qualcun altro" con "Sovrascrivi" / "Annulla e ricarica" |
| M7 | Uscire dal modulo con modifiche non salvate | richiesta di conferma |
| M8 | Da console del browser, prova a creare `feeSchedules/2029` o a cancellare `feeSchedules/2026` | negato dalle regole (F4, F8) |
| M9 | Da telefono (360 px) | nessuno scorrimento orizzontale (SC-007) |
| M10 | Avviso adesioni (FR-011) | verificabile solo con la specifica 004; fino ad allora è coperto da un test con `ScheduleUsage` finto |

Nessun dato reale nei test: solo importi del PDF e email `*@example.org`.
