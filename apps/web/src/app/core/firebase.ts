import { isDevMode } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase.config';

/** Progetto usato da emulatori e test: il prefisso `demo-` impedisce di toccare la produzione. */
export const EMULATOR_PROJECT_ID = 'demo-tesseramento';

const dev = isDevMode();

// In sviluppo l'app e gli emulatori vedono lo stesso progetto (ricerca R4b).
const app = initializeApp(dev ? { ...firebaseConfig, projectId: EMULATOR_PROJECT_ID } : firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

if (dev) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
