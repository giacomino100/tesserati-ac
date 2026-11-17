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
import { Router, RouterLink } from '@angular/router';
import type { FeeSchedule, ScheduleDraft } from '@tesseramento/fees';
import { FeeScheduleService } from '../../fee-schedule.service';
import { ScheduleForm } from '../../schedule-form/schedule-form';
import type { HasUnsavedChanges } from '../../unsaved-changes.guard';

@Component({
  selector: 'app-listino-new',
  imports: [MatButtonModule, MatToolbarModule, RouterLink, ScheduleForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <a mat-button routerLink="/listini">← Listini</a>
      <span class="title">Nuovo listino {{ base()?.label }}</span>
    </mat-toolbar>
    <main class="content">
      @if (!ready()) {
        <p>Caricamento…</p>
      } @else if (service.error(); as message) {
        <p role="alert">{{ message }}</p>
      } @else if (base(); as schedule) {
        <p>
          Anno associativo: <strong>{{ schedule.label }}</strong> (non modificabile). Le quote sono
          copiate dall'anno precedente: correggile secondo il nuovo PDF.
        </p>
        <app-schedule-form
          [base]="schedule"
          [errorMessage]="message()"
          [busy]="busy()"
          (save)="save($event, schedule)"
          (cancelled)="cancel()"
        />
      } @else {
        <p>Nessun listino da copiare. Contatta chi gestisce il progetto.</p>
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
    }
  `,
})
export class ListinoNew implements OnInit, HasUnsavedChanges {
  protected readonly service = inject(FeeScheduleService);
  private readonly router = inject(Router);
  private readonly form = viewChild(ScheduleForm);

  protected readonly base = signal<FeeSchedule | undefined>(undefined);
  protected readonly ready = signal(false);
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  private saved = false;

  async ngOnInit(): Promise<void> {
    await this.service.load();
    this.base.set(this.service.startNew());
    this.ready.set(true);
  }

  protected async save(draft: ScheduleDraft, base: FeeSchedule): Promise<void> {
    this.busy.set(true);
    this.message.set(null);
    const result = await this.service.create(draft, base);
    this.busy.set(false);
    if (result.status === 'saved') {
      this.saved = true;
      void this.router.navigate(['/listini', base.associationYear]);
    } else if (result.status === 'error') {
      this.message.set(result.message);
    }
  }

  protected cancel(): void {
    void this.router.navigate(['/listini']);
  }

  /** Per il guard di uscita: modifiche in sospeso non ancora salvate. */
  hasUnsavedChanges(): boolean {
    return !this.saved && (this.form()?.hasUnsavedChanges() ?? false);
  }

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: Event): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }
}
