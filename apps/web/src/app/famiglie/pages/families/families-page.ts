import { ChangeDetectionStrategy, Component, inject, OnInit, PendingTasks, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { labelFor } from '@tesseramento/fees';
import type { ConfirmedFamilyView, ProposedAddition, YearMember } from '@tesseramento/families';
import { listLabel } from '@tesseramento/import';
import { italianDate } from '../../../importa/format';
import type { HasUnsavedChanges } from '../../../listini/unsaved-changes.guard';
import { FamiliesService } from '../../families.service';

/** Famiglie dell'anno (specifica 007): suggerite, confermate, correzioni, senza famiglia. */
@Component({
  selector: 'app-families-page',
  imports: [MatButtonModule, MatToolbarModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <a mat-button routerLink="/">← Home</a>
      <span class="title">Famiglie</span>
    </mat-toolbar>
    <main class="content">
      @if (service.loading()) {
        <p>Caricamento…</p>
      } @else if (service.members().length === 0) {
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
        <p class="summary">{{ service.summary() }}</p>
        @if (service.message(); as message) {
          <p role="status">{{ message }}</p>
        }

        @if (service.editing(); as edit) {
          <section class="editor" data-testid="editor">
            <h2>{{ edit.id ? 'Correggi la famiglia' : edit.origin === 'manuale' ? 'Nuova famiglia' : 'Correggi la famiglia suggerita' }}</h2>
            <ul>
              @for (id of edit.memberIds; track id) {
                <li>
                  <span>{{ service.memberName(id) }}</span>
                  <button mat-stroked-button type="button" (click)="service.removeMember(id)">Togli</button>
                </li>
              }
            </ul>
            @if (!service.canSaveEdit()) {
              <p role="alert">Una famiglia ha almeno 2 componenti.</p>
            }
            <label class="add">
              Aggiungi un tesserato
              <select (change)="onAdd($event)">
                <option value="">—</option>
                @for (m of service.addable(); track m.personId) {
                  <option [value]="m.personId">{{ m.lastName }} {{ m.firstName }}</option>
                }
              </select>
            </label>
            <div class="actions">
              <button mat-flat-button type="button" [disabled]="!service.canSaveEdit() || service.busy()" (click)="run(service.saveEdit())">
                Conferma
              </button>
              <button mat-stroked-button type="button" (click)="service.cancelEdit()">Annulla</button>
            </div>
          </section>
        }

        @if (service.view().suggested.length > 0) {
          <div class="section-head">
            <h2>Famiglie suggerite</h2>
            <button mat-flat-button type="button" [disabled]="service.busy()" (click)="run(service.confirmAll())">Conferma tutte</button>
          </div>
          @for (s of service.view().suggested; track s.bondId) {
            <article class="family" data-testid="family">
              <h3>N. Legame {{ s.bondId }}{{ s.bond ? ' · ' + s.bond : '' }}</h3>
              <ul>
                @for (m of s.members; track m.personId) {
                  <li>{{ line(m) }}</li>
                }
              </ul>
              @for (w of s.warnings; track $index) {
                <p class="warning">{{ service.warningText(w, s.bond) }}</p>
              }
              @for (e of s.elsewhere; track e.member.personId) {
                <p class="note">{{ service.elsewhereText(e.member, e.familyId) }}</p>
              }
              <div class="actions">
                <button mat-flat-button type="button" [disabled]="!s.confirmable || service.busy()" (click)="run(service.confirmSuggested(s))">
                  Conferma
                </button>
                <button mat-stroked-button type="button" (click)="service.startEditSuggested(s)">Correggi</button>
              </div>
            </article>
          }
        }

        @if (service.view().confirmed.length > 0) {
          <h2>Famiglie confermate</h2>
          @for (c of service.view().confirmed; track c.family.id) {
            <article class="family confirmed" data-testid="family">
              <h3>{{ heading(c) }}</h3>
              <ul>
                @for (m of c.members; track m.personId) {
                  <li>{{ line(m) }}</li>
                }
              </ul>
              <p class="meta">{{ c.family.origin === 'manuale' ? 'Creata a mano · ' : '' }}Confermata il {{ when(c.family.confirmedAt) }} da {{ c.family.confirmedBy }}</p>
              @for (w of c.warnings; track $index) {
                <p class="warning">{{ service.warningText(w) }}</p>
              }
              @for (a of additionsOf(c); track a.member.personId) {
                <button mat-stroked-button type="button" [disabled]="service.busy()" (click)="run(service.addProposed(a))">
                  {{ service.additionText(a) }}
                </button>
              }
              <div class="actions">
                <a mat-stroked-button routerLink="/quote" [queryParams]="{ anno: service.year(), nucleo: 'f-' + c.family.id }">Vedi la quota</a>
                <button mat-stroked-button type="button" (click)="service.startEditConfirmed(c)">Correggi</button>
                <button mat-stroked-button type="button" (click)="dissolving.set(c.family.id)">Sciogli famiglia</button>
              </div>
              @if (dissolving() === c.family.id) {
                <div role="alertdialog" class="dialog" aria-label="Sciogli famiglia">
                  <p>Tutti i componenti resteranno senza famiglia.</p>
                  <button mat-flat-button type="button" (click)="dissolve(c.family.id)">Sciogli</button>
                  <button mat-stroked-button type="button" (click)="dissolving.set(null)">Annulla</button>
                </div>
              }
            </article>
          }
        }

        <section data-testid="without-family">
          <h2>Senza famiglia</h2>
          @if (service.view().withoutFamily.length === 0) {
            <p>Nessuno.</p>
          } @else {
            <ul class="plain">
              @for (m of service.view().withoutFamily; track m.personId) {
                <li>
                  <label>
                    <input type="checkbox" [checked]="selected().has(m.personId)" (change)="toggle(m.personId)" />
                    {{ line(m) }}
                  </label>
                </li>
              }
            </ul>
            <button mat-stroked-button type="button" [disabled]="selected().size < 2 || service.busy()" (click)="create()">
              Crea famiglia
            </button>
          }
        </section>
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
    .add {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
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
    h3 {
      font-size: 1rem;
      margin: 0 0 4px;
    }
    .section-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .family,
    .editor {
      border: 1px solid rgba(128, 128, 128, 0.35);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      overflow-wrap: anywhere;
    }
    ul {
      margin: 4px 0;
      padding-left: 20px;
    }
    .editor li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .plain {
      list-style: none;
      padding: 0;
    }
    .warning {
      color: #b3261e;
      margin: 4px 0;
    }
    .note,
    .meta {
      opacity: 0.85;
      margin: 4px 0;
    }
    .actions,
    .dialog {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
  `,
})
export class FamiliesPage implements OnInit, HasUnsavedChanges {
  protected readonly service = inject(FamiliesService);
  private readonly route = inject(ActivatedRoute);
  private readonly pendingTasks = inject(PendingTasks);

  protected readonly label = labelFor;
  protected readonly dissolving = signal<string | null>(null);
  protected readonly selected = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    const requested = Number(this.route.snapshot.queryParamMap.get('anno'));
    this.run(this.service.load(Number.isInteger(requested) && requested > 0 ? requested : undefined));
  }

  hasUnsavedChanges(): boolean {
    return this.service.hasUnsavedChanges();
  }

  /** Le operazioni asincrone restano "in corso" per Angular (stabilità nei test). */
  protected run(work: Promise<unknown>): void {
    this.pendingTasks.run(() => work);
  }

  protected line(m: YearMember): string {
    return `${m.lastName} ${m.firstName}, ${italianDate(m.birthDate)} · ${listLabel(m.list)}`;
  }

  protected when(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  }

  protected heading(c: ConfirmedFamilyView): string {
    const first = c.members[0];
    const name = first ? `Famiglia di ${first.lastName} ${first.firstName}` : 'Famiglia';
    return c.family.bondId ? `${name} · N. Legame ${c.family.bondId}` : name;
  }

  protected additionsOf(c: ConfirmedFamilyView): readonly ProposedAddition[] {
    return this.service.view().additions.filter((a) => a.familyId === c.family.id);
  }

  protected onYear(event: Event): void {
    this.run(this.service.load(Number((event.target as HTMLSelectElement).value)));
  }

  protected onAdd(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value) this.service.addMember(select.value);
    select.value = '';
  }

  protected toggle(personId: string): void {
    const next = new Set(this.selected());
    if (next.has(personId)) next.delete(personId);
    else next.add(personId);
    this.selected.set(next);
  }

  protected create(): void {
    const order = this.service.view().withoutFamily.map((m) => m.personId);
    const ids = order.filter((id) => this.selected().has(id));
    this.selected.set(new Set());
    this.run(this.service.createFamily(ids));
  }

  protected dissolve(familyId: string): void {
    this.dissolving.set(null);
    this.run(this.service.dissolve(familyId));
  }
}
