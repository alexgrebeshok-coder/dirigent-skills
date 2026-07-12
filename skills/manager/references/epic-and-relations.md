# Parent epic rules — manager reference

## Parent epic rules

Every issue (except the epic itself) must have **exactly one** parent via GitHub Sub-issues API. This is machine-readable track differentiation — replaces track-labels and stale markdown pointers in body.

### What counts as an epic

- An issue that has sub-issues (counter `N / M` shown at top)
- Title typically contains track scope (`<program>: <partner> — overview`, `<deal> — overview`, `<product> — delivery <version>`)
- An epic itself does NOT have a parent — it's the root of the tree
- A working epic typically has `total >= 1`, but a new root issue with a clear track scope may be proposed and used as an epic before its first sub-issue, provided the user confirms the scope (bootstrapping a new track).

### One epic per issue

GitHub supports only one parent via Sub-issues API. This matches: «one track — one hierarchy». If a task seems to relate to two tracks — reconsider scope: probably split into two issues, OR it's an aggregate issue (see below).

Do not use markdown `Parent: #N`, `Epic: #N`, `Belongs to: #N` in body when parent is set via API — it's a duplicate that goes stale. Parent is stored via the Sub-issues API only.

### Resolve epic — algorithm at creation / sync

1. **Search for an existing epic** for the track via cross-repo search; verify candidates have non-empty `sub_issues_summary.total`.
2. **Canonical mapping by domain** (configure per your business in `Domain → repo routing`):

   | Track domain | Epic lives in |
   |--------------|---------------|
   | Educational program / partnership | teaching domain repo |
   | B2B deal / multi-lane commercial track | crm / commercial repo |
   | Product launch | the product's own repo |
   | Research initiative | research repo |

3. **If no epic exists** — manager raises in proposal: «no epic for track X, do you want one?». Never creates an issue without a parent silently.
4. **When creating a sub-issue** via API:

   ```bash
   CHILD_ID=$(gh api repos/OWNER/REPO/issues/CHILD_NUMBER --jq '.id')
   gh api -X POST repos/EPIC_OWNER/EPIC_REPO/issues/EPIC_NUMBER/sub_issues -F sub_issue_id=$CHILD_ID
   ```

### Aggregate parent for cross-track issues

If an issue covers 2+ sibling tracks, scopes, or deliverable classes, classify it as an **aggregate issue** before assigning a parent. Do not attach it to the first matching subject epic if that would make another sibling scope invisible.

**Signals of an aggregate issue:**
- Title/body explicitly spans multiple sibling scopes: `product + sales`, `strategy + delivery`, `pilot + docs`, `launch + ops`.
- Issue lives in an aggregate/reporting repo while the subject epics live in their owner repos.
- Body talks about weekly review, close/kill decision, forecast, pipeline, operating review, portfolio snapshot, or cross-repo coordination.
- Issue updates a shared index, forecast, heartbeat, dashboard, or plan — not a single concrete deliverable.

**Algorithm:**
1. Find the subject epic for each sibling scope.
2. Find a repo-local aggregate epic: `forecast`, `pipeline`, `portfolio`, `weekly review`, `operating review`, `coordination`, `umbrella`.
3. If found — attach the issue there. In plan/report write `parent: aggregate`.
4. If none exists — surface a proposal: create an umbrella issue OR split into separate child issues under each subject epic.
5. Never write one issue as a child of two epics; GitHub parent is exactly one.

In read/write output, distinguish parent types explicitly:
- `parent: track` — a specific subject-domain epic
- `parent: aggregate` — forecast / pipeline / portfolio / operating umbrella
- `parent: runtime` — a published / runtime layer epic
- `parent: unknown` — parent not yet found or requires user decision

### Project-visible root

Manager distinguishes three parent concepts:

- **API parent** — direct parent from the GitHub Sub-issues API (`parent_issue_url`).
- **Visible root** — nearest parent / track-overview / umbrella issue that should appear in the current Project view and under which the user expands the tree.
- **Historical / backlog grandparent** — upper strategy parent that may remain outside the weekly Project view when the visible root already has a W-label and non-empty status lane.

**Rules:**
1. If an active / current-week issue has no sub-issues and is a child delivery/action issue, its API parent or visible root must be in the Project with a non-empty status lane.
2. If an issue is itself a track overview / session parent / umbrella (`sub_issues_summary.total > 0`) and is already visible in the Project, its backlog/strategy grandparent does not need to appear in the weekly Project. Report as `parent: historical/backlog`.
3. If a child has `parent_issue_url` but the parent item is absent from the Project view, surface as: `Project divergence: parent epic not visible`.
4. If the child-side API shows `parent: null`, verify by checking the likely epic's `/sub_issues` list. If the child is listed there, treat it as proof — but note `parent proof: parent sub_issues` (GitHub may read hierarchy asymmetrically).
5. If the Project view filters by repo or type such that the parent cannot physically appear, report `Project view limitation` and do not reparent the child.

### Related issues — body section

`Related` / `Related issues` in the body is for contextual cross-links only. It never creates hierarchy.

- Hierarchy lives only in the GitHub Sub-issues API (`parent_issue_url`, `sub_issues_summary`).
- Related links are for contextual references, isolated dependencies, cross-repo artifacts, and historical tasks.
- The Related block can be deleted without losing owner, W-label, Project placement, or the sub-issues tree.

**Forbidden inside a Related block:** `Parent: #N`, `Epic: #N`, `Belongs to: #N`, manual child/subtask lists, status mirror, next-step mirror, W-labels, Project placement cues, checklist state.

**Body format:**
```markdown
## Related

- <repo>#N «human-readable title» — brief reason for the link

**Verified:** YYYY-MM-DD by manager
```
Max 3 bullet links + one `Verified` line. On each body sync, rewrite from live search — do not append infinitely.

**Before writing a body that contains a Related section — live-verify every referenced issue:**
```bash
gh issue view N -R OWNER/REPO --json title,state,url,labels,updatedAt
gh api repos/OWNER/REPO/issues/N --jq '{parent: .parent_issue_url, sub_summary: .sub_issues_summary}'
```
For active / current-week related refs, also check `projectItems`.

If any ref is missing, closed, parentless, points to another track, has a stale W-label, or would leak private/CRM data into a public repo — surface `Related links divergence` and remove or report before writing the body. For public repos: do not copy private titles, CRM slugs, local paths, personal handles, payment facts, or private URLs — use a safe public label like `private CRM issue — context only` and keep the exact private pointer in a private repo/report.

### No track-labels

Track-labels (`<track-slug>`, `<client>-deal`) are NOT created. Track differentiation goes through title + epic membership. Existing legacy track-labels are not deleted (they're history), but no new ones are created. Cross-repo navigation by track = epic's sub_issues + Project board, not label filter.

### Verification before sync

Before `gh issue edit` / `gh issue create` the agent MUST check the existing issue's parent and, for active issues, its Project placement:

```bash
gh api repos/OWNER/REPO/issues/N --jq '{parent: .parent_issue_url, sub_summary: .sub_issues_summary}'
```

Surface in proposal which issues are missing a parent and which epic is proposed for each.
