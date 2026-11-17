/** Testo per il confronto: maiuscolo, senza accenti, spazi singoli (regole-famiglia.md §2). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chiave di identità della persona: COGNOME|NOME|AAAA-MM-GG normalizzati. */
export function identityKey(lastName: string, firstName: string, birthDate: string): string {
  return `${normalize(lastName)}|${normalize(firstName)}|${birthDate}`;
}
