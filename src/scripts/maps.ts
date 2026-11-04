// Interactive OneMap maps: one per project page (amenities, rail, HDB works) and an overview on the index page.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const OM_ATTR =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;vertical-align:middle" alt=""/>&nbsp;' +
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;' +
  '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>';
const SG = L.latLngBounds([1.144, 103.535], [1.494, 104.502]);

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function onemap(kind: 'Default' | 'Satellite' | 'Grey') {
  return L.tileLayer(`https://www.onemap.gov.sg/maps/tiles/${kind}/{z}/{x}/{y}.png`, {
    minZoom: 9,
    minNativeZoom: 11, // OneMap has no useful tiles below 11; scale those down on small screens
    maxZoom: 19,
    bounds: SG,
    attribution: OM_ATTR,
  });
}

function baseMap(el: HTMLElement, centre: L.LatLngExpression, zoom: number, opts: L.MapOptions = {}) {
  const street = onemap('Default');
  const sat = onemap('Satellite');
  const map = L.map(el, { center: centre, zoom, maxBounds: SG.pad(0.1), scrollWheelZoom: false, layers: [street], ...opts });
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  L.control.scale({ imperial: false }).addTo(map);
  // Only zoom with the scroll wheel once the map has been clicked, so the page still scrolls normally.
  map.on('click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());
  return { map, bases: { 'OneMap street': street, 'OneMap satellite': sat } };
}

interface AmenityCfg {
  n: number;
  name: string;
  cat: string;
  colour: string;
  label: string;
  lat: number;
  lng: number;
  straight: string;
  walk: string;
  note: string;
  source: string;
}

interface ProjectCfg {
  name: string;
  lat: number;
  lng: number;
  geo: string;
  amenities: AmenityCfg[];
}

function numberIcon(n: number, colour: string) {
  return L.divIcon({
    className: 'num-icon',
    html: `<span style="background:${colour}">${n}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12],
  });
}

function siteIcon() {
  return L.divIcon({ className: 'site-icon', html: '<span></span><b>BTO site</b>', iconSize: [18, 18], iconAnchor: [9, 9] });
}

async function projectMap(el: HTMLElement) {
  const cfg: ProjectCfg = JSON.parse(el.dataset.config!);
  const { map, bases } = baseMap(el, [cfg.lat, cfg.lng], 15);
  const overlays: Record<string, L.Layer> = {};

  const rings = L.layerGroup().addTo(map);
  for (const r of [500, 1000, 2000]) {
    L.circle([cfg.lat, cfg.lng], { radius: r, color: '#e60000', weight: 1.5, dashArray: '6 6', fill: false, interactive: false }).addTo(rings);
    L.marker([cfg.lat + r / 111320, cfg.lng], {
      icon: L.divIcon({ className: 'ring-label', html: r < 1000 ? `${r} m` : `${r / 1000} km`, iconSize: [50, 18], iconAnchor: [25, 9] }),
      interactive: false,
    }).addTo(rings);
  }
  overlays['<span class="lg ring"></span>Distance rings'] = rings;

  // Amenity markers, one layer per category so they can be toggled from the legend
  const markers = new Map<number, { marker: L.Marker; layer: L.LayerGroup }>();
  const groups = new Map<string, L.LayerGroup>();
  for (const a of cfg.amenities) {
    let g = groups.get(a.cat);
    if (!g) {
      g = L.layerGroup().addTo(map);
      groups.set(a.cat, g);
      overlays[`<span class="lg" style="background:${a.colour}"></span>${esc(a.label)}`] = g;
    }
    const popup =
      `<b>${a.n}. ${esc(a.name)}</b><br><span class="pc">${esc(a.label)}</span>` +
      `<br>Straight line: ${esc(a.straight)}` +
      (a.walk !== '–' ? `<br>Walk (route estimate): ${esc(a.walk)}` : '') +
      (a.note ? `<br>${esc(a.note)}` : '') +
      (a.source ? `<br><span class="pc">Source: ${esc(a.source)}</span>` : '');
    const m = L.marker([a.lat, a.lng], { icon: numberIcon(a.n, a.colour), title: a.name }).bindPopup(popup).addTo(g);
    markers.set(a.n, { marker: m, layer: g });
  }

  L.marker([cfg.lat, cfg.lng], { icon: siteIcon(), zIndexOffset: 1000, keyboard: false }).bindPopup(`<b>${esc(cfg.name)}</b><br>HDB's site coordinate`).addTo(map);
  const ctl = L.control.layers(bases, overlays, { collapsed: true, position: 'topright' }).addTo(map);

  // Rail lines (URA Master Plan 2025, including planned lines) and blocks HDB lists as under construction
  try {
    const geo = await (await fetch(cfg.geo)).json();
    const rail = L.layerGroup(
      geo.rail.map((l: { pts: [number, number][]; type: string; level: string }) =>
        L.polyline(l.pts, { color: '#6c3483', weight: 3, opacity: 0.75, dashArray: '8 5' }).bindTooltip(`${esc(l.type)} line (${esc(String(l.level).toLowerCase())}), URA Master Plan 2025`, { sticky: true }),
      ),
    ).addTo(map);
    ctl.addOverlay(rail, '<span class="lg line"></span>Rail lines (URA MP2025, incl. planned)');
    const uc = L.layerGroup(
      geo.uc.map((u: { blk: string; postal: string; ring: [number, number][] }) =>
        L.polygon(u.ring, { color: '#ff8c00', weight: 2, fillOpacity: 0.3 }).bindTooltip(`Blk ${esc(u.blk)} (${esc(u.postal)}): HDB lists as under construction`, { sticky: true }),
      ),
    ).addTo(map);
    ctl.addOverlay(uc, '<span class="lg uc"></span>HDB blocks under construction');
    rings.eachLayer((l) => 'bringToFront' in l && (l as L.Path).bringToFront());
  } catch (e) {
    console.warn('Could not load map overlays', e);
  }

  // Clicking a row in the amenity table shows that place on the map
  document.querySelectorAll<HTMLElement>('[data-amenity]').forEach((row) =>
    row.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('a')) return;
      const hit = markers.get(Number(row.dataset.amenity));
      if (!hit) return;
      if (!map.hasLayer(hit.layer)) hit.layer.addTo(map);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      map.setView(hit.marker.getLatLng(), Math.max(map.getZoom(), 16));
      hit.marker.openPopup();
    }),
  );
}

interface OverviewCfg {
  projects: { name: string; lat: number; lng: number; href: string; colour: string; type: string; exercise: string; town: string }[];
}

function overviewMap(el: HTMLElement) {
  const cfg: OverviewCfg = JSON.parse(el.dataset.config!);
  const { map, bases } = baseMap(el, [1.355, 103.82], 11, { zoomSnap: 0.25 });
  L.control.layers(bases, {}, { collapsed: true }).addTo(map);
  const pts = cfg.projects.map((p) => {
    const m = L.circleMarker([p.lat, p.lng], { radius: 9, color: '#fff', weight: 2, fillColor: p.colour, fillOpacity: 1 })
      .bindTooltip(esc(p.name), { permanent: el.clientWidth > 600, direction: 'right', offset: [8, 0], className: 'proj-label' })
      .bindPopup(`<b><a href="${p.href}">${esc(p.name)}</a></b><br>${esc(p.town)} · ${esc(p.exercise)} · ${esc(p.type)}`)
      .addTo(map);
    return m.getLatLng();
  });
  map.fitBounds(L.latLngBounds(pts).pad(0.08), { maxZoom: 12 });
}

document.querySelectorAll<HTMLElement>('.amap').forEach((el) => void projectMap(el));
document.querySelectorAll<HTMLElement>('.omap').forEach(overviewMap);
