import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-denied',
  imports: [MatButtonModule, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page">
      <mat-card class="card">
        <mat-card-header>
          <mat-card-title>Accesso non autorizzato</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Questo account non è abilitato. Chiedi di essere aggiunto all’elenco.</p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-flat-button type="button" (click)="signOut()">
            Esci / prova con un altro account
          </button>
        </mat-card-actions>
      </mat-card>
    </main>
  `,
  styles: `
    .card {
      width: 100%;
      max-width: 420px;
    }
    mat-card-actions {
      flex-wrap: wrap;
      padding: 16px;
    }
  `,
})
export class Denied {
  private readonly auth = inject(AuthService);

  protected signOut(): void {
    void this.auth.signOut();
  }
}
