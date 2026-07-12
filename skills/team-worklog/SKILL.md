---
name: team-worklog
description: >-
  Use at the start of any non-trivial task in a multi-agent/multi-engine setup — to see
  who did what, at what stage, and what's still open or broken — and throughout the
  work, to record steps, failures, and results, so any other agent or engine can pick up
  the context. Триггеры (RU) — «worklog», «летопись», «журнал работ», «что делалось / на
  какой стадии», перед началом задачи, при сбое, при сдаче. Cross-engine shared journal
  for teams running several AI engines/agents against the same codebase or project.
license: MIT
---

# Team worklog — a shared append-only ledger across engines

A single append-only event log: who, when, what was done, what failed, what came out of
it, what stage things are at right now. **Append-only: never edit or delete another
engine's entries** — only add your own.

The mechanism used here is the `ledger` command of [`samemind`](https://www.npmjs.com/package/samemind)
(`npx samemind ledger …`) — a small, git-native, dependency-light memory tool. You don't
need to build your own journal script: `samemind` ships this ledger as one of its
commands, and it's the same public package this skill's author uses in production. If
your team already has its own shared-journal mechanism, adapt the steps below to it —
the discipline (read first, log meaningful steps, always log failures) is what matters,
not the specific CLI.

## 1. ENTRY — read before you start work

Before picking up a task, pull the current context:

```bash
npx samemind ledger status                    # what's where, at what stage
npx samemind ledger read --topic <topic-id> --limit 20   # full history of one topic
```

Draw conclusions: don't redo what's already done; check for open failures on your topic before starting.

## 2. DURING WORK — log meaningful steps

One entry per meaningful step/decision/failure — not per tool call (that's noise), but at
the points that matter: started, a key decision, an intermediate result, a failure, handed off.

```bash
npx samemind ledger append \
  --actor <your-engine-or-agent-id> \
  --topic <stable-id: branch / ticket / task slug> \
  --phase <start|step|done|fail|block|note> \
  --status <ok|wip|partial|fail> \
  --action "what exactly was done/decided/broke — fold in the next step here if there is one"
  [--artifact <branch/commit/file>] [--ref <issue/link>]
```

## 3. EXIT — record the outcome

- Success: `--phase done --status ok` (+ `--artifact` with the commit/branch).
- Failure/blocked: `--phase fail` (or `block`) `--status fail --action "what broke — and what's needed next"`. **Always log a failure** — otherwise it's invisible to the next agent.

## Rules

- **`topic` is a stable identifier** (one branch/task = one topic id), otherwise events won't group into a coherent timeline.
- **`actor` is your own engine/agent name** — that's how anyone reading the ledger later can tell who did what.
- A failure with no entry is a lost failure. Always log `fail`.
- Don't invent progress — write only what actually happened.
- Never edit someone else's entries — only append your own.

## Examples

```bash
# on entry
npx samemind ledger status

# started
npx samemind ledger append --actor grok --topic auth-refactor --phase start --status wip \
  --action "picked up the task: refactor authorization"

# hit a failure
npx samemind ledger append --actor grok --topic auth-refactor --phase fail --status fail \
  --action "tests fail on refresh-token — need to fix the TTL and re-run"

# handed off, done
npx samemind ledger append --actor grok --topic auth-refactor --phase done --status ok \
  --action "authorization refactored, tests green" --artifact "auth-refactor@a1b2c3d"
```

## Why a ledger instead of ad hoc notes

Without a shared ledger: every engine keeps its own private sense of "what's done", two
agents redo the same work, and a failure one engine hit gets silently repeated by the
next one that picks up the same topic. The ledger is the one place any engine — human or
AI, on any host — can check first and append to last.
