# dirigent-skills

Agent-operations skills for Claude Code: find/acquire/create the right skill instead of
guessing, keep GitHub issues in sync with what actually happened, design a loop before
you launch it, never say "done" without checking, and (for Russian-speaking teams)
produce business documents that meet a fixed formatting standard.

## Skills

| Skill | What it does |
|---|---|
| [`skill-lifecycle`](skills/skill-lifecycle/SKILL.md) | Router + protocol for finding, acquiring, creating, and improving skills — match → acquire → create → improve, with a small BM25 CLI (`tools/skill-match.mjs`) that auto-discovers skills on disk. |
| [`manager`](skills/manager/SKILL.md) | Bidirectional bridge between a work session and GitHub Issues — sync progress into issues (parent epic, W-label, Project placement) or query cross-repo track status. |
| [`looper`](skills/looper/SKILL.md) | Design a loop harness (done-rubric, stop conditions, token budget, independent judge) BEFORE launching any autonomous loop or background agent. |
| [`verify-done`](skills/verify-done/SKILL.md) | No completion claim without fresh evidence — run the real check before saying "done", for code and documents alike. |
| [`docx-ru`](skills/docx-ru/SKILL.md) | Russian business documents (docx/pdf) to a fixed formatting standard — Times New Roman, «Оглавление», a pre-send checklist. |
| [`docx-analytical-ru`](skills/docx-analytical-ru/SKILL.md) | Russian analytical documents (docx/pptx) — due diligence, comparative analysis, partner profiles, bordered tables, no table of contents. |
| [`team-worklog`](skills/team-worklog/SKILL.md) | Shared append-only ledger across engines/agents — read the state before starting, log meaningful steps and failures as you go. |

## Before / after

You ask an agent for something outside its comfort zone.

**Without:** it improvises by hand, learns nothing, and next week the same task
is improvised again — differently.

**With `skill-lifecycle`:** it checks the catalog first (0.1s), searches the world
if the catalog is empty, creates a skill when the task will repeat — and converts
every substantive mistake into a skill after one occurrence. Skills accumulate;
mistakes don't repeat.

## Install

```
/plugin marketplace add <owner>/dirigent-skills
/plugin install dirigent-skills@dirigent-skills
```

Then `/reload-plugins` if your session was already running.

## License

MIT © 2026 Aleksandr Grebeshok — see [LICENSE](LICENSE).

<!-- TODO: expand with before/after examples per skill, badges, and a short usage GIF/screenshot once dogfooded. -->
