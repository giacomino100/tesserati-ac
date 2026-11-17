import type { AgeBand, BandFee, FeeSchedule } from '@tesseramento/fees';
import type { StoredSchedule } from './fee-schedule-backend';

const BANDS: readonly AgeBand[] = ['acr', 'giovanissimi', 'giovani', 'adulti'];
const DOC_KEYS = [
  'associationYear',
  'label',
  'minAge',
  'maxHouseholdSize',
  'acrPackageCents',
  'bands',
  'updatedAt',
  'updatedBy',
];
const BAND_KEYS = ['band', 'minAge', 'maxAge', 'fullCents', 'discountedCents'];

type Raw = Record<string, unknown>;

/** Documento Firestore con forma inattesa. */
export class InvalidScheduleDocumentError extends Error {
  constructor(detail: string) {
    super(`feeSchedules: documento non valido (${detail})`);
    this.name = 'InvalidScheduleDocumentError';
  }
}

function isRaw(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function int(v: unknown, what: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v)) throw new InvalidScheduleDocumentError(what);
  return v;
}

function onlyKeys(o: Raw, allowed: readonly string[], what: string): void {
  for (const key of Object.keys(o)) {
    if (!allowed.includes(key)) {
      throw new InvalidScheduleDocumentError(`${what}: campo "${key}" non previsto`);
    }
  }
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (isRaw(v) && typeof v['toDate'] === 'function') return (v['toDate'] as () => Date)();
  throw new InvalidScheduleDocumentError('updatedAt');
}

/** Documento letto da Firestore → listino più ultima modifica. Rifiuta campi in più o mancanti. */
export function documentToStored(data: unknown): StoredSchedule {
  if (!isRaw(data)) throw new InvalidScheduleDocumentError('non è un oggetto');
  onlyKeys(data, DOC_KEYS, 'documento');
  const rawBands = data['bands'];
  if (!Array.isArray(rawBands) || rawBands.length !== BANDS.length) {
    throw new InvalidScheduleDocumentError('bands');
  }
  const bands = rawBands.map((raw: unknown, i): BandFee => {
    if (!isRaw(raw)) throw new InvalidScheduleDocumentError('fascia');
    onlyKeys(raw, BAND_KEYS, 'fascia');
    if (raw['band'] !== BANDS[i]) throw new InvalidScheduleDocumentError('ordine delle fasce');
    const base = {
      band: BANDS[i] as AgeBand,
      minAge: int(raw['minAge'], 'band.minAge'),
      fullCents: int(raw['fullCents'], 'band.fullCents'),
      discountedCents: int(raw['discountedCents'], 'band.discountedCents'),
    };
    return raw['maxAge'] === undefined ? base : { ...base, maxAge: int(raw['maxAge'], 'band.maxAge') };
  });
  const label = data['label'];
  const updatedBy = data['updatedBy'];
  if (typeof label !== 'string') throw new InvalidScheduleDocumentError('label');
  if (typeof updatedBy !== 'string') throw new InvalidScheduleDocumentError('updatedBy');
  const schedule: FeeSchedule = {
    associationYear: int(data['associationYear'], 'associationYear'),
    label,
    minAge: int(data['minAge'], 'minAge'),
    maxHouseholdSize: int(data['maxHouseholdSize'], 'maxHouseholdSize'),
    acrPackageCents: int(data['acrPackageCents'], 'acrPackageCents'),
    bands,
  };
  return { schedule, updatedAt: toDate(data['updatedAt']), updatedBy };
}

/** Listino → campi da scrivere (senza `updatedAt`, che il backend imposta con l'ora del server). */
export function scheduleToDocument(schedule: FeeSchedule, email: string): Raw {
  return {
    associationYear: schedule.associationYear,
    label: schedule.label,
    minAge: schedule.minAge,
    maxHouseholdSize: schedule.maxHouseholdSize,
    acrPackageCents: schedule.acrPackageCents,
    bands: schedule.bands.map((b) => ({
      band: b.band,
      minAge: b.minAge,
      ...(b.maxAge === undefined ? {} : { maxAge: b.maxAge }),
      fullCents: b.fullCents,
      discountedCents: b.discountedCents,
    })),
    updatedBy: email.toLowerCase(),
  };
}
