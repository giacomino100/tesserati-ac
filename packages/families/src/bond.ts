import type { Bond } from './types';

/** "C3" → { kind: 'C', size: 3 } (regole-famiglia.md §0); qualsiasi altra forma → undefined. */
export function parseBond(bond: string | undefined): Bond | undefined {
  const match = /^([A-Z])(\d+)$/.exec((bond ?? '').trim().toUpperCase());
  return match ? { kind: match[1]!, size: Number(match[2]) } : undefined;
}
