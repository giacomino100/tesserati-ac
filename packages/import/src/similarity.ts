import { normalize } from './identity';
import type { ArchivedPerson, ImportRow } from './types';

/** Distanza di Levenshtein: inserimenti, cancellazioni e sostituzioni di lettere. */
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
    }
    previous = current;
  }
  return previous[b.length]!;
}

/** Le parole di `short` compaiono intere e consecutive in `long`, in qualsiasi posizione. */
function containsWords(long: string, short: string): boolean {
  return ` ${long} `.includes(` ${short} `);
}

/**
 * Nomi diversi ma simili (regole-famiglia.md §2): al massimo 2 lettere di differenza, oppure uno contiene
 * l'altro come parola intera in qualsiasi posizione ("MARIA" / "MARIA GRAZIA"; non "ANNA" / "GIOVANNA").
 */
export function namesSimilar(a: string, b: string): boolean {
  const x = normalize(a);
  const y = normalize(b);
  if (x === y || x === '' || y === '') return false;
  return editDistance(x, y) <= 2 || containsWords(x, y) || containsWords(y, x);
}

function isValidDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d || m > 12) return false;
  const days = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= days[m - 1]!;
}

/** Date "AAAA-MM-GG" diverse ma simili: una sola cifra diversa, oppure giorno e mese scambiati. */
export function datesSimilar(a: string, b: string): boolean {
  if (a === b || !isValidDate(a) || !isValidDate(b)) return false;
  const digitsA = a.replace(/-/g, '');
  const digitsB = b.replace(/-/g, '');
  let differences = 0;
  for (let i = 0; i < digitsA.length; i++) if (digitsA[i] !== digitsB[i]) differences++;
  if (differences === 1) return true;
  const [year, month, day] = a.split('-');
  return month !== day && b === `${year}-${day}-${month}`;
}

/**
 * Persone dell'archivio simili alla riga (research R3): stessa data e stesso cognome con nome simile,
 * oppure stesso cognome e nome con data simile. Mai la persona con la stessa chiave di identità.
 */
export function findCandidates(row: ImportRow, archive: readonly ArchivedPerson[]): ArchivedPerson[] {
  const lastName = normalize(row.lastName);
  const firstName = normalize(row.firstName);
  return archive.filter((person) => {
    if (person.identityKey === row.identityKey || normalize(person.lastName) !== lastName) return false;
    const sameFirstName = normalize(person.firstName) === firstName;
    if (person.birthDate === row.birthDate) return namesSimilar(person.firstName, row.firstName);
    return sameFirstName && datesSimilar(person.birthDate, row.birthDate);
  });
}
