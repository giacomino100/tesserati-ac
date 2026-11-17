import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, MatToolbarModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar>
      <span class="title">Tesseramento</span>
      <span class="name" title="Utente connesso">{{ auth.user()?.displayName }}</span>
      <button mat-stroked-button type="button" (click)="signOut()">Esci</button>
    </mat-toolbar>
    <main class="content">
      <header class="intro">
        <h1>Cosa vuoi gestire?</h1>
        <p>Scegli una sezione per iniziare.</p>
      </header>
      <nav class="menu" aria-label="Sezioni principali">
        <a class="menu-item primary" routerLink="/tesserati">
          <span class="menu-title">Tesserati</span>
          <span class="menu-copy">Cerca, conferma o aggiungi una persona</span>
          <span class="arrow" aria-hidden="true"></span>
        </a>
        <a class="menu-item" routerLink="/famiglie">
          <span class="menu-title">Famiglie</span>
          <span class="menu-copy">Controlla e abbina i nuclei familiari</span>
          <span class="arrow" aria-hidden="true"></span>
        </a>
        <a class="menu-item" routerLink="/quote">
          <span class="menu-title">Quote</span>
          <span class="menu-copy">Calcola e verifica gli importi</span>
          <span class="arrow" aria-hidden="true"></span>
        </a>
        <a class="menu-item" routerLink="/listini">
          <span class="menu-title">Listini</span>
          <span class="menu-copy">Gestisci tariffe e fasce</span>
          <span class="arrow" aria-hidden="true"></span>
        </a>
        @if (auth.admin()) {
          <a class="menu-item" routerLink="/importa">
            <span class="menu-title">Importa dati</span>
            <span class="menu-copy">Carica un nuovo elenco Excel</span>
            <span class="arrow" aria-hidden="true"></span>
          </a>
        }
      </nav>
    </main>
  `,
  styles: `
    mat-toolbar {
      gap: 10px;
    }
    .title {
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .name {
      margin-left: auto;
      max-width: 36ch;
      color: var(--app-muted);
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .intro {
      margin: 8px 0 24px;
    }
    h1 {
      margin: 0 0 4px;
      font-size: clamp(1.65rem, 6vw, 2.25rem);
      line-height: 1.15;
      letter-spacing: -0.03em;
    }
    .intro p {
      margin: 0;
      color: var(--app-muted);
    }
    .menu {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .menu-item {
      position: relative;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 2px 16px;
      min-height: 104px;
      padding: 18px;
      color: var(--app-text);
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--app-radius);
      text-decoration: none;
    }
    .menu-item.primary {
      color: #ffffff;
      background: var(--app-accent);
      border-color: var(--app-accent);
    }
    .menu-title {
      align-self: end;
      font-size: 1.08rem;
      font-weight: 700;
    }
    .menu-copy {
      grid-column: 1;
      color: var(--app-muted);
      font-size: 0.9rem;
      line-height: 1.35;
    }
    .primary .menu-copy {
      color: #dcefe7;
    }
    .arrow {
      grid-column: 2;
      grid-row: 1 / span 2;
      align-self: center;
      width: 10px;
      height: 10px;
      border-top: 2px solid currentColor;
      border-right: 2px solid currentColor;
      transform: rotate(45deg);
    }
    @media (hover: hover) {
      .menu-item:hover {
        border-color: var(--app-accent);
      }
      .menu-item.primary:hover {
        background: #0f5b42;
      }
    }
    .menu-item:active {
      transform: scale(0.99);
    }
    @media (max-width: 639px) {
      .name {
        display: none;
      }
      .menu {
        grid-template-columns: 1fr;
      }
      .menu-item {
        min-height: 92px;
        padding: 16px;
      }
    }
    @media (max-width: 359px) {
      mat-toolbar {
        gap: 4px;
      }
      .title {
        font-size: 1rem;
      }
      mat-toolbar button {
        padding-inline: 10px;
      }
    }
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);

  protected signOut(): void {
    void this.auth.signOut();
  }
}
