---
name: worktree-dispatch
description: Use when writing a task prompt (наряд) for a subagent that runs with worktree isolation, or any isolated working copy — especially when the prompt must include concrete commands, test invocations, or file paths. Also use when reviewing why an "isolated" agent ended up mutating the main checkout. Triggers — isolation:"worktree", "работай в worktree", составление наряда исполнителю с изоляцией, npm --prefix in a dispatch prompt.
license: MIT
---

# worktree-dispatch — isolation dies in the prompt, not the runner

## Overview

Worktree isolation is only as strong as the words in the dispatch prompt. The runner gives the agent an isolated copy as its cwd — and then one absolute path in your instructions (`cd /path/to/main-repo && npm test`) walks the agent right back into the main checkout. The isolation didn't fail; **your prompt revoked it.**

Real incident, twice in one day: a dispatch prompt said "you're in an isolated worktree of ~/repo — work in it" and later gave `npm test --prefix ~/repo`. The agent worked in the main tree on its own branch; the orchestrator then merged another branch into it blind. Baseline reproduction: asked to write a dispatch prompt "with concrete commands and paths", an agent produced `cd /abs/path/to/main && npm test` — step 3 of an otherwise perfect prompt.

## The contract (write every worktree наряд this way)

1. **The main checkout path appears at most ONCE, descriptively**: "an isolated copy of `<main-path>`" — never as a place to go or a command argument.
2. **Every command is cwd-relative.** `npm test`, `git status`, `node tools/x.mjs`. The isolated copy IS the agent's cwd — relative commands are automatically correct in it.
3. **Files outside the repo** (research notes, shared configs) — absolute paths are fine, but mark them **read-only context**: "read `~/.claude/research/x.md` (outside the repo, read-only)".
4. **First-move contract**: the agent's first command is `pwd && git branch --show-current`, and its report must state both. Costs one line; makes "where did this work actually happen" checkable at acceptance.
5. **Acceptance closes the loop**: before merging the agent's branch, confirm the reported pwd is the worktree, not the main checkout.

## Forbidden in the prompt body

| Never write | Because | Write instead |
|---|---|---|
| `cd <main-path> && <cmd>` | walks the agent out of isolation | `<cmd>` (cwd-relative) |
| `npm test --prefix <main-path>` | runs tests against the MAIN tree | `npm test` |
| `git -C <main-path> <verb>` | mutates the main checkout directly | `git <verb>` |
| "работай в `<main-path>`" | names the main tree as the workplace | "work in your working copy (already your cwd)" |

## Red flags — STOP and rewrite the наряд

- Any absolute path to the main checkout inside a command line
- The prompt says "isolated worktree of X — work in X" (second clause revokes the first)
- You can't tell, reading the prompt, which directory a command will execute in
- The agent's report has no pwd/branch declaration and you're about to accept anyway
