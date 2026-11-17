import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AUTH_BACKEND } from './core/auth-backend';
import { FirebaseAuthBackend } from './core/firebase-auth-backend';
import { FEE_SCHEDULE_BACKEND } from './listini/fee-schedule-backend';
import { FirestoreFeeScheduleBackend } from './listini/firestore-fee-schedule-backend';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: AUTH_BACKEND, useFactory: () => new FirebaseAuthBackend() },
    { provide: FEE_SCHEDULE_BACKEND, useFactory: () => new FirestoreFeeScheduleBackend() },
  ],
};
