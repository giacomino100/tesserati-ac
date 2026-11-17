import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Anni con tesserati (specifiche 008 e 009): anni con almeno un elenco importato più anni con almeno una riconferma
 * o un nuovo tesserato. Un anno fatto solo di questi non ha segni di import.
 */
export async function memberYears(): Promise<number[]> {
  const [batches, renewals] = await Promise.all([
    getDocs(collection(db, 'importBatches')),
    getDocs(query(collection(db, 'adhesions'), where('origin', 'in', ['riconferma', 'nuovo']))),
  ]);
  const years = [...batches.docs, ...renewals.docs]
    .map((d) => d.data()['associationYear'])
    .filter((y): y is number => typeof y === 'number');
  return [...new Set(years)];
}
