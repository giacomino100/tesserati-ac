import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AUTH_BACKEND } from './core/auth-backend';
import { FirebaseAuthBackend } from './core/firebase-auth-backend';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: AUTH_BACKEND, useFactory: () => new FirebaseAuthBackend() },
  ],
};
