#!/usr/bin/env python3
"""Build dist/ with only the public site files (no scripts, secrets, or repo files)."""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

PUBLIC_FILES = ["index.html", "journal.html", "quiz.html", "admin.html", "404.html",
                "favicon.svg", "robots.txt", "_headers"]
PUBLIC_DIRS = ["assets", "data", "functions"]


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    for f in PUBLIC_FILES:
        shutil.copy2(ROOT / f, DIST / f)
    for d in PUBLIC_DIRS:
        shutil.copytree(ROOT / d, DIST / d)
    files = sorted(p.relative_to(DIST) for p in DIST.rglob("*") if p.is_file())
    print(f"Built dist/ with {len(files)} files")
    for p in files:
        print("  ", p)


if __name__ == "__main__":
    main()
