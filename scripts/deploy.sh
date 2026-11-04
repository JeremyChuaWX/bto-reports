#!/bin/sh
# Build the site and publish dist/ to the gh-pages branch, which GitHub Pages serves.
set -eu
cd "$(dirname "$0")/.."
remote=$(git remote get-url origin)
rev=$(git rev-parse --short HEAD)
npm run build
touch dist/.nojekyll # Pages would otherwise skip the _astro/ folder
tmp=$(mktemp -d)
cp -R dist/. "$tmp"
cd "$tmp"
git init -q -b gh-pages
git add -A
git commit -qm "Deploy $rev"
git push -f "$remote" gh-pages
rm -rf "$tmp"
