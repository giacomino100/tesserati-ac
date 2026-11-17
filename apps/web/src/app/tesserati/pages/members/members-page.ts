import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PendingTasks, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { labelFor } from '@tesseramento/fees';
import { ADHESION_LISTS, listLabel, sectorOf } from '@tesseramento/import';
import { bondLabel, italianDate } from '../../../importa/format';
import { NewMemberForm } from '../../../nuovo-tesserato/new-member-form';
import { MEMBERS_BACKEND, type MemberRow } from '../../members-backend';

const LOAD_ERROR = 'Impossibile leggere i tesserati. Controlla la connessione e riprova.';

/**
 * "ACR 15 · Giovani 8 · Adulti 14": solo i settori presenti, nell'ordine degli elenchi, poi gli altri
 * settori col nome dell'export (specifica 005, research R7).
 */
export function sectorTotals(members: readonly MemberRow[]): string {
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.sector, (counts.get(m.sector) ?? 0) + 1);
  const known = ADHESION_LISTS.map((list) => [sectorOf(list), listLabel(list)] as const);
  const parts = known
    .filter(([sector]) => counts.has(sector))
    .map(([sector, label]) => `${label} ${counts.get(sector)}`);
  const others = [...counts]
    .filter(([sector]) => !known.some(([s]) => s === sector))
    .sort(([a], [b]) => a.localeCompare(b, 'it'))
    .map(([sector, n]) => `${sector} ${n}`);
  return [...parts, ...others].join(' · ');
}

function byName(a: MemberRow, b: MemberRow): number {
  return a.lastName.localeCompare(b.lastName, 'it') || a.firstName.localeCompare(b.firstName, 'it');
}

/** Tesserati di un anno importato, in sola lettura (FR-019). */
@Component({
  selector: 'app-members-page',
  imports: [MatButtonModule, MatToolbarModule, NewMemberForm, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <a mat-button routerLink="/">← Home</a>
      <span class="title">Tesserati</span>
    </mat-toolbar>
    <main class="content">
      @if (loading()) {
        <p>Caricamento…</p>
      } @else if (error(); as message) {
        <p role="alert">{{ message }}</p>
      } @else if (years().length === 0) {
        <p>Nessun tesserato importato. Usa <a routerLink="/importa">Importa Excel</a>.</p>
      } @else {
        <label class="year">
          Anno associativo
          <select [value]="year()" (change)="onYear($event)">
            @for (y of years(); track y) {
              <option [value]="y" [selected]="y === year()">{{ label(y) }}</option>
            }
          </select>
        </label>
        <p class="totals" data-testid="totals">{{ totals() }}</p>
        <p>{{ members().length }} tesserati nel {{ label(year()) }}</p>
        @if (notice(); as n) {
          <p role="status">{{ n }}</p>
        }
        @if (adding()) {
          <app-new-member-form [year]="year()" (saved)="onSaved($event)" (closed)="adding.set(false)" />
        } @else {
          <button mat-stroked-button type="button" (click)="adding.set(true)">Nuovo tesserato</button>
        }
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cognome e nome</th>
                <th>Data di nascita</th>
                <th>Settore</th>
                <th>Fascia d'età (export)</th>
                <th>Legame</th>
              </tr>
            </thead>
            <tbody>
              @for (m of members(); track $index) {
                <tr>
                  <td>{{ m.lastName }} {{ m.firstName }}</td>
                  <td>{{ date(m.birthDate) }}</td>
                  <td>{{ m.sector }}</td>
                  <td>{{ m.exportAgeBand ?? '' }}</td>
                  <td>{{ bond(m) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
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
      max-width: 960px;
    }
    .year {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .totals {
      font-weight: 500;
      margin-bottom: 0;
    }
    select {
      font: inherit;
      padding: 4px 8px;
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
  `,
})
export class MembersPage implements OnInit {
  private readonly backend = inject(MEMBERS_BACKEND);
  private readonly route = inject(ActivatedRoute);
  private readonly pendingTasks = inject(PendingTasks);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly years = signal<number[]>([]);
  protected readonly year = signal(0);
  protected readonly members = signal<MemberRow[]>([]);
  protected readonly adding = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly totals = computed(() => sectorTotals(this.members()));
  protected readonly label = labelFor;
  protected readonly date = italianDate;
  protected readonly bond = bondLabel;

  ngOnInit(): void {
    // Registrato come attività in corso: l'app (e i test) restano "instabili" finché non finisce.
    this.pendingTasks.run(() => this.load());
  }

  private async load(): Promise<void> {
    try {
      const years = [...(await this.backend.importedYears())].sort((a, b) => b - a);
      this.years.set(years);
      const requested = Number(this.route.snapshot.queryParamMap.get('anno'));
      const first = years.includes(requested) ? requested : years[0];
      if (first !== undefined) await this.show(first);
    } catch {
      this.error.set(LOAD_ERROR);
    } finally {
      this.loading.set(false);
    }
  }

  protected onYear(event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value);
    this.pendingTasks.run(() => this.show(year).catch(() => this.error.set(LOAD_ERROR)));
  }

  /** Iscrizione dal modulo (specifica 009): chiude il modulo e rilegge l'anno. */
  protected onSaved(message: string): void {
    this.adding.set(false);
    this.notice.set(message);
    this.pendingTasks.run(() => this.show(this.year()).catch(() => this.error.set(LOAD_ERROR)));
  }

  private async show(year: number): Promise<void> {
    this.year.set(year);
    this.members.set([...(await this.backend.membersOfYear(year))].sort(byName));
  }
}
