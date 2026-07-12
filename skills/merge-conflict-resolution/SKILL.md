---
name: merge-conflict-resolution
description: Use when resolving git merge/rebase/cherry-pick conflicts — especially resolving "all in favor of one side", resolving with a script or bulk command, or resolving multiple conflict blocks in one file. Also use before committing any conflict resolution, and when reviewing a merge someone (or some agent) claims is done. Triggers — "разреши конфликт", merge conflict markers, checkout --theirs/--ours, "возьми вариант ветки X".
license: MIT
---

# merge-conflict-resolution — resolve blocks, never replace files

## Overview

A merge conflict file has THREE kinds of content: conflict blocks (both sides shown), **auto-merged lines git already combined for you**, and untouched context. Every data-loss incident in this class comes from treating the file as two-kinds: a resolver that replaces the whole file, or a script that eats the lines *between* blocks.

**Core rule: resolve conflict BLOCKS. Anything that replaces the FILE destroys auto-merged work — silently, with a clean `git status`.**

## The trap that passes every naive check

`git checkout --theirs <file>` does NOT mean "take their side of the conflicts". It replaces the whole file with their version — every line the other side added outside the conflicts is gone. Then:

- `git status` — clean ✓ (loss is staged, status can't see it)
- `git diff --check` — no markers ✓
- `git log --graph` — proper merge commit, two parents ✓

All green, data lost. This exact sequence shipped a deleted "critical security notice" line in a 17-second baseline test, and lost README lines twice in production.

## Doing it right

| Intent | Correct tool |
|---|---|
| All conflicts in favor of one side, merge not started yet | `git merge -X theirs <branch>` (block-level; keeps auto-merged lines) |
| All conflicts one side, conflict already open | Re-do properly: `git merge --abort && git merge -X theirs <branch>`. Or edit only the blocks. |
| Mixed choices per block | Edit each block (by hand or state-machine script), never whole-file commands |
| Whole file genuinely from one side (binary, generated) | `git checkout --theirs` — the ONLY case it's correct; say so in the commit message |

**Script rules** (if you automate block editing):
- Process line-by-line with a state machine (`<<<<<<<` opens, `>>>>>>>` closes). **Never a regex spanning from `<<<<<<<` to `>>>>>>>`** — greedy or multiline matching eats everything between two blocks. This is the production bug this skill exists for.
- Fail fast on anything unmapped (unknown section, nested markers) — crash beats guess.
- Keep the pre-resolution file: `cp file file.conflicted` before touching it.

## Verify before commit — three checks, all mandatory

```bash
# 1. No markers anywhere in the repo (not just the file you edited)
git -C "$R" diff --check && git -C "$R" grep -nE '^(<<<<<<<|=======|>>>>>>>)' -- . ; # grep must find nothing

# 2. NO LINE OUTSIDE CONFLICT BLOCKS WAS LOST — the check that catches --theirs and greedy regex
awk '/^<<<<<<</{c=1} /^>>>>>>>/{c=0;next} !c' file.conflicted > /tmp/outside
grep -Fxvf <resolved-file> /tmp/outside   # must print NOTHING; every printed line was eaten
# (file.conflicted is the copy you kept; recover one with `git checkout -m <file>` if you didn't)

# 3. Each block resolved to the INTENDED side — grep the distinctive line of each choice
```

Only after all three: `git add` + commit. If you resolved during a review/приёмка of someone else's merge — run the same three checks on their result; a clean status is not evidence.

## Rationalizations — heard in real incidents

| Excuse | Reality |
|---|---|
| "`checkout --theirs` = take theirs in the conflicts" | It takes theirs for the FILE. Auto-merged lines from the other side die. |
| "`git status` is clean, работа сдана" | Status sees staged-ness, not meaning. The loss is *inside* what you staged. |
| "Merge commit has two parents, graph is correct" | Graph proves ancestry, not content. |
| "It's mechanical, one-two commands, 13 more repos waiting" | The 17-second version of this job deleted a security notice. Check #2 costs 5 seconds. |
| "My resolver script printed 'resolved 3 blocks'" | It resolved what it matched. Verify what it *didn't* match survived. |

## Red flags — STOP

- Typing `checkout --ours/--theirs` on a text file while auto-merged changes exist
- A conflict-parsing regex with `[\s\S]*?` or multiline mode across markers
- Declaring a merge done having checked only `git status` / `git log`
- No pre-resolution copy and no `checkout -m` recovery before verifying
- Accepting an executor's merge because their report says "conflicts resolved"
