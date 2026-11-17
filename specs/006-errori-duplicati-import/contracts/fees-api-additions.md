# Contract: aggiunte a `@tesseramento/fees`

Solo esportazioni additive di funzioni pure già esistenti in `packages/fees/src/age-band.ts`:

```ts
/** Età = anno associativo − anno di nascita. */
export function ageFor(birthDate: string, associationYear: number): number;
/** Fascia per l'età; undefined sotto schedule.minAge. */
export function bandForAge(age: number, schedule: FeeSchedule): AgeBand | undefined;
```

Nessun cambiamento di comportamento; i test esistenti del calcolo (195) restano verdi.
