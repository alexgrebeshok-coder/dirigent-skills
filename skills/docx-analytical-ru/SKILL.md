---
name: docx-analytical-ru
description: >-
  Assembling analytical docx/pptx documents in Russian — comparative analysis, due
  diligence, counterparty checks, explanatory notes, partner profiles, shortlists.
  No pandoc table of contents; bordered tables with background-fill semantics; two
  tones (internal / external). Триггеры (RU) — «аналитика», «DD», «due diligence»,
  «сравнительный», «пояснительная записка», «профиль партнёра», «таблицы с рамками»,
  «без оглавления».
---

# Analytical documents (docx / pptx)

**Reading order:** [`docx-ru`](../docx-ru/SKILL.md) → **this skill** → for pptx, also see the `pptx` skill (if installed) for a visual QA pass.

Terminology glossary: [`references/terminologiya-analitika.md`](references/terminologiya-analitika.md) — the example glossary below is built around one industry niche (data-center power equipment); replace it with your own domain's terms.

## When to use

- Comparative analysis, due diligence, market research
- An internal explanatory note (risks, "who to engage / who not to")
- An external partner profile (without the internal DD block)
- An 8–10 slide deck for the external version

**Do NOT use** for counterparty contract letters or table-of-contents rationale documents — those stay in `docx-ru`.

## Assembling the docx (required steps)

```bash
pandoc "INPUT.md" -o "OUTPUT.docx" --metadata lang=ru-RU   # NO --toc

python3 ../docx-ru/scripts/normalize_docx.py "OUTPUT.docx"

python3 scripts/format_analytical_docx.py \
  --kind compare|research|partner_internal|partner_external "OUTPUT.docx"

bash scripts/validate_analytical_docx.sh "OUTPUT.docx"
```

### `--kind` variants

| kind | Title |
|---|---|
| `compare` | СРАВНИТЕЛЬНЫЙ АНАЛИЗ ПАРТНЁРОВ |
| `research` | ИССЛЕДОВАНИЕ ПАРТНЁРОВ И РЫНКА |
| `partner_internal` | ПОЯСНИТЕЛЬНАЯ ЗАПИСКА (ВНУТРЕННЯЯ) |
| `partner_external` | ПРОФИЛЬ ПАРТНЁРА |

Edit the title/subtitle strings inside `format_analytical_docx.py` for your own project before use — they ship with a generic placeholder partner name.

## Formatting

Inherits from `docx-ru`: **Times New Roman**, black text, **2.54 cm** margins.

Additionally (handled by `format_analytical_docx.py`):

- **No table of contents** — strip TOC / «Оглавление» / the pandoc title block
- **Centered title:** 16 pt bold + 12 pt subtitle
- **Section headings:** 14 pt bold
- **Tables:** borders on every cell; header row `#1F3864` with white text; first column `#F2F2F2`; semantics conveyed via **background fill** (green / yellow / orange) — **not** colored font

## Language

- Russian only in text meant for people (see the glossary reference).
- «Оговорка» instead of "Disclaimer"; «документ 1»/«документ 2» instead of "Doc1"/"Doc2".
- After editing the md source — scan for homoglyphs and stray English words (see the reference).

## Two tones

| | Internal | External |
|---|---|---|
| Risks, financial/tax exposure, hypotheses | yes | no |
| "Do not engage", DD disqualification | yes | no |
| Competencies, scenarios, references | yes | yes |

File names: `{Type}_{Subject}_{description}_DD.MM.YYYY.docx`

## PPTX

- 8–10 slides; Times New Roman; palette `#1F3864` / `#F2F2F2`; no "font zoo"
- Reference template: `scripts/build_analytical_pptx.py` (edit the content, don't copy the whole script per project)
- QA: `python3 -m markitdown file.pptx` + glossary / validate

## Placement

Keep working files, sources, and final exports in whatever project document structure you already use (working / sources / final-published tiers). This skill only handles the assembly and QA — routing the finished file is a project-specific convention.

## Pre-send checklist

**Formatting**
- [ ] No table of contents
- [ ] Bordered tables with background fill, TNR 12 pt
- [ ] Centered title block

**Text**
- [ ] No English terms from the glossary (except URLs / proper names / ISO terms)
- [ ] No homoglyphs
- [ ] External docx has no internal risk blocks

**QA**
- [ ] `validate_analytical_docx.sh` — no unexpected matches
- [ ] Figures consistent across the document package

## Related skills

- `docx-ru` — base typography and normalization
- `pptx` — visual QA for slide decks
