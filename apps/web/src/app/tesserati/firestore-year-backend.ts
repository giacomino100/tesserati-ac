import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { FeeSchedule } from '@tesseramento/fees';
import type { ConfirmedFamily, RenewalDraft, YearMember } from '@tesseramento/families';
import { db } from '../core/firebase';
import { memberYears } from '../core/member-years';
import type { FamilyDraft } from '../famiglie/families-backend';
import { FirestoreFamiliesBackend } from '../famiglie/firestore-families-backend';
import { FirestoreFeeScheduleBackend } from '../listini/firestore-fee-schedule-backend';
import { FirestoreRenewalsBackend } from '../riconferme/firestore-renewals-backend';
import { FirestoreMembersBackend } from './firestore-members-backend';
import type { ListChangeRequest } from './members-backend';
import type { YearBackend } from './year-backend';

const adhesionId = (year: number, personId: string) => `${year}_${personId}`;

/** Pagina Tesserati in Cloud Firestore (specifica 013): compone i backend di 007, 008, 011 e aggiunge pagamento e famiglia. */
export class FirestoreYearBackend implements YearBackend {
  private readonly families = new FirestoreFamiliesBackend();
  private readonly renewals = new FirestoreRenewalsBackend();
  private readonly members = new FirestoreMembersBackend();
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

  confirmedFamilies(year: number): Promise<ConfirmedFamily[]> {
    return this.families.confirmedFamilies(year);
  }

  async schedule(year: number): Promise<FeeSchedule | undefined> {
    return (await this.schedules.get(year))?.schedule;
  }

  renew(drafts: readonly RenewalDraft[], paidOn: string, email: string): Promise<void> {
    return this.renewals.renew(drafts, email, paidOn);
  }

  undo(year: number, personId: string): Promise<void> {
    return this.renewals.undo(year, personId);
  }

  hasSavedFee(year: number, personId: string): Promise<boolean> {
    return this.renewals.hasSavedFee(year, personId);
  }

  /** Transazione: senza connessione fallisce invece di restare in coda; aggiorna solo i tre campi del pagamento. */
  async registerPayment(year: number, personIds: readonly string[], paidOn: string, email: string): Promise<void> {
    const by = email.trim().toLowerCase();
    await runTransaction(db, async (tx) => {
      for (const personId of personIds) {
        tx.update(doc(db, 'adhesions', adhesionId(year, personId)), { paidOn, paidAt: serverTimestamp(), paidBy: by });
      }
    });
  }

  confirmFamily(draft: FamilyDraft, email: string): Promise<void> {
    return this.families.confirm([draft], email);
  }

  dissolveFamily(familyId: string): Promise<void> {
    return this.families.dissolve(familyId);
  }

  async setFamilyOptOut(year: number, personId: string, value: boolean): Promise<void> {
    await runTransaction(db, async (tx) => {
      tx.update(doc(db, 'adhesions', adhesionId(year, personId)), { familyOptOut: value });
    });
  }

  changeList(changes: readonly ListChangeRequest[], email: string): Promise<void> {
    return this.members.changeList(changes, email);
  }
}
