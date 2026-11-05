# Copy the BTO research output into the Astro site.
# Usage: python3 -I scripts/sync_data.py ~/Documents/bto [/tmp/govdata]
# The second argument is the folder of raw data.gov.sg downloads used for the map overlays
# (URA MP2025 rail lines, HDB under-construction buildings), written to public/geo/<month>/<slug>.json. If it is missing, existing files are kept.
import glob, json, math, os, re, shutil, sys

SRC = os.path.expanduser(sys.argv[1])
GOV = os.path.expanduser(sys.argv[2]) if len(sys.argv) > 2 else "/tmp/govdata"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data")
JSONS = ["amenities.json", "gov-stats.json", "verification.json", "models.json"]
MAPS = ["plot-satellite.jpg", "area-satellite.jpg", "townmap-crop.jpg"]
OFFICIAL_KEYS = ["project_name", "classification", "town", "lat", "lng", "clawback_rate", "est_waiting_time", "total_units",
                 "waiting_time_note", "ecd", "dpd", "booking_period", "flat_types", "units"]


def hav(a, b, c, d):
    r = math.radians
    x = math.sin(r(c - a) / 2) ** 2 + math.cos(r(a)) * math.cos(r(c)) * math.sin(r(d - b) / 2) ** 2
    return 12742000 * math.asin(math.sqrt(x))


def load_geo():
    rf, uf = os.path.join(GOV, "rail_line_amd.raw"), os.path.join(GOV, "hdb_uc.raw")
    if not (os.path.exists(rf) and os.path.exists(uf)): return None, None
    rail = []
    for f in json.load(open(rf))["features"]:
        g, p = f["geometry"], f["properties"]
        for c in (g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]):
            pts = []
            for x, y, *_ in c:  # drop points within ~8 m of the previous one
                if not pts or hav(pts[-1][0], pts[-1][1], y, x) > 8: pts.append([round(y, 5), round(x, 5)])
            last = [round(c[-1][1], 5), round(c[-1][0], 5)]
            if pts[-1] != last: pts.append(last)
            rail.append(dict(type=p.get("RAIL_TYPE"), level=p.get("GRND_LEVEL"), pts=pts))
    uc = []
    for f in json.load(open(uf))["features"]:
        g, p = f["geometry"], f["properties"]
        rings = g["coordinates"] if g["type"] == "Polygon" else [r for poly in g["coordinates"] for r in poly]
        uc.append(dict(blk=p.get("BLK_NO"), postal=p.get("POSTAL_COD"), ring=[[round(y, 6), round(x, 6)] for x, y, *_ in rings[0]]))
    return rail, uc


def main():
    rail, uc = load_geo()
    dest_projects = os.path.join(OUT, "projects")
    keep = set()
    for pdir in sorted(glob.glob(os.path.join(SRC, "projects", "*", "*"))):
        if not os.path.exists(os.path.join(pdir, "report.md")): continue
        month, slug = pdir.split(os.sep)[-2:]
        dst = os.path.join(dest_projects, month, slug); keep.add(dst)
        img = os.path.join(dst, "images")
        if os.path.isdir(img): shutil.rmtree(img)
        os.makedirs(img, exist_ok=True)
        shutil.copy2(os.path.join(pdir, "report.md"), dst)
        o = json.load(open(os.path.join(pdir, "official.json")))
        json.dump({k: o.get(k) for k in OFFICIAL_KEYS}, open(os.path.join(dst, "official.json"), "w"), indent=1, ensure_ascii=False)
        for j in JSONS:
            f = os.path.join(pdir, j)
            if os.path.exists(f):
                txt = open(f).read().replace(os.path.join(os.path.expanduser("~"), "Documents", "bto") + "/", "")
                open(os.path.join(dst, j), "w").write(txt)
        for m in MAPS:
            f = os.path.join(pdir, "assets", "maps", m)
            if os.path.exists(f): shutil.copy2(f, os.path.join(img, m))
        for f in sorted(glob.glob(os.path.join(pdir, "assets", "hdb", "carousel__*.jpg"))):
            name = "siteplan.jpg" if "siteplan" in f else re.sub(r"^carousel__", "", os.path.basename(f))
            shutil.copy2(f, os.path.join(img, name))
        # HDB's resale comparison and affordability charts, e.g. chart__resale_<code>_4rm.jpg -> chart-resale-4rm.jpg
        for f in sorted(glob.glob(os.path.join(pdir, "assets", "hdb", "chart__*.jpg"))):
            kind, ftype = re.match(r"chart__(resale|oydh)_.+_(\w+)\.jpg$", os.path.basename(f)).groups()
            shutil.copy2(f, os.path.join(img, f"chart-{kind}-{ftype.replace('type2', '')}.jpg"))
        # HDB "Layout Ideas" floor plans, renamed layout-NN.jpg, with captions in layouts.json
        lf = os.path.join(pdir, "layouts.json")
        if os.path.exists(lf):
            layouts = json.load(open(lf))
            for i, l in enumerate(layouts, 1):
                l["image"] = f"layout-{i:02d}.jpg"
                shutil.copy2(os.path.join(pdir, l.pop("file")), os.path.join(img, l["image"]))
            json.dump(layouts, open(os.path.join(dst, "layouts.json"), "w"), indent=1, ensure_ascii=False)
        elif os.path.exists(os.path.join(dst, "layouts.json")):
            os.remove(os.path.join(dst, "layouts.json"))
        if rail is not None:
            lat, lng = o["lat"], o["lng"]
            near_rail = [l for l in rail if any(hav(lat, lng, a, b) < 3500 for a, b in l["pts"][:: max(1, len(l["pts"]) // 8)] + [l["pts"][-1]])]
            near_uc = [u for u in uc if hav(lat, lng, *u["ring"][0]) < 800]
            gdir = os.path.join(ROOT, "public", "geo", month); os.makedirs(gdir, exist_ok=True)
            json.dump(dict(rail=near_rail, uc=near_uc), open(os.path.join(gdir, slug + ".json"), "w"), separators=(",", ":"))
        print(f"{month}/{slug}: {len(os.listdir(img))} images")
    for d in glob.glob(os.path.join(dest_projects, "*", "*")):
        if d not in keep: shutil.rmtree(d); print("removed", d)
    s = open(os.path.join(SRC, "summary.md")).read()
    s = re.sub(r"\]\(projects/([^/]+)/([^/]+)/report\.html\)", r"](projects/\1/\2/)", s)
    open(os.path.join(OUT, "summary.md"), "w").write(s)


if __name__ == "__main__":
    main()
