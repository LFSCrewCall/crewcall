#!/usr/bin/env python3
"""Builds i18n-dict.js from the translation sources in tools/i18n/.

Each line in tools/i18n/*.txt is:  English || 繁體中文 || Français || Español
Simplified Chinese is generated from Traditional with OpenCC (pip install opencc).
Russian and Arabic live in tools/i18n/ru-ar/*.txt as:  English || Русский || العربية
Hindi and Portuguese live in tools/i18n/hi-pt/*.txt as:  English || हिन्दी || Português
Anything missing there falls back to English.
Patterns (sentences with names, numbers or dates) live in patterns.txt in each folder,
where the English side is a regular expression. See docs/TRANSLATION.md.

Run:  python3 tools/build_i18n.py
"""
import json, os, glob
import opencc

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "i18n")
OUT = os.path.join(HERE, "..", "i18n-dict.js")
cc = opencc.OpenCC("tw2sp")


def rows(path, parts=4):
    for n, line in enumerate(open(path, encoding="utf-8"), 1):
        line = line.rstrip("\n")
        if not line.strip() or line.startswith("#"):
            continue
        p = line.split(" || ")
        if len(p) != parts:
            raise SystemExit(f"{path}:{n} needs {parts} parts, has {len(p)}: {line[:80]}")
        yield [x.strip() for x in p]


words = {}
for f in sorted(glob.glob(os.path.join(SRC, "words*.txt"))):
    for en, hant, fr, es in rows(f):
        words[en] = [hant, cc.convert(hant), fr, es]

patterns = []
for en, hant, fr, es in rows(os.path.join(SRC, "patterns.txt")):
    patterns.append([en, hant, cc.convert(hant), fr, es])

RA = os.path.join(SRC, "ru-ar")
ra_words = {}
for f in sorted(glob.glob(os.path.join(RA, "words*.txt"))):
    for en, ru, ar in rows(f, 3):
        ra_words[en] = [ru, ar]
ra_pats = {}
for en, ru, ar in rows(os.path.join(RA, "patterns.txt"), 3):
    ra_pats[en] = [ru, ar]
missing = 0
for en, v in words.items():
    if en not in ra_words:
        missing += 1
    v.extend(ra_words.get(en, [en, en]))
for p in patterns:
    if p[0] not in ra_pats:
        missing += 1
    p.extend(ra_pats.get(p[0], [None, None]))
if missing:
    print(f"note: {missing} strings have no Russian/Arabic yet and will show in English")

HP = os.path.join(SRC, "hi-pt")
hp_words = {}
for f in sorted(glob.glob(os.path.join(HP, "words*.txt"))):
    for en, hi, pt in rows(f, 3):
        hp_words[en] = [hi, pt]
hp_pats = {}
for en, hi, pt in rows(os.path.join(HP, "patterns.txt"), 3):
    hp_pats[en] = [hi, pt]
missing = 0
for en, v in words.items():
    if en not in hp_words:
        missing += 1
    v.extend(hp_words.get(en, [en, en]))
for p in patterns:
    if p[0] not in hp_pats:
        missing += 1
    p.extend(hp_pats.get(p[0], [None, None]))
if missing:
    print(f"note: {missing} strings have no Hindi/Portuguese yet and will show in English")

# ---------- open-source translation workflow ----------
# Codes in the order used in i18n-dict.js (words[en] = [zh-Hant, zh-Hans, fr, es, ru, ar, hi, pt])
CODES = ["zh-Hant", "zh-Hans", "fr", "es", "ru", "ar", "hi", "pt"]
LOC = os.path.join(SRC, "locales")
os.makedirs(LOC, exist_ok=True)
SNAP = os.path.join(LOC, ".last-build.json")


def where(en, code):
    """The text file and line that hold a translation, so edits can be written back."""
    folder = RA if code in ("ru", "ar") else HP if code in ("hi", "pt") else SRC
    col = {"zh-Hant": 1, "fr": 2, "es": 3, "ru": 1, "ar": 2, "hi": 1, "pt": 2}[code]
    for f in sorted(glob.glob(os.path.join(folder, "words*.txt"))):
        lines = open(f, encoding="utf-8").read().split("\n")
        for i, line in enumerate(lines):
            if line.startswith(en + " || "):
                return f, lines, i, col
    return None


def write_back(en, code, text):
    hit = where(en, code)
    if not hit:
        return False
    f, lines, i, col = hit
    parts = lines[i].split(" || ")
    parts[col] = text
    lines[i] = " || ".join(parts)
    open(f, "w", encoding="utf-8").write("\n".join(lines))
    return True


# 1) Weblate (or anyone) edited tools/i18n/locales/<lang>.json since the last build:
#    copy those edits into the text files, which stay the master copy.
last = json.load(open(SNAP, encoding="utf-8")) if os.path.exists(SNAP) else {}
pulled = 0
for code in ["zh-Hant", "fr", "es", "ru", "ar", "hi", "pt"]:
    path = os.path.join(LOC, f"{code}.json")
    if not os.path.exists(path) or code not in last:
        continue
    for en, text in json.load(open(path, encoding="utf-8")).items():
        if en in words and text and text != last[code].get(en) and text != words[en][CODES.index(code)]:
            words[en][CODES.index(code)] = text
            if code == "zh-Hant":
                words[en][1] = cc.convert(text)
            write_back(en, code, text)
            pulled += 1
if pulled:
    print(f"took {pulled} edits from tools/i18n/locales/*.json (Weblate) and wrote them into the text files")

# 2) Translations admins saved in the app (Admin, Languages, Download) as app-additions.json
add_path = os.path.join(LOC, "app-additions.json")
if os.path.exists(add_path):
    added = 0
    for en, by in json.load(open(add_path, encoding="utf-8")).items():
        row = words.setdefault(en, [en] * 8)
        for code, text in by.items():
            if code in CODES and text:
                row[CODES.index(code)] = text
                added += 1
        if by.get("zh-Hant") and not by.get("zh-Hans"):
            row[1] = cc.convert(by["zh-Hant"])
    print(f"folded in {added} translations from app-additions.json")

# 3) Write one JSON file per language for Weblate (key = the English text). zh-Hans is
#    left out because it's made from Traditional. en.json is the base file.
json.dump({en: en for en in sorted(words)}, open(os.path.join(LOC, "en.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
snap = {}
for code in ["zh-Hant", "fr", "es", "ru", "ar", "hi", "pt"]:
    i = CODES.index(code)
    out = {en: (v[i] if v[i] != en or en.isupper() else "") for en, v in sorted(words.items())}
    json.dump(out, open(os.path.join(LOC, f"{code}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    snap[code] = out
json.dump(snap, open(SNAP, "w", encoding="utf-8"), ensure_ascii=False)

with open(OUT, "w", encoding="utf-8") as o:
    o.write("// Generated by tools/build_i18n.py. Edit tools/i18n/*.txt, then run the script.\n")
    o.write("// Order in each entry: Traditional Chinese, Simplified Chinese, French, Spanish, Russian, Arabic, Hindi, Portuguese.\n")
    o.write("window.CC_I18N = {\n  words: ")
    o.write(json.dumps(words, ensure_ascii=False, indent=0))
    o.write(",\n  patterns: ")
    o.write(json.dumps(patterns, ensure_ascii=False, indent=0))
    o.write("\n};\n")
print(f"{len(words)} strings, {len(patterns)} patterns -> {os.path.relpath(OUT)}")
