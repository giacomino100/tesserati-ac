import { Injectable, computed, inject, signal } from '@angular/core';
import { formatEuros, labelFor, parseEuros, type FeeSchedule } from '@tesseramento/fees';
import {
  compareWithSaved,
  householdFees,
  householdsOfYear,
  suggestFamilies,
  toSavedCalculated,
  yearTotals,
  type ConfirmedFamily,
  type FeeComparison,
  type FeeLine,
  type FeeOutcome,
  type Household,
  type HouseholdFee,
  type SavedHouseholdFee,
  type YearMember,
} from '@tesseramento/families';
import { AuthService } from '../core/auth.service';
import { FAMILIES_BACKEND } from '../famiglie/families-backend';
import { FEE_SCHEDULE_BACKEND } from '../listini/fee-schedule-backend';
import { HOUSEHOLD_FEES_BACKEND, type HouseholdFeeEntry } from './fees-backend';

export const FEES_MESSAGES = {
  load: 'Impossibile leggere le quote. Controlla la connessione e riprova.',
  saveFailed: 'Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.',
  noteRequired: 'Scrivi una nota che spieghi la quota.',
  negative: "L'importo non può essere negativo.",
} as const;

const MONEY_ERRORS = {
  required: 'Inserisci un importo.',
  notNumber: 'Inserisci un importo valido, per esempio 26,00.',
  tooManyDecimals: 'Usa al massimo due decimali.',
} as const;

const BAND_LABEL: Record<FeeLine['band'], string> = {
  acr: 'ACR',
  giovanissimi: 'Giovanissimi',
  giovani: 'Giovani',
  adulti: 'Adulti',
};
const BENEFIT_LABEL: Record<FeeLine['benefit'], string> = {
  none: '—',
  discount20: 'sconto 20%',
  free: 'gratis',
  inAcrPackage: 'pacchetto 2 ACR',
};

export type ManualSaveResult = 'saved' | 'invalid' | 'confirmZero' | 'failed';

function dateText(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

/** Importo della quota manuale: come `parseEuros` della 003, ma ammette 0 (chiarimento della 010). */
function parseManualEuros(text: string): { ok: true; cents: number } | { ok: false; message: string } {
  const trimmed = text.trim();
  if (/^0+(?:[.,]0{1,2})?$/.test(trimmed)) return { ok: true, cents: 0 };
  if (/^-/.test(trimmed) && parseEuros(trimmed.slice(1)).ok) return { ok: false, message: FEES_MESSAGES.negative };
  const result = parseEuros(trimmed);
  if (result.ok) return result;
  return { ok: false, message: result.code === 'notPositive' ? FEES_MESSAGES.negative : MONEY_ERRORS[result.code] };
}

/**
 * Quote dei nuclei dell'anno (specifica 010): calcolo della 002 con il listino dell'anno, quote manuali per i non
 * previsti, quote salvate che cambiano solo su richiesta. Nessun importo nel codice: solo il listino.
 */
@Injectable({ providedIn: 'root' })
export class FeesService {
  private readonly families = inject(FAMILIES_BACKEND);
  private readonly schedules = inject(FEE_SCHEDULE_BACKEND);
  private readonly fees = inject(HOUSEHOLD_FEES_BACKEND);
  private readonly auth = inject(AuthService);

  readonly years = signal<number[]>([]);
  readonly year = signal(0);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  private readonly members = signal<YearMember[]>([]);
  private readonly confirmed = signal<ConfirmedFamily[]>([]);
  private readonly memberships = signal<Map<string, string>>(new Map());
  private readonly schedule = signal<FeeSchedule | null>(null);
  private readonly saved = signal<SavedHouseholdFee[]>([]);

  // Quota manuale in modifica.
  readonly manualKey = signal<string | null>(null);
  readonly manualEuros = signal('');
  readonly manualNote = signal('');
  readonly manualErrors = signal<{ euros?: string; note?: string }>({});

  readonly hasMembers = computed(() => this.members().length > 0);
  private readonly byId = computed(() => new Map(this.members().map((m) => [m.personId, m])));

  private readonly householdsView = computed(() =>
    householdsOfYear(suggestFamilies(this.members(), this.confirmed(), this.memberships())),
  );

  readonly comparisons = computed<FeeComparison[]>(() => {
    const schedule = this.schedule();
    if (!schedule) return [];
    return compareWithSaved(householdFees(this.householdsView().households, schedule, this.year()), this.saved());
  });

  readonly totals = computed(() => yearTotals(this.comparisons()));

  readonly scheduleMissing = computed(() =>
    this.hasMembers() && !this.schedule() ? `Manca il listino ${labelFor(this.year())}. Crealo nella sezione Listini.` : '',
  );

  readonly totalsText = computed(() => {
    const t = this.totals();
    const base = `Totale ${labelFor(this.year())}: ${formatEuros(t.totalCents)} € · ${t.calculated} nuclei calcolati · ${t.manual} quote manuali · ${t.missing} nuclei da decidere`;
    return this.saved().length > 0 && t.savedTotalCents !== t.totalCents
      ? `${base} · Totale salvato: ${formatEuros(t.savedTotalCents)} €`
      : base;
  });

  readonly unconfirmedText = computed(() => {
    const n = this.householdsView().unconfirmedSuggested;
    return n > 0 ? `${n} famiglie suggerite non confermate: i loro componenti sono calcolati come singoli.` : '';
  });

  readonly savedInfo = computed(() => {
    const saved = this.saved();
    if (saved.length === 0) return 'Quote non ancora salvate';
    const last = saved.reduce((a, b) => (b.savedAt > a.savedAt ? b : a));
    return `Ultimo salvataggio il ${dateText(last.savedAt)} da ${last.savedBy}`;
  });

  readonly updateText = computed(() => {
    const n = this.totals().toUpdate;
    return this.saved().length > 0 && n > 0 ? `Quote da ricalcolare: ${n} nuclei sono cambiati.` : '';
  });

  async load(year?: number): Promise<void> {
    this.loading.set(true);
    try {
      const years = [...(await this.families.importedYears())].sort((a, b) => b - a);
      this.years.set(years);
      const chosen = year !== undefined && years.includes(year) ? year : years[0];
      this.year.set(chosen ?? year ?? 0);
      if (chosen === undefined) {
        this.members.set([]);
        return;
      }
      const [members, confirmed, memberships, stored, saved] = await Promise.all([
        this.families.yearMembers(chosen),
        this.families.confirmedFamilies(chosen),
        this.families.memberships(chosen),
        this.schedules.get(chosen),
        this.fees.saved(chosen),
      ]);
      this.members.set(members);
      this.confirmed.set(confirmed);
      this.memberships.set(memberships);
      this.schedule.set(stored?.schedule ?? null);
      this.saved.set(saved);
    } catch {
      this.message.set(FEES_MESSAGES.load);
    } finally {
      this.loading.set(false);
    }
  }

  // ---- Testi (solo a schermo) ----

  name(personId: string): string {
    const m = this.byId().get(personId);
    return m ? `${m.lastName} ${m.firstName}` : personId;
  }

  title(household: Household): string {
    const first = household.members[0];
    const name = first ? `${first.lastName} ${first.firstName}` : '';
    if (!household.familyId) return name;
    return household.bondId ? `Famiglia di ${name} · N. Legame ${household.bondId}` : `Famiglia di ${name}`;
  }

  lines(fee: HouseholdFee): string[] {
    if (fee.outcome.kind !== 'calculated') return [];
    return fee.outcome.lines.map(
      (l) =>
        `${this.name(l.memberId)} · ${l.age} anni · ${BAND_LABEL[l.band]} · ${formatEuros(l.fullCents)} € · ${BENEFIT_LABEL[l.benefit]} · ${
          l.amountCents === undefined ? '—' : `${formatEuros(l.amountCents)} €`
        }`,
    );
  }

  packageText(fee: HouseholdFee): string {
    return fee.outcome.kind === 'calculated' && fee.outcome.acrPackageCents !== undefined
      ? `Pacchetto 2 ACR · ${formatEuros(fee.outcome.acrPackageCents)} €`
      : '';
  }

  totalText(fee: HouseholdFee): string {
    return fee.outcome.kind === 'calculated' ? `${formatEuros(fee.outcome.totalCents)} €` : '';
  }

  reasonText(outcome: FeeOutcome): string {
    if (outcome.kind === 'error') return 'Impossibile calcolare: dati incoerenti, contatta chi gestisce il progetto.';
    if (outcome.kind !== 'notCovered') return '';
    switch (outcome.reason) {
      case 'householdTooLarge':
        return 'Non previsto dal listino: il nucleo ha più di 4 persone.';
      case 'memberUnderMinAge':
        return `Non previsto dal listino: c'è un componente sotto i ${this.schedule()?.minAge ?? ''} anni.`;
      case 'invalidInput':
        return "Non previsto dal listino: data di nascita incoerente con l'anno.";
    }
  }

  changeText(c: FeeComparison): string {
    if (c.status !== 'changed' || !c.saved) return '';
    const now = c.current?.outcome.kind === 'calculated' ? `${formatEuros(c.current.outcome.totalCents)} €` : 'da decidere';
    return `Salvata: ${formatEuros(c.saved.totalCents)} € · Ora: ${now}`;
  }

  manualText(saved: SavedHouseholdFee): string {
    return `Quota manuale: ${formatEuros(saved.totalCents)} € — ${saved.note ?? ''} — inserita il ${dateText(saved.savedAt)} da ${saved.savedBy}`;
  }

  // ---- Salvataggio (US3) ----

  /** "Salva le quote dell'anno" e "Aggiorna tutte": tutti i nuclei nuovi o cambiati, via quelli spariti. */
  async updateAll(): Promise<void> {
    await this.persist(this.comparisons().filter((c) => c.status !== 'unchanged'));
  }

  /** "Aggiorna questa quota". */
  async updateOne(key: string): Promise<void> {
    await this.persist(this.comparisons().filter((c) => c.key === key));
  }

  // ---- Quota manuale (US2) ----

  startManual(key: string): void {
    const saved = this.saved().find((s) => s.key === key && s.kind === 'manual');
    this.manualKey.set(key);
    this.manualEuros.set(saved ? formatEuros(saved.totalCents) : '');
    this.manualNote.set(saved?.note ?? '');
    this.manualErrors.set({});
  }

  cancelManual(): void {
    this.manualKey.set(null);
    this.manualErrors.set({});
  }

  hasUnsavedChanges(): boolean {
    return this.manualKey() !== null;
  }

  async saveManual(confirmedZero = false): Promise<ManualSaveResult> {
    const key = this.manualKey();
    const comparison = this.comparisons().find((c) => c.key === key);
    const outcome = comparison?.current?.outcome;
    if (!key || !comparison?.current || outcome?.kind !== 'notCovered') return 'invalid';
    const amount = parseManualEuros(this.manualEuros());
    const note = this.manualNote().trim();
    const errors = {
      ...(amount.ok ? {} : { euros: amount.message }),
      ...(note ? {} : { note: FEES_MESSAGES.noteRequired }),
    };
    this.manualErrors.set(errors);
    if (!amount.ok || !note) return 'invalid';
    if (amount.cents === 0 && !confirmedZero) return 'confirmZero';
    const entry: HouseholdFeeEntry = {
      key,
      associationYear: this.year(),
      memberIds: comparison.current.household.members.map((m) => m.personId),
      kind: 'manual',
      manualCents: amount.cents,
      note,
      reason: outcome.reason,
      totalCents: amount.cents,
    };
    const ok = await this.write([entry], []);
    if (ok) this.manualKey.set(null);
    return ok ? 'saved' : 'failed';
  }

  // ---- Interni ----

  private async persist(comparisons: FeeComparison[]): Promise<void> {
    const entries: HouseholdFeeEntry[] = [];
    const removed: string[] = [];
    for (const c of comparisons) {
      if (c.status === 'removed') removed.push(c.key);
      else if (c.current?.outcome.kind === 'calculated') entries.push(toSavedCalculated(c.current, this.year()));
      // Nucleo diventato non previsto: la vecchia quota non vale più, si decide a mano.
      else if (c.saved && c.status === 'changed') removed.push(c.key);
    }
    if (entries.length === 0 && removed.length === 0) return;
    await this.write(entries, removed);
  }

  private async write(entries: HouseholdFeeEntry[], removed: string[]): Promise<boolean> {
    const email = this.auth.user()?.email;
    if (!email) return false;
    this.busy.set(true);
    try {
      await this.fees.save(entries, removed, this.year(), email);
      this.saved.set(await this.fees.saved(this.year()));
      this.message.set(null);
      return true;
    } catch {
      this.message.set(FEES_MESSAGES.saveFailed);
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
