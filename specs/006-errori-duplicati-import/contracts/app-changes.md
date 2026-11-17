# Contract: modifiche all'anteprima dell'import

Base: contratti della [004](../../004-import-excel-acr/contracts/app-routes.md) e della
[005](../../005-import-giovani-adulti/contracts/app-changes.md).

## Sezioni dell'anteprima (in quest'ordine, solo se non vuote)

| Sezione | Contenuto |
|---|---|
| **Possibili doppioni (N da decidere)** | per ogni caso: "Riga 7: ROSSI MARIA GRAZIA, 12/03/1965" e, per ogni candidato, "ROSSI MARIA, 12/03/1965 · ACR 2025/26" con pulsante "Stessa persona"; in fondo "Persona diversa". La scelta fatta è evidenziata e si può cambiare |
| **Riconosciute dal codice fiscale** | "Riga 9: NERI ANA → NERI ANNA, 05/11/1982 (stesso codice fiscale)" — solo quando nome o data differiscono |
| **Avvisi** | "Riga 14 (GATTI MIA): 4 anni, sotto l'età minima di 6 anni del listino" · "Riga 3 (PROVA ALFA): 30 anni: per il listino è Adulti, nell'export è GIOVANI" |
| **Righe saltate** | "Riga 7 (PROVA ALFA): manca la data di nascita" (senza nome se mancano cognome e nome) |

"Importa" è disattivato finché ci sono possibili doppioni senza scelta; sopra il pulsante: "Decidi i possibili
doppioni prima di importare." Totali come in 005: "N righe nel file, M da importare" (M esclude le righe in attesa).

## Riepilogo

"Import completato: elenco ACR, 15 adesioni 2026/27, 14 persone nuove, 1 già presenti." più, se diversi da zero:
"1 riconosciute dal codice fiscale · 1 doppioni confermati · 1 avvisi".

## Etichette dei settori attesi negli avvisi

Testo dell'avviso: "{età} anni: per il listino è {ACR | Giovani | Adulti}, nell'export è {SETTORE}", dove il
gruppo del listino è ACR per la fascia `acr`, Giovani per `giovanissimi` e `giovani`, Adulti per `adulti`.
