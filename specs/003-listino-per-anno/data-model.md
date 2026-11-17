# Data Model: Listino per anno

**Feature**: [spec.md](./spec.md) · **Date**: 2026-11-17

Importi sempre in **centesimi interi** in archivio; in euro con due decimali solo nell'interfaccia.
Identificatori in inglese, testi per l'utente in italiano.

## Collezione `feeSchedules` (Cloud Firestore)

Un documento per anno associativo. **ID del documento** = anno di inizio come testo di 4 cifre
(`"2026"` = 2026/27).

| Campo | Tipo | Regole | 2026/27 |
|---|---|---|---|
| `associationYear` | intero | uguale all'ID del documento; non modificabile | `2026` |
| `label` | testo | `"<anno>/<ultime due cifre dell'anno+1>"`; non modificabile | `"2026/27"` |
| `minAge` | intero | regola del PDF; **uguale** al listino precedente; non modificabile | `6` |
| `maxHouseholdSize` | intero | regola del PDF; **uguale** al listino precedente; non modificabile | `4` |
| `acrPackageCents` | intero | **> 0** | `2500` |
| `bands` | lista di 4 | nell'ordine `acr`, `giovanissimi`, `giovani`, `adulti`; vedi sotto | vedi sotto |
| `updatedAt` | timestamp | uguale al momento della richiesta (server); aggiornato a ogni salvataggio | — |
| `updatedBy` | testo | email di chi salva, in minuscolo; aggiornata a ogni salvataggio | — |

Nessun altro campo è ammesso (le regole rifiutano campi in più).

**Elemento di `bands`**

| Campo | Tipo | Regole |
|---|---|---|
| `band` | testo | `acr` · `giovanissimi` · `giovani` · `adulti`, nell'ordine indicato; non modificabile |
| `minAge` | intero | età minima inclusa; **uguale** al listino precedente; non modificabile |
| `maxAge` | intero, assente per `adulti` | età massima inclusa; **uguale** al listino precedente; non modificabile |
| `fullCents` | intero | **> 0** |
| `discountedCents` | intero | **> 0** e **≤ `fullCents`** (valore "Percentuale del 20%" del PDF, mai calcolato) |

| Fascia | minAge | maxAge | fullCents | discountedCents |
|---|---|---|---|---|
| acr | 6 | 14 | 1500 | 1200 |
| giovanissimi | 15 | 18 | 1600 | 1300 |
| giovani | 19 | 29 | 2200 | 1800 |
| adulti | 30 | — | 2600 | 2100 |

**Forma attesa dal calcolo** (specifica 002): `FeeSchedule` = `associationYear`, `label`, `minAge`,
`bands`, `acrPackageCents`, `maxHouseholdSize`. `updatedAt` e `updatedBy` sono metadati dell'archivio
e non entrano nel calcolo.

## Regole di creazione e di modifica

| Operazione | Condizioni |
|---|---|
| Creare l'anno `Y` | utente autorizzato; `feeSchedules/(Y-1)` esiste; `feeSchedules/Y` non esiste; forma e importi validi; campi non modificabili **uguali** a quelli di `Y-1` (l'etichetta è quella dell'anno `Y`, non copiata) |
| Modificare l'anno `Y` | utente autorizzato; forma e importi validi; campi non modificabili **invariati**; `updatedAt`/`updatedBy` aggiornati |
| Cancellare | mai |
| Leggere (un listino o l'elenco) | utente autorizzato |

Il listino 2026/27 non passa da questa regola (non esiste il 2025): lo crea una sola volta lo
script di inizializzazione (ricerca R6).

## Stato dell'interfaccia (in memoria)

| Elemento | Contenuto |
|---|---|
| `ScheduleDraft` | le quote come testo in euro per ogni campo modificabile (piena e scontata per fascia, pacchetto 2 ACR) |
| Errori di campo | per ogni campo: nessuno o un codice (`required`, `notNumber`, `tooManyDecimals`, `notPositive`, `discountedAboveFull`) con messaggio in italiano |
| `openedAt` | l'`updatedAt` visto all'apertura, per il controllo di collisione (R5) |
| Conflitto | stato "il listino è cambiato": scelta fra sovrascrivere e annullare/ricaricare |

## Transizioni

`elenco → dettaglio (sola lettura) → modifica → salvataggio → dettaglio`;
`elenco → nuovo (anno proposto = ultimo + 1, valori copiati) → salvataggio → dettaglio`.
In caso di conflitto: `salvataggio → conflitto → (sovrascrivi → dettaglio | annulla → dettaglio ricaricato)`.
