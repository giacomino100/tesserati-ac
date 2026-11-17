import type { ImportPlan } from '@tesseramento/import';
import type { ImportBackend, YearStatus } from './import-backend';

/** Provvisorio: sostituito dall'implementazione Firestore (task T029). */
export class FirestoreImportBackend implements ImportBackend {
  async yearStatus(_year: number): Promise<YearStatus> {
    throw new Error('non implementato');
  }

  async existingPersons(): Promise<Map<string, string>> {
    throw new Error('non implementato');
  }

  async commit(_plan: ImportPlan, _email: string): Promise<void> {
    throw new Error('non implementato');
  }
}
