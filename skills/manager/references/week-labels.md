# W-label rules — manager reference

## W-label rules

(Skip this section if W-label convention is disabled in your config.)

### Current-week resolution

1. Read tasks index first line under your "Updated" marker — canonical signal for current week.
2. Compute ISO week from `date '+%V'` if index is stale (>7 days).
3. Map to label format: `W{NN}` (zero-padded only if existing labels in repo are zero-padded — check repo first).

### Dated issues — W-label from the event date

For issues whose title/body/calendar contain a specific event date (a session, live event, workshop, deadline), the W-label is computed from **that event date**, not the current sync date.

- `<person> S2 — prep and deliver session (29.05)` on 2026-05-29 gets `W22`.
- If the date in the title is only `DD.MM`, take the year from body / calendar / current session context. If the year is ambiguous — surface `Week ambiguity: date in <repo>#N is ambiguous; not writing GitHub until clarified` and halt the label write.
- If syncing in a different week from the event, show both: `event week: W22`, `sync week: W23`.
- If an existing dated issue has a stale or missing W-label, surface: `Week drift: <repo>#N «title» — has <labels>, should have W{NN}; action: add W{NN}`.

### Week drift vs Project drift (read mode)

These are two independent conditions — an issue can have one without the other:

- **Week drift:** issue has a W-label that doesn't match the current calendar week for the work → `Week drift: issue has W{NN}, expected W{MM} by date; action: add W{MM}`
- **Project drift:** issue has the correct W-label but is absent from the expected Project board → `Project drift: W{NN} present, missing from <Project>; action: add to Project after W-label fix`

List both in the Track health section of read mode output.

### Multi-week tasks

If a task requires action this week AND continues next week — apply BOTH W-labels. The index file is for "what's hot now"; labels record full lifecycle.

### Backlog vs future-week

- If task is **deferred more than 1 week** without active work → `backlog` (create label if missing).
- If task is **planned for a specific future week** → `W{NN}` for that week.
- Never use `backlog` AND `W{NN}` together — pick one.

### Creating / adding W-labels — fast-path

Do not call `gh label list` first to check existence. Immediately try to add it; only on failure create the label and retry:

```bash
gh issue edit <N> -R "$REPO" --add-label "W{NN}" \
  || { gh label create "W{NN}" -R "$REPO" --color "0E8A16" --description "Week {NN}"; \
       gh issue edit <N> -R "$REPO" --add-label "W{NN}"; }

# backlog label
gh label create "backlog" -R "$REPO" --color "ededed" --description "Deferred — not on current/next week"
```

Color `0E8A16` (dark green) for active weeks, `ededed` (neutral grey) for backlog. Old `retro:W*` and historical `W*` labels are never removed for tidiness.
