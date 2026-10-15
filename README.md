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
| `index.html` | Online resume + the **critical path** visualization with milestone progress + **funding pathways** |
| `journal.html` | Study journal generated from the Obsidian vault (competency notes + answers) |
| `quiz.html` | Testing area: multiple practice tests (Socioculturalism 30q, SPED sample 10q), sets of 10 with grading |
| `admin.html` | Token-protected editor for milestones + exam scores (writes to KV) |

## Data

| File | Source | Notes |
|---|---|---|
| `data/site.json` | Hand-written | Profile, resume, skills, projects |
| `data/progress.json` | Hand-written / admin export | Milestones, tasks, exams — static fallback when KV is empty |
| `data/journal.json` | Generated | `python3 scripts/build_journal.py` parses the Obsidian notes |
| `data/quizzes.json` | Hand-written | Index of tests shown in the testing area |
| `data/quizzes/*.json` | Hand-written | Public question banks (socioculturalism 30q, sped-demo 10q) |
| `private/nes601-full.json` | Local only (gitignored) | Full 80-question AEPA Field 22 bank; uploaded to KV as `quiz:nes601-full` |

### Private full bank

The 80-question NES/AEPA Special Education practice bank is **not** in the public build. It lives in
KV under `quiz:nes601-full` and is served only by `/api/quiz/nes601` to a signed-in owner (GitHub
session) or with the `ADMIN_TOKEN`. The testing area shows it as a locked card to anonymous visitors.

```bash
# re-upload after editing private/nes601-full.json
npx wrangler kv key put "quiz:nes601-full" --path private/nes601-full.json --namespace-id <KV_ID> --remote
```

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

## Admin authentication

The write API (`PUT /api/progress`) accepts either:

- **GitHub OAuth session (primary)** — only the account in `ADMIN_GITHUB_LOGIN` can sign in;
  the session is a signed, HttpOnly cookie (HMAC-SHA256, 30 days).
- **`ADMIN_TOKEN` bearer (fallback)** — for curl/automation and local dev.

### Enable GitHub sign-in (one-time)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
   - Application name: `SPED Journey Admin`
   - Homepage URL: `https://sped.notallorder.com`
   - Authorization callback URL: `https://sped.notallorder.com/api/auth/callback`
2. Set the secrets:
   ```bash
   npx wrangler pages secret put GITHUB_CLIENT_ID --project-name sped-journey
   npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name sped-journey
   ```
3. Already set: `ADMIN_GITHUB_LOGIN=67tallchris`, `SESSION_SECRET`, `ADMIN_TOKEN`

Once `GITHUB_CLIENT_ID` is set, `/admin` shows **Sign in with GitHub** and the token fallback moves
under “Advanced”. Remove the token fallback later by deleting the bearer branch in
`functions/api/progress.js` and the `ADMIN_TOKEN` secret.

## Sources

- **Quiz bank:** official [AEPA Field 22 Special Education study guide (PDF)](https://www.aepa.nesinc.com/Content/Docs/AZSG_FLD022_Expanded.pdf)
  — AEPA/NES materials at [aepa.nesinc.com](https://www.aepa.nesinc.com). The full 80-question bank is kept private.
- **Study journal:** generated from my Obsidian notes (`05 - AEPA Study`).
- **Demo questions:** original, written for this site.

## Copyright note

`data/demo-questions.json` is original. The **full 80-question AEPA Field 22 practice bank** and the
source study guide are copyrighted study materials and are **not** part of this public site — they
live in the separate, private `aepa-sped-quiz` project.
