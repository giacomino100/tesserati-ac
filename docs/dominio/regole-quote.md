# Regole delle quote

## 1. Listino (anno associativo 2026/27, nell'export "Anno 2026")

La quota cambia per settore o anche per fascia d'età? Compilare la tabella al livello giusto
(se la quota è la stessa per tutto il settore, ripeterla).

| Settore | Fascia d'età | Nati (anno 2026) | Quota (€) |
|---|---|---|---|
| ACR (RAGAZZI) | 0/5 | 2021–2026 | **TODO** |
| ACR (RAGAZZI) | 6/8 | 2018–2020 | **TODO** |
| ACR (RAGAZZI) | 9/11 | 2015–2017 | **TODO** |
| ACR (RAGAZZI) | 12/14 | 2012–2014 | **TODO** |
| GIOVANI | 15/18 (giovanissimi), 19/25, 26/30 — **stessa quota** ✅ | 1996–2011 | **TODO** |
| ADULTI | AD | ≤ 1995 | **TODO** |

- Esistono quote diverse per ruolo (es. coppia, educatori, sacerdoti)? **TODO**
- Il listino cambia ogni anno? **TODO**

## 2. Regola dello sconto famiglia

Regola come ce l'hanno comunicata:
> Dal terzo tesserato della famiglia scatta lo sconto del 20% sul più piccolo.

### Domande da chiudere (rispondere sotto ogni domanda)

1. "Il più piccolo" = il più **giovane d'età** o quello con la **quota più bassa**?
   - Risposta: **TODO**
2. Con 4 o più tesserati: sconto **solo al più piccolo**, oppure su **ciascuno dal terzo in poi** (es. i due più piccoli)?
   - Risposta: **TODO**
3. Due tesserati con la stessa data di nascita (gemelli): chi riceve lo sconto?
   - Risposta: **TODO** (con quote uguali il risultato in € non cambia, ma va deciso cosa mostrare)
4. La famiglia è il nucleo `N. Legame` dell'export (vedi `regole-famiglia.md`)? Contano solo i componenti tesserati **di quest'anno** (riconfermati + nuovi)? Chi non rinnova esce dal conteggio?
   - Risposta: **TODO**
5. Se un componente si iscrive **dopo** che gli altri hanno già pagato, lo sconto si ricalcola? Chi riceve il rimborso/differenza?
   - Risposta: **TODO**
6. Lo sconto si arrotonda? (es. al centesimo, all'euro, per difetto?)
   - Risposta: **TODO**
7. Vale anche per nuclei **senza genitori tesserati** (es. 3 fratelli, `Legame` = `N3`)?
   - Risposta: ✅ **Sì**, lo sconto vale anche per i nuclei di soli fratelli.
8. Ci sono altri sconti o esenzioni (es. educatori, sacerdoti, casi di difficoltà economica)? Si cumulano?
   - Risposta: **TODO**

### Regola finale (da riscrivere dopo aver risposto)

**TODO**: una formulazione che non lasci spazio a interpretazioni, es.
> Se una famiglia ha 3 o più adesioni nell'anno associativo, il tesserato con la data di nascita più recente riceve uno sconto del 20% sulla propria quota. In caso di parità ...

## 3. Esempi (diventeranno i test automatici)

I casi da K in poi corrispondono ai nuclei negli Excel finti (`excel-esempio/`), così import e calcolo si possono provare sugli stessi dati.

Usare le quote del listino sopra. Completare **tutte** le colonne, compreso l'atteso in euro.
Quote di esempio provvisorie usate qui sotto: ACR 20 €, Giovani 25 €, Adulti 30 € → **sostituire con quelle vere**.

| Caso | Componenti (categoria, data di nascita) | Chi ha lo sconto | Quote attese (€) | Totale famiglia (€) |
|---|---|---|---|---|
| A – 1 adulto | Adulto 1980 | nessuno | 30 | 30 |
| B – 2 adulti | Adulto 1980, Adulto 1982 | nessuno | 30, 30 | 60 |
| C – 2 adulti + 1 ACR | Adulto 1980, Adulto 1982, ACR 2016 | ACR 2016 | 30, 30, 16 | 76 |
| D – 2 adulti + 2 ACR | Adulto 1980, Adulto 1982, ACR 2014, ACR 2017 | **TODO** | **TODO** | **TODO** |
| E – 3 adulti | Adulto 1955, Adulto 1980, Adulto 1982 | **TODO** | **TODO** | **TODO** |
| F – genitore + giovane + ACR | Adulto 1978, Giovane 2005, ACR 2015 | **TODO** | **TODO** | **TODO** |
| G – gemelli | Adulto 1980, Adulto 1982, ACR 2016-03-10, ACR 2016-03-10 | **TODO** | **TODO** | **TODO** |
| H – 5 componenti | Adulto 1975, Adulto 1977, Giovane 2004, ACR 2012, ACR 2018 | **TODO** | **TODO** | **TODO** |
| I – uno non rinnova | come C, ma Adulto 1982 non rinnova | **TODO** | **TODO** | **TODO** |
| J – età vs quota in conflitto | **TODO**: caso in cui il più giovane NON ha la quota più bassa (se esiste) | **TODO** | **TODO** | **TODO** |
| K – nucleo 900002 (C3) | Adulto 1980, Adulto 1982, ACR 2016 | **TODO** | **TODO** | **TODO** |
| L – nucleo 900004 (C6) | Adulto 1970, Adulto 1972, Giovane 1999, Giovane 2005, Giovane 2010, ACR 2013 | **TODO** | **TODO** | **TODO** |
| M – nucleo 900006 (N3, solo fratelli) | Giovane 2009, ACR 2013, ACR 2017 | **TODO** | **TODO** | **TODO** |
| N – nucleo 900008 (N3) | Adulto 1985, Giovane 2011, ACR 2020 | **TODO** | **TODO** | **TODO** |
