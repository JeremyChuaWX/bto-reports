# Refresh HDB application rates and regenerate the site's rate data.
# Usage: python3 -I scripts/rates.py [--no-fetch] 202611 [202702 ...]
#   Downloads HDB's public application-rate file for each launch (BTO<yyyymm>.json) into data/apprates/,
#   skipping launches already marked final, then writes:
#   - src/data/projects/<yyyy-mm>/<slug>/application-rates.json for each project in that launch
#   - src/data/past-rates.json, every launch in data/apprates/ (used for the cross-launch comparisons)
# A failed download is reported and skipped, so the existing data stays in place.
import datetime, glob, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "apprates")
PROJECTS = os.path.join(ROOT, "src", "data", "projects")
FILE_URL = "https://services-homes.hdb.gov.sg/sales/files/apprates/BTO{}.json"
PAGE_URL = "https://services-homes.hdb.gov.sg/sales/application-rate/bto/{}"


def fetch(qtr):
    path = os.path.join(RAW, f"BTO{qtr}.json")
    old = json.load(open(path)) if os.path.exists(path) else None
    if old and old.get("is_final_update"):
        print(f"{qtr}: already final, not fetched"); return
    req = urllib.request.Request(FILE_URL.format(qtr), headers={"User-Agent": "Mozilla/5.0 (bto-reports rate refresh)"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            if r.status != 200 or r.geturl() != FILE_URL.format(qtr): raise ValueError(f"HTTP {r.status} {r.geturl()}")
            new = json.loads(r.read())
        assert isinstance(new.get("estate_list"), list) and new.get("display_datetime")
    except Exception as e:  # not published yet, or blocked
        print(f"{qtr}: not updated ({e})"); return
    if new == old:
        print(f"{qtr}: unchanged, as at {new['display_datetime']}"); return
    json.dump(new, open(path, "w"), indent=4, ensure_ascii=False)
    print(f"{qtr}: updated, as at {new['display_datetime']}, final={new['is_final_update']}")


def key(t):  # HDB rate-table flat type -> official.json flat types
    t = t.lower()
    if "community care" in t: return ["cca"]
    if "flexi" in t: return ["2rm"]
    if "3gen" in t and "5" in t: return ["5rm", "3gen"]
    if "3gen" in t: return ["3gen"]
    m = re.match(r"(\d)-room", t)
    return [m.group(1) + "rm"] if m else [t]


def project_rates(qtr, d):
    month = f"{qtr[:4]}-{qtr[4:]}"
    for p in sorted(glob.glob(os.path.join(PROJECTS, month, "*", "official.json"))):
        o = json.load(open(p))
        pn = re.split(r"\s+[–-]\s+", o.get("project_name") or "")[0].strip()
        if not pn: continue
        supply = {}
        for u in o.get("units") or []:
            k = key(u["flat_type"])[0]; supply[k] = supply.get(k, 0) + int(u["supply"])
        rows = []
        for e in d["estate_list"]:
            for f in e["flat_type_list"]:
                names = [x["project_name"] for x in f["projects"]]
                if pn not in names: continue
                rows.append(dict(flat_type=f["flat_type"], shared_with=[n for n in names if n != pn], units=f["flat_supply"],
                                 project_units=sum(supply.get(k, 0) for k in key(f["flat_type"])), applicants=f["total_applicant_no"],
                                 overall=round(f["total_applicant_no"] / f["flat_supply"], 2) if f["flat_supply"] else None, rates=f["app_rates"]))
        if not rows: continue
        out = dict(as_at=d["display_datetime"], is_final=d["is_final_update"], launch_start=d["launch_start_date"],
                   launch_end=d["launch_end_date"], source=PAGE_URL.format(qtr), tag="Official", rows=rows)
        json.dump(out, open(os.path.join(os.path.dirname(p), "application-rates.json"), "w"), indent=1, ensure_ascii=False)


def main():
    args = sys.argv[1:]
    if "--no-fetch" not in args:
        for q in args: fetch(q)
    launches = []
    for f in sorted(glob.glob(os.path.join(RAW, "BTO??????.json"))):
        qtr = re.search(r"(\d{6})", os.path.basename(f)).group(1); d = json.load(open(f))
        project_rates(qtr, d)
        launches.append(dict(launch=datetime.date(int(qtr[:4]), int(qtr[4:]), 1).strftime("%b %Y"), qtr=qtr, final=d["is_final_update"],
                             as_at=d["display_datetime"], source=PAGE_URL.format(qtr),
                             rows=[dict(town=e["estate_name"], flat_type=t["flat_type"],
                                        projects=[dict(name=x["project_name"], cls=x.get("project_classification")) for x in t["projects"]],
                                        units=t["flat_supply"], applicants=t["total_applicant_no"], rates=t["app_rates"])
                                   for e in d["estate_list"] for t in e["flat_type_list"]]))
    json.dump(dict(tag="Official", launches=launches), open(os.path.join(ROOT, "src", "data", "past-rates.json"), "w"), indent=1, ensure_ascii=False)
    print("launches:", [(l["launch"], "final" if l["final"] else "live") for l in launches])


if __name__ == "__main__":
    main()
