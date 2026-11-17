import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.state() === 'loading') {
      <div class="page" role="status" aria-label="Caricamento">
        <mat-spinner diameter="40" />
      </div>
    } @else {
      <router-outlet />
    }
  `,
})
export class App {
  protected readonly auth = inject(AuthService);

  /** Quando la scheda torna in primo piano si riverifica che l'utente sia ancora in elenco (FR-006). */
  @HostListener('document:visibilitychange')
  protected onVisibilityChange(): void {
    if (document.visibilityState === 'visible') void this.auth.revalidate();
  }
}
