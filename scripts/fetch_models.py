# Usage: python3 -I scripts/fetch_models.py ~/Documents/bto
# Reads Btomyhome's free 3D models post (SketchUp viewer links) and writes models.json into each Nov 2026 project folder.
# Rerun when Btomyhome adds models; the post marks some projects "Work in Progress".
import datetime, glob, html, json, os, re, sys, urllib.request

ROOT = os.path.expanduser(sys.argv[1])
POST = "https://btomyhome.com/blogs/news/november-bto-2026-models-pre-ballot-result-free-to-view"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
TYPES = r"(Community Care Apartment|2-room Flexi \(Type [12]\)|3-room|4-room|5-room|3Gen)"

page = urllib.request.urlopen(urllib.request.Request(POST, headers={"User-Agent": UA}), timeout=60).read().decode("utf-8", "ignore")
links = [(html.unescape(u), re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", t))).strip())
         for u, t in re.findall(r'<a [^>]*href="(https://app\.sketchup\.com/share/[^"]+)"[^>]*>(.*?)</a>', page, re.S)]
today = datetime.date.today().isoformat()
for pdir in sorted(glob.glob(os.path.join(ROOT, "projects", "2026-11", "*", "official.json"))):
    pdir = os.path.dirname(pdir)
    name = json.load(open(os.path.join(pdir, "official.json")))["project_name"].replace("–", "-").split(" - ")[0].strip()
    models = []
    for url, text in links:
        if not text.lower().startswith(name.lower() + " "): continue
        m = re.match(TYPES + r"\s*(?:\(CCA\))?\s*(.*)$", text[len(name):].strip())
        if not m: print("unmatched:", text); continue
        variant = re.sub(r"(\d+)\s*sqm", r"\1 m²", m.group(2))
        models.append(dict(flat_type=m.group(1), variant=variant, title=text, url=url))
    out = os.path.join(pdir, "models.json")
    json.dump(dict(source=POST, retrieved=today, models=models), open(out, "w"), indent=1, ensure_ascii=False)
    print(os.path.basename(pdir), len(models), [(x["flat_type"], x["variant"]) for x in models])
