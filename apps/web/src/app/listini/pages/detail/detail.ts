import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ScheduleDraft } from '@tesseramento/fees';
import type { StoredSchedule } from '../../fee-schedule-backend';
import { FeeScheduleService, type UpdateOptions } from '../../fee-schedule.service';
import { ageRange, BAND_NAMES, dateTime, euro } from '../../format';
import { ScheduleForm } from '../../schedule-form/schedule-form';
import type { HasUnsavedChanges } from '../../unsaved-changes.guard';

type Pending = 'conflict' | 'inUse' | null;

@Component({
  selector: 'app-listino-detail',
  imports: [MatButtonModule, MatToolbarModule, RouterLink, ScheduleForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <a mat-button routerLink="/listini">← Listini</a>
      <span class="title">Listino {{ current()?.schedule?.label }}</span>
    </mat-toolbar>
    <main class="content">
      @if (!loaded()) {
        <p>Caricamento…</p>
      } @else if (service.error(); as message) {
        <p role="alert">{{ message }}</p>
      } @else if (current(); as item) {
        @if (editing()) {
          <app-schedule-form
            [base]="item.schedule"
            [errorMessage]="message()"
            [busy]="busy()"
            (save)="save($event, item)"
            (cancelled)="cancelEdit()"
          />
          @if (pending() === 'conflict') {
            <div class="dialog" role="alertdialog" aria-label="Conflitto di modifica">
              <p>Il listino è stato modificato da qualcun altro.</p>
              <div class="actions">
                <button mat-flat-button type="button" (click)="overwrite(item)">Sovrascrivi</button>
                <button mat-stroked-button type="button" (click)="reload()">Annulla e ricarica</button>
              </div>
            </div>
          } @else if (pending() === 'inUse') {
            <div class="dialog" role="alertdialog" aria-label="Quote già calcolate">
              <p>
                Le quote già calcolate per questo anno non cambiano finché non vengono ricalcolate.
              </p>
              <div class="actions">
                <button mat-flat-button type="button" (click)="confirm(item)">Conferma</button>
                <button mat-stroked-button type="button" (click)="dismiss()">Annulla</button>
              </div>
            </div>
          }
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fascia</th>
                  <th>Età</th>
                  <th>Quota piena</th>
                  <th>Quota con sconto 20%</th>
                </tr>
              </thead>
              <tbody>
                @for (band of item.schedule.bands; track band.band) {
                  <tr data-testid="band-row" [attr.data-band]="band.band">
                    <td>{{ names[band.band] }}</td>
                    <td>{{ range(band) }}</td>
                    <td>{{ euro(band.fullCents) }}</td>
                    <td>{{ euro(band.discountedCents) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p data-testid="package" class="package">
            <strong>Pacchetto 2 ACR</strong>: {{ euro(item.schedule.acrPackageCents) }}
          </p>
          <section data-testid="rules" class="rules">
            <h2>Regole del PDF (non modificabili)</h2>
            <ul>
              <li>Età minima: {{ item.schedule.minAge }}</li>
              <li>Massimo componenti del nucleo: {{ item.schedule.maxHouseholdSize }}</li>
            </ul>
          </section>
          <p data-testid="last-update" class="meta">
            Ultima modifica: {{ when(item.updatedAt) }}, {{ item.updatedBy }}
          </p>
          <button mat-flat-button type="button" data-testid="edit" (click)="startEdit()">Modifica</button>
        }
      } @else {
        <p>Listino non trovato.</p>
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
      max-width: 720px;
    }
    .table-wrap {
      overflow-wrap: anywhere;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      text-align: left;
      padding: 8px 6px;
      border-bottom: 1px solid rgba(128, 128, 128, 0.3);
      vertical-align: top;
    }
    .rules h2 {
      font-size: 1rem;
    }
    .meta {
      overflow-wrap: anywhere;
      opacity: 0.8;
    }
    .dialog {
      margin-top: 16px;
      padding: 12px 16px;
      border: 2px solid #b3261e;
      border-radius: 8px;
      max-width: 520px;
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  `,
})
export class ListinoDetail implements OnInit, HasUnsavedChanges {
  protected readonly service = inject(FeeScheduleService);
  private readonly route = inject(ActivatedRoute);
  private readonly form = viewChild(ScheduleForm);

  protected readonly current = signal<StoredSchedule | undefined>(undefined);
  protected readonly loaded = signal(false);
  protected readonly editing = signal(false);
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly pending = signal<Pending>(null);
  private draft: ScheduleDraft | undefined;

  protected readonly names = BAND_NAMES;
  protected readonly euro = euro;
  protected readonly range = ageRange;
  protected readonly when = dateTime;

  async ngOnInit(): Promise<void> {
    const year = Number(this.route.snapshot.paramMap.get('anno'));
    this.current.set(Number.isInteger(year) ? await this.service.open(year) : undefined);
    this.loaded.set(true);
  }

  protected startEdit(): void {
    this.message.set(null);
    this.pending.set(null);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.pending.set(null);
    this.message.set(null);
  }

  protected save(draft: ScheduleDraft, item: StoredSchedule): Promise<void> {
    this.draft = draft;
    return this.run(item, {});
  }

  protected overwrite(item: StoredSchedule): Promise<void> {
    return this.run(item, { overwrite: true, confirmed: true });
  }

  protected confirm(item: StoredSchedule): Promise<void> {
    return this.run(item, { confirmed: true });
  }

  protected dismiss(): void {
    this.pending.set(null);
  }

  /** "Annulla e ricarica": scarta le modifiche e rilegge il listino aggiornato da altri. */
  protected async reload(): Promise<void> {
    const year = this.current()?.schedule.associationYear;
    this.pending.set(null);
    this.editing.set(false);
    if (year !== undefined) this.current.set(await this.service.open(year));
  }

  private async run(item: StoredSchedule, options: UpdateOptions): Promise<void> {
    if (!this.draft) return;
    this.busy.set(true);
    this.message.set(null);
    this.pending.set(null);
    const result = await this.service.update(this.draft, item, options);
    this.busy.set(false);
    switch (result.status) {
      case 'saved':
        this.editing.set(false);
        this.current.set(await this.service.open(item.schedule.associationYear));
        break;
      case 'conflict':
        this.pending.set('conflict');
        break;
      case 'confirmNeeded':
        this.pending.set('inUse');
        break;
      case 'error':
        this.message.set(result.message);
        break;
      case 'invalid':
        break; // gli errori sono già mostrati accanto ai campi dal modulo
    }
  }

  /** Per il guard di uscita e per `beforeunload`: modifiche non ancora salvate (FR-014). */
  hasUnsavedChanges(): boolean {
    return this.editing() && (this.form()?.hasUnsavedChanges() ?? false);
  }

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: Event): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }
}
