// Estimated price banding by storey, spread from HDB's official price range for each flat type.
// HDB publishes only a low-high range per flat type at launch; the price of each unit is shown at booking.
import type { Blocks, Unit } from './data';

// Share of the price range assumed to come from height. The rest is put down to stack (facing, view, noise, corner).
export const FLOOR_SHARE = 0.7;

export interface Band {
  from: number; // first storey
  to: number; // last storey
  low: number; // cheapest stack at the first storey
  high: number; // best stack at the last storey
  blocks: string[];
}

export interface Banding {
  flat_type: string;
  base: string;
  low: number;
  high: number;
  top: number;
  perStorey: number;
  perStoreyMin: number; // if only half the range comes from height
  perStoreyMax: number; // if all of it does
  stackSpread: number;
  bands: Band[];
}

const num = (s: string) => Number(s.replace(/,/g, ''));
const round = (v: number) => Math.round(v / 1000) * 1000;

// 99-year price ranges for a unit row; one row can carry variants, e.g. "4-room: $558,000 - $796,000 4-room (with balcony): $619,000 - $832,000"
export function ranges(u: Unit): { flat_type: string; low: number; high: number }[] {
  const note = u.price_note ?? '';
  const m99 = note.match(/99 Years: \$([\d,]+) - \$([\d,]+)/);
  if (m99) return [{ flat_type: u.flat_type, low: num(m99[1]), high: num(m99[2]) }];
  if (/short leases/i.test(note)) return []; // short leases only (Community Care Apartments)
  const variants = [...note.matchAll(/(\d-room(?: \([^)]*\))?): \$([\d,]+) - \$([\d,]+)/g)];
  if (variants.length) return variants.map((v) => ({ flat_type: v[1], low: num(v[2]), high: num(v[3]) }));
  if (u.price_low && u.price_high) return [{ flat_type: u.flat_type, low: Number(u.price_low), high: Number(u.price_high) }];
  return [];
}

export function banding(units: Unit[], blocks: Blocks): Banding[] {
  const out: Banding[] = [];
  for (const u of units) {
    const having = blocks.blocks.filter((b) => (b.counts[u.flat_type] ?? 0) > 0);
    if (!having.length) continue;
    const top = Math.max(...having.map((b) => b.top));
    const storeys = top - 2; // flats start on the 2nd storey
    for (const r of ranges(u)) {
      const spread = r.high - r.low;
      const perStorey = (FLOOR_SHARE * spread) / storeys;
      const stackSpread = (1 - FLOOR_SHARE) * spread;
      const n = top >= 20 ? 4 : 3;
      const size = (top - 1) / n;
      const bands: Band[] = [];
      for (let i = 0; i < n; i++) {
        const from = 2 + Math.round(i * size);
        const to = i === n - 1 ? top : 1 + Math.round((i + 1) * size);
        bands.push({
          from, to,
          low: round(r.low + perStorey * (from - 2)),
          high: round(r.low + perStorey * (to - 2) + stackSpread),
          blocks: having.filter((b) => b.top >= from).map((b) => b.block),
        });
      }
      out.push({
        flat_type: r.flat_type, base: u.flat_type, low: r.low, high: r.high, top,
        perStorey,
        perStoreyMin: (0.5 * spread) / storeys,
        perStoreyMax: spread / storeys,
        stackSpread,
        bands,
      });
    }
  }
  return out;
}
