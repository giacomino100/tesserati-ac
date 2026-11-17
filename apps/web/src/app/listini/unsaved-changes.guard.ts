import type { CanDeactivateFn } from '@angular/router';

export const UNSAVED_MESSAGE = 'Hai modifiche non salvate. Vuoi uscire senza salvare?';

/** Pagine con un modulo che può avere modifiche in sospeso (FR-014). */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Cambio di rotta: se ci sono modifiche non salvate chiede conferma. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() || window.confirm(UNSAVED_MESSAGE);
