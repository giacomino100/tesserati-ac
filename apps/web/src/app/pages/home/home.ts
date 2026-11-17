import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, MatToolbarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <span class="title">Tesseramento AC</span>
      <span class="name">{{ auth.user()?.displayName }}</span>
      <button mat-stroked-button type="button" (click)="signOut()">Esci</button>
    </mat-toolbar>
    <main class="content"></main>
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
    .name {
      margin-left: auto;
      overflow-wrap: anywhere;
    }
    .content {
      padding: 16px;
    }
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);

  protected signOut(): void {
    void this.auth.signOut();
  }
}
