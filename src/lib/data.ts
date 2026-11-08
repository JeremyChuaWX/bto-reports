import type { ImageMetadata } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

export interface Amenity {
  name: string;
  category: string;
  lat: number;
  lng: number;
  straight_m?: number | null;
  walk_m?: number | null;
  walk_min?: number | null;
  note?: string;
  source?: string;
}

export interface Unit {
  flat_type: string;
  supply?: string | null;
  floor_area_sqm?: string | null;
  price_low?: string | null;
  price_high?: string | null;
  price_note?: string | null;
}

export interface Official {
  project_name: string | null;
  classification: 'Standard' | 'Plus' | 'Prime' | null;
  town: string;
  lat: number;
  lng: number;
  clawback_rate: string | null;
  est_waiting_time: string | null;
  total_units: string | null;
  waiting_time_note: string | null;
  ecd: string | null;
  dpd: string | null;
  booking_period: string | null;
  flat_types?: string[];
  units: Unit[];
}

export interface GovStats {
  primary_1km: number;
  primary_2km: number;
  clinics_500: number;
  clinics_1km: number;
  preschools_500: number;
  bus_400: number;
  hawker_1km: number;
  supermarkets_1km: number;
  hdb_uc_300m: { blk: string; postal: string; dist_m: number }[];
}

// HDB "Layout Ideas" floor plans (Nov 2026 projects; HDB publishes these at launch)
export interface Layout {
  image: string;
  flat_type: string;
  variant: string;
  area_sqm: number;
  internal_sqm: number;
  note: string;
}

// Unofficial 3D models (SketchUp viewer links) from Btomyhome; see scripts/fetch_models.py
export interface Model {
  flat_type: string;
  variant: string;
  title: string;
  url: string;
}

export interface Models {
  source: string;
  retrieved: string;
  models: Model[];
}

// Other BTO projects near the site: the flats this one will compete with on the resale market
export interface Competitor {
  name: string;
  classification: string; // Standard, Plus or Prime; "Pre-2024" for launches before the Oct 2024 framework
  launch: string | null;
  units: number | null;
  flat_types: string | null;
  status: string;
  completion: string | null;
  resale_from: string | null;
  open_market: boolean | null; // null while the classification is not yet announced; false where resale buyers must meet BTO-style eligibility (Plus and Prime)
  lat: number;
  lng: number;
  straight_m: number;
  note?: string;
  source: string;
  tag: string;
}

export interface ResaleBlock {
  blk: string; street: string; year: number; flats: number; dist: number; lat: number; lng: number;
  types: string; sales: number; median_4rm: number | null;
}
export interface ResaleType {
  flat_type: string; stock: number; sales: number; turnover_pct: number | null;
  median: number | null; p25: number | null; p75: number | null; median_sqm: number | null;
  young_sales: number; young_median: number | null; // leases that started within the last 10 years
}
export interface Resale {
  radius_m: number; window: string; sale_year: number; sale_note: string;
  blocks_count: number; flats: number; sales: number;
  age_at_sale: { band: string; flats: number }[];
  by_type: ResaleType[]; blocks: ResaleBlock[]; method: string; source: string; tag: string;
}
export interface Competition {
  updated: string;
  resale?: Resale;
  method: string;
  projects: Competitor[];
}

export interface AppRateRow {
  flat_type: string;
  shared_with: string[];
  units: number;
  project_units: number;
  applicants: number;
  overall: number | null;
  rates: { elderly: number | null; first_time_fam: number | null; second_time_fam: number | null; first_time_singles: number | null };
}

export interface AppRates {
  as_at: string;
  is_final: boolean;
  launch_start: string;
  launch_end: string;
  source: string;
  tag: string;
  rows: AppRateRow[];
}

export interface Package {
  kind: string;
  name: string;
  price: number | null;
  price_text: string | null;
  items: string[];
  notes: string[];
}

export interface Fittings {
  source: string;
  tag: string;
  ocs_note: string;
  features: Record<string, string[]>;
  types: { flat_type: string; standard: string[]; packages: Package[]; info: { title: string; text: string }[] }[];
}

export interface Block {
  block: string;
  storeys: string; // e.g. "43", or "7/30" for a block that steps down
  top: number;
  counts: Record<string, number>;
  total: number;
  stacks: Record<string, string[]> | null;
  notes: string;
}

export interface Blocks {
  source: string;
  tag: string;
  stack_note: string;
  blocks: Block[];
  notes: string[];
}

export interface PastLaunch {
  launch: string;
  qtr: string;
  final: boolean;
  as_at: string;
  source: string;
  rows: { town: string; flat_type: string; projects: { name: string; cls: string | null }[]; units: number; applicants: number; rates: AppRateRow['rates'] }[];
}

export interface Verification {
  item: string;
  old?: string;
  new?: string;
  status: string;
  source?: string;
}

// Short names for upcoming projects, which HDB hasn't named yet
const SHORT_NAMES: Record<string, string> = {
  '2027-02/bishan': 'Bishan (Sin Ming St)',
  '2027-02/tampines': 'Tampines (Upper Changi)',
  '2027-02/tampines-cca': 'Tampines CCA (St 11)',
  '2027-02/tengah': 'Tengah (Brickland)',
  '2027-02/toa-payoh': 'Toa Payoh (Mount Pleasant)',
};

const json = import.meta.glob('/src/data/projects/*/*/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const images = import.meta.glob<{ default: ImageMetadata }>('/src/data/projects/*/*/images/*.jpg', { eager: true });

export interface Project {
  id: string; // e.g. "2026-11/sembawang-anchor"
  month: '2026-11' | '2027-02';
  slug: string;
  name: string;
  title: string;
  exercise: string;
  upcoming: boolean;
  official: Official;
  amenities: Amenity[];
  stats: GovStats | null;
  verification: Verification[];
  layouts: Layout[];
  models: Models | null;
  competition: Competition | null;
  appRates: AppRates | null;
  fittings: Fittings | null;
  blocks: Blocks | null;
  images: Record<string, ImageMetadata>;
  totalUnits: number | null;
  fourRoom: Unit | undefined;
  entry: CollectionEntry<'reports'>;
}

function load(entry: CollectionEntry<'reports'>): Project {
  const id = entry.id;
  const [month, slug] = id.split('/') as [Project['month'], string];
  const base = `/src/data/projects/${id}/`;
  const official = json[base + 'official.json'] as Official;
  const amenities = ((json[base + 'amenities.json'] as Amenity[]) ?? []).filter((a) => a.lat && a.lng);
  const title = (entry.body ?? '').split('\n')[0].replace(/^#\s*/, '').trim();
  const name = SHORT_NAMES[id] ?? ((official.project_name ?? '').replace('–', '-').split(' - ')[0].trim() || title.split(':')[0] || slug);
  const imgs: Record<string, ImageMetadata> = {};
  for (const [path, mod] of Object.entries(images)) {
    if (path.startsWith(base + 'images/')) imgs[path.slice((base + 'images/').length)] = mod.default;
  }
  const units = official.units ?? [];
  const total = official.total_units ? Number(official.total_units) : units.reduce((s, u) => s + Number(u.supply ?? 0), 0) || null;
  return {
    id, month, slug, name, title,
    exercise: month === '2026-11' ? 'Nov 2026' : 'Feb 2027',
    upcoming: !official.classification,
    official, amenities,
    stats: (json[base + 'gov-stats.json'] as GovStats) ?? null,
    verification: (json[base + 'verification.json'] as Verification[]) ?? [],
    layouts: (json[base + 'layouts.json'] as Layout[]) ?? [],
    models: (json[base + 'models.json'] as Models) ?? null,
    competition: (json[base + 'competition.json'] as Competition) ?? null,
    appRates: (json[base + 'application-rates.json'] as AppRates) ?? null,
    fittings: (json[base + 'fittings.json'] as Fittings) ?? null,
    blocks: (json[base + 'blocks.json'] as Blocks) ?? null,
    images: imgs,
    totalUnits: total,
    fourRoom: units.find((u) => u.flat_type.startsWith('4-room')),
    entry,
  };
}

// "7 Nov 2026, 12pm" in Singapore time
export function sgTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Singapore' }).replace(':00', '').replace(' ', '').toLowerCase();
  return `${day}, ${time}`;
}

export async function getProjects(): Promise<Project[]> {
  const entries = await getCollection('reports');
  return entries.map(load).sort((a, b) => a.month.localeCompare(b.month) || a.name.localeCompare(b.name));
}

export const nearest = (p: Project, category: string) =>
  p.amenities.filter((a) => a.category === category).sort((a, b) => (a.straight_m ?? 1e9) - (b.straight_m ?? 1e9))[0];

export const url = (path = '') => import.meta.env.BASE_URL + path.replace(/^\//, '');
