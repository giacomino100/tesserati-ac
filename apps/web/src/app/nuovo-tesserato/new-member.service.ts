import { Injectable, computed, inject, signal } from '@angular/core';
import { ageFor, bandForAge, labelFor } from '@tesseramento/fees';
import { listForBand, type FamilyList } from '@tesseramento/families';
import {
  listLabel,
  matchNewMember,
  resolveSimilar,
  validateNewMember,
  type ArchivedPerson,
  type NewMemberErrors,
  type NewMemberInput,
  type NewMemberMatch,
} from '@tesseramento/import';
import { AuthService } from '../core/auth.service';
import { italianDate } from '../importa/format';
import {
  AlreadyEnrolledError,
  NEW_MEMBER_BACKEND,
  RenewableError,
  type NewMemberContext,
} from './new-member-backend';

export const NEW_MEMBER_MESSAGES = {
  load: 'Impossibile leggere l’archivio. Controlla la connessione e riprova.',
  saveFailed: 'Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.',
} as const;

const EMPTY: NewMemberInput = { lastName: '', firstName: '', birthDate: '', sex: '', taxCode: '' };

/**
 * Modulo "Nuovo tesserato" (specifica 009): campi, età ed elenco dell'anno, ricerca in archivio (regole di
 * `regole-famiglia.md` §2), iscrizione. Un'istanza per modulo aperto (fornita dal componente).
 */
@Injectable()
export class NewMemberService {
  private readonly backend = inject(NEW_MEMBER_BACKEND);
  private readonly auth = inject(AuthService);

  readonly year = signal(0);
  readonly fields = signal<NewMemberInput>(EMPTY);
  readonly submitted = signal(false);
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  /** Scelta su un possibile doppione: ID della persona ("Stessa persona") o 'new' ("Persona diversa"). */
  readonly choice = signal<string | null>(null);
  private readonly context = signal<NewMemberContext | null>(null);

  private readonly validation = computed(() => validateNewMember(this.fields(), this.year()));

  readonly errors = computed<NewMemberErrors>(() => {
    const v = this.validation();
    return this.submitted() && !v.ok ? v.errors : {};
  });

  readonly scheduleMissing = computed(() =>
    this.context() && !this.context()!.schedule
      ? `Manca il listino ${labelFor(this.year())}. Crealo nella sezione Listini.`
      : '',
  );

  /** Età ed elenco dell'anno, se la data è valida e c'è il listino. */
  private readonly placement = computed<{ age: number; list: FamilyList; underMin?: number } | null>(() => {
    const schedule = this.context()?.schedule;
    const v = this.validation();
    const birthDate = v.ok ? v.member.birthDate : this.fields().birthDate;
    if (!schedule || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    const age = ageFor(birthDate, this.year());
    if (age < 0) return null;
    const band = bandForAge(age, schedule);
    return band ? { age, list: listForBand(band) } : { age, list: 'ACR', underMin: schedule.minAge };
  });

  readonly ageText = computed(() => {
    const p = this.placement();
    return p ? `${p.age} anni · ${listLabel(p.list)}` : '';
  });

  readonly ageWarning = computed(() => {
    const p = this.placement();
    return p?.underMin !== undefined ? `Sotto l'età minima del listino (${p.underMin} anni): quota non prevista` : '';
  });

  private readonly rawMatch = computed<NewMemberMatch | null>(() => {
    const ctx = this.context();
    const v = this.validation();
    if (!ctx || !v.ok) return null;
    return matchNewMember(v.member, this.year(), ctx.archive, ctx.yearIds, ctx.previousYearIds);
  });

  /** Esito dopo l'eventuale scelta sul possibile doppione. */
  readonly match = computed<NewMemberMatch | null>(() => {
    const raw = this.rawMatch();
    const ctx = this.context();
    const choice = this.choice();
    if (raw?.kind !== 'similar' || !ctx || choice === null) return raw;
    if (choice === 'new') return { kind: 'new' };
    return resolveSimilar(choice, this.year(), ctx.archive, ctx.yearIds, ctx.previousYearIds);
  });

  readonly candidateTexts = computed(() => {
    const raw = this.rawMatch();
    return raw?.kind === 'similar' ? raw.candidates.map((p) => ({ id: p.id, text: this.personText(p) })) : [];
  });

  readonly statusText = computed(() => {
    const m = this.match();
    if (!m) return '';
    switch (m.kind) {
      case 'new':
        return '';
      case 'similar':
        return 'Possibile doppione:';
      case 'existing':
        if (m.by === 'taxCode') {
          return `Già in archivio con questo codice fiscale: ${m.person.lastName} ${m.person.firstName}, ${italianDate(m.person.birthDate)}.`;
        }
        return m.person.lastAdhesion
          ? `Già in archivio: ultima adesione nel ${labelFor(m.person.lastAdhesion.year)}. Verrà usata questa persona.`
          : 'Già in archivio. Verrà usata questa persona.';
      case 'renewable':
        return `Ha un'adesione nel ${labelFor(m.previousYear)}: usa Riconferme.`;
      case 'alreadyInYear':
        return this.alreadyText();
    }
  });

  readonly showRenewalsLink = computed(() => this.match()?.kind === 'renewable');

  readonly canSave = computed(() => {
    const m = this.match();
    const blocked = m?.kind === 'similar' || m?.kind === 'renewable' || m?.kind === 'alreadyInYear';
    return !!this.context()?.schedule && !this.busy() && !blocked && (!this.validation().ok || !!this.placement());
  });

  async open(year: number): Promise<void> {
    this.year.set(year);
    this.fields.set(EMPTY);
    this.submitted.set(false);
    this.choice.set(null);
    this.message.set(null);
    this.context.set(null);
    try {
      this.context.set(await this.backend.context(year));
    } catch {
      this.message.set(NEW_MEMBER_MESSAGES.load);
    }
  }

  set(field: keyof NewMemberInput, value: string): void {
    this.fields.set({ ...this.fields(), [field]: value });
    this.choice.set(null);
    this.message.set(null);
  }

  choose(choice: string): void {
    this.choice.set(choice);
  }

  /** Iscrive; true se salvato. Con campi non validi mostra gli errori e non salva. */
  async save(): Promise<boolean> {
    this.submitted.set(true);
    const v = this.validation();
    const m = this.match();
    const p = this.placement();
    if (!v.ok || !m || !p || !this.canSave()) return false;
    const year = this.year();
    const entry =
      m.kind === 'existing'
        ? { year, list: p.list, personId: m.person.id }
        : { year, list: p.list, member: v.member };
    this.busy.set(true);
    try {
      await this.backend.add(entry, this.auth.user()?.email ?? '');
      this.message.set(`Iscrizione salvata: ${v.member.lastName} ${v.member.firstName} nel ${labelFor(year)}.`);
      return true;
    } catch (error) {
      this.message.set(
        error instanceof AlreadyEnrolledError
          ? this.alreadyText()
          : error instanceof RenewableError
            ? `Ha un'adesione nel ${labelFor(year - 1)}: usa Riconferme.`
            : NEW_MEMBER_MESSAGES.saveFailed,
      );
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  private alreadyText(): string {
    return `Ha già un'adesione nel ${labelFor(this.year())}.`;
  }

  private personText(p: ArchivedPerson): string {
    const last = p.lastAdhesion ? ` (ultima adesione ${labelFor(p.lastAdhesion.year)})` : '';
    return `${p.lastName} ${p.firstName}, ${italianDate(p.birthDate)}${last}`;
  }
}
