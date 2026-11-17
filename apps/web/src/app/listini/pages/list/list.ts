import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { dateTime } from '../../format';
import { FeeScheduleService } from '../../fee-schedule.service';

@Component({
  selector: 'app-listini-list',
  imports: [MatButtonModule, MatToolbarModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <a mat-button routerLink="/">← Home</a>
      <span class="title">Listini</span>
    </mat-toolbar>
    <main class="content">
      @if (service.loading()) {
        <p>Caricamento…</p>
      } @else if (service.error(); as message) {
        <p role="alert">{{ message }}</p>
      } @else if (service.schedules().length === 0) {
        <p>Nessun listino. Contatta chi gestisce il progetto.</p>
      } @else {
        <ul class="rows">
          @for (item of service.schedules(); track item.schedule.associationYear) {
            <li data-testid="row">
              <a [routerLink]="['/listini', item.schedule.associationYear]" class="year">{{
                item.schedule.label
              }}</a>
              <span class="meta">Ultima modifica: {{ when(item.updatedAt) }}, {{ item.updatedBy }}</span>
            </li>
          }
        </ul>
        <a mat-flat-button data-testid="new" routerLink="/listini/nuovo">Nuovo listino</a>
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
    .rows {
      list-style: none;
      margin: 0 0 16px;
      padding: 0;
    }
    .rows li {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(128, 128, 128, 0.3);
    }
    .year {
      font-weight: 500;
      font-size: 1.1rem;
    }
    .meta {
      overflow-wrap: anywhere;
      opacity: 0.8;
    }
  `,
})
export class ListiniList implements OnInit {
  protected readonly service = inject(FeeScheduleService);
  protected readonly when = dateTime;

  ngOnInit(): void {
    void this.service.load();
  }
}
