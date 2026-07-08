#!/usr/bin/env bash
# Fero app — rebuild uit content.md en publiceer naar GitHub Pages.
# Gebruik:  ./publish.sh "wat je veranderd hebt"
# Live op:  https://110rover.github.io/fero/
set -e
cd "$(dirname "$0")"

echo "→ content.md → data.js"
bun build.mjs

echo "→ committen & pushen"
git add -A
if git diff --cached --quiet; then
  echo "  (niks veranderd)"
else
  git commit -q -m "${1:-update content}"
  git push -q
  echo "✓ gepubliceerd — live binnen ~1 min op https://110rover.github.io/fero/"
fi
