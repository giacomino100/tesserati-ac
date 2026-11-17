import { ChangeDetectionStrategy, Component, inject, OnInit, PendingTasks, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { labelFor } from '@tesseramento/fees';
import { NewMemberForm } from '../../../nuovo-tesserato/new-member-form';
import { RenewalsService, type UndoRequest } from '../../renewals.service';

/** Riconferme dell'anno nuovo (specifica 008). */
@Component({
  selector: 'app-renewals-page',
  imports: [MatButtonModule, MatToolbarModule, NewMemberForm, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <a mat-button routerLink="/">← Home</a>
      <span class="title">Riconferme</span>
    </mat-toolbar>
    <main class="content">
      @if (service.loading() && service.year() === 0) {
        <p>Caricamento…</p>
      } @else if (service.years().length === 0) {
        <p>{{ service.noPrevious() }} <a routerLink="/importa">Importa Excel</a></p>
      } @else {
        <label class="year">
          Anno associativo
          <select [value]="service.year()" (change)="onYear($event)">
            @for (y of service.years(); track y) {
              <option [value]="y" [selected]="y === service.year()">{{ label(y) }}</option>
            }
          </select>
        </label>
        @if (service.message(); as message) {
          <p role="status">{{ message }}</p>
        }
        @if (service.noPrevious(); as none) {
          <p>{{ none }}</p>
        } @else {
          <p class="summary" data-testid="summary">{{ service.summary() }}</p>
          @if (service.scheduleMissing(); as missing) {
            <p class="warning">{{ missing }} <a routerLink="/listini">Listini</a></p>
          }

          @if (service.view().pendingCount > 0) {
            <div class="actions sticky">
              <label>
                <input type="checkbox" [checked]="service.allSelected()" [disabled]="!!service.scheduleMissing()" (change)="service.toggleAll()" />
                Seleziona tutti
              </label>
              <button mat-flat-button type="button" [disabled]="!service.canRenew()" (click)="run(service.renew())">
                Riconferma ({{ service.selectedCount() }})
              </button>
            </div>

            @for (g of service.view().groups; track g.bondId) {
              <section class="group" data-testid="group">
                <label class="group-head">
                  <input
                    type="checkbox"
                    data-testid="group-check"
                    [checked]="service.groupState(g) === 'all'"
                    [indeterminate]="service.groupState(g) === 'some'"
                    [disabled]="!!service.scheduleMissing()"
                    (change)="service.toggleGroup(g)"
                  />
                  <strong>{{ service.groupTitle(g) }}</strong> · tutto il nucleo
                </label>
                <ul class="plain">
                  @for (c of g.candidates; track c.member.personId) {
                    <li>
                      <label>
                        <input type="checkbox" [checked]="service.isSelected(c.member.personId)" [disabled]="!c.renewable" (change)="service.toggle(c.member.personId)" />
                        {{ service.rowText(c) }}
                      </label>
                      @for (w of service.warningTexts(c); track $index) {
                        <span class="warning">{{ w }}</span>
                      }
                    </li>
                  }
                </ul>
              </section>
            }

            @if (service.view().singles.length > 0) {
              <section class="group" data-testid="singles">
                <h2>Senza N. Legame</h2>
                <ul class="plain">
                  @for (c of service.view().singles; track c.member.personId) {
                    <li>
                      <label>
                        <input type="checkbox" [checked]="service.isSelected(c.member.personId)" [disabled]="!c.renewable" (change)="service.toggle(c.member.personId)" />
                        {{ service.rowText(c) }}
                      </label>
                      @for (w of service.warningTexts(c); track $index) {
                        <span class="warning">{{ w }}</span>
                      }
                    </li>
                  }
                </ul>
              </section>
            }
          }

          @if (service.view().renewed.length > 0) {
            <section data-testid="renewed">
              <h2>Già iscritti nel {{ label(service.year()) }}</h2>
              <ul class="plain">
                @for (r of service.view().renewed; track r.member.personId) {
                  <li>
                    <span>{{ service.renewedText(r) }}</span>
                    @if (r.undoable) {
                      <button mat-stroked-button type="button" [disabled]="service.busy()" (click)="run(service.startUndo(r.member.personId))">
                        Annulla riconferma
                      </button>
                    } @else if (service.blockedText(r); as blocked) {
                      <span class="note">{{ blocked }}</span>
                    }
                  </li>
                }
              </ul>
            </section>
          }

        }

        <section data-testid="new-members">
          <h2>{{ service.newTitle() }}</h2>
          @if (service.newMembers().length === 0) {
            <p>Nessuno.</p>
          } @else {
            <ul class="plain">
              @for (n of service.newMembers(); track n.member.personId) {
                <li>
                  <span>{{ service.newText(n) }}</span>
                  @if (n.undoable) {
                    <button mat-stroked-button type="button" [disabled]="service.busy()" (click)="run(service.startUndo(n.member.personId))">
                      Annulla iscrizione
                    </button>
                  } @else {
                    <span class="note">{{ service.newBlockedText(n) }}</span>
                  }
                </li>
              }
            </ul>
          }
          @if (adding()) {
            <app-new-member-form [year]="service.year()" (saved)="onSaved($event)" (closed)="adding.set(false)" />
          } @else {
            <button mat-stroked-button type="button" (click)="adding.set(true)">Nuovo tesserato</button>
          }
        </section>

        @if (service.undoing(); as undo) {
          <div role="alertdialog" class="dialog" [attr.aria-label]="undoLabel(undo)">
            <p>{{ undo.question }}</p>
            @if (undo.feeWarning) {
              <p class="warning">{{ undo.feeWarning }}</p>
            }
            <button mat-flat-button type="button" (click)="run(service.confirmUndo())">{{ undoLabel(undo) }}</button>
            <button mat-stroked-button type="button" (click)="service.cancelUndo()">Indietro</button>
          </div>
        }
      }
    </main>
  `,
  styles: `
    mat-toolbar {
      gap: 12px;
      flex-wrap: wrap;
      height: auto;
      min-height: 64px;
      padding: 8px 16px;
    }
    .title {
      font-weight: 500;
    }
    .content {
      padding: 16px;
      max-width: 840px;
    }
    .year,
    .actions,
    .dialog {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .sticky {
      position: sticky;
      top: 0;
      background: var(--mat-sys-surface, #fff);
      padding: 8px 0;
      z-index: 1;
    }
    select {
      font: inherit;
      padding: 4px 8px;
      max-width: 100%;
    }
    h2 {
      font-size: 1.15rem;
      margin: 20px 0 8px;
    }
    .group,
    .dialog {
      border: 1px solid rgba(128, 128, 128, 0.35);
      border-radius: 8px;
      padding: 12px;
      margin: 12px 0;
      overflow-wrap: anywhere;
    }
    .plain {
      list-style: none;
      padding: 0;
      margin: 4px 0;
    }
    .plain li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 12px;
      margin-bottom: 6px;
    }
    .warning {
      color: #b3261e;
    }
    .note {
      opacity: 0.85;
    }
  `,
})
export class RenewalsPage implements OnInit {
  protected readonly service = inject(RenewalsService);
  private readonly route = inject(ActivatedRoute);
  private readonly pendingTasks = inject(PendingTasks);

  protected readonly label = labelFor;
  protected readonly adding = signal(false);

  protected undoLabel(undo: UndoRequest): string {
    return undo.kind === 'nuovo' ? 'Annulla iscrizione' : 'Annulla riconferma';
  }

  /** Iscrizione dal modulo (specifica 009): chiude il modulo e rilegge l'anno. */
  protected onSaved(message: string): void {
    this.adding.set(false);
    const year = this.service.year();
    this.run(this.service.load(year).then(() => this.service.message.set(message)));
  }

  ngOnInit(): void {
    const requested = Number(this.route.snapshot.queryParamMap.get('anno'));
    this.run(this.service.load(Number.isInteger(requested) && requested > 0 ? requested : undefined));
  }

  /** Le operazioni asincrone restano "in corso" per Angular (stabilità nei test). */
  protected run(work: Promise<unknown>): void {
    this.pendingTasks.run(() => work);
  }

  protected onYear(event: Event): void {
    this.run(this.service.load(Number((event.target as HTMLSelectElement).value)));
  }
}
