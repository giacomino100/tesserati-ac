# Contract: riconferme in Firestore

## Documento

`adhesions/{anno}_{personId}`:

| Campo | Tipo | Note |
|---|---|---|
| `personId` | string | non vuoto |
| `associationYear` | int | anno nuovo |
| `origin` | `'riconferma'` | assente nelle adesioni importate |
| `list` | `'ACR'` \| `'GIOVANI'` \| `'ADULTI'` | elenco del nuovo anno |
| `sector` | string | `RAGAZZI` / `GIOVANI` / `ADULTI`, coerente con `list` |
| `bond`, `bondId` | string? | copiati dall'anno precedente |
| `renewedFrom` | int | `associationYear − 1` |
| `renewedAt` | timestamp | `request.time` |
| `renewedBy` | string | email di chi scrive (minuscolo) |

## Regole

- `create` (riconferma): `isAllowed()`, campi ammessi/obbligatori, ID = `{anno}_{personId}`, `list` valido e `sector`
  corrispondente, `renewedFrom == associationYear - 1`, `exists(adhesions/{renewedFrom}_{personId})`,
  `exists(feeSchedules/{anno})`, `renewedAt == request.time`, `renewedBy == ownEmail()`.
- `create` (import): invariata.
- `update`: vietato (anche per le riconferme).
- `delete`: `isAllowed()`, `resource.data.origin == 'riconferma'`, `!exists(familyMemberships/{adhesionId})`.

### Test (sezione L)

- **L1** Riconferma valida accettata; utente non autorizzato rifiutato in lettura, creazione e cancellazione.
- **L2** Senza adesione dell'anno precedente → rifiutata; `renewedFrom` non consecutivo → rifiutata.
- **L3** Senza listino dell'anno → rifiutata.
- **L4** Seconda adesione della stessa persona nello stesso anno (riconferma su import o su riconferma) → rifiutata.
- **L5** `sector` incoerente, `list` non valido, campi in più, `renewedAt`/`renewedBy` di altri → rifiutata.
- **L6** Riconferma con `importId` → rifiutata (le due forme non si mescolano).
- **L7** 15 riconferme in una scrittura → accettate (limite letture).
- **L8** Cancellazione di una riconferma senza appartenenza → accettata; con appartenenza → rifiutata.
- **L9** Cancellazione di un'adesione importata → rifiutata.
- **L10** Query delle adesioni con `origin == 'riconferma'` → permessa a chi è autorizzato.

## Letture dell'app

- Pagina: `memberYears()` (R3), tesserati dell'anno precedente e dell'anno nuovo (come `yearMembers` della 007, con
  `origin`), appartenenze dell'anno nuovo, listino dell'anno nuovo.
- Annulla: `householdFees/{anno}_p-{personId}` (esiste?) prima della conferma.

## Integrazione (emulatore)

- **E1** `renew` di 37 persone → 3 transazioni, 37 adesioni con i campi attesi.
- **E2** `renew` con una persona già iscritta → `AlreadyRenewedError`, nulla salvato di quel gruppo.
- **E3** `undo` di una riconferma; `undo` con appartenenza → errore, nulla cambiato.
- **E4** `memberYears()` include un anno con sole riconferme.
