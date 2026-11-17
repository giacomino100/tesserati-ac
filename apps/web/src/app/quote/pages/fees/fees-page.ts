import { ChangeDetectionStrategy, Component, inject, OnInit, PendingTasks, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { labelFor } from '@tesseramento/fees';
import type { FeeComparison } from '@tesseramento/families';
import type { HasUnsavedChanges } from '../../../listini/unsaved-changes.guard';
import { FeesService } from '../../fees.service';

/** Quote dei nuclei di un anno (specifica 010). */
@Component({
  selector: 'app-fees-page',
  imports: [MatButtonModule, MatToolbarModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <a mat-button routerLink="/">← Home</a>
      <span class="title">Quote</span>
    </mat-toolbar>
    <main class="content">
      @if (service.loading()) {
        <p>Caricamento…</p>
      } @else if (!service.hasMembers()) {
        <p>Nessun tesserato importato per questo anno. Usa <a routerLink="/importa">Importa Excel</a>.</p>
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
          <p role="alert">{{ message }}</p>
        }
        @if (service.scheduleMissing(); as missing) {
          <p role="alert">{{ missing }} <a routerLink="/listini">Listini</a></p>
        } @else {
          <p class="totals" data-testid="totals">{{ service.totalsText() }}</p>
          @if (service.unconfirmedText(); as unconfirmed) {
            <p class="warning">{{ unconfirmed }} <a routerLink="/famiglie" [queryParams]="{ anno: service.year() }">Famiglie</a></p>
          }
          <div class="actions">
            <span>{{ service.savedInfo() }}</span>
            @if (service.updateText(); as update) {
              <span class="warning">{{ update }}</span>
              <button mat-flat-button type="button" [disabled]="service.busy()" (click)="run(service.updateAll())">Aggiorna tutte</button>
            } @else if (service.savedInfo() === 'Quote non ancora salvate') {
              <button mat-flat-button type="button" [disabled]="service.busy()" (click)="run(service.updateAll())">
                Salva le quote dell'anno
              </button>
            }
          </div>

          @for (c of service.comparisons(); track c.key) {
            @if (c.current; as fee) {
              <article class="household" data-testid="household" [id]="c.key" [class.open]="c.key === focus()">
                <header>
                  <h3>{{ service.title(fee.household) }}</h3>
                  <span class="amount">{{ service.totalText(fee) }}</span>
                </header>
                @if (fee.outcome.kind === 'calculated') {
                  <ul>
                    @for (line of service.lines(fee); track $index) {
                      <li>{{ line }}</li>
                    }
                  </ul>
                  @if (service.packageText(fee); as pack) {
                    <p>{{ pack }}</p>
                  }
                } @else {
                  <p class="warning">{{ service.reasonText(fee.outcome) }}</p>
                  @if (c.saved?.kind === 'manual' && !c.needsManual) {
                    <p>{{ service.manualText(c.saved!) }}</p>
                  }
                  @if (fee.outcome.kind === 'notCovered') {
                    @if (service.manualKey() === c.key) {
                      <div class="manual" data-testid="manual">
                        <label>Quota del nucleo (€) <input type="text" [value]="service.manualEuros()" (input)="service.manualEuros.set(value($event))" /></label>
                        @if (service.manualErrors().euros; as e) {
                          <p role="alert">{{ e }}</p>
                        }
                        <label>Nota (obbligatoria) <textarea maxlength="500" [value]="service.manualNote()" (input)="service.manualNote.set(value($event))"></textarea></label>
                        @if (service.manualErrors().note; as e) {
                          <p role="alert">{{ e }}</p>
                        }
                        <div class="actions">
                          <button mat-flat-button type="button" [disabled]="service.busy()" (click)="saveManual(false)">Salva quota manuale</button>
                          <button mat-stroked-button type="button" (click)="service.cancelManual()">Annulla</button>
                        </div>
                        @if (confirmingZero()) {
                          <div role="alertdialog" aria-label="Quota zero" class="actions">
                            <p>Il nucleo non paga nulla: confermi?</p>
                            <button mat-flat-button type="button" (click)="saveManual(true)">Conferma</button>
                            <button mat-stroked-button type="button" (click)="confirmingZero.set(false)">Annulla</button>
                          </div>
                        }
                      </div>
                    } @else {
                      <button mat-stroked-button type="button" (click)="service.startManual(c.key)">
                        {{ c.saved?.kind === 'manual' && !c.needsManual ? 'Modifica' : 'Inserisci la quota' }}
                      </button>
                    }
                  }
                }
                @if (statusText(c); as status) {
                  <p class="status">{{ status }}</p>
                }
                @if (c.status === 'changed' && service.changeText(c)) {
                  <div class="actions">
                    <span>{{ service.changeText(c) }}</span>
                    <button mat-stroked-button type="button" [disabled]="service.busy()" (click)="run(service.updateOne(c.key))">
                      Aggiorna questa quota
                    </button>
                  </div>
                }
              </article>
            }
          }
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
      max-width: 880px;
    }
    .year,
    .manual label {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    select,
    input,
    textarea {
      font: inherit;
      padding: 4px 8px;
      max-width: 100%;
    }
    textarea {
      width: 100%;
      min-height: 3em;
    }
    .totals {
      font-weight: 500;
    }
    .warning {
      color: #b3261e;
    }
    .household {
      border: 1px solid rgba(128, 128, 128, 0.35);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      overflow-wrap: anywhere;
    }
    .household.open {
      border-width: 2px;
    }
    .household header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px;
    }
    h3 {
      font-size: 1rem;
      margin: 0;
    }
    .amount {
      font-weight: 500;
    }
    ul {
      margin: 6px 0;
      padding-left: 20px;
    }
    .status {
      opacity: 0.85;
      margin: 4px 0;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
    }
  `,
})
export class FeesPage implements OnInit, HasUnsavedChanges {
  protected readonly service = inject(FeesService);
  private readonly route = inject(ActivatedRoute);
  private readonly pendingTasks = inject(PendingTasks);

  protected readonly label = labelFor;
  protected readonly focus = signal<string | null>(null);
  protected readonly confirmingZero = signal(false);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const requested = Number(params.get('anno'));
    this.focus.set(params.get('nucleo'));
    this.run(this.service.load(Number.isInteger(requested) && requested > 0 ? requested : undefined));
  }

  hasUnsavedChanges(): boolean {
    return this.service.hasUnsavedChanges();
  }

  protected run(work: Promise<unknown>): void {
    this.pendingTasks.run(() => work);
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected statusText(c: FeeComparison): string {
    if (c.needsManual) return 'Da decidere';
    if (c.saved?.kind === 'manual') return '';
    if (c.status === 'new') return 'Da salvare';
    if (c.status === 'unchanged') return 'Salvata';
    return 'Da ricalcolare';
  }

  protected onYear(event: Event): void {
    this.run(this.service.load(Number((event.target as HTMLSelectElement).value)));
  }

  protected saveManual(confirmedZero: boolean): void {
    this.run(
      this.service.saveManual(confirmedZero).then((result) => {
        this.confirmingZero.set(result === 'confirmZero');
      }),
    );
  }
}
