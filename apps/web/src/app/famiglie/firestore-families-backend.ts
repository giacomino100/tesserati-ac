import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Timestamp,
} from 'firebase/firestore';
import type { ConfirmedFamily, YearMember } from '@tesseramento/families';
import { listOfAdhesion } from '@tesseramento/import';
import { db } from '../core/firebase';
import { memberYears } from '../core/member-years';
import { MemberInOtherFamilyError, type FamiliesBackend, type FamilyDraft } from './families-backend';

const membershipId = (year: number, personId: string) => `${year}_${personId}`;

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** Famiglie in Cloud Firestore (specifica 007, contracts/firestore-families.md). Nessun nome nei log. */
export class FirestoreFamiliesBackend implements FamiliesBackend {
  /** Anni con tesserati: importati o riconfermati (specifica 008). */
  async importedYears(): Promise<number[]> {
    return memberYears();
  }

  /** Adesioni dell'anno unite alle persone, con l'elenco del segno di import o della riconferma (008, R2). */
  async yearMembers(year: number): Promise<YearMember[]> {
    const [adhesions, persons] = await Promise.all([
      getDocs(query(collection(db, 'adhesions'), where('associationYear', '==', year))),
      getDocs(collection(db, 'persons')),
    ]);
    const byId = new Map(persons.docs.map((p) => [p.id, p.data()]));
    const members: YearMember[] = [];
    for (const adhesion of adhesions.docs) {
      const a = adhesion.data();
      const personId = String(a['personId']);
      const person = byId.get(personId);
      const list = listOfAdhesion(text(a['importId']), text(a['list']));
      if (!person || !list) continue;
      const bond = text(a['bond']);
      const bondId = text(a['bondId']);
      members.push({
        personId,
        lastName: String(person['lastName']),
        firstName: String(person['firstName']),
        birthDate: String(person['birthDate']),
        list,
        ...(bond ? { bond } : {}),
        ...(bondId ? { bondId } : {}),
        ...(a['origin'] === 'riconferma' || a['origin'] === 'nuovo' ? { origin: a['origin'] as 'riconferma' | 'nuovo' } : {}),
        // Eccezione decisa a mano (specifica 011): ultimo cambio di elenco con nota.
        ...(text((a['listChange'] as Record<string, unknown> | undefined)?.['note'])
          ? { exception: true as const, listNote: text((a['listChange'] as Record<string, unknown>)['note'])! }
          : {}),
        // Specifica 013: pagamento e "tolta a mano dalla famiglia".
        ...(text(a['paidOn']) ? { paidOn: text(a['paidOn'])! } : {}),
        ...(a['familyOptOut'] === true ? { familyOptOut: true as const } : {}),
      });
    }
    return members;
  }

  async confirmedFamilies(year: number): Promise<ConfirmedFamily[]> {
    const snapshot = await getDocs(query(collection(db, 'families'), where('associationYear', '==', year)));
    return snapshot.docs.map((d) => {
      const data = d.data();
      const bondId = text(data['bondId']);
      return {
        id: d.id,
        associationYear: Number(data['associationYear']),
        memberIds: (data['memberIds'] as unknown[]).map(String),
        origin: data['origin'] === 'manuale' ? 'manuale' : 'legame',
        ...(bondId ? { bondId } : {}),
        confirmedAt: (data['confirmedAt'] as Timestamp | null)?.toDate() ?? new Date(0),
        confirmedBy: String(data['confirmedBy']),
      };
    });
  }

  async memberships(year: number): Promise<Map<string, string>> {
    const snapshot = await getDocs(query(collection(db, 'familyMemberships'), where('associationYear', '==', year)));
    return new Map(snapshot.docs.map((d) => [String(d.data()['personId']), String(d.data()['familyId'])]));
  }

  /**
   * Conferma (crea o aggiorna) le famiglie in una transazione (research R3): rilegge le famiglie da aggiornare e le
   * appartenenze dei componenti; una persona di un'altra famiglia (fuori da questa scrittura) → errore, nulla scritto.
   */
  async confirm(drafts: readonly FamilyDraft[], email: string): Promise<void> {
    const refs = drafts.map((d) => (d.id ? doc(db, 'families', d.id) : doc(collection(db, 'families'))));
    const ids = new Set(refs.map((r) => r.id));
    await runTransaction(db, async (tx) => {
      const previous = await Promise.all(refs.map((ref, i) => (drafts[i]!.id ? tx.get(ref) : Promise.resolve(undefined))));
      const removed: { year: number; personId: string }[] = [];
      drafts.forEach((d, i) => {
        const before = previous[i]?.data()?.['memberIds'] as unknown[] | undefined;
        for (const p of (before ?? []).map(String)) {
          if (!d.memberIds.includes(p)) removed.push({ year: d.associationYear, personId: p });
        }
      });
      for (const [i, d] of drafts.entries()) {
        for (const p of d.memberIds) {
          const link = await tx.get(doc(db, 'familyMemberships', membershipId(d.associationYear, p)));
          const owner = link.exists() ? String(link.data()['familyId']) : undefined;
          // Un'appartenenza verso una famiglia di questa stessa scrittura che la lascia è uno spostamento valido.
          const movedHere = owner !== undefined && ids.has(owner) && !drafts.some((o, j) => refs[j]!.id === owner && o.memberIds.includes(p));
          if (owner !== undefined && owner !== refs[i]!.id && !movedHere) throw new MemberInOtherFamilyError(p);
        }
      }

      drafts.forEach((d, i) => {
        tx.set(refs[i]!, {
          associationYear: d.associationYear,
          memberIds: [...d.memberIds],
          origin: d.origin,
          ...(d.bondId ? { bondId: d.bondId } : {}),
          confirmedAt: serverTimestamp(),
          confirmedBy: email.trim().toLowerCase(),
        });
        for (const p of d.memberIds) {
          tx.set(doc(db, 'familyMemberships', membershipId(d.associationYear, p)), {
            associationYear: d.associationYear,
            personId: p,
            familyId: refs[i]!.id,
          });
        }
      });
      for (const r of removed) {
        if (!drafts.some((d) => d.memberIds.includes(r.personId))) {
          tx.delete(doc(db, 'familyMemberships', membershipId(r.year, r.personId)));
        }
      }
    });
  }

  /** Scioglie la famiglia: la cancella con le appartenenze che puntano a lei. */
  async dissolve(familyId: string): Promise<void> {
    const ref = doc(db, 'families', familyId);
    await runTransaction(db, async (tx) => {
      const family = await tx.get(ref);
      if (!family.exists()) return;
      const year = Number(family.data()['associationYear']);
      const memberIds = (family.data()['memberIds'] as unknown[]).map(String);
      const links = await Promise.all(memberIds.map((p) => tx.get(doc(db, 'familyMemberships', membershipId(year, p)))));
      tx.delete(ref);
      links.forEach((link) => {
        if (link.exists() && link.data()['familyId'] === familyId) tx.delete(link.ref);
      });
    });
  }
}
