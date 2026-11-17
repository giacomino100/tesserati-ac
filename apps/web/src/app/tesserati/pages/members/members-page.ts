import { ChangeDetectionStrategy, Component, inject, OnInit, PendingTasks, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { labelFor } from '@tesseramento/fees';
import { ADHESION_LISTS, listLabel, type AdhesionList } from '@tesseramento/import';
import { NewMemberForm } from '../../../nuovo-tesserato/new-member-form';
import { MEMBERS_MESSAGES, MembersService, type MemberFilter } from '../../members.service';

/**
 * Tesserati dell'anno (specifica 013): un solo elenco con chi è da confermare e chi è iscritto, conferma = pagato,
 * pannello della famiglia, nuovo tesserato; cambio di elenco come azione secondaria.
 */
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
        <p>Nessun tesserato. Chiedi all'amministratore di importare gli elenchi.</p>
      } @else {
        <div class="bar">
          <label>
            Anno associativo
            <select [value]="service.year()" (change)="onYear($event)">
              @for (y of service.years(); track y) {
                <option [value]="y" [selected]="y === service.year()">{{ label(y) }}</option>
              }
            </select>
          </label>
          <label>
            Data di pagamento
            <input type="date" name="paidOn" [value]="service.paidOn()" (change)="onPaidOn($event)" />
          </label>
        </div>
        <p class="counts" data-testid="counts">{{ service.countsText() }}</p>
        @if (service.scheduleMissing(); as missing) {
          <p class="warning">{{ missing }} <a routerLink="/listini">Listini</a></p>
        }
        <div class="bar">
          <label>
            Mostra
            <select name="filter" [value]="service.filter()" (change)="onFilter($event)">
              <option value="all">Tutti</option>
              <option value="pending">Da confermare</option>
              <option value="enrolled">Iscritti</option>
            </select>
          </label>
          <label class="grow">
            Cerca per nome
            <input type="search" name="search" [value]="service.search()" (input)="onSearch($event)" />
          </label>
          @if (!adding()) {
            <button mat-stroked-button type="button" (click)="adding.set(true)">Nuovo tesserato</button>
          }
        </div>
        @if (adding()) {
          <app-new-member-form [year]="service.year()" [paidOn]="service.paidOn()" (saved)="onSaved($event)" (closed)="adding.set(false)" />
        }
        @if (service.message(); as m) {
          <p role="status">{{ m }}</p>
        }

        @if (service.panel(); as panel) {
          <section class="panel" data-testid="family-panel" aria-label="Famiglia">
            <h2>{{ service.panelTitle() }}</h2>
            <ul class="plain">
              @for (m of panel.members; track m.member.personId) {
                <li>
                  <span>{{ m.member.lastName }} {{ m.member.firstName }}</span>
                  @if (m.status === 'pending') {
                    <span class="state">Da confermare</span>
                    <button mat-flat-button type="button" [disabled]="service.busy()" (click)="run(service.confirm(m.member.personId))">Conferma</button>
                  } @else {
                    <span class="state">{{ m.member.paidOn ? 'Pagato il ' + date(m.member.paidOn) : 'Iscritto' }}</span>
                    @if (m.inFamily) {
                      <button mat-stroked-button type="button" [disabled]="service.busy()" (click)="run(service.removeFromFamily(m.member.personId))">Togli</button>
                    }
                  }
                </li>
              }
            </ul>
            @if (panel.addable.length > 0) {
              <label class="add">
                Aggiungi un tesserato
                <select (change)="onAdd($event)">
                  <option value="">—</option>
                  @for (a of panel.addable; track a.personId) {
                    <option [value]="a.personId">{{ a.lastName }} {{ a.firstName }}</option>
                  }
                </select>
              </label>
            }
            <button mat-stroked-button type="button" (click)="service.closePanel()">Chiudi</button>
          </section>
        }

        @if (service.undoing(); as undo) {
          <div role="alertdialog" class="dialog" aria-label="Annulla conferma">
            <p>{{ undo.question }}</p>
            @if (undo.feeWarning) {
              <p class="warning">{{ undo.feeWarning }}</p>
            }
            <button mat-flat-button type="button" (click)="run(service.confirmUndo())">Annulla conferma</button>
            <button mat-stroked-button type="button" (click)="service.cancelUndo()">Indietro</button>
          </div>
        }

        @if (service.editing(); as edit) {
          <section class="dialog" data-testid="list-edit" aria-label="Cambia elenco">
            <p>Cambia elenco di {{ edit.member.lastName }} {{ edit.member.firstName }}</p>
            <label>
              Elenco
              <select [value]="service.editList()" (change)="onEditList($event)">
                @for (l of lists; track l) {
                  <option [value]="l" [selected]="l === service.editList()">{{ listName(l) }}</option>
                }
              </select>
            </label>
            <label class="grow">
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

        <ul class="rows">
          @for (r of service.visibleRows(); track r.member.personId) {
            <li data-testid="member" [class.pending]="r.status === 'pending'">
              <div class="who">
                <span>{{ service.rowText(r) }}</span>
                <span class="state">{{ service.statusText(r) }}{{ r.origin === 'nuovo' ? ' · Nuovo' : '' }}</span>
                @for (w of service.warningTexts(r); track $index) {
                  <span class="warning">{{ w }}</span>
                }
              </div>
              <div class="actions">
                @if (r.status === 'pending') {
                  <button mat-flat-button type="button" [disabled]="!service.canConfirm(r)" (click)="run(service.confirm(r.member.personId))">Conferma</button>
                } @else {
                  <button mat-stroked-button type="button" (click)="service.openPanel(r.member.personId)">Famiglia</button>
                  @if (!r.paidOn) {
                    <button mat-stroked-button type="button" [disabled]="service.busy()" (click)="run(service.registerPayment(r.member.personId))">Registra pagamento</button>
                  }
                  <details class="more">
                    <summary>Altre azioni</summary>
                    @if (r.undoable) {
                      <button mat-button type="button" (click)="run(service.startUndo(r.member.personId))">Annulla conferma</button>
                    }
                    @if (service.canAlign(r)) {
                      <button mat-button type="button" (click)="run(service.align(r))">Allinea all’età</button>
                    }
                    <button mat-button type="button" (click)="service.startEdit(r)">Cambia elenco</button>
                  </details>
                }
              </div>
            </li>
          } @empty {
            <li>Nessuno.</li>
          }
        </ul>
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
    .bar,
    .actions,
    .dialog,
    .add,
    .plain li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .bar {
      margin: 8px 0;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .grow {
      flex: 1 1 200px;
    }
    select,
    input,
    textarea {
      font: inherit;
      padding: 4px 8px;
      max-width: 100%;
    }
    .counts {
      font-weight: 500;
    }
    .rows,
    .plain {
      list-style: none;
      padding: 0;
      margin: 8px 0;
    }
    .rows li {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(128, 128, 128, 0.3);
      overflow-wrap: anywhere;
    }
    .who {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .state {
      opacity: 0.85;
    }
    .warning {
      color: #b3261e;
    }
    .panel,
    .dialog {
      border: 1px solid rgba(128, 128, 128, 0.35);
      border-radius: 8px;
      padding: 12px;
      margin: 12px 0;
      overflow-wrap: anywhere;
    }
    h2 {
      font-size: 1.1rem;
      margin: 0 0 8px;
    }
    .more summary {
      cursor: pointer;
    }
  `,
})
export class MembersPage implements OnInit {
  protected readonly service = inject(MembersService);
  private readonly route = inject(ActivatedRoute);
  private readonly pendingTasks = inject(PendingTasks);

  protected readonly adding = signal(false);
  protected readonly label = labelFor;
  protected readonly lists = ADHESION_LISTS;
  protected readonly listName = listLabel;

  ngOnInit(): void {
    const requested = Number(this.route.snapshot.queryParamMap.get('anno'));
    this.run(this.service.load(Number.isInteger(requested) && requested > 0 ? requested : undefined));
  }

  /** Le operazioni asincrone restano "in corso" per Angular (stabilità nei test). */
  protected run(work: Promise<unknown>): void {
    this.pendingTasks.run(() => work);
  }

  protected date(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  protected onYear(event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value);
    this.service.closePanel();
    this.run(this.service.show(year).catch(() => this.service.error.set(MEMBERS_MESSAGES.load)));
  }

  protected onPaidOn(event: Event): void {
    this.service.paidOn.set((event.target as HTMLInputElement).value);
  }

  protected onFilter(event: Event): void {
    this.service.filter.set((event.target as HTMLSelectElement).value as MemberFilter);
  }

  protected onSearch(event: Event): void {
    this.service.search.set((event.target as HTMLInputElement).value);
  }

  protected onAdd(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value) this.run(this.service.addToFamily(select.value));
    select.value = '';
  }

  protected onEditList(event: Event): void {
    this.service.editList.set((event.target as HTMLSelectElement).value as AdhesionList);
  }

  protected onEditNote(event: Event): void {
    this.service.editNote.set((event.target as HTMLTextAreaElement).value);
  }

  /** Iscrizione dal modulo (009): chiude il modulo e rilegge l'anno. */
  protected onSaved(message: string): void {
    this.adding.set(false);
    this.run(this.service.show(this.service.year()).then(() => this.service.message.set(message)));
  }

}
