import {
  deleteUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { AuthBackend, SessionUser } from './auth-backend';
import { auth, db } from './firebase';
import { normalizeEmail } from './session';

function toSessionUser(user: User): SessionUser {
  return {
    displayName: user.displayName,
    email: user.email ?? '',
    emailVerified: user.emailVerified,
    lastSignInTime: user.metadata.lastSignInTime,
  };
}

/** Implementazione di AuthBackend con l'SDK Firebase. Non registra mai nome o email nei log. */
export class FirebaseAuthBackend implements AuthBackend {
  onAuthChanged(callback: (user: SessionUser | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => callback(user ? toSessionUser(user) : null));
  }

  async signInWithGoogle(): Promise<void> {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  async deleteCurrentUser(): Promise<void> {
    if (auth.currentUser) await deleteUser(auth.currentUser);
  }

  async isEmailAllowed(email: string): Promise<boolean> {
    const snapshot = await getDoc(doc(db, 'allowedEmails', normalizeEmail(email)));
    return snapshot.exists();
  }

  /** Amministratore (specifica 013): segno `admin: true` messo dalla console sul proprio documento. */
  async isAdmin(email: string): Promise<boolean> {
    const snapshot = await getDoc(doc(db, 'allowedEmails', normalizeEmail(email)));
    return snapshot.exists() && snapshot.data()['admin'] === true;
  }
}
