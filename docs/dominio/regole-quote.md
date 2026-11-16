# Regole delle quote

Fonte ufficiale: [`fonti/quote-tesseramento-2026-27.pdf`](fonti/quote-tesseramento-2026-27.pdf)
(AC Don Bosco – Parrocchia San Gioacchino, quote associative 2026/27).
Legenda: ✅ confermato · 🔶 dedotto dal PDF, da confermare · **TODO** da decidere.

## 1. Listino 2026/27

| Fascia | Età (PDF) | Fasce nell'export | Quota (€) | Quota −20% (€) |
|---|---|---|---|---|
| Adulti | 30+ (nel PDF "30/25", probabile refuso) | `AD` | 26,00 | 21,00 |
| Giovani | 19–29 | `19/25`, `26/30` | 22,00 | 18,00 |
| Giovanissimi | 15–18 | `15/18` | 16,00 | 13,00 |
| ACR | 6–14 | `6/8`, `9/11`, `12/14` | 15,00 | 12,00 |

- ⚠️ **Giovani e Giovanissimi hanno quote diverse** (22 € e 16 €): nel PDF sono due fasce distinte,
  mentre nell'export stanno entrambe nel settore `GIOVANI`. La fascia si ricava dalla colonna `Fasce d'età`.
- 🔶 Lo sconto del 20% si **arrotonda all'euro più vicino** (26 → 20,80 → **21**; 22 → 17,60 → **18**; 16 → 12,80 → **13**; 15 → **12**).
- **TODO** Un trentenne è Giovane o Adulto? Il PDF dice Giovani fino a 29 anni, l'export mette i nati nel 1996 (30 anni) nella fascia `26/30` del settore GIOVANI.
- **TODO** I bambini sotto i 6 anni (fascia `0/5` nell'export, 1 caso reale) quanto pagano?
- **TODO** Il listino cambia ogni anno? (Proposta: sì, l'app lo gestisce come configurazione per anno.)

## 2. Pacchetti familiari

Testo del PDF:
> - NUCLEI 2 PERSONE ACR: 25 €
> - NUCLEI 3 PERSONE: si applica lo sconto del 20% sulla tessera del più giovane.
> - NUCLEI 4 PERSONE: si applica lo sconto del 20% sulla tessera del 3° componente più giovane e il 4° non paga.

### Regola completa (ipotesi verificata sulla tabella "Casistica")

1. **Nucleo** = tesserati dell'anno con lo stesso `N. Legame` (vedi `regole-famiglia.md`).
   Chi non ha `N. Legame` paga la quota piena.
2. I componenti si ordinano **dal più anziano al più giovane** (data di nascita) ✅.
3. Agevolazioni possibili:
   - **Pacchetto 2 ACR**: due ACR dello stesso nucleo pagano **25 €** in tutto (invece di 30).
   - **Nucleo da 3**: il più giovane paga la quota −20%.
   - **Nucleo da 4**: il 3° componente paga la quota −20% e il 4° (il più giovane) **non paga**.
4. 🔶 **Ogni persona riceve al massimo un'agevolazione** e si applica la **combinazione più conveniente** per la famiglia.
   Esempi: 1 adulto + 2 ACR = 26 + 25 = **51** (il pacchetto ACR conviene più del 20% sul più giovane);
   3 ACR = pacchetto sui due più grandi (25) + 20% sul più piccolo (12) = **37**.
5. ✅ Vale anche per i nuclei di soli fratelli (es. `N3` = 3 fratelli).

> Verifica: con questa regola **tutti i 18 casi della tabella "Casistica" del PDF danno il totale atteso**.

### Domande ancora aperte

1. **Nuclei da 5 o più** (nell'export c'è un nucleo reale da 6): cosa si applica? **TODO**
2. **Nucleo da 4 con 2 ACR**: il pacchetto ACR si può combinare con la regola dei 4? Con la regola "la combinazione più conveniente", 2 adulti + 2 ACR = 26 + 26 + 12 + 0 = **64**. È corretto? **TODO**
3. **"3° componente più giovane"** = il secondo più giovane (contando dal più anziano: 1°, 2°, **3°**, 4°)? 🔶
4. **4 ACR** nello stesso nucleo: si applica la regola dei 4 oppure due pacchetti da 25? Con la regola "la combinazione più conveniente" vince la regola dei 4: 15 + 15 + 12 + 0 = **42** contro 50. **TODO**
5. **Gemelli** (stessa data di nascita): chi è "il più giovane"? Se hanno la stessa quota l'importo non cambia; serve solo una regola per cosa mostrare. **TODO**
6. **Contano solo i tesserati di quest'anno**: chi non rinnova esce dal nucleo per il calcolo? **TODO** (proposta: sì)
7. **Chi si iscrive dopo** che il nucleo ha già pagato: si ricalcola? Chi riceve la differenza? **TODO**
8. **Altri sconti o esenzioni** (educatori, sacerdoti, difficoltà economiche)? **TODO**

## 3. Esempi (diventeranno i test automatici)

Quote: A = Adulto 26, G = Giovane 22, Gm = Giovanissimo 16, R = ACR 15.

### 3.1 Casi ufficiali (tabella "Casistica" del PDF) ✅

| # | Nucleo | Totale (€) | Come si ottiene |
|---|---|---|---|
| 1 | 2 A + 1 G | 70,00 | 26 + 26 + 18 |
| 2 | 2 A + 1 Gm | 65,00 | 26 + 26 + 13 |
| 3 | 2 A + 1 R | 64,00 | 26 + 26 + 12 |
| 4 | 1 A + 2 G | 66,00 | 26 + 22 + 18 |
| 5 | 1 A + 2 Gm | 55,00 | 26 + 16 + 13 |
| 6 | 1 A + 2 R | 51,00 | 26 + 25 (pacchetto ACR) |
| 7 | 1 A + 1 G + 1 R | 60,00 | 26 + 22 + 12 |
| 8 | 1 A + 1 G + 1 Gm | 61,00 | 26 + 22 + 13 |
| 9 | 2 G + 1 R | 56,00 | 22 + 22 + 12 |
| 10 | 1 G + 2 R | 47,00 | 22 + 25 (pacchetto ACR) |
| 11 | 2 G + 1 Gm | 57,00 | 22 + 22 + 13 |
| 12 | 1 G + 2 Gm | 51,00 | 22 + 16 + 13 |
| 13 | 1 G + 1 Gm + 1 R | 50,00 | 22 + 16 + 12 |
| 14 | 1 Gm + 2 R | 41,00 | 16 + 25 (pacchetto ACR) |
| 15 | 3 G | 62,00 | 22 + 22 + 18 |
| 16 | 3 Gm | 45,00 | 16 + 16 + 13 |
| 17 | 3 R | 37,00 | 25 (pacchetto) + 12 |
| 18 | 3 A | 73,00 | 26 + 26 + 21 |

### 3.2 Casi derivati dalla regola, da confermare 🔶

| # | Nucleo | Totale proposto (€) | Come si ottiene |
|---|---|---|---|
| 19 | 1 A | 26,00 | nessun nucleo |
| 20 | 2 A | 52,00 | nessuna agevolazione |
| 21 | 2 R | 25,00 | pacchetto ACR |
| 22 | 1 A + 1 R | 41,00 | nessuna agevolazione |
| 23 | 2 A + 1 G + 1 R | 70,00 | 26 + 26 + 18 (3° −20%) + 0 (4° gratis) |
| 24 | 2 A + 2 R | 64,00 | 26 + 26 + 12 + 0 — vedi domanda 2 |
| 25 | 4 A | 73,00 | 26 + 26 + 21 + 0 |
| 26 | 4 R | 42,00 | 15 + 15 + 12 + 0 — vedi domanda 4 |
| 27 | 2 A + 1 R, un adulto non rinnova | 41,00 | resta 1 A + 1 R — vedi domanda 6 |
| 28 | nucleo da 6 (2 A + 3 G/Gm + 1 R) | **TODO** | vedi domanda 1 |
| 29 | gemelli (2 A + 2 R nati lo stesso giorno) | 64,00 | come il 24; **TODO** chi è il "4°" |
