# Tesseramento AC – Parrocchia San Gioacchino

App per gestire il tesseramento annuale all'Azione Cattolica (ACR, Giovani, Adulti):
import degli elenchi Excel, riconferma delle adesioni e calcolo delle quote familiari.

Sviluppata con **Spec-Driven Development** ([GitHub Spec Kit](https://github.com/github/spec-kit)).

## Dove trovare cosa

| Cartella | Contenuto | Chi lo scrive |
|---|---|---|
| `docs/dominio/` | Regole, glossario, Excel di esempio | **Noi** (fonte di verità) |
| `docs/decisioni-tecniche.md` | Scelte tecniche → input della constitution | **Noi** |
| `docs/roadmap.md` | Elenco e ordine delle specifiche | **Noi** |
| `docs/brief/` | Descrizione breve di ogni specifica → input di `/speckit.specify` | **Noi** |
| `.specify/` , `specs/` | Constitution, spec, piani, task | Spec Kit (noi rivediamo) |

## Ciclo per ogni specifica

1. `/speckit.specify` passando il brief
2. `/speckit.clarify`
3. `/speckit.plan`
4. `/speckit.tasks` → `/speckit.analyze`
5. revisione umana → `/speckit.implement`
