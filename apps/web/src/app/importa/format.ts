/** "2016-04-09" → "09/04/2016". */
export function italianDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/** "C3 · 900002", solo la parte presente, vuoto senza legame. */
export function bondLabel(row: { readonly bond?: string; readonly bondId?: string }): string {
  return [row.bond, row.bondId].filter(Boolean).join(' · ');
}
