import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../core/firebase';
import { memberYears } from '../core/member-years';
import type { MemberRow, MembersBackend } from './members-backend';

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** Lettura dei tesserati in Cloud Firestore (contracts/firestore-import.md, "Lettura per la pagina Tesserati"). */
export class FirestoreMembersBackend implements MembersBackend {
  /** Anni con tesserati: importati o riconfermati (specifica 008). */
  async importedYears(): Promise<number[]> {
    return memberYears();
  }

  /** Adesioni dell'anno unite in memoria con l'anagrafica (poche centinaia di persone). */
  async membersOfYear(year: number): Promise<MemberRow[]> {
    const [adhesions, persons] = await Promise.all([
      getDocs(query(collection(db, 'adhesions'), where('associationYear', '==', year))),
      getDocs(collection(db, 'persons')),
    ]);
    const byId = new Map(persons.docs.map((p) => [p.id, p.data()]));
    const rows: MemberRow[] = [];
    for (const adhesion of adhesions.docs) {
      const a = adhesion.data();
      const person = byId.get(String(a['personId']));
      if (!person) continue;
      const exportAgeBand = text(a['exportAgeBand']);
      const bond = text(a['bond']);
      const bondId = text(a['bondId']);
      rows.push({
        lastName: String(person['lastName']),
        firstName: String(person['firstName']),
        birthDate: String(person['birthDate']),
        sector: String(a['sector']),
        ...(exportAgeBand ? { exportAgeBand } : {}),
        ...(bond ? { bond } : {}),
        ...(bondId ? { bondId } : {}),
      });
    }
    return rows;
  }
}
