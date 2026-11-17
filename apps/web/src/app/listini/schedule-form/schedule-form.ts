import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  draftToSchedule,
  scheduleToDraft,
  type AgeBand,
  type DraftField,
  type FeeSchedule,
  type FieldIssue,
  type FieldIssueCode,
  type ScheduleDraft,
} from '@tesseramento/fees';
import { ageRange, BAND_NAMES } from '../format';

const ISSUE_MESSAGES: Readonly<Record<FieldIssueCode, string>> = {
  required: 'Inserisci un importo.',
  notNumber: 'Inserisci un importo valido, per esempio 26,00.',
  tooManyDecimals: 'Usa al massimo due decimali.',
  notPositive: "L'importo deve essere maggiore di zero.",
  discountedAboveFull: 'La quota con sconto non può superare la quota piena.',
};

/**
 * Modulo con le quote in euro (nuovo listino e modifica). Mostra le regole del PDF in sola
 * lettura: età delle fasce, età minima e massimo del nucleo non si possono cambiare qui.
 */
@Component({
  selector: 'app-schedule-form',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (submit)="submit($event)" novalidate>
      @for (band of base().bands; track band.band) {
        <fieldset>
          <legend>{{ names[band.band] }} <small>({{ range(band) }} anni)</small></legend>
          <div class="field">
            <label [for]="id(band.band + '.full')">Quota piena</label>
            <span class="input-row">
              <input
                [id]="id(band.band + '.full')"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                [attr.data-field]="band.band + '.full'"
                [value]="draft().bands[band.band].full"
                (input)="setBand(band.band, 'full', $event)"
              />
              <span aria-hidden="true">€</span>
            </span>
            <span class="error" role="alert" [attr.data-error-for]="band.band + '.full'">{{
              error(band.band + '.full')
            }}</span>
          </div>
          <div class="field">
            <label [for]="id(band.band + '.discounted')">Quota con sconto del 20%</label>
            <span class="input-row">
              <input
                [id]="id(band.band + '.discounted')"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                [attr.data-field]="band.band + '.discounted'"
                [value]="draft().bands[band.band].discounted"
                (input)="setBand(band.band, 'discounted', $event)"
              />
              <span aria-hidden="true">€</span>
            </span>
            <span class="error" role="alert" [attr.data-error-for]="band.band + '.discounted'">{{
              error(band.band + '.discounted')
            }}</span>
          </div>
        </fieldset>
      }
      <fieldset>
        <legend>Pacchetto 2 ACR</legend>
        <div class="field">
          <label [for]="id('acrPackage')">Quota del pacchetto</label>
          <span class="input-row">
            <input
              [id]="id('acrPackage')"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              data-field="acrPackage"
              [value]="draft().acrPackage"
              (input)="setPackage($event)"
            />
            <span aria-hidden="true">€</span>
          </span>
          <span class="error" role="alert" data-error-for="acrPackage">{{ error('acrPackage') }}</span>
        </div>
      </fieldset>

      <section data-testid="rules" class="rules">
        <h2>Regole del PDF (non modificabili)</h2>
        <ul>
          <li>Età minima: {{ base().minAge }}</li>
          <li>Massimo componenti del nucleo: {{ base().maxHouseholdSize }}</li>
        </ul>
      </section>

      @if (errorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <div class="actions">
        <button mat-flat-button type="submit" [disabled]="busy()">Salva</button>
        <button mat-stroked-button type="button" (click)="cancelled.emit()">Annulla</button>
      </div>
    </form>
  `,
  styles: `
    form {
      max-width: 520px;
    }
    fieldset {
      margin: 0 0 16px;
      padding: 8px 12px 12px;
      border: 1px solid rgba(128, 128, 128, 0.4);
      border-radius: 8px;
      min-width: 0;
    }
    legend {
      font-weight: 500;
      padding: 0 4px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
    }
    .input-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    input {
      flex: 1;
      min-width: 0;
      padding: 8px;
      font: inherit;
      color: inherit;
      background: transparent;
      border: 1px solid rgba(128, 128, 128, 0.6);
      border-radius: 4px;
    }
    .error {
      color: #b3261e;
      min-height: 1.2em;
      font-size: 0.875rem;
    }
    .rules h2 {
      font-size: 1rem;
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  `,
})
export class ScheduleForm {
  /** Listino da cui prendere le regole fisse e i valori iniziali. */
  readonly base = input.required<FeeSchedule>();
  readonly errorMessage = input<string | null>(null);
  readonly busy = input(false);

  readonly save = output<ScheduleDraft>();
  readonly cancelled = output<void>();

  protected readonly names = BAND_NAMES;
  protected readonly range = ageRange;

  protected readonly draft = signal<ScheduleDraft>({
    acrPackage: '',
    bands: {
      acr: { full: '', discounted: '' },
      giovanissimi: { full: '', discounted: '' },
      giovani: { full: '', discounted: '' },
      adulti: { full: '', discounted: '' },
    },
  });
  private initial = '';
  private readonly issues = signal<readonly FieldIssue[]>([]);
  private readonly issueByField = computed(
    () => new Map<DraftField, FieldIssueCode>(this.issues().map((i) => [i.field, i.code])),
  );

  private static nextId = 0;
  private readonly prefix = `schedule-form-${ScheduleForm.nextId++}-`;

  constructor() {
    effect(() => {
      const initial = scheduleToDraft(this.base());
      this.draft.set(initial);
      this.initial = JSON.stringify(initial);
      this.issues.set([]);
    });
  }

  protected id(field: string): string {
    return this.prefix + field;
  }

  protected error(field: string): string {
    const code = this.issueByField().get(field as DraftField);
    return code ? ISSUE_MESSAGES[code] : '';
  }

  protected setBand(band: AgeBand, kind: 'full' | 'discounted', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((d) => ({ ...d, bands: { ...d.bands, [band]: { ...d.bands[band], [kind]: value } } }));
  }

  protected setPackage(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((d) => ({ ...d, acrPackage: value }));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const result = draftToSchedule(this.draft(), this.base());
    if (!result.ok) {
      this.issues.set(result.issues);
      return;
    }
    this.issues.set([]);
    this.save.emit(this.draft());
  }

  /** Vero se ci sono modifiche non ancora salvate (per l'avviso di uscita, FR-014). */
  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.draft()) !== this.initial;
  }
}
