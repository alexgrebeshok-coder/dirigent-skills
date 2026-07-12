---
name: npm-publish-smoke
description: Use immediately after every npm publish (or any registry release), before closing the release task, announcing, or reporting success — including when publish exited 0, local tests were green, and it is late. Also use when a published CLI behaves differently via npx than locally, or prints nothing with exit 0. Triggers — "publish прошла?", "релиз готов", closing a release checklist item, npx silence.
license: MIT
---

# npm-publish-smoke — the registry is the only truth

## Overview

`npm publish` exiting 0 means the server accepted a tarball. It does not mean a user can run your package. Local tests validate the **working tree**; users get the **registry tarball** through `npx` in a clean environment. Every release that broke silently, broke in that gap.

**Core rule: a release is DONE only after the registry artifact runs in a clean environment. Not before.**

This is a specialization of verify-done for releases: the "fresh evidence" is a clean-env run of the published artifact.

## When to use

- The moment `npm publish` (or `gh release create`, or any registry push) returns — smoke BEFORE closing the task, announcing, or telling anyone "готово".
- A published CLI works locally but users report nothing happens / `command not found` / wrong version.
- NOT for pre-publish testing (that's your normal test suite) — this skill is strictly post-publish.

## The protocol (in order, ~3 minutes)

```bash
PKG=@scope/name; VER=1.2.3

# 1. Registry metadata: the version exists and `latest` actually moved
npm view "$PKG@$VER" version && npm view "$PKG" dist-tags.latest
# criterion: latest == $VER (a stuck dist-tag ships old code to `npx pkg`)

# 2. The real tarball — not npm pack --dry-run from your disk
tar -tzf "$(npm view "$PKG@$VER" dist.tarball | xargs -I{} sh -c 'curl -sL {} -o /tmp/pkg.tgz && echo /tmp/pkg.tgz')" | head -30
# criterion: expected files present (dist/, bin, README), no secrets, no tests

# 3. Clean-environment run — the user's path, not yours
NPM_CACHE=$(mktemp -d) && npm_config_cache="$NPM_CACHE" npx --yes "$PKG@$VER" --help
# criterion: exit 0 AND expected output text. Run from a directory OUTSIDE the
# package repo — local node_modules resolution lies.

# 4. One real command, not just --help
npm_config_cache="$NPM_CACHE" npx --yes "$PKG@$VER" <main-command with real input>
# criterion: validate the OUTPUT (file exists, content correct), not just exit code
```

**Read counters, not tails.** When a smoke step runs tests or prints a report, assert the machine-readable signal (`# pass N / # fail 0`, exit code, output file hash) — never conclude success from the last few lines looking fine.

## Known traps (each one shipped in a real release)

| Trap | Symptom | Cause / fix |
|---|---|---|
| **isMain vs symlink** | CLI prints nothing, exit 0 — only via npx | npx runs bin through a `.bin` symlink, so `fileURLToPath(import.meta.url) === process.argv[1]` is false. Fix: `realpathSync()` **both** sides. Local runs never catch this. |
| Stuck dist-tag | `npx pkg` serves the previous version | `latest` didn't move (publish with explicit tag, or a later re-publish of an old version). `npm dist-tag add pkg@ver latest`. |
| Missing files | `MODULE_NOT_FOUND` or broken README page | `files` in package.json excluded something the code imports. Fix files list, patch release. |
| Scoped package private | `404` / `402` on install | First publish of `@scope/pkg` needs `--access public`. |
| Lost exec bit | `permission denied` via npx | bin file lost `+x` in packing; check `tar -tvzf` mode column. |

## If the smoke fails

Never `npm unpublish` (breaks downstream lock-files; blocked after 24h). Instead:
```bash
npm deprecate "$PKG@$VER" "broken release, use $NEXT"   # then ship the patch
```
And say it plainly in your report: the release was broken, the smoke caught it. A caught failure is a good outcome; a silent one costs more.

## Rationalizations — none of these survive contact

| Excuse | Reality |
|---|---|
| "publish exited 0, the registry accepted it" | Accepted ≠ runnable. The 0-exit bug class exists precisely here. |
| "87/87 tests green before publish" | Tests ran the working tree. Users run the tarball. Different artifacts. |
| "`npm pack --dry-run` showed the right files" | Dry-run packs your disk. The registry serves what actually uploaded. |
| "It's 23:40, I'll smoke it in the morning" | The announcement/user lands before you wake up. The smoke is 3 minutes. |
| "I checked the npm web page" | A rendered README proves nothing about an executable bin. |
| "The output tail looked fine" | Tails lie. Read the counters and exit codes. |

## Red flags — STOP and run the protocol

- About to close a release task / write "опубликовано" with no clean-env run
- Declaring success from the tail of any output instead of its counters
- Smoking from inside the package repo directory
- A CLI that "works on my machine" but you never ran it via `npx pkg@ver`
