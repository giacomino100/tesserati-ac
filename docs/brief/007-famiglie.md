# 007 – Famiglie

**Chi:** gli utenti autorizzati (segreteria), dopo aver importato gli elenchi dell'anno (004–006).
**Cosa:** una nuova sezione **Famiglie** mostra, per un anno associativo, le famiglie **suggerite** dall'export: i
tesserati dell'anno con lo stesso `N. Legame`, anche se sono in elenchi diversi (ACR, Giovani, Adulti). Per ogni
famiglia si vedono i componenti, il `Legame` (es. `C3`) e un avviso se il numero di componenti trovati non torna.
La segreteria **conferma** le famiglie così come sono oppure le **corregge** (aggiunge o toglie un tesserato) e poi
conferma. Le famiglie confermate dell'anno sono salvate e saranno la base delle quote (010) e della riconferma (008).
**Perché:** lo sconto famiglia si applica al nucleo; oggi il nucleo è solo un numero nell'export, sparso su tre file
(20 nuclei su 43 sono in più elenchi). Serve un elenco di famiglie controllato da una persona, non solo dedotto.
**Regole:** `docs/dominio/regole-famiglia.md` §0 (`N. Legame` = nucleo, `Legame` = lettera + numero di componenti,
indirizzo e cognome non identificano la famiglia) e §1 (cos'è una famiglia — **TODO** da confermare in questa
revisione); `docs/dominio/regole-quote.md` (lo sconto dipende dal nucleo; massimo del nucleo nel listino);
`docs/dominio/glossario.md` (Nucleo, Famiglia); constitution principi I, III e IV.
**Criteri di accettazione:**
- La sezione "Famiglie" mostra, per l'anno scelto, le famiglie suggerite dai `N. Legame` delle adesioni dell'anno
  di tutti gli elenchi, con i componenti (cognome e nome, data di nascita, elenco) e il `Legame` dell'export.
- Se i componenti trovati non corrispondono al numero del `Legame` (es. `C3` ma 2 tesserati trovati, perché un
  elenco non è ancora stato importato), la famiglia mostra un avviso; si può confermare comunque.
- Si può confermare una famiglia così com'è, oppure correggerla prima: togliere un componente (resta senza famiglia)
  o aggiungere un tesserato dell'anno che non è in un'altra famiglia; si può anche creare una famiglia a mano da
  tesserati senza famiglia.
- Una persona sta al massimo in una famiglia per anno.
- Le famiglie confermate restano salvate per l'anno e non cambiano se si importano altri elenchi o si lavora su un
  altro anno; i nuovi tesserati con `N. Legame` di una famiglia già confermata compaiono come suggerimento di
  aggiunta.
- Solo gli utenti autorizzati leggono e scrivono le famiglie (regole di sicurezza testate).
- Con i dati finti di `docs/dominio/excel-esempio/` (tre elenchi del 2026 importati) si vedono **9 famiglie**, tutte
  coerenti con il `Legame` (2, 3, 4, 6, 2, 3, 2, 3, 2 componenti), e 10 tesserati senza famiglia.
**Fuori ambito:**
- Calcolo della quota della famiglia (010) e riconferma (008).
- Collegare a una famiglia un tesserato **nuovo** inserito a mano (009).
- Riportare le famiglie da un anno al successivo (008 o successive).
- Stampa o export delle famiglie (012).

## Decisioni della revisione (2026-11-17: tutte le proposte accettate; `regole-famiglia.md` §1 aggiornato)

## Da decidere nella revisione (proposte approvate)

1. **Cos'è una famiglia** (oggi proposta in `regole-famiglia.md` §1): Proposta: **famiglia = tesserati dell'anno con
   lo stesso `N. Legame`**, come suggerimento; diventa la famiglia "vera" solo dopo la conferma di una persona. Chi
   non ha `N. Legame` non ha famiglia (nucleo da 1, nessuna famiglia salvata).
2. **Famiglie per anno**: le famiglie si salvano per anno associativo (una famiglia del 2026 non vale per il 2027)?
   Proposta: **sì, per anno** (constitution IV: il nucleo dipende dall'anno).
3. **Correzioni manuali**: oltre a confermare, si può aggiungere/togliere componenti e creare famiglie a mano?
   Proposta: **sì**, con il vincolo di una sola famiglia per persona nell'anno; nessuna modifica ai dati importati.
4. **Persona in due nuclei** (es. genitori separati; oggi **TODO**): Proposta: **non ammesso** (nei dati non
   succede); se servirà, una specifica futura.
5. **Avviso sul numero del `Legame`**: blocca la conferma o no? Proposta: **non blocca**, è un avviso (es. elenco
   ancora da importare).
6. **Modificare una famiglia già confermata**: Proposta: **sì**, si può riaprire, correggere e riconfermare; resta
   traccia di chi e quando ha confermato per ultimo (come per i listini).
