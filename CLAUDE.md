# Tesseramento AC – Parrocchia San Gioacchino

App Angular + Firebase per il tesseramento annuale all'Azione Cattolica: import degli Excel
(ACR, Giovani, Adulti), riconferma delle adesioni, calcolo delle quote per nucleo familiare.

## Metodo: Spec-Driven Development con Spec Kit

- Constitution (regole non negoziabili): `.specify/memory/constitution.md` — leggerla prima di tutto.
- Dominio (fonte di verità): `docs/dominio/` — in particolare `regole-quote.md` (unica fonte: il PDF
  in `docs/dominio/fonti/`), `regole-famiglia.md`, `glossario.md`, `excel-esempio/`.
- Roadmap delle specifiche: `docs/roadmap.md`; brief in `docs/brief/`.
- Ciclo per ogni specifica: `/speckit-specify` → `/speckit-clarify` → revisione umana →
  `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.

## Stato attuale

- Specifica in corso: **002 – Calcolo quota famiglia** (`specs/002-calcolo-quote-famiglia/`),
  branch `002-calcolo-quote-famiglia`. Spec, plan, tasks e analyze completati e approvati.
- Prossimo passo: `/speckit-implement` (29 task in `tasks.md`, test scritti prima del codice).

## Regole pratiche

- Mai dati reali dei tesserati nel repository, nei test o nei log: solo i dati finti di
  `docs/dominio/excel-esempio/`.
- Le regole delle quote seguono solo il PDF: se qualcosa non è previsto, si segnala, non si inventa.
- Codice e identificatori in inglese; interfaccia, documentazione e specifiche in italiano.
- TypeScript 6.0 (richiesto da Angular 22), Node.js 22, Vitest.
