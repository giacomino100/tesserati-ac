import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where, type Timestamp } from 'firebase/firestore';
import type { FeeSchedule } from '@tesseramento/fees';
import { ADHESION_LISTS, listOfAdhesion, sectorOf, type AdhesionList } from '@tesseramento/import';
import { db } from '../core/firebase';
import { memberYears } from '../core/member-years';
import { FirestoreFeeScheduleBackend } from '../listini/firestore-fee-schedule-backend';
import type { ListChange, ListChangeRequest, MemberRow, MembersBackend } from './members-backend';

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

const isList = (v: unknown): v is AdhesionList => ADHESION_LISTS.some((l) => l === v);

function listChangeOf(value: unknown): ListChange | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const v = value as Record<string, unknown>;
  if (!isList(v['from'])) return undefined;
  const note = text(v['note']);
  return {
    from: v['from'],
    at: (v['at'] as Timestamp | null)?.toDate() ?? new Date(0),
    by: String(v['by']),
    ...(note ? { note } : {}),
  };
}

/** Più di così in una transazione si va oltre le 500 scritture. */
const GROUP = 400;

/** Tesserati in Cloud Firestore (FR-019 della 004; cambio di elenco della 011, contracts/firestore-list-change.md). */
export class FirestoreMembersBackend implements MembersBackend {
  private readonly schedules = new FirestoreFeeScheduleBackend();

  /** Anni con tesserati: importati o riconfermati / inseriti a mano (specifiche 008 e 009). */
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
      const personId = String(a['personId']);
      const person = byId.get(personId);
      const list = listOfAdhesion(text(a['importId']), text(a['list']));
      if (!person || !list) continue;
      const exportSector = text(a['exportSector']);
      const exportAgeBand = text(a['exportAgeBand']);
      const bond = text(a['bond']);
      const bondId = text(a['bondId']);
      const listChange = listChangeOf(a['listChange']);
      rows.push({
        adhesionId: adhesion.id,
        personId,
        lastName: String(person['lastName']),
        firstName: String(person['firstName']),
        birthDate: String(person['birthDate']),
        list,
        sector: String(a['sector']),
        imported: typeof a['importId'] === 'string',
        ...(exportSector ? { exportSector } : {}),
        ...(exportAgeBand ? { exportAgeBand } : {}),
        ...(bond ? { bond } : {}),
        ...(bondId ? { bondId } : {}),
        ...(listChange ? { listChange } : {}),
      });
    }
    return rows;
  }

  async schedule(year: number): Promise<FeeSchedule | undefined> {
    return (await this.schedules.get(year))?.schedule;
  }

  /**
   * Transazioni di al massimo 400 adesioni (research R6): rilegge ogni adesione, poi aggiorna solo elenco, settore,
   * settore dell'export (al primo cambio di un'adesione importata) e ultimo cambio. Senza connessione fallisce.
   */
  async changeList(changes: readonly ListChangeRequest[], email: string): Promise<void> {
    const by = email.trim().toLowerCase();
    for (let i = 0; i < changes.length; i += GROUP) {
      const chunk = changes.slice(i, i + GROUP);
      await runTransaction(db, async (tx) => {
        const refs = chunk.map((c) => doc(db, 'adhesions', c.adhesionId));
        const snaps = await Promise.all(refs.map((r) => tx.get(r)));
        chunk.forEach((change, j) => {
          const data = snaps[j]!.data();
          if (!data) throw new Error('adhesion-not-found');
          const from = listOfAdhesion(text(data['importId']), text(data['list']));
          if (!from) throw new Error('adhesion-without-list');
          const keepExportSector =
            typeof data['importId'] === 'string' && data['exportSector'] === undefined ? { exportSector: data['sector'] } : {};
          tx.update(refs[j]!, {
            list: change.to,
            sector: sectorOf(change.to),
            ...keepExportSector,
            listChange: {
              from,
              at: serverTimestamp(),
              by,
              ...(change.note ? { note: change.note } : {}),
            },
          });
        });
      });
    }
  }
}
