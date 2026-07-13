---
name: skill-lifecycle
description: Use when solving any non-trivial task in this ecosystem — before doing it by hand; when skill matching returns weak/none; when a used skill misfired or felt inadequate; when the same class of task keeps coming back; when tempted to say "there's no skill for this, I'll just do it by hand". Триггеры (RU) — «найди скилл», «нет подходящего скилла», «сделаю руками», повторная задача одного класса, провал скилла.
license: MIT
---

# Skill Lifecycle

## Overview

A skill that stays in one session is forgotten by the next. This skill closes the loop: **match → (criteria) → acquire → create → improve**, so every decision either reuses a proven capability or leaves a trace for the future.

The deterministic part is run by a small router, `node tools/skill-match.mjs` (relative to this skill's own directory) — it does matching, usage logging, `--feedback`, `--stats`, `--gaps`. The judgment steps below are this protocol.

## Stage 0 — MATCH (always, free)

```bash
node tools/skill-match.mjs "<task in your own words>" --json
```

Runs in well under a second. Don't ask yourself "do I need to search" — running it is mandatory for any non-trivial task. `strong` confidence → read the SKILL.md of the top result and use it.

## Trigger criteria (expensive stages — only past this gate)

`weak`/`none` does **NOT** mean "this task has no skill for it". Ask yourself three questions honestly, out loud in your reasoning:

1. **Will it repeat?** Is this task part of a regular class (documents, releases, reports, generating artifacts, checks) — or a genuine one-off?
2. **Would I get it wrong without instructions?** Are there standards/regulations/ordering traps/house style where improvising would produce a defect or inconsistency?
3. **Does someone else need this too?** Should other engines/future sessions be able to do the same thing?

**≥2 "yes" → go through the stages below. 0–1 "yes" → do the task by hand — but still leave feedback (see Stage 3).**

Data beats intuition: `--gaps` shows whether this class of task has come up before and stayed without a skill — 2+ repeats in the gaps log is an automatic "yes" to question 1.

## Stage 1 — ACQUIRE (find it in the world)

1. `gh search repos "<2-3 key words> skill claude" --sort stars --limit 10`
2. Catalogs: agentskills.io · plugin marketplaces (the ponytail/superpowers ecosystem) · awesome-claude-code
3. Found something worth it → install it (`/plugin marketplace add <owner>/<repo>` + `/plugin install`, or clone into your skills directory and enable it per your host's convention) → re-run match (should now be `strong`).
4. Read third-party skills before installing — skills execute as code inside your trusted context.

## Stage 2 — CREATE (write it yourself)

Nothing suitable exists in the world → create it. **REQUIRED SUB-SKILL:** `superpowers:writing-skills` (Iron Law: baseline failure BEFORE writing the skill). Quality checklist: the official Anthropic Agent Skills best-practices doc (`platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices`). Place it in your skills directory, e.g. `~/.claude/skills/<name>/SKILL.md`, then enable/sync per your host and repeat Stage 1.3.

## Stage 3 — FEEDBACK (always, even without a skill)

- Used a skill → `node tools/skill-match.mjs --feedback <skill> ok|fail --note "<what was wrong>"` — a `fail` note should be specific, it becomes the spec for the improve stage.
- The match was noise → `--feedback <top-match> fail --note "irrelevant to the request <...>"`.
- Did it by hand with no skill → write nothing: match already logged the gap, `--gaps` will surface it.

## Stage 4 — IMPROVE (data-driven)

`--stats` surfaces a candidate (fail≥2 and fail>ok) → re-read its SKILL.md against the fail notes, improve it against the checklist, re-run the verification scenario. Improving a skill = editing a skill ⇒ the `writing-skills` Iron Law applies.

## Stage 5 — HARVEST (reap lessons from shared memory)

Mistakes that live only in the log get repeated. Regularly (weekly review / after a major task) pull failures and lessons from your shared ledger — e.g. `npx samemind ledger status` (open failures) and recent `fail`-events — or run `tools/skill-match.mjs --harvest` if your team logs to a journal it can read.

Owner-grade thresholds:

- **A substantive mistake needs to happen only ONCE.** A behavior/method error (lost lines in a merge resolve, skipped post-release smoke, false "done", a skill's blind spot) → convert immediately: IMPROVE the existing skill (if it's that skill's blind spot) or CREATE a new one. The three questions are not needed — the mistake itself already answered "yes" on the cost of repetition.
- **Reproducibility gate — when the mistake involves a tool or the environment.** A tool refusal, permissions, config, version, sandbox: before CREATE/IMPROVE from a single occurrence, first reproduce the failure or find a second independent witness in the ledger. A one-off, unreproduced environment failure codified into a skill becomes learned helplessness — agents will route around a healthy tool forever (precedent: hermes-agent#6051, where a transient failure was captured as "this tool doesn't work" and the avoidance outlived the fix). No repro and no second witness → record it as a candidate (a note / `--gaps`) and convert on its second appearance. A purely behavioral mistake (no environment involved) needs no gate — the once-threshold stands.
- **External failures don't count.** server errors, network timeouts, a crashed service — that's not a skill lesson; it gets a fix/retry, not a skill.
- **Neutral lessons** (a discovery without a mistake) — go through the three questions as usual.

A lesson converted into a skill never repeats on any engine; a lesson left as a log entry repeats on the next one. One repetition is the maximum you allow yourself.

## Rationalizations — don't say these to yourself

| Excuse | Reality |
|---|---|
| "This isn't skill-shaped, it's just a direct operation" | That's a conclusion from THREE QUESTIONS, not a feeling. A "direct operation" that repeats ten times ten different ways is exactly a skill's job. |
| "The catalog confirms there's no skill — so it's not needed" | Absence + repetition reads the opposite way: time to create one. |
| "The library is already installed — I'll just do it" | Having a tool ≠ having a codified skill. A skill is also the calling conventions. |
| "Noisy match — whatever" | A noisy match without fail feedback means the router never gets smarter. |
| "No time to write it up" | Stage 3 is one command. Stage 2 only fires on ≥2 "yes" — that's rare. |

## Red Flags — STOP and return to the protocol

- Solved a task by hand without running match first
- Said "not skill-shaped" without asking the three questions
- weak/none → straight to manual work, skipping the questions
- Used a skill — didn't leave feedback
- Editing a skill without a baseline test

## Quick Reference

| Situation | Action |
|---|---|
| Any non-trivial task | match (fast, always) |
| strong | read the top result's SKILL.md, apply it, then feedback |
| weak/none | 3 questions → ≥2 "yes": acquire→create; otherwise by hand |
| a skill let you down | `--feedback <skill> fail --note` |
| periodic review | `--stats` (improve candidates) + `--gaps` (catalog gaps) |
