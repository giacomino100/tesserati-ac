import { cleanText } from './clean';

/** Gli elenchi dell'export nazionale: un file per elenco (specifica 005). */
export type AdhesionList = 'ACR' | 'GIOVANI' | 'ADULTI';

export const ADHESION_LISTS: readonly AdhesionList[] = ['ACR', 'GIOVANI', 'ADULTI'];

const SECTOR: Record<AdhesionList, string> = { ACR: 'RAGAZZI', GIOVANI: 'GIOVANI', ADULTI: 'ADULTI' };
const LABEL: Record<AdhesionList, string> = { ACR: 'ACR', GIOVANI: 'Giovani', ADULTI: 'Adulti' };

/** Settore dell'export che corrisponde all'elenco (es. ACR → "RAGAZZI"). */
export function sectorOf(list: AdhesionList): string {
  return SECTOR[list];
}

/** Nome dell'elenco per l'interfaccia. */
export function listLabel(list: AdhesionList): string {
  return LABEL[list];
}

/** ID del segno di import di un elenco in un anno, es. "2026-GIOVANI". */
export function importId(year: number, list: AdhesionList): string {
  return `${year}-${list}`;
}

/** "2026-ADULTI" → "ADULTI"; ID non riconosciuti → `undefined`. */
export function listOfImportId(id: string): AdhesionList | undefined {
  const match = /^\d{4}-([A-Z]+)$/.exec(id);
  const list = match?.[1] as AdhesionList | undefined;
  return list && ADHESION_LISTS.includes(list) ? list : undefined;
}

/**
 * Elenco di un'adesione: il campo `list` se c'è (riconferma, nuovo tesserato, cambio di elenco), altrimenti dal
 * segno di import (specifiche 008 e 011).
 */
export function listOfAdhesion(importId?: string, list?: string): AdhesionList | undefined {
  // L'elenco salvato (riconferma, nuovo tesserato o cambio di elenco della 011) ha la precedenza.
  const saved = ADHESION_LISTS.find((l) => l === list);
  if (saved) return saved;
  return importId !== undefined ? listOfImportId(importId) : undefined;
}

function listOfSector(sector: string): AdhesionList | undefined {
  return ADHESION_LISTS.find((list) => SECTOR[list] === sector);
}

export type ListRecognition =
  | { readonly kind: 'recognized'; readonly list: AdhesionList }
  | { readonly kind: 'tie'; readonly candidates: readonly AdhesionList[] };

/**
 * Elenco di un file dal settore più frequente delle righe (research R1). Parità tra elenchi noti →
 * l'utente sceglie; un settore sconosciuto tra i più frequenti, o nessun settore → `undefined`.
 */
export function recognizeList(sectors: readonly (string | undefined)[]): ListRecognition | undefined {
  const counts = new Map<string, number>();
  for (const sector of sectors) {
    const cleaned = cleanText(sector)?.toUpperCase();
    if (cleaned) counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
  }
  if (counts.size === 0) return undefined;
  const top = Math.max(...counts.values());
  const leaders = [...counts].filter(([, n]) => n === top).map(([sector]) => listOfSector(sector));
  if (leaders.some((list) => list === undefined)) return undefined;
  const candidates = ADHESION_LISTS.filter((list) => leaders.includes(list));
  return candidates.length === 1 ? { kind: 'recognized', list: candidates[0]! } : { kind: 'tie', candidates };
}
