/** Durata massima della sessione: 7 giorni dall'ultimo accesso con Google (spec FR-009). */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Email come ID del documento in `allowedEmails`: senza spazi, in minuscolo. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** True se l'ultimo accesso è più vecchio di 7 giorni o la data manca / non è leggibile. */
export function isSessionExpired(lastSignInTime: string | undefined, now: Date): boolean {
  if (!lastSignInTime) return true;
  const last = Date.parse(lastSignInTime);
  if (Number.isNaN(last)) return true;
  return now.getTime() - last > SESSION_MAX_AGE_MS;
}
