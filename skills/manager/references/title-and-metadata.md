# Issue title convention — manager reference

## Issue title convention

All new issues created by manager follow a fixed formula — canonical operational layer for agents (predictable parsing, search, groupBy).

### Formula

```
{object} — {action} ({when / context})
```

Visible domain prefixes (`product:`, `content:`, `ops:`, `infra:`, `epic:`, etc.) are **NOT** written in the title. Type metadata lives in labels, the parent tree, Projects, and body.

| Segment | What | Examples |
|---------|------|----------|
| **`{object}`** | Recognizable subject first (noun) | `<track-A>`, `<product> L3`, `<person-name> S2`, `<handle>` |
| **`{action}`** | Verb + short scope | `prep for meeting <date>`, `process response + intake + slot` |
| **`{when / context}`** | Date/window/week in parens at end; optional | `(by <date>)`, `(<date> <time>)` |

### Rules

1. **No domain prefix in title.**
2. **`{object}` is a noun first** for search ease (groups all of that track's tasks).
3. **em-dash (—) separator** between object and action — visual anchor, easy to parse.
4. **Date in parens at the end**, not the middle. Predictable placement.
5. **No emojis in title** — clutter search and sorting.
6. **Accept old prefixed titles as legacy aliases** in search/read. Do not auto-rename — only rename if user explicitly asked for bulk-rename.

### Where type metadata actually lives

| Metadata | Location |
|----------|----------|
| Work type | labels (use your own taxonomy): `type:<work-type>`, `area:<domain>`, lifecycle labels |
| Track hierarchy | GitHub Sub-issues parent tree |
| Weekly visibility | W-label + Project placement |
| Owner / source | repo, Project, body fields |
| Root / epic status | sub-issues summary + body; no `epic:` prefix needed |

### Product / runtime sub-patterns

| Situation | Pattern | Example |
|-----------|---------|---------|
| Bot / funnel / runtime feature | `<product or surface> — <fixed user behaviour> (<week/context>)` | `<bot handle> — duplicate request status without queue reset (W23)` |
| Ops discovery / runbook | `<system> — <operational capability or runbook>` | `<service> ops — one-off container commands via ssh (W23)` |

If a title is only understandable knowing a screenshot, a person's name, or a debugging-session history — the title is too situational. Details go in `## What was done`, `Evidence`, `Updates`; the title reflects the product outcome.

### Examples

- `<track-A> — prep meeting <date> + budget by <date>`
- `<person-name> (<handle>) — process response + intake + slot`
- `<product> L3 — final prep for live (<date> <time>)`
- `<channel> — post recap <month> YYYY`

### Anti-patterns

- ❌ `🔥 <track>: KP` — emoji + domain prefix
- ❌ `prep meeting on <date> for <track>` — verb-first instead of noun-first
- ❌ `ops: all about <event>` — domain prefix + too generic, no concrete action
- ❌ `partner: <track> → divergence ⚠️ overdue` — prefix, arrow instead of em-dash, emoji

## Definition of done — body must be verifiable

When manager **creates** an issue or **reformats** an existing one, the body MUST contain verifiable completion criteria.

**Required minimum:**
1. **Concrete scope checklist `- [ ]`** — what is specifically in scope, each item observable as done / not done.
2. **Explicit "considered done when…"** — a closing condition tied to a verifiable artifact or observable behaviour.
3. **Pointer to the source of scope** — where this scope came from: a skill section, a research report, a CRM slug, a parent epic, a meeting transcript.

**Vague one-liners without specifics are FORBIDDEN.** An issue body that cannot be verified against reality = malformed.

- ❌ `Implement rules from report X` — unclear which rules, which file, and when it's done.
- ✅ `- [ ]` checklist of concrete items + `done when rules are encoded in <skill>/SKILL.md § …` + link to source report.

If manager touches an existing vague issue (one-liner with no DoD), it adds the scope checklist + acceptance condition + source pointer in that same sync. Part of standard write sync under standing authorization.

## Update vs create decision

**Default: update issue body, NOT add a comment.** Body = single source of truth, readable as one document. Comments stack chronologically and become unreadable after 5+ entries.

| Situation | Action |
|-----------|--------|
| Existing issue covers same scope, same track | **Edit body** — refresh "Status:", "Next:", and dated line in `## Updates`. Verify W-label is current AND parent epic attached AND Project placement present. |
| Existing issue scope is narrower but session expanded scope | Edit body of existing + create new follow-up issue with expanded scope, child of the same epic. |
| Multiple existing issues match different aspects (parent epic + sub-issue) | Edit body of the most specific child; touch epic only if its body needs updating. |
| No existing issue matches, but track is in tasks index | Create new issue. First resolve parent epic. W-label current, Project placement set. |
| No existing issue, no track in tasks index, fresh artifact | Ask user which repo + which epic before creating |
| Existing issue covers 2+ sibling scopes or belongs to a forecast/pipeline/operating review | Treat as aggregate issue. Find a repo-local aggregate epic first; if none, propose umbrella or split. |
| Existing child has a parent API link but appears flat in Project view | Do not reparent first. Verify parent Project placement + status lane; fix the parent Project item before changing hierarchy. |
| Found related issue with same subject but different scope | Keep as `Related` context only. Update/create a separate primary issue for the new standalone action. |

### Comment is fallback, not default

Use a comment ONLY when:

- **Work-record after real session work on the issue** — one mandatory timeline comment per (session × issue): what was done + `refs`/SHA. This is the one case where a comment is required *in addition to* the body update (Iron invariant 6). One such comment per session per issue; don't stack — consolidate into body.
- The note is genuinely chronological and ephemeral (e.g. "blocked by external party until <date>") — would clutter body.
- User explicitly asked for a comment.

**Anti-pattern signal:** if you're about to write the third progress comment on an issue — that's two too many. Edit body instead.

### Body update mechanics

Manager owns the read-modify-write pattern: `gh issue view` → local body file → `gh issue edit --body-file`, with refreshed `Status` / `Next` / `## Updates`. Use standard `gh` CLI directly.

## Issue body template (when creating new)

Before writing any body to a **public** repo: replace private absolute paths, internal slugs, personal handles, payment facts, raw meeting/messaging URLs, and local-only evidence with safe public pointers. If no safe public pointer exists, record the private pointer only in the private/internal owner repo. Surface this as a blocker in the sync plan when applicable.

```markdown
<one-line context: what changed/what was made>

**Source artifact:** <clickable GitHub URL — committed & pushed>
**Date:** <YYYY-MM-DD>
**Track:** <link to CRM card if commercial — see CRM integration>

## What was done
<2-4 bullets — actual progress>

## Scope
- [ ] <concrete item, observable as done/not-done>
- [ ] <concrete item>

## Next step
<one line — what closes this issue (acceptance condition)>

## Related

- <repo>#N «human-readable title» — brief reason for the link

**Verified:** <YYYY-MM-DD> by manager

---
Synced by manager from session <YYYY-MM-DD>.
```

Add the `## Related` block **only when there are verified context links** — omit the whole block (don't leave it empty or with placeholder text) when there are none.

## Body update template (default)

```markdown
<one-line context: what changed/what was made — same as before, refresh if scope changed>

**Status:** <active / blocked / pending external / done — only "done" if user said so>
**Next:** <one-line next concrete step — refresh on each sync>

[... rest of original body content — REMOVE any old `## Related` block before re-writing ...]

## Related

- <repo>#N «human-readable title» — brief reason for the link

**Verified:** <YYYY-MM-DD> by manager

## Updates

- **YYYY-MM-DD:** <2-4 bullets of progress / decisions> (code: <repo>@<sha>)
- **YYYY-MM-DD:** <previous sync entry, kept>
```

Remove any stale `## Related` block from the preserved original content, then insert at most one fresh verified block (omit when there are no real context links). Newest update at top of `## Updates`, oldest at bottom (pick once per issue and stay consistent).

## Comment template (fallback only)

```markdown
**YYYY-MM-DD:** <one-line note that doesn't fit body — e.g. "external blocker until X", "transient state observation">
```

Work-record comment (the required case) lists what was done this session + `refs`/SHA. Keep comments short. If a comment grows beyond 4 lines — it belongs in body.

## Output format

### Issue reference format (CRITICAL)

**Always use `<repo>#N — «human title»` form when surfacing an issue to the user.** Bare `<repo>#27` is unreadable — the user needs the title to recognize the track at a glance.

- ❌ Bad: `<repo>#27 → comment + W19`
- ✅ Good: `<repo>#27 «<track-A> — respond to brief» → comment + W19`

### Write mode — plan (BEFORE execution)

Compact plan. Each line: what I'll do + where + why. Group by track. Under each track, first line — **epic** (parent issue), then sub-issues with `parent: OK / parent: MISSING` marker. Decisions / ambiguities — inline as questions.

```
Sync plan (W18, <date>):

<track-A> · epic crm#15 «<track-A> — B2B deal overview»
- crm#27 «<track-A> — respond to brief»  [parent: crm#15 ✓; W18 ✓; Project ✓]
  → body update + work-record comment; status → In progress
- crm#25 «<track-A> — prep meeting <date>»  [parent: crm#15 ✓; W18 ✓; Project ⚠️ missing]
  → comment "both meetings done"; add to Project; close if scope done, else keep open with reason

Labels to create: W19 in $YOUR_OWNER/crm
Epics missing coverage: (none)

Uncommitted in crm: meetings/<date>.md (new) — commit before sync?

Proceeding under standing authorization. If scope looks wrong — stop / correct.
```

If a track has **no working epic**, surface separately:

```
⚠️ Epic missing: track «<X>» has no parent epic. Options:
   - Create crm#NEW «<X> — overview» as umbrella; all 3 issues below become sub-issues.
   OR
   - Use existing <repo>#N «<title>» (sub_summary total=N) — ask if ambiguous.
```

### Write mode — report (AFTER execution)

```
Done:
- crm#27 «<track-A> — respond to brief» — body update + work-record comment + W19; parent crm#15 ✓; Project → In progress
- crm#42 «<track-B> — scope expanded» — created, child crm#10, W18+W19, added to Project
- W19 label created in $YOUR_OWNER/crm

Skipped per your decision: crm#25 «<track-A> — prep…» — left open
```

### Read mode

Compact table — always with a «Title» column, parent epic in its own column, a Project column, no bare numbers:

```
Query: «what about <track-A>»

Epic of the track: crm#15 «<track-A> — B2B deal overview» (3/5 done)

Open sub-issues:
| Issue | Title | Parent | W-label | Project | Activity | Status |
|-------|-------|--------|---------|---------|----------|--------|
| crm#27 | <track-A> — respond to brief | crm#15 ✓ | W18 ✓ | ✓ | <date> | Active — KP due <date> |
| crm#25 | <track-A> — prep <date> | crm#15 ✓ | W18 ✓ | ✓ | <date> | Both meetings done — likely stale |
| presentations#9 | <track-A> — deck audit | — ⚠️ | W18 ✓ | ⚠️ | <date> | No parent + missing from Project, attach to crm#15 |

In tasks index:
- 🔥 W18 priority 4 — «KP for <track-A> by <date>»

Not covered (gap):
- No issue for writing the KP itself (only prep). Create on next sync?

Track health check:
- 1 issue without parent epic — presentations#9. Attach on next sync.
- 1 issue missing from Project — presentations#9.

Drift in index / epic state:
- (optional) crm#15 epic — 5/5 sub-issues done, state OPEN. Candidate to close.

Filtered (false positives):
- crm#1 «<unrelated> — complete» — surfaced via W18 label, unrelated to <track-A>
```

When a track has a multi-level epic hierarchy (root → lanes/children → grandchildren), output the read-mode report as a **tree, not a flat list**: each line carries parent status, W-label status, and Project placement. Active / current-week issues missing a Project slot are flagged `Project mismatch`.

## Cross-references

- For weekly index management (when current week changes): see `weekly-planning` skill.
- For retro-driven backlog (when `retro:W*` labels appear): see `weekly-retro` skill — these labels carry historical signal, don't strip.

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Closing issues without explicit user instruction | Comment-and-leave-open is default. Only close if user said "close" or scope is fully delivered AND user mentioned completion. |
| Closing a delivery issue after local smoke only | A conducted live/session/workshop is not delivered until: recording/artifact ID or exact blocker recorded, the runtime/published artifact validated (not just locally), and the user-facing URL smoke check passes. Keep open with the exact open child otherwise. Don't infer enrollment/payment from view counts — verify against the authoritative source. |
| Removing legacy labels (`retro:W17`, etc.) for "tidiness" | Don't strip labels you didn't add. Append new W-label, leave legacy. |
| Picking single W-label for cross-week task | If a task spans current + next week, apply both. |
| Creating new issue when a comment in an existing one fits | Search broadly first (multiple keys / batched GraphQL). Only create if scope clearly diverges. |
| Skipping W-label create when missing in repo | Iron invariant — create the label (fast-path), don't skip. |
| Creating/touching an issue without a parent epic | Iron invariant — surface in proposal, don't be silent. |
| Treating W-label as sufficient | Need W-label + parent + Project placement (lane not empty). |
| Treating the API parent as sufficient | Verify the visible root Project item and its status lane. |
| Attaching one issue to two epics | GitHub supports one parent. Split into two issues, or treat as aggregate. |
| Markdown `Parent: #N` in body when API link exists | Duplicate, goes stale. Parent — only via Sub-issues API. |
| Missing SHA when commits exist | The `## Updates` entry must list short SHAs of session commits per touched repo. |
| Local `~/...` path as a deliverable link | Commit + push first; the body/report link is a clickable GitHub URL. |
| N×`gh issue view` one-by-one | Use batched GraphQL; single calls are a pointed fallback only. |
| Closing/syncing after real work without a work-record comment | Iron invariant 6 — add the timeline comment. |
| Not respecting the public-repo gate | Before writing to a public repo, do not add private / CRM / personal details; if unsure — surface in proposal and ask. |
| Treating tasks index as a task list to mutate | The tasks index is read-only context for manager. Index is curated by user / `weekly-planning`. |
| Acting on uncommitted local changes as "done" | Surface uncommitted work in the report; don't link a not-yet-pushed artifact. |
| Silently filtering false-positive matches | Drop from primary results but show in `IGNORED (false positives)`. |
| Treating every invocation as write mode | Check first: artifacts (write) OR question about state (read)? Use the mode resolution diagram. |
| Asking the user to open a URL/issue/file manually | Never. Bring the content back via `gh issue view <repo>/<N> --comments` yourself. |
| Bare issue numbers | Always `<repo>#N «title»`. Numbers are unrecognizable. |

## Anti-patterns

- **Creating an issue without a parent epic** — breaks iron invariant. Surface in proposal, don't create orphan.
- **Creating new track-labels** — no longer done. Differentiation = title + epic membership.
- **Domain prefix in title** — superseded. Type metadata lives in labels/parent-tree/Projects.
- **Attaching one issue to two epics** — one parent per issue. Reconsider scope or treat as aggregate.
- **Markdown `Parent: #N` / `Epic: #N` in body when parent is set via API** — duplicate, goes stale.
- **Treating prose as Project-placement evidence** — use live `projectItems` reads, not "should be on the board".
- **Auto-closing stale issues** — never. Surface to user, leave open.
- **Mutating tasks index** — manager is read-only on it.
- **Silent skip on tasks-index drift** — surface explicitly so the user can re-curate.
- **Silent skip on epic stale-open** — epic with 100% sub-issues done but `state = open` is a real signal; surface as candidate-to-close, never auto-close.
- **Single mega-comment dumping whole session** — one comment per issue, scoped to that issue's track.
- **Creating issues across repos for the same artifact** — one artifact = one primary issue.
- **Skipping search** — always search before create. Bias toward update.
- **Dumping full investigation output to chat** — readings are silent; only the proposal is visible.
- **Asking the user to re-list session artifacts** — infer from conversation context.
- **Bare issue numbers** — always `<repo>#N «title»`.
- **Skipping tasks index before gh search** — pre-flight is not optional.
- **Adding comments instead of updating body** — body is the main channel; comment only for work-record / genuinely ephemeral notes.

## CRM integration (optional)

Activate by setting `crm_path` and `crm_pointer_format` in your CLAUDE.md config.

When CRM integration is enabled, every commercial / communication-related issue body must include a pointer to the corresponding CRM artifact (person card, opportunity card, meeting note). Default pointer format is `[[<slug>]]` (Obsidian wiki-link style), but you can configure any format your CRM uses.

For commercial / mentoring tracks, keep money out of the GitHub task body — price, package balance, paid/won status, and deal-close language live in CRM or the sales ledger. The issue body carries `[[<slug>]]` and a one-line pointer instead.

```markdown
**Track:** [[<opportunity-slug>]]
```

Manager checks the CRM path exists when activated; if it doesn't — surfaces a one-line warning and proceeds without the pointer requirement.

## Key reminders (recency — duplicate the critical)

**Before any gh call:** read the tasks index → otherwise it's shotgun search.

**Every issue must carry:** W-label + parent (Sub-issues API) + Project placement (non-empty status lane).

**Write mode always:** `In progress` on touched active issues; work-record comment on real work; commit↔issue SHA linkage; body is the channel, comment is the audit trail.

**Title:** `{object} — {action} ({when})`, no domain prefix; type metadata lives in labels/parent/Projects.

**Standing auth:** follow your configured mode — `execute-after-plan` runs scoped writes after the plan without a separate "confirm"; `ask-each-time` (default) shows the plan, then asks. Either way, ask on genuine ambiguity / hard blocker.

**Output language follows the project.** Technical tokens (`<repo>#N`, `W18`, commands) stay as-is.
