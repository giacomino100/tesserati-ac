# 011 – Cambio categoria per età

> Dopo 008 e 009 una parte è già fatta: alla riconferma e all'iscrizione l'elenco del nuovo anno si ricalcola
> dall'età con le fasce del listino, e le quote (010) dipendono sempre e solo dall'età, mai dall'elenco. Restano le
> adesioni il cui elenco non corrisponde all'età (soprattutto quelle importate: l'export mette i trentenni nei Giovani)
> e il TODO di `regole-famiglia.md` §3: forzare a mano l'elenco (es. un ragazzo che resta in ACR un anno in più).

**Chi:** gli utenti autorizzati (segreteria), dopo l'import o le riconferme dell'anno.
**Cosa:** in **Tesserati** ogni riga mostra l'elenco dell'adesione (ACR, Giovani, Adulti) e, se è diverso da quello
dell'età secondo il listino dell'anno, un avviso ("Per età: Adulti"). Si può **cambiare l'elenco** di un'adesione: o
allinearlo all'età ("Allinea all'età", anche per tutte le adesioni dell'anno con "Allinea tutte"), o sceglierne un
altro a mano con una **nota obbligatoria** ("resta in ACR un anno in più"). Ogni cambio salva data, email e l'elenco di
prima.
**Perché:** l'elenco serve alla segreteria per organizzare i gruppi e per i riepiloghi (012); oggi un'adesione importata
con un settore che non corrisponde al PDF resta così e non c'è modo di registrare un'eccezione decisa dalla parrocchia.
**Regole:** `docs/dominio/regole-famiglia.md` §3 (fascia solo dall'anno di nascita, fasce del PDF; ricalcolo automatico
alla riconferma; TODO forzatura a mano); `docs/dominio/regole-quote.md` (la quota segue l'età del PDF, non la colonna
dell'export); `docs/dominio/glossario.md` (Settore, Fascia); specifiche 004–006 (adesioni importate e avvisi età/settore),
008 e 009 (elenco dal listino), 010 (quote per età).
**Criteri di accettazione:**
- Tesserati mostra per ogni adesione l'elenco e, se diverso, l'elenco per età con l'avviso; in cima il numero di
  adesioni non allineate.
- "Allinea all'età" e "Allinea tutte" cambiano l'elenco in quello dell'età; un elenco scelto a mano richiede una nota.
- Ogni cambio conserva l'elenco di prima, la data e l'email; un'eccezione con nota resta tale (non viene "allineata"
  da "Allinea tutte").
- Le quote non cambiano per un cambio di elenco.
- Solo gli utenti autorizzati cambiano l'elenco (regole di sicurezza testate); nessun altro campo dell'adesione cambia.
- Con i dati finti del 2026/27 importati: le adesioni non allineate sono quelle che l'export mette in un elenco diverso
  dal PDF (da contare nella specifica) e, dopo "Allinea tutte", nessuna.
**Fuori ambito:**
- Cambiare le regole delle quote (il PDF non prevede quote per elenco forzato: vedi decisione 2).
- Riepiloghi ed export (012).
- Modificare anagrafiche, famiglie o altri anni.

## Decisioni della revisione (2026-11-17: tutte le proposte accettate; `regole-famiglia.md` §3 e `regole-quote.md` aggiornati)

## Da decidere nella revisione (proposte approvate)

1. **Dove**: in Tesserati (una colonna "Elenco" con avviso e azioni) invece di una pagina nuova? Proposta: **sì,
   Tesserati**.
2. **Quota di chi ha un elenco forzato** (es. 15 anni ma "resta in ACR"): il PDF lega la quota all'età, non all'elenco.
   Proposta: **la quota resta per età** (Giovanissimi nell'esempio); se la parrocchia vuole un'eccezione anche sulla
   quota, va scritta prima in `regole-quote.md` (oggi non è prevista: si segnala, non si inventa).
3. **Allinea tutte**: un pulsante per allineare all'età tutte le adesioni non allineate dell'anno, escluse le eccezioni
   con nota, con una conferma ("12 adesioni cambieranno elenco"). Proposta: **sì**.
4. **Eccezione a mano**: si può scegliere qualsiasi elenco, sempre con nota obbligatoria; si può togliere l'eccezione
   (torna all'elenco per età). Proposta: **sì**.
5. **Cosa si salva**: sull'adesione `list` e `sector` nuovi più `listChange { from, at, by, note? }`; l'elenco e il
   settore dell'export restano leggibili (`exportSector`), le regole permettono di cambiare solo questi campi.
   Proposta: **sì**.
6. **Riconferma successiva**: l'anno dopo, la riconferma ricalcola comunque dall'età (l'eccezione vale un anno e va
   rifatta). Proposta: **sì**, con l'avviso in Riconferme "L'anno scorso era un'eccezione: ACR".
7. **Anni senza listino** (es. 2025/26): niente avvisi né allineamento (manca la fascia per età); il cambio a mano con
   nota resta possibile. Proposta: **sì**.
