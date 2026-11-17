import { cleanText } from './clean';
import { identityKey } from './identity';
import { findCandidates } from './similarity';
import type { ArchivedPerson, ImportRow, NewMember, NewMemberErrors, NewMemberInput, NewMemberMatch } from './types';

const TAX_CODE = /^[A-Z0-9]{16}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Età massima plausibile: oltre, la data è considerata un errore di battitura. */
const MAX_AGE = 120;

function validDate(text: string, year: number): boolean {
  const match = ISO_DATE.exec(text);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  const exists = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return exists && y <= year && y >= year - MAX_AGE;
}

/**
 * Campi del modulo "Nuovo tesserato" (specifica 009, research R3): puliti come nell'import (spazi singoli,
 * maiuscolo), così la chiave di identità è la stessa. Errori per campo, in italiano.
 */
export function validateNewMember(
  input: NewMemberInput,
  year: number,
): { readonly ok: true; readonly member: NewMember } | { readonly ok: false; readonly errors: NewMemberErrors } {
  const lastName = cleanText(input.lastName)?.toUpperCase();
  const firstName = cleanText(input.firstName)?.toUpperCase();
  const birthDate = input.birthDate.trim();
  const taxCode = input.taxCode.trim().toUpperCase();
  const errors: { -readonly [K in keyof NewMemberErrors]: NewMemberErrors[K] } = {};
  if (!lastName) errors.lastName = 'Inserisci il cognome.';
  if (!firstName) errors.firstName = 'Inserisci il nome.';
  if (!birthDate) errors.birthDate = 'Inserisci la data di nascita.';
  else if (!validDate(birthDate, year)) errors.birthDate = 'Data di nascita non valida.';
  if (taxCode && !TAX_CODE.test(taxCode)) errors.taxCode = 'Il codice fiscale ha 16 lettere e numeri.';
  if (Object.keys(errors).length > 0 || !lastName || !firstName) return { ok: false, errors };
  const sex = input.sex === 'M' || input.sex === 'F' ? input.sex : undefined;
  return {
    ok: true,
    member: {
      lastName,
      firstName,
      birthDate,
      identityKey: identityKey(lastName, firstName, birthDate),
      ...(sex ? { sex } : {}),
      ...(taxCode ? { taxCode } : {}),
    },
  };
}

/** Controlli d'anno su una persona dell'archivio (research R4). */
function checkYear(
  person: ArchivedPerson,
  by: 'identity' | 'taxCode',
  year: number,
  yearIds: ReadonlySet<string>,
  previousYearIds: ReadonlySet<string>,
): NewMemberMatch {
  if (yearIds.has(person.id)) return { kind: 'alreadyInYear', person };
  if (previousYearIds.has(person.id)) return { kind: 'renewable', person, previousYear: year - 1 };
  return { kind: 'existing', person, by };
}

/**
 * La persona del modulo è già in archivio? Stesso codice fiscale o stessa chiave → quella persona (senza chiedere);
 * altrimenti persone simili secondo `regole-famiglia.md` §2 → da decidere; altrimenti nuova.
 */
export function matchNewMember(
  member: NewMember,
  year: number,
  archive: readonly ArchivedPerson[],
  yearIds: ReadonlySet<string>,
  previousYearIds: ReadonlySet<string>,
): NewMemberMatch {
  const byTaxCode = member.taxCode ? archive.find((p) => p.taxCode === member.taxCode) : undefined;
  if (byTaxCode) return checkYear(byTaxCode, 'taxCode', year, yearIds, previousYearIds);
  const byKey = archive.find((p) => p.identityKey === member.identityKey);
  if (byKey) return checkYear(byKey, 'identity', year, yearIds, previousYearIds);
  const row = { ...member, rowNumber: 0, sector: '' } satisfies ImportRow;
  const candidates = findCandidates(row, archive);
  return candidates.length > 0 ? { kind: 'similar', candidates } : { kind: 'new' };
}

/** Dopo "Stessa persona" su un possibile doppione: stessi controlli d'anno di una persona esistente. */
export function resolveSimilar(
  personId: string,
  year: number,
  archive: readonly ArchivedPerson[],
  yearIds: ReadonlySet<string>,
  previousYearIds: ReadonlySet<string>,
): NewMemberMatch {
  const person = archive.find((p) => p.id === personId);
  if (!person) return { kind: 'new' };
  return checkYear(person, 'identity', year, yearIds, previousYearIds);
}
