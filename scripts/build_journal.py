#!/usr/bin/env python3
"""Convert Obsidian study notes (05 - AEPA Study) into data/journal.json.

Reads the markdown notes, extracts exam/competency metadata plus each
"## Qn: topic" block's answer and explanation, and writes a JSON file the
site renders. Verbatim quoted practice questions are intentionally NOT
included in the output — only my own answer/explanation notes.
"""
import json, re, sys
from pathlib import Path

VAULT = Path("/home/chris/Documents/Obsidian Vault/05 - AEPA Study")
OUT = Path(__file__).resolve().parent.parent / "data" / "journal.json"


def parse_frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).split("\n"):
        mm = re.match(r"^(\w[\w-]*):\s*(.*)$", line)
        if mm and not mm.group(2).strip().startswith("-"):
            fm[mm.group(1)] = mm.group(2).strip().strip('"')
    return fm


def blockquote_text(lines):
    """Join a blockquote block into one line."""
    parts = []
    for ln in lines:
        s = re.sub(r"^>\s?", "", ln).strip()
        if s:
            parts.append(s)
    return " ".join(parts)


def strip_md(s):
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)   # links
    s = re.sub(r"\[\[([^\]|]+)\|?([^\]]*)\]\]", lambda m: m.group(2) or m.group(1), s)
    s = re.sub(r"[*_`]", "", s)
    return s.strip()


def parse_note(path):
    text = path.read_text(encoding="utf-8", errors="ignore")
    fm = parse_frontmatter(text)
    body = re.sub(r"^---\n.*?\n---\n", "", text, count=1, flags=re.S)

    sections = re.split(r"\n##\s+Q(\d+):\s*", body)
    questions = []
    # sections: [preamble, num, content, num, content, ...]
    for i in range(1, len(sections), 2):
        topic = strip_md(sections[i + 1].split("\n", 1)[0])
        content = sections[i + 1]

        # quoted practice question (not exported)
        q_lines = re.findall(r"^>.*$", content, re.M)
        quoted = blockquote_text(q_lines)
        quoted = re.sub(r"^\[!question\]\s*", "", quoted).strip()

        # answer from the blockquote
        answer = ""
        am = re.search(r"\*\*Answer:\s*(.*?)\*\*", quoted, re.S)
        if am:
            answer = strip_md(am.group(1)).strip()

        # explanation: everything after the answer block, minus headings
        after = content
        dm = re.search(r"\*\*Answer:.*?\*\*", after, re.S)
        if dm:
            after = after[dm.end():]
        after = re.sub(r"^>.*$", "", after, flags=re.M)          # drop blockquote
        after = re.sub(r"^###.*$", "", after, flags=re.M)         # drop subheads
        after = after.split("\n---")[0]
        bullets, para = [], []
        for ln in after.split("\n"):
            s = ln.strip()
            if s.startswith(("-", "•", "*")):
                bullets.append(strip_md(re.sub(r"^\s*[-•*]\s*", "", s)))
            elif s:
                para.append(strip_md(s))
        why = bullets if bullets else para
        # merge wrapped bullet continuation lines
        merged = []
        for b in why:
            if merged and not re.match(r"^([A-Z0-9]|\*\*)", b) and len(merged[-1]) > 0:
                merged[-1] += " " + b
            else:
                merged.append(b)
        merged = [m for m in merged if m]

        if topic:
            questions.append({
                "n": int(sections[i]),
                "topic": topic,
                "answer": answer,
                "why": merged,
                "hasQuoted": bool(quoted),
                "quotedChars": len(quoted),
            })

    title = fm.get("title") or path.stem
    return {
        "id": re.sub(r"[^a-z0-9]+", "-", path.stem.lower()).strip("-"),
        "title": title,
        "exam": fm.get("exam", "AEPA/NES"),
        "competency": fm.get("competency", ""),
        "status": fm.get("status", "in-progress"),
        "folder": str(path.parent.relative_to(VAULT)),
        "questions": questions,
        "questionCount": len(questions),
    }


def main():
    notes = []
    for path in sorted(VAULT.rglob("*.md")):
        if path.name in ("NES 601 - Practice Quiz App.md",
                         "ASU vs NAU - SPED Master's Programs.md",
                         "Teacher Certification - Career Path EPP Options and Funding.md"):
            continue
        note = parse_note(path)
        if note["questions"]:
            notes.append(note)

    total_q = sum(n["questionCount"] for n in notes)
    exams = {}
    for n in notes:
        key = n["exam"]
        exams.setdefault(key, {"exam": key, "notes": 0, "questions": 0, "competencies": []})
        exams[key]["notes"] += 1
        exams[key]["questions"] += n["questionCount"]
        exams[key]["competencies"].append(n["competency"])

    payload = {
        "source": "Obsidian vault · 05 - AEPA Study",
        "updated": "2026-10",
        "noteCount": len(notes),
        "questionCount": total_q,
        "exams": sorted(exams.values(), key=lambda e: -e["questions"]),
        "notes": notes,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT} — {len(notes)} notes, {total_q} study questions")
    for e in payload["exams"]:
        print(f"  {e['exam']}: {e['notes']} notes, {e['questions']} questions")
    empty = [n["title"] for n in notes if any(not q["answer"] for q in n["questions"])]
    if empty:
        print("Notes with missing answers (check):")
        for t in empty:
            print("  -", t)


if __name__ == "__main__":
    main()
