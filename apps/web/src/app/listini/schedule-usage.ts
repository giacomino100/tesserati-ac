import { InjectionToken } from '@angular/core';

/**
 * Dice se per l'anno esistono adesioni (FR-011). Le adesioni arrivano con la specifica 004 e
 * seguenti: finché non esistono la risposta è sempre `false`.
 */
export interface ScheduleUsage {
  isInUse(year: number): Promise<boolean>;
}

export const SCHEDULE_USAGE = new InjectionToken<ScheduleUsage>('SCHEDULE_USAGE', {
  providedIn: 'root',
  factory: (): ScheduleUsage => ({ isInUse: async () => false }),
});
