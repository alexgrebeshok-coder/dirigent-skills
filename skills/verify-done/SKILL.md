---
name: verify-done
description: Use before claiming any task is finished or telling the user "done". Триггеры (RU) — момент завершения работы, перед словами «сделал/готово/работает». Enforces verification-before-completion — run the actual check (tests, build, the command, open the file) and read its real output before reporting done. Applies to code AND to documents/configs.
license: MIT
---

# Verify before "done"

Principle (adapted from superpowers:verification-before-completion): **no completion claim without fresh evidence.** Words like "should work", "probably", "looks right" are a red flag — they mean it wasn't checked.

## Before saying "done"

1. **Run a real check**, don't guess the result:
   - Code: tests / `build` / typecheck / actually running the command.
   - Document: does the file exist? does it open? is the table of contents present and correctly titled? are the required sections there?
   - Config/MCP: restart + the tool status is green, the tool actually responds.
   - A file that's supposed to land in a specific place: is it there, and is the index/dashboard entry added?
2. **Read the output**, not just the exit code. Show an error/warning, don't swallow it.
3. Only then answer — with specifics on what exactly was checked ("build: 0 errors", "docx opened, table of contents is there").

## Red flags (stop, check again)

- "Should work" / "probably" / "usually does" — not actually checked.
- A test passed on the very first try without a single failure — is it actually testing anything.
- "Done", but the verification command was never run this session.

## Why this exists

This formalizes a simple rule: don't report a half-finished task as progress — an unfinished task gets finished, not narrated. The task ends **before** the answer, not during it.
