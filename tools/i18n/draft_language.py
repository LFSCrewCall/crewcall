#!/usr/bin/env python3
"""Draft a new language for Crew Call with LibreTranslate (open source, AGPL-3.0).

LibreTranslate can run for free on your own computer or a free server:
    pip install libretranslate && libretranslate --load-only en,pt
Then:
    python3 tools/i18n/draft_language.py --lang pt --server http://localhost:5000

It writes tools/i18n/drafts/words-pt.txt as  English || draft translation
with names and film words you should check marked "CHECK". Nothing is used by the
app until a speaker of the language has gone through the file and it has been
added to the language list (see docs/TRANSLATION.md, "Adding another language").
Machine translation gets film terms wrong, so treat every line as a first draft.
"""
import argparse, json, os, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def english_strings():
    out = []
    for name in sorted(os.listdir(HERE)):
        if name.startswith("words") and name.endswith(".txt"):
            for line in open(os.path.join(HERE, name), encoding="utf-8"):
                if line.strip() and not line.startswith("#"):
                    out.append(line.split(" || ")[0].strip())
    return list(dict.fromkeys(out))


def translate(server, key, text, target):
    body = {"q": text, "source": "en", "target": target, "format": "text"}
    if key:
        body["api_key"] = key
    req = urllib.request.Request(server.rstrip("/") + "/translate", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get("translatedText", "")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", required=True, help="language code, e.g. pt, it, de, ja, ko, tr, pl, hi")
    ap.add_argument("--server", required=True, help="LibreTranslate address, e.g. http://localhost:5000")
    ap.add_argument("--key", default=os.environ.get("LIBRETRANSLATE_KEY", ""), help="API key, only if the server needs one")
    ap.add_argument("--limit", type=int, default=0, help="only the first N strings, to try it out")
    a = ap.parse_args()
    roles = set()
    try:
        import re
        data = open(os.path.join(HERE, "..", "..", "data.js"), encoding="utf-8").read()
        block = data[data.index("ROLE_GROUPS"):data.index("]", data.index("Actor"))]
        roles = set(re.findall(r'"([^"]+)"', block))
    except Exception:
        pass
    items = english_strings()
    if a.limit:
        items = items[:a.limit]
    os.makedirs(os.path.join(HERE, "drafts"), exist_ok=True)
    path = os.path.join(HERE, "drafts", f"words-{a.lang}.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# DRAFT {a.lang}: machine translated with LibreTranslate. A speaker must check every line.\n")
        f.write("# Lines marked CHECK are crew roles: compare with Admin, Languages, Look up on Wikidata.\n")
        for i, en in enumerate(items, 1):
            try:
                t = translate(a.server, a.key, en, a.lang)
            except Exception as e:
                sys.exit(f"Couldn't reach {a.server}: {e}")
            f.write(f"{en} || {t}{'  # CHECK' if en in roles else ''}\n")
            if i % 50 == 0:
                print(f"{i}/{len(items)}")
            time.sleep(0.05)
    print(f"Wrote {os.path.relpath(path)}. Ask a speaker to check it before it goes live.")


if __name__ == "__main__":
    main()
