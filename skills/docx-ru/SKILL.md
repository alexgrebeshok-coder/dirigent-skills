---
name: docx-ru
description: >-
  Use when creating, editing, or exporting Russian business documents (docx/pdf) —
  proposals (КП), memos (справка), reports (отчёт), letters (письмо), memoranda,
  contract appendices, counterparty document packages. Триггеры (RU) — «сделай docx»,
  «оформи документ», «деловой текст», «собери комплект», «выгрузи в word/PDF». Always
  applies a fixed Russian business formatting standard: Times New Roman, black text,
  Russian terminology, «Оглавление» (not "Table of Contents"), a pre-send checklist. Do NOT use for analytical/DD documents with semantic table formatting — use docx-analytical-ru.
license: MIT
---

# Russian business documents (DOCX/PDF)

**Read this skill in full before assembling any docx.**
Terminology details and checklists: [`references/delovoy-stil-i-oformlenie.md`](references/delovoy-stil-i-oformlenie.md).

## Hard rules

1. **Table of contents** — always «Оглавление», never "Table of Contents".
2. **Font** — **Times New Roman**, body text **12 pt**, color **black** (RGB 0,0,0). Headings — same font, 14–16 pt bold is fine, but no "font zoo" of sizes within one document.
3. **Language** — documents for people/counterparties use **Russian only**. Replace English legal/business jargon (see the terminology table in the reference). Latin script is fine in URLs, contract numbers, and abbreviations (tax authority names, statute references).
4. **Units** — **₽/м³**, **м³**, **т/км** (Cyrillic «м», not Latin `m`). Check for homoglyphs after pandoc.
5. **Hand-edited files win** — if a docx has already been edited by hand (its file timestamp is newer than the source md), **do not overwrite it from the md**. Copy it as-is.
6. **Nothing internal leaks into the final file** — a finished docx must not contain: "internal note", "draft", "do not send", "hardline/compromise variant" labels, fallback markers, negotiation notes.
7. **Beauty = readability** — structure, tables, a summary up top, explanations for figures; never "just run pandoc and ship it".
8. **Exception — analytical documents without a table of contents:** comparative analysis, due diligence, explanatory notes, partner profiles → use the **`docx-analytical-ru`** skill instead (pandoc **without** `--toc`, plus `format_analytical_docx.py`).

## Document types

| Type | Structure | Tone |
|-----|-----------|------|
| Memo / rationale / calculation | Summary → sections → tables → appendices | For a business partner: facts, scenarios, assumptions stated explicitly |
| Letter to a counterparty | Letterhead → body → numbered appendices | Soft, no ultimatums or hard deadlines |
| Appendix to a letter | Heading "Appendix N…" → body only | No other letter's letterhead, no list of someone else's appendices |
| Contract / addendum | Numbered clauses, legal register | No conversational quoting style |

Summary heading for Russian-language external documents: **«Резюме для партнёра»** / **«Резюме»**, not "Executive summary".

## Workflow: md → docx

```bash
pandoc "INPUT.md" -o "OUTPUT.docx" \
  --toc --toc-depth=3 \
  --metadata=toc-title:"Оглавление" \
  --metadata lang=ru-RU
```

**Always** run this after pandoc:

```bash
python3 scripts/normalize_docx.py "OUTPUT.docx"
```

The script sets Times New Roman 12 pt, black text, fixes common homoglyphs and English terms, and optionally sets an appendix heading.

Verify the table of contents:

```bash
pandoc "OUTPUT.docx" -t plain | rg "Оглавление|Table of Contents" | head -5
```

## Workflow: editing a finished docx

1. If the file has already been hand-edited (newer timestamp than its md source) → make targeted edits only, don't rebuild from scratch.
2. Otherwise: edit via `python-docx`, or md → pandoc → `normalize_docx.py`.
3. Document packages: keep uniform formatting across every file in the set; count appendix pages via LibreOffice → PDF.

## PDF

```bash
pandoc "INPUT.md" -o "OUTPUT.pdf" \
  --toc --toc-depth=3 --metadata=toc-title:"Оглавление" \
  --pdf-engine=xelatex \
  -V mainfont="PT Serif" -V lang=ru-RU -V geometry:margin=2.5cm
```

Fallback: docx → `soffice --headless --convert-to pdf`.

## Naming and placement

- Name: `{Type}_{Description}_{DD.MM.YYYY}.docx` (+ `_DRAFT` / `_FINAL` / `_CONFIDENTIAL` where needed).
- Document packages: a folder `Package_{description}_{DD.MM.YYYY}/`.
- Where the finished file lands is a project convention — route it per your own document-store rules.

## Pre-send checklist (chat / counterparty delivery)

**Formatting**
- [ ] Times New Roman, black, ~12 pt, tables not misaligned
- [ ] «Оглавление», not "Table of Contents"
- [ ] ₽/м³, м³ — Cyrillic; no m³ / ₽/m³

**Text**
- [ ] No English legal jargon (take-or-pay, make-up, fallback…)
- [ ] No internal notes or negotiation-track labels
- [ ] Business register consistent with your own house style guide (see the reference file)
- [ ] Letters: soft tone, no ultimatums; appendices numbered, page counts stated

**Content**
- [ ] Figures and cross-references are consistent across the whole document package
- [ ] Statute/regulation references double-checked (no stale or wrong article numbers)
- [ ] Price basis stated (e.g. incoterm / delivery point) — otherwise a margin figure is meaningless

**Gate:** only send to chat / a counterparty **after** the checklist is green. A short ✅/⚠️/🔧 report in the message or a separate note.

## Markdown source (for analytical content)

```markdown
---
title: "..."
subtitle: "..."
date: "DD.MM.YYYY"
audience: "..."
---

# Резюме для партнёра

**Задача:** ...
**Вывод:** ...

---

# 1. ...
```

- Tables — markdown; complex calculations — separate "check" / "comment" columns.
- Number sections for long documents (# 1., # 2.…).
- Add a disclaimer for legal-adjacent content at the end: "аналитика, не юридическое заключение" ("analysis, not a legal opinion").

## Related skills

- **`docx-analytical-ru`** — due diligence, comparative analysis, partner memos (no TOC, bordered tables)
- `pptx` — visual QA for slide decks, if you also build a companion presentation

## If pandoc fails

Show stderr. Don't stay silent. Don't hand over a half-assembled file.
