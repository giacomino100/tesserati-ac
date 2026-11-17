import { SCHEDULE_2026_27 } from '@tesseramento/fees';
import { documentToStored, InvalidScheduleDocumentError, scheduleToDocument } from './schedule-mapper';

const when = new Date('2026-11-17T10:00:00Z');
const timestamp = { toDate: () => when };

function doc(): Record<string, unknown> {
  return { ...scheduleToDocument(SCHEDULE_2026_27, 'Utente@Example.org'), updatedAt: timestamp };
}

describe('schedule-mapper', () => {
  it('scrive la forma del documento con l’email in minuscolo e senza maxAge per adulti', () => {
    const d = scheduleToDocument(SCHEDULE_2026_27, 'Utente@Example.org') as {
      updatedBy: string;
      bands: Record<string, unknown>[];
    };
    expect(d.updatedBy).toBe('utente@example.org');
    expect(d.bands.map((b) => b['band'])).toEqual(['acr', 'giovanissimi', 'giovani', 'adulti']);
    expect(d.bands[3]).not.toHaveProperty('maxAge');
    expect(d.bands[0]).toHaveProperty('maxAge', 14);
    expect(d).not.toHaveProperty('updatedAt');
  });

  it('andata e ritorno: il documento dà lo stesso listino, la data e l’email', () => {
    const stored = documentToStored(doc());
    expect(stored.schedule).toEqual(SCHEDULE_2026_27);
    expect(stored.updatedAt).toEqual(when);
    expect(stored.updatedBy).toBe('utente@example.org');
  });

  it('accetta anche una Date al posto del timestamp', () => {
    expect(documentToStored({ ...doc(), updatedAt: when }).updatedAt).toEqual(when);
  });

  it('rifiuta campi in più, mancanti o con tipo sbagliato', () => {
    expect(() => documentToStored({ ...doc(), extra: 1 })).toThrow(InvalidScheduleDocumentError);
    const { label: _label, ...noLabel } = doc();
    expect(() => documentToStored(noLabel)).toThrow(InvalidScheduleDocumentError);
    expect(() => documentToStored({ ...doc(), minAge: '6' })).toThrow(InvalidScheduleDocumentError);
    expect(() => documentToStored({ ...doc(), updatedAt: 'ieri' })).toThrow(InvalidScheduleDocumentError);
    expect(() => documentToStored(null)).toThrow(InvalidScheduleDocumentError);
  });

  it('rifiuta fasce in ordine diverso, in numero sbagliato o con campi in più', () => {
    const bands = doc()['bands'] as Record<string, unknown>[];
    expect(() => documentToStored({ ...doc(), bands: [...bands].reverse() })).toThrow(
      InvalidScheduleDocumentError,
    );
    expect(() => documentToStored({ ...doc(), bands: bands.slice(1) })).toThrow(
      InvalidScheduleDocumentError,
    );
    const withExtra = bands.map((b, i) => (i === 0 ? { ...b, note: 'x' } : b));
    expect(() => documentToStored({ ...doc(), bands: withExtra })).toThrow(InvalidScheduleDocumentError);
  });
});
