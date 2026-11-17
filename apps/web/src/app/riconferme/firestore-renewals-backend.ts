import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, type Timestamp } from 'firebase/firestore';
import type { FeeSchedule } from '@tesseramento/fees';
import type { RenewalDraft, YearMember } from '@tesseramento/families';
import { sectorOf } from '@tesseramento/import';
import { db } from '../core/firebase';
import { memberYears } from '../core/member-years';
import { FirestoreFamiliesBackend } from '../famiglie/firestore-families-backend';
import { FirestoreFeeScheduleBackend } from '../listini/firestore-fee-schedule-backend';
import {
  AlreadyRenewedError,
  PartialRenewalError,
  RENEWAL_GROUP_SIZE,
  RenewalInFamilyError,
  type RenewalInfo,
  type RenewalsBackend,
} from './renewals-backend';

const adhesionId = (year: number, personId: string) => `${year}_${personId}`;

/** Riconferme in Cloud Firestore (specifica 008, contracts/firestore-renewals.md). Nessun nome salvato né nei log. */
export class FirestoreRenewalsBackend implements RenewalsBackend {
  private readonly families = new FirestoreFamiliesBackend();
  private readonly schedules = new FirestoreFeeScheduleBackend();

  memberYears(): Promise<number[]> {
    return memberYears();
  }

  yearMembers(year: number): Promise<YearMember[]> {
    return this.families.yearMembers(year);
  }

  memberships(year: number): Promise<Map<string, string>> {
    return this.families.memberships(year);
  }

  async schedule(year: number): Promise<FeeSchedule | undefined> {
    return (await this.schedules.get(year))?.schedule;
  }

  async renewals(year: number): Promise<Map<string, RenewalInfo>> {
    const snapshot = await getDocs(
      query(collection(db, 'adhesions'), where('associationYear', '==', year), where('origin', '==', 'riconferma')),
    );
    return new Map(
      snapshot.docs.map((d) => {
        const data = d.data();
        return [
          String(data['personId']),
          {
            renewedAt: (data['renewedAt'] as Timestamp | null)?.toDate() ?? new Date(0),
            renewedBy: String(data['renewedBy']),
          },
        ];
      }),
    );
  }

  /**
   * Gruppi di 15 (research R5): ogni gruppo è una transazione che prima rilegge le adesioni dell'anno nuovo delle
   * persone del gruppo (una già presente → nulla salvato del gruppo) e poi le crea. Senza connessione fallisce invece
   * di restare in coda.
   */
  async renew(drafts: readonly RenewalDraft[], email: string, paidOn?: string): Promise<void> {
    const by = email.trim().toLowerCase();
    let saved = 0;
    for (let i = 0; i < drafts.length; i += RENEWAL_GROUP_SIZE) {
      const chunk = drafts.slice(i, i + RENEWAL_GROUP_SIZE);
      try {
        await runTransaction(db, async (tx) => {
          const refs = chunk.map((d) => doc(db, 'adhesions', adhesionId(d.associationYear, d.personId)));
          const existing = await Promise.all(refs.map((r) => tx.get(r)));
          if (existing.some((s) => s.exists())) throw new AlreadyRenewedError();
          chunk.forEach((d, j) => {
            tx.set(refs[j]!, {
              personId: d.personId,
              associationYear: d.associationYear,
              origin: 'riconferma',
              list: d.list,
              sector: sectorOf(d.list),
              ...(d.bond ? { bond: d.bond } : {}),
              ...(d.bondId ? { bondId: d.bondId } : {}),
              renewedFrom: d.associationYear - 1,
              renewedAt: serverTimestamp(),
              renewedBy: by,
              // Conferma = pagato (specifica 013).
              ...(paidOn ? { paidOn, paidAt: serverTimestamp(), paidBy: by } : {}),
            });
          });
        });
        saved += chunk.length;
      } catch (error) {
        if (saved > 0 && !(error instanceof AlreadyRenewedError)) throw new PartialRenewalError(saved);
        throw error;
      }
    }
  }

  /** Transazione: senza connessione fallisce; con un'appartenenza dell'anno la riconferma resta. */
  async undo(year: number, personId: string): Promise<void> {
    await runTransaction(db, async (tx) => {
      const membership = await tx.get(doc(db, 'familyMemberships', adhesionId(year, personId)));
      if (membership.exists()) throw new RenewalInFamilyError();
      tx.delete(doc(db, 'adhesions', adhesionId(year, personId)));
    });
  }

  async hasSavedFee(year: number, personId: string): Promise<boolean> {
    return (await getDoc(doc(db, 'householdFees', `${year}_p-${personId}`))).exists();
  }
}
