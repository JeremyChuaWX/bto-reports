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
    images: imgs,
    totalUnits: total,
    fourRoom: units.find((u) => u.flat_type.startsWith('4-room')),
    entry,
  };
}

export async function getProjects(): Promise<Project[]> {
  const entries = await getCollection('reports');
  return entries.map(load).sort((a, b) => a.month.localeCompare(b.month) || a.name.localeCompare(b.name));
}

export const nearest = (p: Project, category: string) =>
  p.amenities.filter((a) => a.category === category).sort((a, b) => (a.straight_m ?? 1e9) - (b.straight_m ?? 1e9))[0];

export const url = (path = '') => import.meta.env.BASE_URL + path.replace(/^\//, '');
