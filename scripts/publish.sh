#!/usr/bin/env bash
# Sync the study journal from Obsidian, build dist/, and deploy to Cloudflare Pages.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "→ Syncing journal from Obsidian…"
python3 scripts/build_journal.py
echo "→ Building dist/…"
python3 scripts/build_site.py
echo "→ Deploying to Cloudflare Pages…"
npx --yes wrangler pages deploy dist --project-name sped-journey --branch main
echo "✅ Live at https://sped-journey.pages.dev"
