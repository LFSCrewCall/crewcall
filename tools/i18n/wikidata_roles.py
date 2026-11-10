#!/usr/bin/env python3
"""Cross-check Crew Call's crew role names against Wikidata (open data, CC0).

Run:  python3 tools/i18n/wikidata_roles.py
Writes tools/i18n/wikidata-roles.md, a table of our wording next to Wikidata's
label in each language. It never changes the translations: Wikidata labels are
often formal ("directeur ou directrice de la photographie") rather than what
crews say on set, so a person decides. Needs internet access.
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
UA = {"User-Agent": "CrewCall-translation-check/1.0 (student project; https://github.com/)"}
LANGS = [("zh-hant", "繁體"), ("zh-hans", "简体"), ("fr", "Français"), ("es", "Español"), ("ru", "Русский"), ("ar", "العربية")]
FILMY = re.compile(r"film|cinema|movie|television|theat|production|camera|stage|music|video|occupation|profession", re.I)

# role -> what to search for on Wikidata (or a fixed item id when search picks the wrong thing)
SEARCH = {
    "Director": "Q2526255", "Producer": "Q3282637", "Screenwriter": "Q28389", "1st AD": "assistant director",
    "Script Supervisor": "script supervisor", "Runner": "runner film", "Line Producer": "line producer",
    "Production Manager": "unit production manager", "Production Coordinator": "production coordinator",
    "Location Manager": "location manager", "DoP": "Q222344", "Camera Operator": "camera operator",
    "1st AC / Focus Puller": "focus puller", "2nd AC": "clapper loader", "DIT": "digital imaging technician",
    "Stills / BTS": "unit still photographer", "Gaffer": "Q1424726", "Spark": "lighting technician", "Key Grip": "key grip",
    "Grip": "grip film", "Sound Recordist": "production sound mixer", "Boom Operator": "boom operator",
    "Sound Designer": "sound designer", "Composer": "film score composer", "Production Designer": "production designer",
    "Art Director": "art director", "Costume": "costume designer", "Hair & Make-up": "make-up artist",
    "Editor": "film editor", "Colourist": "colorist", "VFX": "visual effects", "Unit Publicist": "unit publicist", "Actor": "Q33999",
}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
        return json.load(r)

def find(term):
    if re.fullmatch(r"Q\d+", term):
        return term
    q = urllib.parse.urlencode({"action": "wbsearchentities", "search": term, "language": "en", "format": "json", "limit": 7, "type": "item"})
    hits = get("https://www.wikidata.org/w/api.php?" + q).get("search", [])
    for h in hits:
        if FILMY.search(h.get("description", "")):
            return h["id"]
    return hits[0]["id"] if hits else None

def ours():
    """English -> [zh-Hant, zh-Hans, fr, es, ru, ar] from the built dictionary."""
    src = (HERE.parent.parent / "i18n-dict.js").read_text(encoding="utf-8")
    words = json.loads(re.search(r"words\s*:\s*(\{.*?\})\s*,\s*patterns", src, re.S).group(1))
    return words

def main():
    try:
        mine = ours()
    except Exception as e:
        mine = {}
        print("Couldn't read i18n-dict.js:", e, file=sys.stderr)
    rows = []
    for role, term in SEARCH.items():
        qid = find(term)
        labels = {}
        if qid:
            q = urllib.parse.urlencode({"action": "wbgetentities", "ids": qid, "props": "labels", "languages": "|".join(l for l, _ in LANGS), "format": "json"})
            ent = get("https://www.wikidata.org/w/api.php?" + q)["entities"][qid]["labels"]
            labels = {k: v["value"] for k, v in ent.items()}
        rows.append((role, qid, labels))
        time.sleep(0.3)  # be polite to the Wikidata API
    out = ["# Crew roles: Crew Call wording next to Wikidata", "",
           "Made by `tools/i18n/wikidata_roles.py`. Wikidata labels are open data (CC0). Each cell shows **ours** / Wikidata.",
           "Where they differ, keep ours if it's what crews say on set; otherwise update the words file.", "",
           "| Role | Item | " + " | ".join(n for _, n in LANGS) + " |", "|---|---|" + "---|" * len(LANGS)]
    for role, qid, labels in rows:
        o = mine.get(role, [""] * 6)
        cells = []
        for i, (code, _) in enumerate(LANGS):
            w = labels.get(code, "–")
            a = o[i] if i < len(o) and o[i] else "(English)"
            cells.append(f"**{a}** / {w}" if a != w else f"**{a}** ✓")
        out.append(f"| {role} | [{qid}](https://www.wikidata.org/wiki/{qid}) | " + " | ".join(cells) + " |" if qid else f"| {role} | not found | " + " | ".join("–" for _ in LANGS) + " |")
    (HERE / "wikidata-roles.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print("Wrote", HERE / "wikidata-roles.md", "with", len(rows), "roles")

if __name__ == "__main__":
    main()
