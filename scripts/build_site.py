#!/usr/bin/env python3
"""Build dist/ with only the public site files (no scripts, secrets, or repo files).

Also stamps asset URLs in the HTML with a content hash (assets/app.js?v=abcd1234)
so browsers/edges can't serve a stale script after a deploy.
"""
import hashlib, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

PUBLIC_FILES = ["index.html", "journal.html", "quiz.html", "admin.html", "404.html",
                "favicon.svg", "robots.txt", "_headers"]
PUBLIC_DIRS = ["assets", "data", "functions"]


def stamp_assets(html_path: Path):
    html = html_path.read_text(encoding="utf-8")
    cache = {}

    def repl(m):
        attr, url = m.group(1), m.group(2)
        path = DIST / url
        if not path.is_file():
            return m.group(0)
        if url not in cache:
            cache[url] = hashlib.md5(path.read_bytes()).hexdigest()[:8]
        return f'{attr}="{url}?v={cache[url]}"'

    html = re.sub(r'(src|href)="(assets/[^"]+)"', repl, html)
    html_path.write_text(html, encoding="utf-8")


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    for f in PUBLIC_FILES:
        shutil.copy2(ROOT / f, DIST / f)
    for d in PUBLIC_DIRS:
        shutil.copytree(ROOT / d, DIST / d)

    stamped = 0
    for html in DIST.glob("*.html"):
        before = html.read_text(encoding="utf-8")
        stamp_assets(html)
        if html.read_text(encoding="utf-8") != before:
            stamped += 1

    files = sorted(p.relative_to(DIST) for p in DIST.rglob("*") if p.is_file())
    print(f"Built dist/ with {len(files)} files · stamped assets in {stamped} HTML files")


if __name__ == "__main__":
    main()
