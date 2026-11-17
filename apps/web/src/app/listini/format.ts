import { formatEuros, type AgeBand, type BandFee } from '@tesseramento/fees';

/** 2600 → "26,00 €" */
export function euro(cents: number): string {
  return `${formatEuros(cents)} €`;
}

export const BAND_NAMES: Readonly<Record<AgeBand, string>> = {
  acr: 'ACR',
  giovanissimi: 'Giovanissimi',
  giovani: 'Giovani',
  adulti: 'Adulti',
};

/** "6–14", "30 e oltre" */
export function ageRange(band: BandFee): string {
  return band.maxAge === undefined ? `${band.minAge} e oltre` : `${band.minAge}–${band.maxAge}`;
}

const DATE_TIME = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' });

export function dateTime(date: Date): string {
  return DATE_TIME.format(date);
}
