#!/usr/bin/env bash
# QA: scan docx/pptx text for unexpected English words (see terminologiya-analitika.md)
set -euo pipefail

file="${1:?usage: validate_analytical_docx.sh FILE.docx|FILE.pptx}"

# Allowlist of expected non-Cyrillic tokens — extend with your own project's domains,
# company names, and industry acronyms. Shipped defaults are deliberately generic.
ALLOW='https|ISO|TUV|PDF|URL|Slide number'

hits="$(python3 -m markitdown "$file" 2>/dev/null | rg -i '[a-z]{4,}' | rg -vi "$ALLOW" || true)"

if [[ -n "$hits" ]]; then
  echo "FAIL: possible English/latin terms in $file:" >&2
  echo "$hits" >&2
  exit 1
fi

echo "OK $(basename "$file")"
