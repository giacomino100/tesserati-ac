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
import { FAMILIES_BACKEND } from './famiglie/families-backend';
import { FirestoreFamiliesBackend } from './famiglie/firestore-families-backend';
import { HOUSEHOLD_FEES_BACKEND } from './quote/fees-backend';
import { FirestoreHouseholdFeesBackend } from './quote/firestore-fees-backend';
import { FirestoreMembersBackend } from './tesserati/firestore-members-backend';
import { FirestoreNewMemberBackend } from './nuovo-tesserato/firestore-new-member-backend';
import { NEW_MEMBER_BACKEND } from './nuovo-tesserato/new-member-backend';
import { FirestoreYearBackend } from './tesserati/firestore-year-backend';
import { YEAR_BACKEND } from './tesserati/year-backend';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: AUTH_BACKEND, useFactory: () => new FirebaseAuthBackend() },
    { provide: FEE_SCHEDULE_BACKEND, useFactory: () => new FirestoreFeeScheduleBackend() },
    { provide: IMPORT_BACKEND, useFactory: () => new FirestoreImportBackend() },
    { provide: MEMBERS_BACKEND, useFactory: () => new FirestoreMembersBackend() },
    { provide: FAMILIES_BACKEND, useFactory: () => new FirestoreFamiliesBackend() },
    { provide: HOUSEHOLD_FEES_BACKEND, useFactory: () => new FirestoreHouseholdFeesBackend() },
    { provide: NEW_MEMBER_BACKEND, useFactory: () => new FirestoreNewMemberBackend() },
    { provide: YEAR_BACKEND, useFactory: () => new FirestoreYearBackend() },
    { provide: SCHEDULE_USAGE, useFactory: () => new FirestoreScheduleUsage() },
  ],
};
