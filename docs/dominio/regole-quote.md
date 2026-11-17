# Regole delle quote

**Unica fonte: [`fonti/quote-tesseramento-2026-27.pdf`](fonti/quote-tesseramento-2026-27.pdf)** ✅
(AC Don Bosco – Parrocchia San Gioacchino, quote associative 2026/27).

L'app applica **solo** quello che è scritto nel PDF: non introduce regole, sconti o arrotondamenti propri.
I casi che il PDF non prevede non vengono calcolati: l'app li **segnala** (vedi §4).

## 1. Listino 2026/27 (dal PDF)

| Fascia | Età | Quota (€) | Quota con sconto 20% (€) |
|---|---|---|---|
| Adulti | 30 e oltre (nel PDF "30/25", probabile refuso) | 26,00 | 21,00 |
| Giovani | 19–29 | 22,00 | 18,00 |
| Giovanissimi | 15–18 | 16,00 | 13,00 |
| ACR | 6–14 | 15,00 | 12,00 |

- La quota scontata è **quella scritta nella colonna "Percentuale del 20%"** del PDF: l'app non calcola il 20%, legge il valore dal listino.
- ✅ **Età = anno associativo − anno di nascita** (es. 2026/27: nato nel 1996 → 30 anni → Adulto).
- La fascia segue le età del PDF. **Attenzione**: l'export mette i trentenni nella fascia `26/30` (GIOVANI), il PDF li considera Adulti → l'app ricalcola la fascia dall'età e non usa la colonna `Fasce d'età` dell'export.
- Il listino è legato all'anno associativo: ogni anno si carica il nuovo PDF/listino.

## 2. Pacchetti familiari (testo del PDF)

> - NUCLEI 2 PERSONE ACR: 25 €
> - NUCLEI 3 PERSONE: si applica lo sconto del 20 % sulla tessera del più giovane.
> - NUCLEI 4 PERSONE: si applica lo sconto del 20 % sulla tessera del 3° componente più giovane e il 4° non paga.

Il **nucleo** è l'insieme dei tesserati dell'anno con lo stesso `N. Legame` (vedi `regole-famiglia.md`);
i componenti si ordinano per data di nascita. Vale anche per i nuclei di soli fratelli ✅.

| Nucleo | Cosa si applica |
|---|---|
| 1 persona (nessun `N. Legame`) | quota piena |
| 2 persone, entrambe ACR | 25 € in tutto |
| 2 persone, altri casi | quote piene |
| 3 persone | 20% sul più giovane; se nel nucleo ci sono 2 ACR si applica la "scontistica dei 2 ACR" come nella tabella Casistica (§3) |
| 4 persone | ordinando dal più anziano al più giovane: il 3° (secondo più giovane) paga la quota −20%, il 4° (il più giovane) non paga ✅ — anche se nel nucleo ci sono 2 ACR ✅ |
| 5 o più persone | **non previsto dal PDF** → §4 |

### Chiarimenti sulla lettura del PDF ✅

1. **Nucleo da 4**: ordinando dal più anziano al più giovane, il 3° è il secondo più giovane (−20%) e il 4° è il più giovane (non paga).
2. **Nucleo da 4 con 2 ACR**: si applica la regola dei 4, non il pacchetto ACR.
3. **Età**: anno associativo − anno di nascita (non conta il giorno di nascita).

## 3. Esempi (diventeranno i test automatici)

### 3.1 Tabella "Casistica" del PDF ✅

| # | Nucleo | Totale (€) | Note del PDF |
|---|---|---|---|
| 1 | 2 Adulti + 1 Giovane | 70,00 | |
| 2 | 2 Adulti + 1 Giovanissimo | 65,00 | |
| 3 | 2 Adulti + 1 ACR | 64,00 | |
| 4 | 1 Adulto + 2 Giovani | 66,00 | |
| 5 | 1 Adulto + 2 Giovanissimi | 55,00 | |
| 6 | 1 Adulto + 2 ACR | 51,00 | scontistica dei 2 ACR |
| 7 | 1 Adulto + 1 Giovane + 1 ACR | 60,00 | |
| 8 | 1 Adulto + 1 Giovane + 1 Giovanissimo | 61,00 | |
| 9 | 2 Giovani + 1 ACR | 56,00 | |
| 10 | 1 Giovane + 2 ACR | 47,00 | scontistica dei 2 ACR |
| 11 | 2 Giovani + 1 Giovanissimo | 57,00 | |
| 12 | 1 Giovane + 2 Giovanissimi | 51,00 | |
| 13 | 1 Giovane + 1 Giovanissimo + 1 ACR | 50,00 | |
| 14 | 1 Giovanissimo + 2 ACR | 41,00 | scontistica dei 2 ACR |
| 15 | 3 Giovani | 62,00 | |
| 16 | 3 Giovanissimi | 45,00 | |
| 17 | 3 ACR | 37,00 | scontistica dei 2 ACR |
| 18 | 3 Adulti | 73,00 | |

### 3.2 Applicazione diretta delle regole del PDF

Casi non elencati nella Casistica ma risolti direttamente dal testo del PDF (listino e pacchetti).

| # | Nucleo | Totale (€) | Regola del PDF |
|---|---|---|---|
| 19 | 1 Adulto | 26,00 | listino |
| 20 | 2 Adulti | 52,00 | nessun pacchetto per 2 persone non ACR |
| 21 | 2 ACR | 25,00 | nuclei 2 persone ACR |
| 22 | 1 Adulto + 1 ACR | 41,00 | nessun pacchetto |
| 23 | 1 Adulto + 1 Giovanissimo + 1 ACR | 54,00 | 3 persone: 26 + 16 + 12 |
| 24 | 2 Giovanissimi + 1 ACR | 44,00 | 3 persone: 16 + 16 + 12 |
| 25 | 2 Adulti + 1 Giovane + 1 ACR | 70,00 | 4 persone: 26 + 26 + 18 + 0 ✅ |
| 26 | 2 Adulti + 2 ACR | 64,00 | 4 persone: 26 + 26 + 12 + 0 ✅ |
| 27 | 4 Adulti | 73,00 | 4 persone: 26 + 26 + 21 + 0 ✅ |
| 28 | 1 Adulto + 1 Giovane (2000) + 1 Giovane (2003) + 1 Giovanissimo | 66,00 | 4 persone: 26 + 22 + 18 + 0 — il 3° è il giovane nato nel 2003 ✅ |
| 29 | 2 Adulti + 1 nato nel 1996 | 73,00 | il nato nel 1996 ha 30 anni → Adulto → come il caso 18 ✅ |

## 4. Casi non previsti dal PDF

L'app **non inventa la quota**: segnala il nucleo come "non previsto dal listino".

| Caso | Nei dati reali 2026 |
|---|---|
| Nuclei da 5 o più persone | 1 nucleo da 6 |
| Nucleo con almeno un bambino sotto i 6 anni (fascia `0/5` nell'export): **tutto il nucleo** è non previsto ✅ | 1 bambino |

✅ L'app mostra l'avviso e la segreteria **inserisce a mano la quota** del nucleo, con una **nota obbligatoria** che ne spiega il motivo.

✅ Anche un nucleo con una **data di nascita incoerente** con l'anno associativo (es. nato dopo l'anno) non viene
calcolato: si tratta come non previsto (quota manuale del nucleo con nota), mostrando il motivo. Confermato il
2026-11-17 (specifica 010). La quota manuale è **un solo importo per il nucleo**.
