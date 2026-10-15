# SPED Journey — an online resume and progress portfolio

A living record of becoming a **Mild/Moderate Special Education teacher (K–12)** in Marana, Arizona:
the critical path, the exams, the study notes, and the tools built along the way.

Hosted on **Cloudflare Pages** with a small **Pages Function + KV** API so progress can be updated
from the site itself.

- **Live: https://sped.notallorder.com** (fallback: https://sped-journey.pages.dev)
- Repo: https://github.com/67tallchris/sped-journey

## Pages

| Page | What it shows |
|---|---|
| `index.html` | Online resume + the **critical path** visualization with milestone progress |
| `journal.html` | Study journal generated from the Obsidian vault (competency notes + answers) |
| `quiz.html` | Interactive practice-quiz demo (10 original questions) |
| `admin.html` | Token-protected editor for milestones + exam scores (writes to KV) |

## Data

| File | Source | Notes |
|---|---|---|
| `data/site.json` | Hand-written | Profile, resume, skills, projects |
| `data/progress.json` | Hand-written / admin export | Milestones, tasks, exams — static fallback when KV is empty |
| `data/journal.json` | Generated | `python3 scripts/build_journal.py` parses the Obsidian notes |
| `data/demo-questions.json` | Hand-written | 10 original demo questions (no copyrighted test content) |

### Sync the journal from Obsidian

```bash
python3 scripts/build_journal.py
```

Reads `~/Documents/Obsidian Vault/05 - AEPA Study/**/*.md`, extracts the exam/competency metadata
plus each `## Qn: topic` answer and explanation, and writes `data/journal.json`.
Verbatim quoted practice questions are intentionally **not** exported.

## Local development

```bash
# build dist/ and preview with Functions + KV
python3 scripts/build_site.py
npx wrangler pages dev dist --kv PROGRESS --env-file ~/.config/sped-journey/dev.vars

# or a plain static preview without the admin API
python3 scripts/build_site.py && python3 -m http.server 8788 --directory dist
```

## Deploy

```bash
python3 scripts/build_site.py
npx wrangler pages deploy dist --project-name sped-journey --branch main
```

The deploy uploads only `dist/` — never `scripts/`, `README.md`, `wrangler.toml`, or `.dev.vars`.

`scripts/publish.sh` does the whole loop: sync journal notes → build → deploy.

The first deploy creates the project. Production KV binding + `ADMIN_TOKEN` are configured on the
Pages project; for local dev put them in `.dev.vars` (gitignored):

```
ADMIN_TOKEN=...
```

## Updating progress

1. Open `/admin.html`, paste the `ADMIN_TOKEN`, toggle tasks / edit exam scores.
2. **Save to Cloudflare** → writes to KV; public pages pick it up immediately.
3. Or use **Download JSON** and commit the result to `data/progress.json`.

## Sources

- **Quiz bank:** official [AEPA Field 22 Special Education study guide (PDF)](https://www.aepa.nesinc.com/Content/Docs/AZSG_FLD022_Expanded.pdf)
  — AEPA/NES materials at [aepa.nesinc.com](https://www.aepa.nesinc.com). The full 80-question bank is kept private.
- **Study journal:** generated from my Obsidian notes (`05 - AEPA Study`).
- **Demo questions:** original, written for this site.

## Copyright note

`data/demo-questions.json` is original. The **full 80-question AEPA Field 22 practice bank** and the
source study guide are copyrighted study materials and are **not** part of this public site — they
live in the separate, private `aepa-sped-quiz` project.
