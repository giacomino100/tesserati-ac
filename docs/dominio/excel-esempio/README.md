# Excel di esempio

I file `ElencoAdesioni_ACR.xlsx`, `ElencoAdesioni_Giovani.xlsx`, `ElencoAdesioni_Adulti.xlsx` in questa cartella
contengono **dati finti** generati da `genera_esempi.py`, con la **stessa struttura e gli stessi difetti**
dell'export reale (analizzato il 16/11/2026: 89 righe ACR, 15 Giovani, 60 Adulti, "Anno 2026").

> I file reali contengono dati personali, anche di minori: non vanno mai nel repository
> (`.gitignore` esclude la cartella `dati-reali/`).

## Struttura del file

- Un solo foglio: `ElencoAdesioniExcel`, riga 1 = intestazioni, nessuna cella unita, nessuna riga di totale.
- **Stesse 33 colonne, nello stesso ordine, in tutti e tre i file.** Il file di provenienza coincide con la colonna `Settore`.
- Sembra un export del sistema nazionale delle adesioni AC (codici numerici per professione, incarico, ecc.).

## Colonne

| # | Colonna | Esempio | Compilata nel reale | Uso per l'app | Note |
|---|---|---|---|---|---|
| 1 | Associazione | `S. GIOACCHINO - 440 ` | 100% | controllo | sempre con **spazio finale** |
| 2 | Anno Associativo | `Anno 2026` | 100% | **anno** | testo, non numero → estrarre l'anno |
| 3 | Cognome | `ROSSI` | 100% | **identità** | maiuscolo; a volte spazi in più |
| 4 | Nome | `MARIO` | 100% | **identità** | maiuscolo; a volte spazi in più |
| 5 | Sesso | `M` / `F` | 100% | anagrafica | |
| 6 | Data Nascita | 1965-03-12 | 100% | **identità, fascia, sconto** | cella data vera (non testo) |
| 7 | Città Nascita | `PALERMO` | 93% | anagrafica | |
| 8 | Cod. Fiscale | 16 caratteri | **27%** (1 su 89 in ACR) | identità se presente | **non utilizzabile come chiave** |
| 9 | Telefono | | 2% | contatto | `''` o vuoto |
| 10 | Cellulare | | 4% | contatto | |
| 11 | Indirizzo | `VIA ROMA 10` | 100% | anagrafica | scritto in modi diversi anche nella stessa famiglia |
| 12–14 | CAP, Città, Prov. | `90047`, `PARTINICO`, `PA` | 100% | anagrafica | CAP è testo |
| 15 | Frazione | | 0% | ignorare | |
| 16 | Settore | `RAGAZZI` / `GIOVANI` / `ADULTI` | 100% | **categoria** | ACR = `RAGAZZI` |
| 17 | Fasce d'età | `6/8`, `15/18`, `AD` | 100% | **fascia (quota?)** | vedi glossario |
| 18 | Legame | `C3`, `N2` | 65% | **famiglia** | lettera + n. componenti; vuoto = nessun legame |
| 19 | N. Legame | `284787` | 65% | **famiglia** | id del nucleo; vuoto = singolo |
| 20 | Ruolo | `CG`, `F`, `FS`, `A` | 65% | famiglia | vedi `regole-famiglia.md` |
| 21 | SR | `SR` | 18% | **TODO: significato?** | |
| 22 | LM | | 0% | ignorare | |
| 23 | Pagato | `Sì` | 100% | stato pagamento? | sempre `Sì` nell'export |
| 24–28 | A, B, C, D, E | `A`…`E` | 100% | ignorare? | **TODO**: sempre uguali, cosa sono? |
| 29 | Incarico | `21` | 10% | **TODO** | codice numerico |
| 30 | Professione | `07` | 26% | anagrafica | codice numerico, testo con zero iniziale |
| 31 | Stato Civile | `1`, `2`, `3` | 45% | anagrafica | codice numerico |
| 32–33 | MLAC, MSAC | `0` | 38% | ignorare? | adesione ai movimenti (lavoratori / studenti)? |

## Difetti da gestire nell'import (presenti anche nei file finti)

- spazi iniziali, finali o doppi in nomi, indirizzi e associazione;
- valori vuoti rappresentati a volte come cella vuota e a volte come stringa `''`;
- `N. Legame` numerico, vuoto per chi non ha legami;
- indirizzi diversi (refusi, virgole) per persone dello stesso nucleo;
- codice fiscale quasi sempre assente per i minori.

## Famiglie presenti nei file finti

| N. Legame | Legame | Composizione | Sconto previsto? |
|---|---|---|---|
| 900001 | C2 | 2 adulti | no |
| 900002 | C3 | 2 adulti + 1 ACR | sì |
| 900003 | C4 | 2 adulti + 2 ACR | sì |
| 900004 | C6 | 2 adulti + 3 giovani + 1 ACR | sì |
| 900005 | N2 | 2 fratelli ACR | no |
| 900006 | N3 | 3 fratelli (1 giovane + 2 ACR) | sì |
| 900007 | N2 | ruolo A (adulto anziano) + 1 ACR | no |
| 900008 | N3 | 1 genitore + 1 giovane + 1 ACR | sì |
| 900009 | C2 | adulto + giovane (coppia) | no |
| — | — | 10 tesserati singoli | no |
