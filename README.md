# BTO reports: Nov 2026 and Feb 2027

An independent look at the 12 projects in HDB's November 2026 BTO exercise and the upcoming February 2027 exercise: amenities and planned developments, resale benchmarks, Standard/Plus/Prime rules, and construction stage.

Live site: https://jeremychuawx.github.io/bto-reports/

Not financial advice. Check the [HDB Flat Portal](https://homes.hdb.gov.sg/) before applying.

## How it's built

- [Astro](https://astro.build) static site. Each project is a Markdown report plus JSON data in `src/data/projects/<exercise>/<project>/`.
- Maps use [OneMap](https://www.onemap.gov.sg/) tiles (Singapore Land Authority) with [Leaflet](https://leafletjs.com). Rail lines and under-construction blocks in `public/geo/` come from URA and HDB datasets on [data.gov.sg](https://data.gov.sg/).
- `scripts/deploy.sh` builds the site and publishes `dist/` to the `gh-pages` branch, which GitHub Pages serves.

## Updating the data

The reports are written in a separate working folder, then copied in:

```sh
python3 -I scripts/sync_data.py <reports-folder> <govdata-folder>
git add -A && git commit -m "Update reports" && git push
scripts/deploy.sh
```

`sync_data.py` copies each project's `report.md`, the JSON files and selected images, writes the map overlays to `public/geo/`, and copies `summary.md`.

## Licences

Site plans, town maps and artist's impressions are © HDB. Map tiles © OneMap / Singapore Land Authority. Government datasets are used under the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence).
