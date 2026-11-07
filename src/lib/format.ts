// Shared labels, colours and formatting helpers.

export const CAT: Record<string, [string, string]> = {
  mrt: ['#d42e12', 'MRT (open)'],
  mrt_future: ['#f39c12', 'MRT (future)'],
  bus: ['#7f8c8d', 'Bus stop'],
  school_primary: ['#2e86de', 'Primary school'],
  school_secondary: ['#1b4f72', 'Secondary school'],
  food: ['#27ae60', 'Food / hawker'],
  supermarket: ['#16a085', 'Supermarket'],
  mall: ['#8e44ad', 'Mall'],
  healthcare: ['#c0392b', 'Healthcare'],
  park: ['#2ecc71', 'Park'],
  community: ['#d35400', 'Community'],
  eldercare: ['#a04000', 'Eldercare'],
  preschool: ['#f1c40f', 'Preschool'],
  development: ['#e84393', 'Planned development'],
  other: ['#555555', 'Other'],
};

export const cat = (c?: string) => CAT[c ?? ''] ?? CAT.other;

const TAGS: Record<string, string> = {
  official: '#1e7e34', verified: '#2471a3', estimate: '#b9770e', est: '#b9770e', 'est.': '#b9770e',
  unverified: '#922b21', opinion: '#6c3483', inferred: '#b9770e', unconfirmed: '#922b21',
};

export const tagColour = (tag: string) => TAGS[tag.toLowerCase()] ?? '#555555';

// Turn status markers such as [Official] or **[Estimate, high confidence]** into coloured tags.
export function tagify(html: string): string {
  const rep = (whole: string, word: string) => {
    const key = word.toLowerCase().split(/[,;:]/)[0].trim();
    const col = TAGS[key] ?? TAGS[key.split(/\s+/)[0]];
    return col ? `<span class="tag" style="background:${col}">${word}</span>` : whole;
  };
  html = html.replace(/<strong>\[([^\]<]{2,40})\]<\/strong>/g, rep);
  return html.replace(/\[([A-Za-z][^\]<]{1,40})\](?!\()/g, rep);
}

export function money(v: unknown): string {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) ? '$' + Math.round(n).toLocaleString('en-US') : '–';
}

export const metres = (v: unknown) => (typeof v === 'number' ? `${Math.round(v).toLocaleString('en-US')} m` : '–');

export function walk(a: { walk_m?: number | null; walk_min?: number | null }): string {
  const m = typeof a.walk_m === 'number' ? `${Math.round(a.walk_m).toLocaleString('en-US')} m` : '–';
  return typeof a.walk_min === 'number' ? `${m} / ${Math.round(a.walk_min)} min` : m;
}

export const CLS_COLOUR: Record<string, string> = { Standard: '#1e7e34', Plus: '#b9770e', Prime: '#922b21' };
