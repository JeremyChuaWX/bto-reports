# (copy of the helper used to build the BTO research folder; run against ~/Documents/bto)
# Writes layouts.json (captions for HDB Layout Ideas floor plans) into each Nov 2026 project folder.
import json, os, sys
ROOT = os.path.expanduser(sys.argv[1])
T1, T2 = "2-room Flexi (Type 1)", "2-room Flexi (Type 2)"
L = {
 "bayshore-oasis": ("bd_n10c3a", [("2rmtype1", T1, "", 40, 38), ("2rmtype2", T2, "", 48, 46), ("4rm", "4-room", "", 90, 86)]),
 "bayshore-sails": ("bd_n10c3", [("2rmtype1(1)", T1, "38 m² layout A", 38, 36), ("cca", T1, "38 m² layout B", 38, 36),
     ("2rmtype1(2)", T1, "40 m² layout", 40, 38), ("2rmtype2", T2, "", 48, 46), ("3rm", "3-room", "", 67, 64), ("4rm", "4-room", "", 90, 86)]),
 "chencharu-acres": ("ys_n8c23", [("2rmtype1", T1, "", 40, 38), ("2rmtype2", T2, "", 48, 46), ("3rm", "3-room", "", 69, 66), ("4rm", "4-room", "", 93, 90), ("5rm", "5-room", "", 113, 110)]),
 "merpati-meadow": ("gl_n1c51", [("2rmtype1", T1, "", 40, 38), ("2rmtype2", T2, "", 48, 46), ("4rm", "4-room", "", 89, 86)]),
 "plantation-dew": ("tg_d1c7", [("2rmtype1", T1, "", 40, 38), ("2rmtype2", T2, "", 48, 46),
     ("3rm(1)", "3-room", "Default", 69, 66), ("3rm(2)", "3-room", "White flat", 69, 66),
     ("4rm(1)", "4-room", "Default", 93, 90), ("4rm(2)", "4-room", "White flat", 93, 90),
     ("5rm(1)", "5-room", "Default", 113, 110), ("5rm(2)", "5-room", "White flat, idea 1", 113, 110), ("5rm(3)", "5-room", "White flat, idea 2", 113, 110),
     ("3gen", "3Gen", "", 121, 115)]),
 "sembawang-anchor": ("sb_n4c11", [("2rmtype1", T1, "", 40, 38), ("2rmtype2", T2, "", 48, 46), ("3rm", "3-room", "", 69, 66), ("4rm", "4-room", "", 93, 90), ("5rm", "5-room", "", 113, 110)]),
 "toa-payoh-hillside": ("tp_n0c29", [("cca", "Community Care Apartment", "", 39, 36), ("2rmtype1", T1, "", 40, 38), ("2rmtype2", T2, "", 49, 46),
     ("4rm(1)", "4-room", "90 m² layout", 90, 86), ("4rm(2)", "4-room", "93 m² layout", 93, 89)]),
}
NOTES = {
 ("bayshore-sails", "cca"): "HDB's project page lists this image under Community Care Apartment, but it shows a 2-room Flexi (Type 1) plan; this project has no Community Care Apartments.",
 ("plantation-dew", "3rm(2)"): "White flats have no partition walls between the living room and bedrooms and fewer power points, and cost $6,000 less (HDB).",
 ("toa-payoh-hillside", "cca"): "Community Care Apartments are for seniors aged 65 and above, on 15–35 year leases, with care services bundled.",
}
for slug, (code, items) in L.items():
    pdir = os.path.join(ROOT, "projects", "2026-11", slug)
    out = []
    for key, ftype, variant, area, internal in items:
        f = f"assets/hdb/layoutideas__layoutideas_{code}_{key}.jpg"
        assert os.path.exists(os.path.join(pdir, f)), f
        note = NOTES.get((slug, key), "") or (NOTES[("plantation-dew", "3rm(2)")] if variant.startswith("White flat") else "")
        out.append(dict(file=f, flat_type=ftype, variant=variant, area_sqm=area, internal_sqm=internal, note=note))
    json.dump(out, open(os.path.join(pdir, "layouts.json"), "w"), indent=1, ensure_ascii=False)
    print(slug, len(out))
