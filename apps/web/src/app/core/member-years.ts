import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Anni con tesserati (specifica 008, research R3): anni con almeno un elenco importato più anni con almeno una
 * riconferma. Un anno fatto solo di riconferme non ha segni di import.
 */
export async function memberYears(): Promise<number[]> {
  const [batches, renewals] = await Promise.all([
    getDocs(collection(db, 'importBatches')),
    getDocs(query(collection(db, 'adhesions'), where('origin', '==', 'riconferma'))),
  ]);
  const years = [...batches.docs, ...renewals.docs]
    .map((d) => d.data()['associationYear'])
    .filter((y): y is number => typeof y === 'number');
  return [...new Set(years)];
}
