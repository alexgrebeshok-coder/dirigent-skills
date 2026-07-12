# Search for existing issues — how — manager reference

## Search for existing issues — how

For each artifact or query subject, search by **multiple keys** to avoid missing matches. For simple unambiguous tracks (single-keyword) one query is enough — escalate to multi-key only when first query returns 0 or 5+ matches:

```bash
gh search issues --owner $YOUR_OWNER <key> --json repository,number,title,labels,state,updatedAt
```

**`--state` accepts only `open` or `closed` — the value `all` is invalid and errors out.** To cover both states, just omit `--state`: one call returns open and closed together. Never run two queries (open + closed) — that wastes the scarce REST quota (30/min).

**Keys to try (per artifact/subject):**
- Person name + slug (different transliterations): `"<person-name>"`, `<handle>`, `<filename-slug>`
- Company / track: `<track-A>`, `<track-B>`, `<client>`
- Telegram/social handle if mentioned: `<handle>`
- Filename slug from any CRM artifact: `<opportunity-slug>`

**Match acceptance criterion:** issue title or body references the same person/company/track AND scope of work overlaps. If 2+ candidates match — pick the most specific one and link the others as `Related`.

### Batched GraphQL search (3+ keys)

When multi-key search needs 3 or more queries, batch them in a single GraphQL call to avoid the REST Search API rate limit (30 req/min):

```bash
gh api graphql -f query='
query {
  s1: search(query:"user:$YOUR_OWNER is:issue <term1>", type:ISSUE, first:20){ nodes { ... on Issue { number title state url repository{nameWithOwner} labels(first:10){nodes{name}} updatedAt } } }
  s2: search(query:"user:$YOUR_OWNER is:issue <term2>", type:ISSUE, first:20){ nodes { ... on Issue { number title state url repository{nameWithOwner} labels(first:10){nodes{name}} } } }
}' | jq -r '(.data // {}) | to_entries[] | .key as $k | (.value.nodes // [])[] | select(.number != null)
  | "\($k) \(.state) \(.repository.nameWithOwner)#\(.number) \(.title) [\([(.labels.nodes // [])[].name]|join(","))]"'
```

Omit any `state:` qualifier — one alias returns both open and closed. Adding `state:open` silently drops closed issues (e.g. a closed epic), forcing a wasteful second batch.

**CRITICAL — pipe into a separate `jq`, NOT the `--jq` flag.** This is the #1 cause of recurring crashes in this skill:

- When a GraphQL response carries an `errors` array (one failed alias, or a totally broken query), `gh api graphql` **ignores the `--jq` flag entirely**: it dumps the raw JSON body to stdout plus a short error to stderr, exit 1. The `(.data // {})` guard inside `--jq` never runs — the flag is bypassed.
- A total failure → body is `{"errors":[...]}` with no `data` key. Any downstream `d['data']` (Python) throws `KeyError: 'data'`.
- So always `gh api graphql -f query='...' | jq -r '(.data // {}) | ...'`. The raw body (with `data`, or `errors`-only) flows from stdout into `jq`, the `(.data // {})` guard runs on the body: live aliases print, failed ones are skipped, a total failure yields empty output with no crash. The `gh` error stays visible on stderr for debugging.
- **Never parse the response with a Python one-liner (`python3 -c "d['data']..."`).** If Python is unavoidable, use `d.get('data', {})`, never `d['data']`.

**Required jq guards** (without them the expression crashes on `cannot iterate over: null`):
- `(.data // {})` **first** — on an `errors`-only body `.data` is `null` and `to_entries[]` crashes; `// {}` yields an empty object
- `(.value.nodes // [])` and `(.labels.nodes // [])` — an alias or field can return `null`
- `select(.number != null)` — drops empty `{}` objects from non-Issue nodes
- `is:issue` in each query string — excludes PRs

**Partial errors:** with `| jq`, a failed alias is simply absent from the output and the live ones print. Don't blindly retry the whole batch — if needed, read `.errors` in a separate pass (`... | jq '.errors'`), then drop/fix the failed alias.

**Why:** `gh search issues` is the REST Search API, limited to 30 req/min — multi-key runs of 15-20 searches throttle. GraphQL `search()` counts against the 5000 points/hour GraphQL limit and batches efficiently. Owner qualifier in GraphQL is `user:$YOUR_OWNER` (not `--owner`).

## False-positive surface (read AND write mode)

Search by W-label or generic terms can return issues that **share a label but aren't on this track**. Example: `<repo>#1` returned for `<track-A>` query because both have `W18` label.

**Rule:** if a search match's title/body has no overlap with the queried track besides W-label or other generic label — it's a false positive. Drop it from results, surface in report under `IGNORED (false positives)` so user can confirm.

```
IGNORED (false positives):
- <repo>#1 — surfaced via W18 label match, but track = <unrelated track>
```

Don't silently filter — show what was filtered and why, in case user spots a real link manager missed.
