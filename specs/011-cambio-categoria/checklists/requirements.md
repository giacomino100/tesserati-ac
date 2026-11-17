# Specification Quality Checklist: Cambio categoria per età

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Cartella `specs/011-cambio-categoria` (numero della roadmap).
- Verificato sui dati finti (`genera_esempi.py`, anno 2026/27): l'export e il PDF coincidono per tutte le età presenti
  (nessun nato nel 1996, unico caso di disaccordo a 30 anni) → 0 non allineate; gli esempi usano persone inventate
  (ROSSI ELENA, ROSSI LUCIA nate nel 1996). GRECO NICOLO (2011, 15 anni, Giovani) è nei dati finti.
- Nota dell'eccezione: massimo 200 caratteri (scelta di default, come le note brevi; modificabile).
