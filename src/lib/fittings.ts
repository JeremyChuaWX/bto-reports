// Regroups HDB's finishes and Optional Component Scheme (OCS) data for display: one price table, then what each
// package contains and what comes as standard, with flat types that share the same list shown once.
import type { Fittings, Package } from './data';

export type Kind = 'floor' | 'door' | 'short';
export const KIND_LABEL: Record<Kind, string> = { floor: 'Flooring', door: 'Doors and sanitary fittings', short: 'Short-lease package' };

export const kindOf = (k: Package): Kind =>
  /short-lease/i.test(k.name) ? 'short' : /flooring/i.test(k.name) ? 'floor' : 'door';

// Tidy HDB's wording: "Floor tiles in the: Bathroom, Kitchen" -> "Floor tiles: bathroom, kitchen"; stray spaces before punctuation
const tidy = (s: string) =>
  s.replace(/\s+([,.:;])/g, '$1').replace(/\s{2,}/g, ' ').replace(/^(.*?) in the: (.*)$/, (_, a, b) => `${a}: ${b.toLowerCase()}`).trim();

// One CCA item has the lead-in to the senior-friendly list run into it; split it off and drop the lead-in
export function standardItems(list: string[]): string[] {
  return list.flatMap((x) => x.split(/\s{3,}/)).filter((x) => !/including$/i.test(x.trim())).map(tidy);
}

const pkgTitle = (n: string) =>
  tidy(n.replace(/^Default \(with bedroom walls\) - OCS opt-in\s*[-–]\s*/, '').replace(/^Package \d+ - /, '').replace(/^OCS package for /, 'Package for '));

export interface Cell { price: string; note?: string }
export interface Row { flat_type: string; cells: Partial<Record<Kind, Cell>>; total: string | null }
export interface Group<T> { flat_types: string[]; value: T }
export interface Contents { kind: Kind; title: string; items: string[]; notes: string[] }
export interface White { flat_type: string; reduction: number | null; bathroom: string | null }

const money = (v: number) => '$' + v.toLocaleString('en-SG');

function cell(k: Package, flat_type: string): Cell {
  if (k.price != null) return { price: money(k.price) };
  const t = k.price_text ?? '–';
  // Toa Payoh Hillside 4-room flooring: "$4,980 / $5,150". Only some 4-room flats there have a balcony, which this package also covers
  if (/balcony/i.test(k.name) && /^\$[\d,]+ \/ \$[\d,]+$/.test(t)) {
    const [a, b] = t.split(' / ');
    return { price: `${a} / ${b}`, note: `${a} without a balcony, ${b} with one (my reading: HDB lists both prices without saying which is which)` };
  }
  return { price: t.replace(/\((\d+)sqm\)/g, '($1 sqm)') };
}

// Group flat types whose values are identical, keeping HDB's order
function group<T>(pairs: [string, T][]): Group<T>[] {
  const out: Group<T>[] = [];
  for (const [ft, v] of pairs) {
    const key = JSON.stringify(v);
    const g = out.find((x) => JSON.stringify(x.value) === key);
    if (g) g.flat_types.push(ft);
    else out.push({ flat_types: [ft], value: v });
  }
  return out;
}

export function view(ft: Fittings) {
  const rows: Row[] = ft.types.map((t) => {
    const cells: Row['cells'] = {};
    for (const k of t.packages) cells[kindOf(k)] = cell(k, t.flat_type);
    // Flooring + doors; a package listed as "$a / $b" gives two totals
    const opts = t.packages.filter((k) => kindOf(k) !== 'short').map((k) =>
      k.price != null ? [k.price] : /^\$[\d,]+ \/ \$[\d,]+$/.test(k.price_text ?? '') ? k.price_text!.split(' / ').map((x) => Number(x.replace(/[$,]/g, ''))) : null);
    const total = opts.length === 2 && opts.every(Boolean)
      ? [...new Set(opts[0]!.flatMap((a) => opts[1]!.map((b) => a + b)))].map(money).join(' / ')
      : null;
    return { flat_type: t.flat_type, cells, total };
  });
  const kinds = (['floor', 'door', 'short'] as Kind[]).filter((k) => rows.some((r) => r.cells[k]));

  const contents = group<Contents>(
    ft.types.flatMap((t) =>
      t.packages.map((k): [string, Contents] => [
        t.flat_type,
        {
          kind: kindOf(k),
          title: pkgTitle(k.name),
          items: k.items.map(tidy),
          // White flat notes go in the white flat box instead
          notes: k.notes.filter((n) => !/white flat/i.test(n)).map(tidy),
        },
      ]),
    ),
  );

  const standard = group(ft.types.map((t): [string, string[]] => [t.flat_type, standardItems(t.standard)]));

  const white: White[] = ft.types
    .filter((t) => t.info.some((i) => /white flat/i.test(i.title)))
    .map((t) => {
      const text = t.info.map((i) => i.text).join(' ');
      const red = text.match(/price reduction of \$([\d,]+)/);
      const bath = t.packages.flatMap((k) => k.notes).map((n) => n.match(/White flat.*?:\s*(\$[\d,]+)/)).find(Boolean);
      return { flat_type: t.flat_type, reduction: red ? Number(red[1].replace(/,/g, '')) : null, bathroom: bath ? bath[1] : null };
    });

  // What a buyer sees whether or not a type has packages: e.g. Community Care Apartments come fully fitted
  const none = ft.types.filter((t) => t.packages.length === 0).map((t) => t.flat_type);

  return { rows, kinds, contents, standard, white, none };
}
