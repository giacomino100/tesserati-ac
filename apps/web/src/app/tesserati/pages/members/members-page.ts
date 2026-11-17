import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PendingTasks, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { labelFor } from '@tesseramento/fees';
import { ADHESION_LISTS, listLabel, sectorOf, type AdhesionList } from '@tesseramento/import';
import { bondLabel, italianDate } from '../../../importa/format';
import { NewMemberForm } from '../../../nuovo-tesserato/new-member-form';
import type { MemberRow } from '../../members-backend';
import { MEMBERS_MESSAGES, MembersService } from '../../members.service';


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

/** Tesserati di un anno con l'elenco rispetto all'età (FR-019; specifiche 009 e 011). */
@Component({
  selector: 'app-members-page',
  imports: [MatButtonModule, MatToolbarModule, NewMemberForm, RouterLink],
  providers: [MembersService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <a mat-button routerLink="/">← Home</a>
      <span class="title">Tesserati</span>
    </mat-toolbar>
    <main class="content">
      @if (service.loading() && service.year() === 0) {
        <p>Caricamento…</p>
      } @else if (service.error(); as message) {
        <p role="alert">{{ message }}</p>
      } @else if (service.years().length === 0) {
        <p>Nessun tesserato importato. Usa <a routerLink="/importa">Importa Excel</a>.</p>
      } @else {
        <label class="year">
          Anno associativo
          <select [value]="service.year()" (change)="onYear($event)">
            @for (y of service.years(); track y) {
              <option [value]="y" [selected]="y === service.year()">{{ label(y) }}</option>
            }
          </select>
        </label>
        <p class="totals" data-testid="totals">{{ totals() }}</p>
        <p>{{ service.rows().length }} tesserati nel {{ label(service.year()) }}</p>
        @if (service.misalignedText(); as misaligned) {
          <p class="warning-line">
            {{ misaligned }}
            <button mat-stroked-button type="button" [disabled]="service.busy()" (click)="service.askAlignAll()">Allinea tutte</button>
          </p>
        }
        @if (service.confirmingAlignAll()) {
          <div role="alertdialog" class="dialog" aria-label="Allinea tutte">
            <p>{{ service.alignAllQuestion() }}</p>
            <button mat-flat-button type="button" (click)="run(service.alignAll())">Allinea</button>
            <button mat-stroked-button type="button" (click)="service.cancelAlignAll()">Annulla</button>
          </div>
        }
        @if (service.message(); as m) {
          <p role="status">{{ m }}</p>
        }
        @if (notice(); as n) {
          <p role="status">{{ n }}</p>
        }
        @if (adding()) {
          <app-new-member-form [year]="service.year()" (saved)="onSaved($event)" (closed)="adding.set(false)" />
        } @else {
          <button mat-stroked-button type="button" (click)="adding.set(true)">Nuovo tesserato</button>
        }
        @if (service.editing(); as edit) {
          <section class="dialog" data-testid="list-edit" aria-label="Cambia elenco">
            <p>Cambia elenco di {{ edit.lastName }} {{ edit.firstName }}</p>
            <label>
              Elenco
              <select [value]="service.editList()" (change)="onEditList($event)">
                @for (l of lists; track l) {
                  <option [value]="l" [selected]="l === service.editList()">{{ listName(l) }}</option>
                }
              </select>
            </label>
            <label class="note">
              Nota (obbligatoria)
              <textarea rows="2" maxlength="200" [value]="service.editNote()" (input)="onEditNote($event)"></textarea>
            </label>
            @if (service.editError(); as e) {
              <p role="alert">{{ e }}</p>
            }
            <button mat-flat-button type="button" [disabled]="service.busy()" (click)="run(service.saveEdit())">Salva</button>
            <button mat-stroked-button type="button" (click)="service.cancelEdit()">Annulla</button>
          </section>
        }
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cognome e nome</th>
                <th>Data di nascita</th>
                <th>Elenco</th>
                <th>Fascia d'età (export)</th>
                <th>Legame</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (m of service.rows(); track m.adhesionId) {
                <tr>
                  <td>{{ m.lastName }} {{ m.firstName }}</td>
                  <td>{{ date(m.birthDate) }}</td>
                  <td>
                    {{ service.listText(m) }}
                    @if (service.warningText(m); as w) {
                      <span class="warning">{{ w }}</span>
                    }
                  </td>
                  <td>{{ m.exportAgeBand ?? '' }}</td>
                  <td>{{ bond(m) }}</td>
                  <td class="actions">
                    @if (service.canAlign(m)) {
                      <button mat-stroked-button type="button" [disabled]="service.busy()" (click)="run(service.align(m))">Allinea all’età</button>
                    }
                    @if (service.isException(m)) {
                      <button mat-stroked-button type="button" [disabled]="service.busy()" (click)="run(service.removeException(m))">Togli eccezione</button>
                    }
                    <button mat-stroked-button type="button" (click)="service.startEdit(m)">Cambia elenco</button>
                  </td>
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
      max-width: 1080px;
    }
    .year,
    .warning-line,
    .dialog,
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .dialog {
      border: 1px solid rgba(128, 128, 128, 0.35);
      border-radius: 8px;
      padding: 12px;
      margin: 12px 0;
    }
    .note {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 240px;
    }
    .totals {
      font-weight: 500;
      margin-bottom: 0;
    }
    select,
    textarea {
      font: inherit;
      padding: 4px 8px;
      max-width: 100%;
    }
    .warning {
      display: block;
      color: #b3261e;
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
  protected readonly service = inject(MembersService);
  private readonly route = inject(ActivatedRoute);
  private readonly pendingTasks = inject(PendingTasks);

  protected readonly adding = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly totals = computed(() => sectorTotals(this.service.rows()));
  protected readonly label = labelFor;
  protected readonly date = italianDate;
  protected readonly bond = bondLabel;
  protected readonly lists = ADHESION_LISTS;
  protected readonly listName = listLabel;

  ngOnInit(): void {
    // Registrato come attività in corso: l'app (e i test) restano "instabili" finché non finisce.
    const requested = Number(this.route.snapshot.queryParamMap.get('anno'));
    this.run(this.service.load(Number.isInteger(requested) && requested > 0 ? requested : undefined));
  }

  protected run(work: Promise<unknown>): void {
    this.pendingTasks.run(() => work);
  }

  protected onYear(event: Event): void {
    this.notice.set(null);
    const year = Number((event.target as HTMLSelectElement).value);
    this.run(this.service.show(year).catch(() => this.service.error.set(MEMBERS_MESSAGES.load)));
  }

  protected onEditList(event: Event): void {
    this.service.editList.set((event.target as HTMLSelectElement).value as AdhesionList);
  }

  protected onEditNote(event: Event): void {
    this.service.editNote.set((event.target as HTMLTextAreaElement).value);
  }

  /** Iscrizione dal modulo (specifica 009): chiude il modulo e rilegge l'anno. */
  protected onSaved(message: string): void {
    this.adding.set(false);
    this.notice.set(message);
    this.run(this.service.show(this.service.year()).catch(() => this.service.error.set(MEMBERS_MESSAGES.load)));
  }
}
