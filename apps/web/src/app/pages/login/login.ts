import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService, MESSAGES } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [MatButtonModule, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page">
      <mat-card class="card">
        <mat-card-header>
          <mat-card-title>Tesseramento AC</mat-card-title>
          <mat-card-subtitle>Parrocchia San Gioacchino</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Accedi con il tuo account Google per continuare.</p>
          @if (errorMessage(); as message) {
            <p class="error" role="alert">{{ message }}</p>
          }
        </mat-card-content>
        <mat-card-actions>
          <button mat-flat-button type="button" (click)="signIn()">Accedi con Google</button>
          @if (isNetworkError()) {
            <button mat-stroked-button type="button" (click)="signIn()">Riprova</button>
          }
        </mat-card-actions>
      </mat-card>
    </main>
  `,
  styles: `
    .card {
      width: 100%;
      max-width: 420px;
    }
    .error {
      color: var(--mat-sys-error);
    }
    mat-card-actions {
      flex-wrap: wrap;
      gap: 8px;
      padding: 16px;
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  protected readonly errorMessage = this.auth.errorMessage;
  protected readonly isNetworkError = computed(() => this.auth.errorMessage() === MESSAGES.network);

  protected signIn(): void {
    void this.auth.signIn();
  }
}
