import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AUTH_BACKEND } from './core/auth-backend';
import { FirebaseAuthBackend } from './core/firebase-auth-backend';
import { FEE_SCHEDULE_BACKEND } from './listini/fee-schedule-backend';
import { FirestoreFeeScheduleBackend } from './listini/firestore-fee-schedule-backend';
import { IMPORT_BACKEND } from './importa/import-backend';
import { FirestoreImportBackend } from './importa/firestore-import-backend';
import { FirestoreScheduleUsage, SCHEDULE_USAGE } from './listini/schedule-usage';
import { MEMBERS_BACKEND } from './tesserati/members-backend';
import { FirestoreMembersBackend } from './tesserati/firestore-members-backend';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: AUTH_BACKEND, useFactory: () => new FirebaseAuthBackend() },
    { provide: FEE_SCHEDULE_BACKEND, useFactory: () => new FirestoreFeeScheduleBackend() },
    { provide: IMPORT_BACKEND, useFactory: () => new FirestoreImportBackend() },
    { provide: MEMBERS_BACKEND, useFactory: () => new FirestoreMembersBackend() },
    { provide: SCHEDULE_USAGE, useFactory: () => new FirestoreScheduleUsage() },
  ],
};
