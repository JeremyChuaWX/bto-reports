# (copy of the helper used to build the BTO research folder; run against ~/Documents/bto)
# Usage: python -I fetch_layouts.py <bto_root>
# Downloads HDB "Layout Ideas" floor plans listed in each project's XML into assets/hdb/layoutideas__*.jpg
import glob, os, re, sys, urllib.parse, urllib.request
root = sys.argv[1]
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
for xml in sorted(glob.glob(os.path.join(root, "projects/*/*/assets/hdb/*.xml"))):
    d = os.path.dirname(xml)
    items = re.findall(r"<(layoutideas-[^>]+)>([^<]+)</", open(xml).read())
    for _, rel in items:
        out = os.path.join(d, "layoutideas__" + os.path.basename(rel))
        if os.path.exists(out) and os.path.getsize(out) > 10000: continue
        req = urllib.request.Request("https://resource.homes.hdb.gov.sg/" + urllib.parse.quote(rel), headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r: open(out, "wb").write(r.read())
    print(os.path.relpath(d, root).split("/assets")[0], len(items))
