# Glossario

Una riga per termine. Se un termine è ambiguo, la definizione qui vince su tutto il resto.
Completare le parti con **TODO**.

| Termine | Definizione |
|---|---|
| Tesserato | Persona iscritta all'Azione Cattolica in almeno un anno associativo. |
| Anno associativo | Periodo di validità di un'adesione. Nell'export `Anno 2026` = anno associativo **2026/27** ✅. **TODO**: da quale data a quale data vale? |
| Adesione | Iscrizione di un tesserato per uno specifico anno associativo, con categoria e quota. |
| Riconferma | Adesione di un tesserato che aveva un'adesione nell'anno associativo **immediatamente** precedente, creata nell'app spuntando chi rinnova (specifica 008). ✅ |
| Nuova adesione | Adesione di una persona senza adesione nell'anno precedente. ✅ Chi torna dopo 2+ anni conta come **nuova adesione** (confermato il 2026-11-17, specifica 008). |
| Settore (categoria) | Nell'export: `RAGAZZI` (= ACR), `GIOVANI`, `ADULTI`. Determinato dall'età: ≤14 ACR, 15–30 Giovani, ≥31 Adulti. |
| Fascia (per le quote) | Secondo il PDF: ACR 6–14, Giovanissimi 15–18, Giovani 19–29, Adulti 30+. Età = anno associativo − anno di nascita. |
| Fascia d'età (export) | Sottocategoria nell'export, **non usata per le quote**: ACR `0/5`, `6/8`, `9/11`, `12/14`; Giovani `15/18` (= **Giovanissimi**, quota propria), `19/25`, `26/30` (= Giovani); Adulti `AD`. Le quote seguono le fasce del listino in `regole-quote.md`, non il settore. Età = anno associativo − anno di nascita. |
| Nucleo (legame) | Gruppo familiare già presente nell'export: colonne `N. Legame` (id) e `Legame` (es. `C3` = coppia, 3 componenti). Vedi `regole-famiglia.md`. |
| Famiglia | Gruppo di tesserati considerato insieme per il calcolo dello sconto. Definizione precisa in `regole-famiglia.md`. |
| Quota | Importo dovuto per un'adesione, prima dello sconto. Dipende da categoria e anno (vedi `regole-quote.md`). |
| Pacchetto familiare | Agevolazione per nucleo: pacchetto 2 ACR (25 €), 20% sul più giovane (nuclei da 3), 20% sul 3° + 4° gratis (nuclei da 4). Vedi `regole-quote.md`. |
| Responsabile | **TODO**: chi usa l'app (vedi `utenti.md`). |
