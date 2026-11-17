# Contract: cambio di elenco in Firestore

## Aggiornamento di `adhesions/{anno}_{personId}`

| Campo | Note |
|---|---|
| `list` | `ACR` / `GIOVANI` / `ADULTI` |
| `sector` | `RAGAZZI` / `GIOVANI` / `ADULTI`, coerente con `list` |
| `exportSector` | solo per le importate: il `sector` dell'export, scritto al primo cambio e poi invariato |
| `listChange` | `{ from: elenco di prima, at: request.time, by: email, note?: 1–200 caratteri }` |

## Regole

- `update`: `isAllowed()`; `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['list', 'sector',
  'exportSector', 'listChange'])`; `list` valido; `sector == {'ACR':'RAGAZZI','GIOVANI':'GIOVANI','ADULTI':'ADULTI'}[list]`;
  `listChange.keys().hasOnly(['from','at','by','note'])` e `hasAll(['from','at','by'])`; `from` valido;
  `at == request.time`; `by == ownEmail()`; `note` assente o testo con `trim().size()` tra 1 e 200; se
  `resource.data` aveva `exportSector` resta uguale, altrimenti `exportSector` assente o uguale a `resource.data.sector`.
- `create` e `delete`: invariati.

### Test (sezione N)

- **N1** Allineamento di un'adesione importata (con `exportSector`), di una riconferma e di un nuovo tesserato:
  consentito; utente non autorizzato: negato.
- **N2** Eccezione con nota: consentita; nota vuota o di 201 caratteri: negata.
- **N3** Cambio di altri campi (`personId`, `associationYear`, `importId`, `bondId`, `origin`): negato.
- **N4** `sector` incoerente, `list` non valido, `at`/`by` di altri, campi in più in `listChange`: negati.
- **N5** `exportSector` diverso dal settore di prima, o cambiato dopo essere stato scritto: negato.
- **N6** 150 aggiornamenti in una sola scrittura: consentiti.

## Integrazione (emulatore)

- **E1** `changeList` di un'adesione importata: `list`, `sector`, `exportSector`, `listChange` attesi; `yearMembers`
  (famiglie) restituisce l'elenco nuovo.
- **E2** Eccezione e "Togli eccezione".
- **E3** `membersOfYear` restituisce `list`, `listChange` ed `exportSector`.
