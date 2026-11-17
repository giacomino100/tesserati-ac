import { ChangeDetectionStrategy, Component, effect, inject, input, output, PendingTasks } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { labelFor } from '@tesseramento/fees';
import type { NewMemberInput } from '@tesseramento/import';
import { NewMemberService } from './new-member.service';

/** Modulo "Nuovo tesserato" (specifica 009), usato da Tesserati e Riconferme. */
@Component({
  selector: 'app-new-member-form',
  imports: [MatButtonModule, RouterLink],
  providers: [NewMemberService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="form" data-testid="new-member" aria-label="Nuovo tesserato">
      <h2>Nuovo tesserato nel {{ label(year()) }}</h2>
      @if (service.scheduleMissing(); as missing) {
        <p class="warning">{{ missing }} <a routerLink="/listini">Listini</a></p>
      }
      <div class="fields">
        <label>
          Cognome *
          <input name="lastName" autocomplete="off" [value]="service.fields().lastName" (input)="on('lastName', $event)" />
          @if (service.errors().lastName; as e) {
            <span class="error">{{ e }}</span>
          }
        </label>
        <label>
          Nome *
          <input name="firstName" autocomplete="off" [value]="service.fields().firstName" (input)="on('firstName', $event)" />
          @if (service.errors().firstName; as e) {
            <span class="error">{{ e }}</span>
          }
        </label>
        <label>
          Data di nascita *
          <input name="birthDate" type="date" [value]="service.fields().birthDate" (input)="on('birthDate', $event)" />
          @if (service.errors().birthDate; as e) {
            <span class="error">{{ e }}</span>
          }
        </label>
        <label>
          Sesso
          <select name="sex" [value]="service.fields().sex" (change)="on('sex', $event)">
            <option value="">—</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </label>
        <label>
          Codice fiscale
          <input name="taxCode" autocomplete="off" maxlength="16" [value]="service.fields().taxCode" (input)="on('taxCode', $event)" />
          @if (service.errors().taxCode; as e) {
            <span class="error">{{ e }}</span>
          }
        </label>
      </div>
      @if (service.ageText(); as age) {
        <p class="age">{{ age }}</p>
      }
      @if (service.ageWarning(); as w) {
        <p class="warning">{{ w }}</p>
      }
      @if (service.statusText(); as status) {
        <p role="status">
          {{ status }}
        </p>
      }
      @if (service.candidateTexts().length > 0 && service.choice() === null) {
        <ul class="candidates">
          @for (c of service.candidateTexts(); track c.id) {
            <li>
              {{ c.text }}
              <button mat-stroked-button type="button" (click)="service.choose(c.id)">Stessa persona</button>
            </li>
          }
        </ul>
        <button mat-stroked-button type="button" (click)="service.choose('new')">Persona diversa</button>
      }
      @if (service.message(); as m) {
        <p role="alert">{{ m }}</p>
      }
      <div class="actions">
        <button mat-flat-button type="button" [disabled]="!service.canSave()" (click)="save()">Iscrivi</button>
        <button mat-stroked-button type="button" (click)="closed.emit()">Chiudi</button>
      </div>
    </section>
  `,
  styles: `
    .form {
      border: 1px solid rgba(128, 128, 128, 0.35);
      border-radius: 8px;
      padding: 12px;
      margin: 12px 0;
      overflow-wrap: anywhere;
    }
    h2 {
      font-size: 1.15rem;
      margin: 0 0 8px;
    }
    .fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px 12px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    input,
    select {
      font: inherit;
      padding: 4px 8px;
      max-width: 100%;
    }
    .error,
    .warning {
      color: #b3261e;
    }
    .candidates {
      padding-left: 20px;
    }
    .candidates li,
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 6px 0;
    }
  `,
})
export class NewMemberForm {
  protected readonly service = inject(NewMemberService);
  private readonly pendingTasks = inject(PendingTasks);

  readonly year = input.required<number>();
  /** Giorno del pagamento (specifica 013): l'iscrizione vale come pagamento. */
  readonly paidOn = input('');
  /** Messaggio di iscrizione riuscita. */
  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly label = labelFor;

  constructor() {
    effect(() => {
      const year = this.year();
      this.pendingTasks.run(() => this.service.open(year));
    });
    effect(() => this.service.paidOn.set(this.paidOn()));
  }

  protected on(field: keyof NewMemberInput, event: Event): void {
    this.service.set(field, (event.target as HTMLInputElement | HTMLSelectElement).value);
  }

  protected save(): void {
    this.pendingTasks.run(async () => {
      if (await this.service.save()) this.saved.emit(this.service.message() ?? '');
    });
  }
}
