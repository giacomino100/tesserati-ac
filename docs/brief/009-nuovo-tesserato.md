# 009 – Nuovo tesserato

**Chi:** gli utenti autorizzati (segreteria), durante l'anno associativo, dopo le riconferme (008).
**Cosa:** nella sezione **Riconferme** (o in **Tesserati**) un pulsante "Nuovo tesserato" apre un modulo con cognome,
nome e data di nascita (obbligatori), sesso e codice fiscale (facoltativi). Prima di salvare l'app cerca la persona in
archivio: se c'è già (anche da anni precedenti, o con un nome scritto in modo simile) propone di usare quella invece di
crearne un'altra. Salvando nasce l'adesione per l'anno scelto, con l'elenco (ACR, Giovani, Adulti) ricavato dall'età e
dal listino dell'anno. La persona compare poi in Tesserati, Famiglie (tra i "senza famiglia", da aggiungere a una
famiglia con "Correggi") e Quote.
**Perché:** chi si iscrive per la prima volta (o torna dopo due o più anni) non è tra i riconfermabili; oggi l'unico
modo per aggiungerlo sarebbe un nuovo Excel.
**Regole:** `docs/dominio/glossario.md` (Nuova adesione: senza adesione nell'anno precedente, anche chi torna dopo 2+
anni); `docs/dominio/regole-famiglia.md` §1 (TODO "chi collega il nuovo tesserato al nucleo?"), §2 (stessa persona:
chiave cognome + nome + data, codice fiscale che prevale, casi dubbi da far decidere), §3 (elenco dall'età con le fasce
del listino); `docs/dominio/excel-esempio/README.md` (solo le colonne ammesse: niente indirizzo né contatti, constitution
III); specifiche 004–006 (persone e adesioni), 007 (famiglie), 008 (riconferma), 010 (quote).
**Criteri di accettazione:**
- Con il modulo compilato (es. un bambino di 7 anni) nasce un'adesione dell'anno con elenco ACR, data ed email; la
  persona nuova ha solo cognome, nome, data di nascita e, se indicati, sesso e codice fiscale.
- Se in archivio esiste la stessa persona (chiave uguale o stesso codice fiscale) l'app la usa, senza duplicarla; se
  esiste una persona simile (regole di §2) chiede "Stessa persona" / "Persona diversa".
- Chi è già iscritto nell'anno non si può aggiungere di nuovo (anche in contemporanea).
- Chi era iscritto l'anno precedente viene indirizzato alla riconferma (008) invece che aggiunto come nuovo.
- Solo gli utenti autorizzati creano nuovi tesserati (regole di sicurezza testate).
**Fuori ambito:**
- Modificare l'anagrafica di una persona esistente; cancellare persone.
- Collegare il nuovo tesserato a una famiglia dal modulo (si fa in "Famiglie", vedi decisione 4).
- Pagamenti, riepiloghi ed export (012); cambio di elenco forzato (011).

## Decisioni della revisione (2026-11-17: tutte le proposte accettate; `regole-famiglia.md` §1 aggiornato)

## Da decidere nella revisione (proposte approvate)

1. **Dove**: il pulsante "Nuovo tesserato" sta in **Riconferme** (stesso anno, subito sotto "Già iscritti") e in
   **Tesserati**? Proposta: **in entrambe**, stesso modulo.
2. **Dati richiesti**: cognome, nome, data di nascita obbligatori; sesso e codice fiscale facoltativi; nient'altro
   (niente indirizzo, contatti, legame). Proposta: **sì**.
3. **Persona già in archivio**: stessa chiave o stesso codice fiscale → si usa quella (con un messaggio "Già in archivio:
   ultima adesione nel 2023/24"); casi dubbi di §2 → "Stessa persona" / "Persona diversa" come nell'import.
   Con un'adesione nell'anno precedente → messaggio "Ha un'adesione nel 2025/26: usa Riconferme" e niente salvataggio.
   Proposta: **sì**.
4. **Famiglia**: il nuovo tesserato entra "senza famiglia" e si aggiunge a una famiglia confermata in "Famiglie" con
   "Correggi" (già possibile dalla 007). Proposta: **sì** (risolve il TODO di `regole-famiglia.md` §1: lo collega a mano
   la segreteria, in Famiglie).
5. **Elenco e listino**: elenco dall'età con le fasce del listino dell'anno (come la 008), listino obbligatorio; sotto
   l'età minima resta ACR con l'avviso "quota non prevista". Proposta: **sì**.
6. **Cosa si salva**: adesione con origine "nuovo" (`origin: 'nuovo'`, `list`, `sector`, data ed email) e, se serve, una
   persona nuova senza segno di import (le regole vanno estese come per la 008). Proposta: **sì**.
7. **Annullare**: "Annulla iscrizione" per le adesioni nate da questo modulo, alle stesse condizioni della 008 (non in
   una famiglia confermata); la persona resta in archivio (le persone non si cancellano). Proposta: **sì**.
8. **Import dopo**: se poi si importa un Excel dello stesso anno che la contiene, la riga è saltata come "già presente
   nell'anno (inserita a mano)", come per le riconferme. Proposta: **sì**.

## Nota

Nella 009 si corregge anche il testo della pagina Quote per un anno senza listino che non si può creare (es. 2025/26):
"Nessun listino 2025/26: le quote si calcolano solo negli anni con listino." invece di "Crealo nella sezione Listini".
