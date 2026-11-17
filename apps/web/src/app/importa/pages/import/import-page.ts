import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import type { ImportRow } from '@tesseramento/import';
import type { HasUnsavedChanges } from '../../../listini/unsaved-changes.guard';
import { bondLabel, italianDate } from '../../format';
import { ImportService } from '../../import.service';

@Component({
  selector: 'app-import-page',
  imports: [MatButtonModule, MatToolbarModule, NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <a mat-button routerLink="/">← Home</a>
      <span class="title">Importa Excel ACR</span>
    </mat-toolbar>
    <main class="content">
      @switch (service.state().kind) {
        @case ('idle') {
          <p>Scegli il file ElencoAdesioni_ACR.xlsx esportato dal sistema nazionale.</p>
          <label class="file">
            <input type="file" accept=".xlsx" (change)="onFile($event)" />
          </label>
        }
        @case ('reading') {
          <p>Lettura del file…</p>
        }
        @case ('rejected') {
          <p role="alert">{{ message() }}</p>
          <ng-container [ngTemplateOutlet]="skippedList" />
          <div class="actions">
            <button mat-flat-button type="button" (click)="service.cancel()">Scegli un altro file</button>
            @if (service.showListiniLink()) {
              <a mat-stroked-button routerLink="/listini">Listini</a>
            }
          </div>
        }
        @case ('done') {
          @if (service.summary(); as s) {
            <p role="status">
              Import completato: {{ s.adhesions }} adesioni {{ s.yearLabel }}, {{ s.newPersons }} persone nuove,
              {{ s.reusedPersons }} già presenti.
            </p>
          }
          <ng-container [ngTemplateOutlet]="skippedList" />
          <div class="actions">
            <a mat-flat-button routerLink="/tesserati" [queryParams]="{ anno: service.summary()?.year }">
              Vedi i tesserati
            </a>
            <a mat-stroked-button routerLink="/">Torna alla home</a>
          </div>
        }
        @default {
          <h2>Anno associativo {{ service.yearLabel() }}</h2>
          <p>{{ service.totals().inFile }} righe nel file, {{ service.totals().toImport }} da importare</p>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cognome e nome</th>
                  <th>Data di nascita</th>
                  <th>Fascia d'età (export)</th>
                  <th>Legame</th>
                </tr>
              </thead>
              <tbody>
                @for (row of service.firstRows(); track row.rowNumber) {
                  <tr>
                    <td>{{ fullName(row) }}</td>
                    <td>{{ date(row.birthDate) }}</td>
                    <td>{{ row.exportAgeBand ?? '' }}</td>
                    <td>{{ bond(row) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <ng-container [ngTemplateOutlet]="skippedList" />
          @if (service.state().kind === 'saving') {
            <p role="status">Salvataggio in corso…</p>
          }
          @if (service.state().kind === 'saveFailed') {
            <p role="alert">{{ message() }}</p>
          }
          <div class="actions">
            <button mat-flat-button type="button" [disabled]="service.isSaving()" (click)="confirm()">
              {{ service.state().kind === 'saveFailed' ? 'Riprova' : 'Importa' }}
            </button>
            <button mat-stroked-button type="button" [disabled]="service.isSaving()" (click)="service.cancel()">
              Annulla
            </button>
          </div>
        }
      }

      <ng-template #skippedList>
        @if (service.skippedMessages().length > 0) {
          <h3>Righe saltate</h3>
          <ul class="skipped">
            @for (message of service.skippedMessages(); track message) {
              <li>{{ message }}</li>
            }
          </ul>
        }
      </ng-template>
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
    h2 {
      font-size: 1.25rem;
      margin: 0 0 8px;
    }
    h3 {
      font-size: 1rem;
      margin: 16px 0 4px;
    }
    .table-wrap {
      overflow-x: auto;
      max-width: 100%;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th,
    td {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid rgba(128, 128, 128, 0.3);
      overflow-wrap: anywhere;
    }
    .skipped {
      margin: 0;
      padding-left: 20px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
    }
  `,
})
export class ImportPage implements HasUnsavedChanges {
  protected readonly service = inject(ImportService);
  protected readonly date = italianDate;
  protected readonly bond = bondLabel;

  constructor() {
    // Il servizio vive per tutta la sessione: entrando nella pagina si riparte dalla scelta del file,
    // tranne se un salvataggio è ancora in corso.
    this.service.cancel();
  }

  /** Durante il salvataggio chiede conferma prima di uscire (route canDeactivate). */
  hasUnsavedChanges(): boolean {
    return this.service.isSaving();
  }

  protected fullName(row: ImportRow): string {
    return `${row.lastName} ${row.firstName}`;
  }

  protected message(): string {
    const state = this.service.state();
    return state.kind === 'rejected' || state.kind === 'saveFailed' ? state.message : '';
  }

  protected onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void this.service.chooseFile(file);
  }

  protected confirm(): void {
    void this.service.confirm();
  }
}
