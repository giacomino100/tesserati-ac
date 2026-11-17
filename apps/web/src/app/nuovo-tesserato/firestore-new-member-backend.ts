import { collection, doc, getDoc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import { listOfAdhesion, sectorOf, type AdhesionList, type ArchivedPerson } from '@tesseramento/import';
import { db } from '../core/firebase';
import { documentToStored } from '../listini/schedule-mapper';
import {
  AlreadyEnrolledError,
  RenewableError,
  type NewMemberBackend,
  type NewMemberContext,
  type NewMemberEntry,
} from './new-member-backend';

const text = (v: unknown) => (typeof v === 'string' ? v : undefined);

/** Nuovo tesserato in Cloud Firestore (specifica 009, contracts/firestore-new-member.md). Nessun nome nei log. */
export class FirestoreNewMemberBackend implements NewMemberBackend {
  /** Archivio completo con l'ultima adesione, adesioni dell'anno e dell'anno prima, listino (research R4). */
  async context(year: number): Promise<NewMemberContext> {
    const [schedule, persons, adhesions] = await Promise.all([
      getDoc(doc(db, 'feeSchedules', String(year))),
      getDocs(collection(db, 'persons')),
      getDocs(collection(db, 'adhesions')),
    ]);
    const yearIds = new Set<string>();
    const previousYearIds = new Set<string>();
    const last = new Map<string, { year: number; list: AdhesionList }>();
    for (const a of adhesions.docs) {
      const data = a.data();
      const personId = String(data['personId']);
      const adhesionYear = Number(data['associationYear']);
      if (adhesionYear === year) yearIds.add(personId);
      if (adhesionYear === year - 1) previousYearIds.add(personId);
      const list = listOfAdhesion(text(data['importId']), text(data['list']));
      const known = last.get(personId);
      if (list && Number.isInteger(adhesionYear) && (!known || adhesionYear > known.year)) {
        last.set(personId, { year: adhesionYear, list });
      }
    }
    const archive: ArchivedPerson[] = persons.docs
      .filter((p) => typeof p.data()['identityKey'] === 'string')
      .map((p) => {
        const data = p.data();
        const taxCode = text(data['taxCode']);
        const lastAdhesion = last.get(p.id);
        return {
          id: p.id,
          lastName: String(data['lastName']),
          firstName: String(data['firstName']),
          birthDate: String(data['birthDate']),
          identityKey: String(data['identityKey']),
          ...(taxCode ? { taxCode } : {}),
          ...(lastAdhesion ? { lastAdhesion } : {}),
        };
      });
    return {
      archive,
      yearIds,
      previousYearIds,
      ...(schedule.exists() ? { schedule: documentToStored(schedule.data()).schedule } : {}),
    };
  }

  /**
   * Una transazione (research R5): rilegge l'adesione dell'anno (e, per una persona esistente, quella dell'anno
   * prima), poi crea la persona se nuova e l'adesione "nuovo". Senza connessione fallisce invece di restare in coda.
   */
  async add(entry: NewMemberEntry, email: string): Promise<void> {
    const by = email.trim().toLowerCase();
    const personRef = 'personId' in entry ? doc(db, 'persons', entry.personId) : doc(collection(db, 'persons'));
    const adhesionRef = doc(db, 'adhesions', `${entry.year}_${personRef.id}`);
    await runTransaction(db, async (tx) => {
      if ((await tx.get(adhesionRef)).exists()) throw new AlreadyEnrolledError();
      if ('personId' in entry) {
        if ((await tx.get(doc(db, 'adhesions', `${entry.year - 1}_${personRef.id}`))).exists()) throw new RenewableError();
      } else {
        const m = entry.member;
        tx.set(personRef, {
          lastName: m.lastName,
          firstName: m.firstName,
          birthDate: m.birthDate,
          identityKey: m.identityKey,
          ...(m.sex ? { sex: m.sex } : {}),
          ...(m.taxCode ? { taxCode: m.taxCode } : {}),
          createdInYear: entry.year,
          createdAt: serverTimestamp(),
          createdBy: by,
        });
      }
      tx.set(adhesionRef, {
        personId: personRef.id,
        associationYear: entry.year,
        origin: 'nuovo',
        list: entry.list,
        sector: sectorOf(entry.list),
        addedAt: serverTimestamp(),
        addedBy: by,
      });
    });
  }
}
