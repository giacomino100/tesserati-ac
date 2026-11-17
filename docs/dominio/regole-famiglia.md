# Regole su famiglie e identità delle persone

## 0. Cosa dicono i dati (analisi export 2026)

L'export **contiene già i nuclei familiari**:

- `N. Legame` = identificativo del nucleo; tutte le persone con lo stesso numero sono della stessa famiglia.
- `Legame` = lettera + **numero di componenti tesserati del nucleo** (verificato: il numero coincide sempre).
  - `C…` → nel nucleo c'è una **coppia** (due `CG`): C2, C3, C4, C6
  - `N…` → nucleo **senza coppia** (un genitore, solo fratelli, ecc.): N2, N3
- `Ruolo` all'interno del nucleo — **non usato dall'app** ✅ (solo informativo; ipotesi sul significato):
  - `CG` = coniuge / genitore
  - `F` = figlio/a
  - `FS` = fratello/sorella (es. nuclei di soli fratelli, genitori non tesserati)
  - `A` = altro (es. nonno/a)
- Nel reale: 43 nuclei (28 da 2, 12 da 3, 2 da 4, 1 da 6), **20 nuclei sparsi su più file**,
  58 tesserati senza legame. → **15 nuclei con 3+ componenti** a cui si applica lo sconto
  (✅ confermato: vale anche per i nuclei di soli fratelli).
- **Indirizzo e cognome NON identificano la famiglia**: 12 nuclei su 43 hanno indirizzi scritti in modo diverso,
  26 su 43 hanno cognomi diversi (es. la madre mantiene il proprio).

## 1. Cos'è una famiglia
- Proposta: **famiglia = nucleo con lo stesso `N. Legame`**; chi non ha `N. Legame` è una famiglia da 1.
- Il `N. Legame` resta lo stesso da un anno all'altro? **TODO** (servirebbe l'export dell'anno precedente per verificarlo)
- Quando si aggiunge un nuovo tesserato (es. un figlio che si iscrive per la prima volta), chi lo collega al nucleo? L'app permette di farlo a mano? **TODO**
- Il `N. Legame` viene creato dal sistema nazionale o dalla parrocchia? **TODO**
- Una persona può stare in due nuclei (es. genitori separati)? Nei dati no. **TODO** confermare.

## 2. Riconoscere la stessa persona tra un anno e l'altro
- Il codice fiscale è compilato solo nel 27% dei casi (1 su 89 in ACR): **non può essere la chiave**.
- Proposta: chiave = **cognome + nome + data di nascita**, normalizzati (maiuscolo, senza spazi in più, senza accenti).
  Nell'export 2026 non ci sono duplicati con questa chiave.
- ✅ Se il codice fiscale è presente in entrambi gli anni, prevale sulla chiave sopra: stessa persona anche se nome o
  data sono scritti diversamente (l'anagrafica salvata non cambia; l'import lo segnala). Confermato il 2026-11-17.
- ✅ Casi dubbi da far decidere a mano a chi importa ("Stessa persona" / "Persona diversa", nessuna scelta
  predefinita), confermato il 2026-11-17 (specifica 006). Una riga senza corrispondenza esatta è un caso dubbio se:
  - stessa data di nascita e stesso cognome, e il nome differisce di al massimo 2 lettere o uno contiene l'altro
    come **parola intera, in qualsiasi posizione** (es. "MARIA" / "MARIA GRAZIA", "ANNA" / "MARIA ANNA LUISA";
    non "ANNA" / "GIOVANNA") — precisato il 2026-11-17;
  - oppure stesso cognome e nome, e la data di nascita differisce per una sola cifra o per giorno e mese scambiati.

## 3. Cambio di categoria
- ✅ La fascia dipende **solo dall'anno di nascita**: età = anno associativo − anno di nascita.
- ✅ Fasce secondo il PDF delle quote: ≤ 5 non previsto · 6–14 ACR · 15–18 Giovanissimi · 19–29 Giovani · ≥ 30 Adulti.
  (Differenza con l'export: l'export mette i trentenni nei GIOVANI, il PDF negli Adulti → vale il PDF.)
- Alla riconferma l'app ricalcola settore e fascia in automatico? **TODO** (proposta: sì)
- Si può forzare a mano (es. un ragazzo che resta in ACR un anno in più)? **TODO**
