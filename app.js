/* Tommi – Web-Prototyp. Gleiche Karte, Daten und Bedienung wie die iPhone-App. */
(() => {
'use strict';

// ---------- Kategorien ----------
const CATS = {
  party:   { title: 'Party & Club',         icon: 'sparkles',     look: 'Bunte Lichter im Beat',  base: '#FF2D95' },
  concert: { title: 'Konzert & Live',       icon: 'mic',          look: 'Pulsiert pink und blau', base: '#7A3CFF' },
  culture: { title: 'Theater, Kino & Oper', icon: 'drama',        look: 'Schimmert gold',         base: '#F2B100' },
  art:     { title: 'Kunst & Museum',       icon: 'palette',      look: 'Atmet türkis-violett',   base: '#00BFA6' },
  special: { title: 'Sonderaktion',         icon: 'tag',          look: 'Blitzt orange auf',      base: '#FF7A00' },
  festive: { title: 'Feierlichkeit',        icon: 'party-popper', look: 'Funkelt rot-weiß',       base: '#E30613' },
};
const CAT_IDS = Object.keys(CATS);
const FILTERS = { all: 'Alles', today: 'Heute', weekend: 'Wochenende' };

// ---------- Farb-Animation (identisch zur App) ----------
const hex = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const mix = (a, b, t) => { t = Math.min(1, Math.max(0, t)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
const css = c => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
const WHITE = [1, 1, 1];
const NEON = [0xFF2D95, 0x00E5FF, 0xFFE600, 0x9B5CFF, 0x39FF14].map(hex);
function frame(cat, t) {
  const three = f => [0, 1, 2].map(f);
  switch (cat) {
    case 'party': {
      const beat = t * 128 / 60, i = Math.floor(beat), pulse = Math.exp(-4.5 * (beat - i));
      return { colors: three(s => mix(NEON[(i + s * 2) % NEON.length], WHITE, pulse * .45)), scale: 1 + .12 * pulse, glow: .35 + .5 * pulse };
    }
    case 'concert': {
      const beat = t * 96 / 60, pulse = Math.exp(-3.5 * (beat - Math.floor(beat)));
      return { colors: three(s => mix(mix(hex(0xFF2D6F), hex(0x3D5AFE), .5 + .5 * Math.sin(t * .9 + s * 2.1)), WHITE, pulse * .35)), scale: 1 + .06 * pulse, glow: .3 + .35 * pulse };
    }
    case 'culture':
      return { colors: three(s => mix(mix(hex(0xF2B100), hex(0xFFD86B), .5 + .5 * Math.sin(t * .8 + s)), hex(0xFFF8DC), Math.pow(Math.max(0, Math.sin(t * 1.4 + s * 2.1)), 12) * .85)), scale: 1, glow: .4 + .15 * Math.sin(t * 1.2) };
    case 'art':
      return { colors: three(s => mix(hex(0x00BFA6), hex(0x7C5CFF), .5 + .5 * Math.sin(t * .7 + s * 1.3))), scale: 1, glow: .3 + .1 * Math.sin(t * .7) };
    case 'special': {
      const cyc = t % 1.8, f = Math.min(1, Math.exp(-12 * cyc) + (cyc > .25 ? Math.exp(-12 * (cyc - .25)) : 0));
      const c = mix(hex(0xFF7A00), hex(0xFFE14D), f);
      return { colors: [c, c, c], scale: 1 + .04 * f, glow: .3 + .5 * f };
    }
    default: {
      const x = t / .55, step = Math.floor(x), blend = Math.min(1, (x - step) * 4), red = hex(0xE30613), white = hex(0xFFD9DC);
      return { colors: three(s => (step + s) % 2 === 0 ? mix(white, red, blend) : mix(red, white, blend)), scale: 1, glow: .45 };
    }
  }
}

// ---------- Geometrie ----------
const COLOGNE = [6.9583, 50.9413];
const Geo = {
  circle(c, radius, n = 28) {
    const k = Math.cos(c[1] * Math.PI / 180), out = [];
    for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI; out.push([c[0] + Math.cos(a) * radius / (111320 * k), c[1] + Math.sin(a) * radius / 111320]); }
    return out;
  },
  centroid(r) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < r.length - 1; i++) { const p = r[i], q = r[i + 1], c = p[0] * q[1] - q[0] * p[1]; a += c; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; }
    return Math.abs(a) < 1e-14 ? r[0] : [cx / (3 * a), cy / (3 * a)];
  },
  contains(r, p) {
    let inside = false;
    for (let i = 0; i < r.length - 1; i++) { const a = r[i], b = r[i + 1];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; }
    return inside;
  },
  meters(a, b) { const k = Math.cos(a[1] * Math.PI / 180); return Math.hypot((a[0] - b[0]) * k, a[1] - b[1]) * 111320; },
  /** Umriss nach außen schieben, damit die farbige Hülle sauber über dem Kartengebäude liegt. */
  inflate(ring, m) {
    let pts = ring.slice();
    const f = pts[0], l = pts[pts.length - 1];
    if (f[0] === l[0] && f[1] === l[1]) pts.pop();
    const n = pts.length; if (n < 3) return ring;
    const k = Math.cos(pts[0][1] * Math.PI / 180) * 111320, M = 111320;
    const xy = pts.map(p => [p[0] * k, p[1] * M]);
    let area = 0; for (let i = 0; i < n; i++) { const a = xy[i], b = xy[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    const sign = area > 0 ? 1 : -1, out = [];
    const normal = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.max(Math.hypot(dx, dy), 1e-9); return [dy / len * sign, -dx / len * sign]; };
    for (let i = 0; i < n; i++) {
      const p = xy[(i + n - 1) % n], c = xy[i], q = xy[(i + 1) % n], n1 = normal(p, c), n2 = normal(c, q);
      let mx = n1[0] + n2[0], my = n1[1] + n2[1]; const len = Math.hypot(mx, my);
      if (len < 1e-6) { mx = n1[0]; my = n1[1]; } else { mx /= len; my /= len; }
      const s = Math.min(2.5, 1 / Math.max(.4, mx * n1[0] + my * n1[1]));
      out.push([(c[0] + mx * m * s) / k, (c[1] + my * m * s) / M]);
    }
    out.push(out[0]); return out;
  },
};

// ---------- Zustand ----------
const S = { events: [], venues: {}, dom: null, boundary: [], filter: 'all', selected: null, building: null, focus: null,
            dark: localStorage.getItem('tommi-theme') !== 'light', orbit: false, pad: 0, ready: false, sheet: null };
let map, markers = [];
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = (n, cls = '') => `<i class="ic ${cls} i-${n}"></i>`;

// ---------- Daten ----------
function dayOffset(key) {
  if (typeof key === 'number') return key;
  const d = new Date().getDay(); // 0 = So
  return ({ fri: (5 - d + 7) % 7, sat: (6 - d + 7) % 7, sun: (0 - d + 7) % 7 })[key] ?? 0;
}
function when(date) {
  const t = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const days = Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  if (days === 0) return `Heute · ${t}`;
  if (days === 1) return `Morgen · ${t}`;
  return `${date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })} · ${t}`;
}
function matches(date) {
  const days = Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  if (S.filter === 'today') return days === 0;
  if (S.filter === 'weekend') return [5, 6, 0].includes(date.getDay()) && days >= 0 && days < 7;
  return true;
}
const visible = () => S.events.filter(e => matches(e.start));
const inCat = c => visible().filter(e => e.cat === c).sort((a, b) => a.start - b.start);

async function load() {
  const get = f => fetch(`${f}.json`).then(r => r.json());
  const [venues, ev, dom, boundary] = await Promise.all([get('venues'), get('events'), get('dom'), get('boundary')]);
  for (const [id, v] of Object.entries(venues)) {
    const c = [v.lon, v.lat], disc = !(v.ring && v.ring.length > 3);
    S.venues[id] = { id, name: v.name, area: ev.areas[id] || v.area || 'Köln', center: c, height: disc ? 5 : Math.min(v.height, 110), ring: disc ? Geo.circle(c, 36) : v.ring };
  }
  const disc = (id, name, area, lat, lon, r) => S.venues[id] = { id, name, area, center: [lon, lat], height: 5, ring: Geo.circle([lon, lat], r) };
  disc('heumarkt', 'Heumarkt', 'Altstadt', 50.93625, 6.96085, 45);
  disc('roncalli', 'Roncalliplatz am Dom', 'Altstadt', 50.94065, 6.95790, 32);
  disc('aachener', 'Aachener Weiher', 'Lindenthal', 50.93480, 6.92560, 42);
  S.events = ev.events.filter(r => S.venues[r.venue]).map(r => {
    const d = new Date(); d.setDate(d.getDate() + dayOffset(r.day)); d.setHours(r.h, r.m, 0, 0);
    return { id: r.venue, title: r.title, cat: r.cat, venue: S.venues[r.venue], start: d, blurb: r.blurb, price: r.price, link: r.link, pushed: r.pushed };
  });
  S.dom = dom; S.boundary = boundary;
}

// ---------- Karte ----------
const styleURL = () => `${S.dark ? 'style-dark' : 'style'}.json`;
function initMap() {
  map = new maplibregl.Map({
    container: 'map', style: styleURL(), center: COLOGNE, zoom: 10.2, pitch: 0, bearing: 0,
    minZoom: 9.6, maxZoom: 18.6, maxPitch: 68, attributionControl: false, fadeDuration: 150,
    maxBounds: [[6.62, 50.76], [7.31, 51.15]],
  });
  map.touchZoomRotate.enable(); map.touchPitch.enable(); map.dragRotate.enable();
  map.on('style.load', () => { buildLayers(); reloadEvents(); S.ready = true; });
  map.once('load', () => setTimeout(() => goHome(3200), 350));
  map.on('move', onMove);
  map.on('moveend', () => { onMove(); renderDock(); });
  map.on('click', onTap);
  for (const ev of ['mousedown', 'touchstart', 'wheel']) map.getCanvasContainer().addEventListener(ev, () => { S.orbit = false; }, { passive: true });
  requestAnimationFrame(tick);
}

function buildLayers() {
  const before = map.getLayer('label-road') ? 'label-road' : undefined;
  const empty = { type: 'FeatureCollection', features: [] };
  // Dom-Teile aus den Kacheln ausblenden (OSM-ID mal 10 plus Typziffer), dafür das Low-Poly-Modell zeigen
  const hidden = []; for (const id of S.dom.ids) for (let d = 0; d < 10; d++) hidden.push(id * 10 + d);
  map.setFilter('building-3d', ['all', ['!', ['in', ['id'], ['literal', hidden]]],
    ['<', ['coalesce', ['get', 'render_min_height'], 0], 60], ['<', ['coalesce', ['get', 'render_height'], 0], 150]]);

  map.addSource('events', { type: 'geojson', data: empty });
  map.addSource('event-points', { type: 'geojson', data: empty });
  map.addSource('selection', { type: 'geojson', data: empty });
  map.addSource('dom', { type: 'geojson', data: { type: 'FeatureCollection', features: S.dom.parts.map(p => (
    { type: 'Feature', properties: { b: p.b, t: p.t, roof: p.k }, geometry: { type: 'Polygon', coordinates: [p.r] } })) } });

  for (const c of CAT_IDS) map.addLayer({ id: `glow-${c}`, type: 'circle', source: 'event-points', filter: ['==', ['get', 'category'], c],
    paint: { 'circle-radius': ['interpolate', ['exponential', 1.9], ['zoom'], 9, 4, 12, 11, 14, 34, 16, 110, 18, 320], 'circle-blur': .75,
             'circle-pitch-alignment': 'map', 'circle-color': CATS[c].base, 'circle-opacity': .4 } }, 'building-3d');

  map.addLayer({ id: 'selection', type: 'fill-extrusion', source: 'selection',
    paint: { 'fill-extrusion-color': '#0A84FF', 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': .95 } }, before);
  map.addLayer({ id: 'landmark', type: 'fill-extrusion', source: 'dom', paint: {
    'fill-extrusion-color': ['match', ['get', 'roof'], 1, S.dark ? '#8CA69E' : '#70857F', S.dark ? '#CCBD99' : '#A1947D'],
    'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-height': ['get', 't'] } }, before);
  for (const c of CAT_IDS) map.addLayer({ id: `event-${c}`, type: 'fill-extrusion', source: 'events', filter: ['==', ['get', 'category'], c],
    paint: { 'fill-extrusion-color': CATS[c].base, 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 1 } }, before);

  // Wolkenrand: außerhalb der Stadtgrenze verschwindet alles im Dunst
  const fog = S.dark ? '#080A0F' : '#EDF2FA';
  map.addSource('fog', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon',
    coordinates: [[[0, 46], [14, 46], [14, 56], [0, 56], [0, 46]], S.boundary] } } });
  map.addSource('fog-edge', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: S.boundary } } });
  map.addLayer({ id: 'fog', type: 'fill', source: 'fog', paint: { 'fill-color': fog, 'fill-opacity': .96, 'fill-antialias': false } }, before);
  map.addLayer({ id: 'fog-edge', type: 'line', source: 'fog-edge', layout: { 'line-join': 'round' }, paint: { 'line-color': fog, 'line-opacity': .95,
    'line-width': ['interpolate', ['exponential', 1.8], ['zoom'], 9, 26, 12, 110, 15, 520],
    'line-blur': ['interpolate', ['exponential', 1.8], ['zoom'], 9, 22, 12, 90, 15, 420] } }, before);

  for (const c of CAT_IDS) map.addLayer({ id: `dot-${c}`, type: 'circle', source: 'event-points', filter: ['==', ['get', 'category'], c],
    paint: { 'circle-radius': 6, 'circle-stroke-width': 2.5, 'circle-stroke-color': '#fff', 'circle-color': CATS[c].base,
             'circle-opacity': ['interpolate', ['linear'], ['zoom'], 13.6, 1, 14.4, 0],
             'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 13.6, 1, 14.4, 0] } });
  if (S.selectionData) map.getSource('selection').setData(S.selectionData);
}

function reloadEvents() {
  const list = visible();
  map.getSource('events')?.setData({ type: 'FeatureCollection', features: list.map((e, i) => ({ type: 'Feature',
    properties: { id: e.id, category: e.cat, h: e.venue.height + 2.5, slot: i % 3 },
    geometry: { type: 'Polygon', coordinates: [Geo.inflate(e.venue.ring, .9)] } })) });
  map.getSource('event-points')?.setData({ type: 'FeatureCollection', features: list.map(e => ({ type: 'Feature',
    properties: { id: e.id, category: e.cat }, geometry: { type: 'Point', coordinates: e.venue.center } })) });
  markers.forEach(m => m.marker.remove());
  markers = list.map(e => {
    // äußeres Element gehört MapLibre (Position), das innere macht die Pop-Animation
    const host = document.createElement('div'); host.className = 'pin-host';
    host.innerHTML = `<div class="pin"><b style="background:${CATS[e.cat].base}">${icon(CATS[e.cat].icon)}</b></div>`;
    const el = host.firstChild;
    el.addEventListener('click', ev => { ev.stopPropagation(); select(e); });
    return { event: e, el, marker: new maplibregl.Marker({ element: host, anchor: 'bottom', opacityWhenCovered: '1' }).setLngLat(e.venue.center).addTo(map) };
  });
  onMove(); renderDock();
}

// Icons poppen auf, wenn man nah dran ist und das Gebäude im Blick liegt
function onMove() {
  if (!map) return;
  const zoom = map.getZoom(), cv = map.getCanvas(), w = cv.clientWidth, h = cv.clientHeight;
  const fx = w / 2, fy = (h - S.pad) / 2, reach = Math.min(w, h) * (zoom >= 15 ? .9 : .5);
  const pitch = map.getPitch() * Math.PI / 180;
  const mpp = 78271.517 * Math.cos(map.getCenter().lat * Math.PI / 180) / Math.pow(2, zoom);
  let nearest = null;
  for (const m of markers) {
    const p = map.project(m.event.venue.center), dist = Math.hypot(p.x - fx, p.y - fy), sel = S.selected?.id === m.event.id;
    if (zoom >= 14.6 && dist < 130 && (!nearest || dist < nearest.dist)) nearest = { event: m.event, dist };
    const show = sel || (zoom >= 14.1 && dist < reach) || (m.event.pushed && zoom >= 12.2);
    m.marker.setOffset([0, -((m.event.venue.height + 6) / mpp * Math.sin(pitch) + 6)]);
    m.el.classList.toggle('on', show);
    m.el.classList.toggle('hot', sel || (!S.selected && S.focus?.id === m.event.id));
  }
  const focus = nearest?.event || null;
  if (focus?.id !== S.focus?.id) { S.focus = focus; if (!S.selected && !S.building) renderDock(); }
  const b = map.getBearing(), compass = $('compass');
  compass.classList.toggle('on', Math.abs(b) > 1);
  compass.style.setProperty('--rot', `${-b}deg`);
}

let last = 0, lastPaint = 0;
function tick(ts) {
  requestAnimationFrame(tick);
  const dt = Math.min(.1, (ts - last) / 1000); last = ts;
  if (S.orbit && (S.selected || S.building) && !map.isMoving()) map.setBearing(map.getBearing() + 3.4 * dt);
  if (ts - lastPaint < 33 || !S.ready) return; lastPaint = ts;
  const t = ts / 1000, root = document.documentElement.style;
  for (const c of CAT_IDS) {
    const f = frame(c, t), col = f.colors.map(css);
    if (map.getLayer(`event-${c}`)) {
      map.setPaintProperty(`event-${c}`, 'fill-extrusion-color', ['match', ['get', 'slot'], 0, col[0], 1, col[1], col[2]], { validate: false });
      map.setPaintProperty(`event-${c}`, 'fill-extrusion-height', ['*', ['get', 'h'], f.scale], { validate: false });
      map.setPaintProperty(`glow-${c}`, 'circle-color', col[0], { validate: false });
      map.setPaintProperty(`glow-${c}`, 'circle-opacity', Math.min(1, f.glow * (S.dark ? 1.1 : 1)), { validate: false });
      map.setPaintProperty(`dot-${c}`, 'circle-color', col[0], { validate: false });
    }
    root.setProperty(`--${c}-0`, col[0]); root.setProperty(`--${c}-1`, col[1]); root.setProperty(`--${c}-2`, col[2]);
    root.setProperty(`--${c}-s`, (.9 + (f.scale - 1) * .9).toFixed(3));
  }
}

// ---------- Kamera ----------
function speedBlur(ms) { const el = $('map'); el.classList.add('speed'); setTimeout(() => el.classList.remove('speed'), ms * .45); }
let flight = 0;
function fly(opts, ms, then) {
  speedBlur(ms);
  const id = ++flight;
  map.flyTo({ ...opts, duration: ms, essential: true, padding: { top: 0, left: 0, right: 0, bottom: S.pad } });
  // erst nach der Landung weitermachen (ein moveend eines abgebrochenen Flugs darf hier nicht zählen)
  setTimeout(() => { if (id === flight && then) then(); }, ms + 120);
}
function goHome(ms = 1600) { S.orbit = false; S.pad = 0; flight++; map.flyTo({ center: COLOGNE, zoom: 13.1, pitch: 52, bearing: 0, duration: ms, essential: true, padding: { top: 0, left: 0, right: 0, bottom: 0 } }); }
const cardPad = () => Math.min(360, Math.round(window.innerHeight * .42));

function select(e) {
  S.orbit = false; S.building = null; S.selected = e; S.selectionData = null;
  map.getSource('selection')?.setData({ type: 'FeatureCollection', features: [] });
  S.pad = cardPad(); renderDock();
  const far = Geo.meters([map.getCenter().lng, map.getCenter().lat], e.venue.center) > 600;
  fly({ center: e.venue.center, zoom: 17.5 - Math.log2(Math.max(1, e.venue.height / 30)), pitch: 60, bearing: map.getBearing() + 40 },
      far ? 1900 : 1200, () => { if (S.selected?.id === e.id) S.orbit = true; });
}
function clearSelection() {
  if (!S.selected && !S.building) return;
  S.selected = null; S.building = null; S.orbit = false; S.pad = 0; S.selectionData = null;
  map.getSource('selection')?.setData({ type: 'FeatureCollection', features: [] });
  map.easeTo({ padding: { top: 0, left: 0, right: 0, bottom: 0 }, duration: 400 });
  renderDock(); onMove();
}

// ---------- Gebäude antippen ----------
function showSelection(ring, h) {
  S.selectionData = { type: 'Feature', properties: { h: h + .8 }, geometry: { type: 'Polygon', coordinates: [Geo.inflate(ring, .7)] } };
  map.getSource('selection')?.setData(S.selectionData);
}
function onTap(ev) {
  const hit = map.queryRenderedFeatures(ev.point, { layers: CAT_IDS.map(c => `event-${c}`).filter(l => map.getLayer(l)) })[0];
  if (hit) { const e = visible().find(x => x.id === hit.properties.id); if (e) return select(e); }
  const isDom = map.queryRenderedFeatures(ev.point, { layers: ['landmark'] }).length > 0;
  let ring = S.dom.outline, h = 0, osm = 'way/4532022';
  if (!isDom) {
    const f = map.getZoom() >= 14 && map.queryRenderedFeatures(ev.point, { layers: ['building-3d'] })[0];
    if (!f) return clearSelection();
    const g = f.geometry; ring = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates.map(p => p[0]).sort((a, b) => b.length - a.length)[0];
    h = f.properties.render_height || 10;
    osm = f.id ? `way/${Math.floor(f.id / 10)}` : null;
  }
  const center = Geo.centroid(ring), token = {};
  S.selected = null; S.orbit = false; S.building = { state: 'loading', osm, token };
  if (isDom) { S.selectionData = null; map.getSource('selection').setData({ type: 'FeatureCollection', features: [] }); } else showSelection(ring, h);
  S.pad = Math.min(270, Math.round(window.innerHeight * .32)); renderDock();
  const far = Geo.meters([map.getCenter().lng, map.getCenter().lat], center) > 500;
  fly({ center, zoom: isDom ? 16.4 : 18 - Math.log2(Math.max(1, h / 22)), pitch: 60, bearing: map.getBearing() + 30 }, far ? 1600 : 1000,
      () => { if (S.building?.token === token) S.orbit = true; });
  lookup(center, ring).then(info => {
    if (S.building?.token !== token) return;
    if (osm && info.id === 'unbekannt') info.id = osm;
    S.building = { state: 'loaded', info, token }; renderDock();
    if (!isDom && info.ring.length > 3) showSelection(info.ring, Math.max(h, 4));
    places(info).then(list => {
      if (S.building?.token !== token || !list.length) return;
      info.places = list; if (info.title === info.kind && list.length === 1) info.title = list[0].name;
      renderDock();
    });
  }).catch(() => { if (S.building?.token === token) { S.building = { state: 'failed', token }; renderDock(); } });
}

// ---------- Gebäude-Daten (OpenStreetMap: Nominatim + Overpass) ----------
const PLACE = {
  amenity: { restaurant: ['Restaurant', 'utensils'], cafe: ['Café', 'utensils'], bar: ['Bar', 'utensils'], pub: ['Kneipe', 'utensils'], biergarten: ['Kneipe', 'utensils'],
    nightclub: ['Club', 'sparkles'], fast_food: ['Imbiss', 'utensils'], theatre: ['Theater', 'drama'], cinema: ['Kino', 'drama'], arts_centre: ['Kulturzentrum', 'palette'],
    place_of_worship: ['Kirche', 'building-2'], school: ['Schule', 'building-2'], university: ['Hochschule', 'building-2'], hospital: ['Medizin', 'building-2'],
    pharmacy: ['Apotheke', 'store'], bank: ['Bank', 'building-2'], townhall: ['Öffentliche Einrichtung', 'building-2'], library: ['Öffentliche Einrichtung', 'building-2'],
    community_centre: ['Öffentliche Einrichtung', 'building-2'], events_venue: ['Veranstaltungsort', 'mic'], music_venue: ['Veranstaltungsort', 'mic'] },
  tourism: { museum: ['Museum', 'palette'], gallery: ['Museum', 'palette'], hotel: ['Hotel', 'building-2'], attraction: ['Sehenswürdigkeit', 'sparkles'] },
};
const BUILDING = { apartments: 'Wohnhaus', residential: 'Wohnhaus', house: 'Wohnhaus', detached: 'Wohnhaus', terrace: 'Wohnhaus', commercial: 'Geschäftshaus', retail: 'Geschäftshaus',
  office: 'Bürogebäude', industrial: 'Gewerbe / Halle', warehouse: 'Gewerbe / Halle', church: 'Kirche', cathedral: 'Kathedrale', school: 'Bildung', university: 'Bildung',
  hospital: 'Krankenhaus', public: 'Öffentliche Einrichtung', civic: 'Öffentliche Einrichtung', train_station: 'Bahnhof', hotel: 'Hotel', garage: 'Garage / Parkhaus', parking: 'Garage / Parkhaus' };
function kindOf(tags) {
  if (tags.building === 'cathedral') return ['Kathedrale', 'building-2'];
  for (const k of ['amenity', 'tourism']) if (PLACE[k][tags[k]]) return PLACE[k][tags[k]];
  if (tags.shop) return [tags.shop === 'supermarket' ? 'Supermarkt' : tags.shop === 'kiosk' ? 'Büdchen' : 'Geschäft', 'store'];
  if (tags.office) return ['Büro', 'building-2'];
  if (tags.craft) return ['Handwerk', 'store'];
  return null;
}
function parse(d, fallback, point) {
  const tags = { ...(d.extratags || {}) }; if (d.category && d.type) tags[d.category] = d.type;
  const a = d.address || {}; let address = null;
  if (a.road) { address = [a.road, a.house_number].filter(Boolean).join(' '); const v = a.suburb || a.neighbourhood || a.quarter; if (v) address += ', ' + v; }
  let ring = fallback; const g = d.geojson;
  if (g?.type === 'Polygon') ring = g.coordinates[0];
  if (g?.type === 'MultiPolygon') ring = g.coordinates.map(p => p[0]).sort((x, y) => y.length - x.length)[0];
  const [kind, sym] = kindOf(tags) || [BUILDING[tags.building] || 'Gebäude', 'building-2'];
  let height = parseFloat(tags.height); if (!height) height = tags['building:levels'] ? tags['building:levels'] * 3.4 + 2 : 12;
  return { id: `${d.osm_type || 'way'}/${d.osm_id || 0}`, title: d.name || kind, kind, symbol: sym, address, places: [], ring,
           center: ring.length > 3 ? Geo.centroid(ring) : point, height };
}
const NOMINATIM = 'https://nominatim.openstreetmap.org';
async function lookup(c, fallback = []) {
  const q = new URLSearchParams({ lat: c[1], lon: c[0], format: 'jsonv2', zoom: 18, addressdetails: 1, extratags: 1, polygon_geojson: 1, layer: 'address', 'accept-language': 'de' });
  const d = await fetch(`${NOMINATIM}/reverse?${q}`).then(r => r.json());
  if (!d || d.error) throw new Error('notFound');
  const info = parse(d, fallback, c);
  if (fallback.length && !Geo.contains(info.ring, c) && !Geo.contains(fallback, info.center)) {
    Object.assign(info, { ring: fallback, center: Geo.centroid(fallback), id: 'unbekannt', title: 'Gebäude', kind: 'Gebäude', symbol: 'building-2' });
    if (info.address) info.address = 'bei ' + info.address;
  }
  return info;
}
async function findAddress(text) {
  const q = new URLSearchParams({ q: text.trim() + ', Köln', format: 'jsonv2', addressdetails: 1, extratags: 1, polygon_geojson: 1, limit: 5, countrycodes: 'de',
    'accept-language': 'de', viewbox: '6.77,51.085,7.165,50.83', bounded: 1 });
  const list = await fetch(`${NOMINATIM}/search?${q}`).then(r => r.json());
  const hits = list.filter(x => x.address?.house_number);
  const best = hits.find(x => x.geojson?.type !== 'Point') || hits[0];
  if (!best) throw new Error('notFound');
  const point = [parseFloat(best.lon), parseFloat(best.lat)], info = parse(best, [], point);
  if (info.ring.length < 4) {
    await new Promise(r => setTimeout(r, 1100));
    const house = await lookup(point);
    if (house.ring.length < 4) throw new Error('notFound');
    Object.assign(info, { ring: house.ring, center: house.center, height: house.height, id: house.id });
  }
  return info;
}
async function places(info) {
  if (info.ring.length < 4) return [];
  const r = Math.round(Math.max(...info.ring.map(p => Geo.meters(p, info.center))) + 5), a = `(around:${r},${info.center[1]},${info.center[0]})[name]`;
  const q = `[out:json][timeout:20];(node${a}[amenity];node${a}[shop];node${a}[tourism];node${a}[leisure];node${a}[office];node${a}[craft];);out;`;
  try {
    const d = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(r => r.json());
    return d.elements.filter(e => e.tags?.name && Geo.contains(info.ring, [e.lon, e.lat])).map(e => { const k = kindOf(e.tags); return k && { name: e.tags.name, kind: k[0] }; })
      .filter(Boolean).sort((x, y) => x.name.localeCompare(y.name));
  } catch { return []; }
}

// ---------- Oberfläche: unten ----------
const swatch = (cat, slot = 0, cls = '') => `<span class="swatch ${cls}" style="--c:var(--${cat}-${slot % 3});--s:var(--${cat}-s)">${icon(CATS[cat].icon)}</span>`;
const bolt = `<span class="bolt">${icon('zap', 'sm')}</span>`;
function quickList() {
  const list = visible();
  if (map.getZoom() >= 13.6) {
    const b = map.getBounds(), c = [map.getCenter().lng, map.getCenter().lat];
    return list.filter(e => b.contains(e.venue.center)).sort((x, y) => Geo.meters(x.venue.center, c) - Geo.meters(y.venue.center, c));
  }
  return list.sort((x, y) => (y.pushed - x.pushed) || (x.start - y.start));
}
let dockKey = '';
function renderDock() {
  const dock = $('dock'); let html = '', key = '';
  if (S.selected) {
    const e = S.selected, c = CATS[e.cat]; key = 'e' + e.id;
    html = `<div class="card">
      <div class="beam" style="--c0:var(--${e.cat}-0);--c1:var(--${e.cat}-1);--c2:var(--${e.cat}-2)"></div>
      <div class="row"><span class="tag" style="background:${c.base}">${icon(c.icon, 'sm')}${c.title}</span>
        ${e.pushed ? `<span class="tag push">${icon('zap', 'sm')}Pushed</span>` : ''}<button class="x" data-act="close" aria-label="Schließen">${icon('x', 'sm')}</button></div>
      <h2>${esc(e.title)}</h2>
      <div class="meta"><div>${icon('clock', 'sm')}${when(e.start)}</div><div>${icon('map-pin', 'sm')}${esc(e.venue.name)} · ${esc(e.venue.area)}</div></div>
      <p>${esc(e.blurb)}</p>
      <div class="actions"><a class="cta ${e.link ? '' : 'off'}" ${e.link ? `href="${esc(e.link)}" target="_blank" rel="noopener"` : ''}>${icon('ticket')}Tickets &amp; Infos<span>${esc(e.price)}</span></a>
        <button class="share" data-act="share" aria-label="Teilen">${icon('share')}</button></div></div>`;
  } else if (S.building) {
    const b = S.building; key = 'b' + b.state + (b.info?.id || '') + (b.info?.places.length || 0);
    const close = `<button class="x" data-act="close" aria-label="Schließen">${icon('x', 'sm')}</button>`;
    if (b.state === 'loading') html = `<div class="card row"><span class="spinner"></span><span style="color:var(--sub)">Gebäude wird nachgeschlagen …</span>${close}</div>`;
    else if (b.state === 'failed') html = `<div class="card row"><span>Zu diesem Gebäude gibt es gerade keine Daten.</span>${close}</div>`;
    else { const i = b.info;
      html = `<div class="card"><div class="bhead"><span class="bicon">${icon(i.symbol)}</span>
        <div class="txt" style="white-space:normal"><h3>${esc(i.title)}</h3><span>${esc([i.title === i.kind ? null : i.kind, i.address].filter(Boolean).join(' · '))}</span></div>${close}</div>
        ${i.places.length ? `<div class="places">${i.places.slice(0, 4).map(p => `<div><b>${esc(p.name)}</b><i>${esc(p.kind)}</i></div>`).join('')}
          ${i.places.length > 4 ? `<i>+ ${i.places.length - 4} weitere</i>` : ''}</div>` : ''}
        <div class="bfoot"><code>OSM ${esc(i.id)}</code><button class="small-cta" data-act="create-here">${icon('plus', 'sm')}Event hier eintragen</button></div></div>`; }
  } else if (S.focus) {
    const e = S.focus; key = 'p' + e.id;
    html = `<button class="card preview" data-act="open" data-id="${esc(e.id)}">${swatch(e.cat, 0, 'lg')}
      <span class="txt"><b>${esc(e.title)}${e.pushed ? bolt : ''}</b><span>${when(e.start)} · ${esc(e.venue.name)}</span><small>${esc(e.blurb)}</small></span>
      <span class="price">${esc(e.price)}</span></button>`;
  } else {
    const list = quickList(); key = 'q' + list.map(e => e.id).join(',');
    html = `<div class="chips">${list.map((e, i) => `<button class="chip ${e.pushed ? 'pushed' : ''}" data-act="open" data-id="${esc(e.id)}">${swatch(e.cat, i)}
      <span class="txt"><b>${esc(e.title)}${e.pushed ? bolt : ''}</b><span>${when(e.start)} · ${esc(e.venue.name)}</span></span></button>`).join('')}</div>`;
  }
  if (key !== dockKey) { dockKey = key; dock.innerHTML = html; }
}
$('dock').addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  if (act === 'close') clearSelection();
  if (act === 'open') { const e = S.events.find(x => x.id === el.dataset.id); if (e) select(e); }
  if (act === 'create-here') openCreate(S.building.info);
  if (act === 'share' && S.selected) {
    const data = { title: S.selected.title, text: `${S.selected.title} – ${when(S.selected.start)}, ${S.selected.venue.name}`, url: S.selected.link || location.href };
    navigator.share ? navigator.share(data).catch(() => {}) : navigator.clipboard?.writeText(`${data.text} ${data.url}`);
  }
});

// ---------- Sheets ----------
function closeSheet() { $('sheet').hidden = true; $('scrim').hidden = true; S.sheet = null; }
function openSheet(html) { const s = $('sheet'); s.innerHTML = `<div class="grab"></div>${html}`; s.hidden = false; $('scrim').hidden = false; s.scrollTop = 0; }
$('scrim').addEventListener('click', closeSheet);

function openLegend(cat = null) {
  S.sheet = 'legend';
  if (cat) {
    openSheet(`<div class="shead"><button class="back" data-act="back">${icon('chevron-left')}Legende</button><h3>${CATS[cat].title}</h3></div>
      <div class="list">${inCat(cat).map(e => `<button data-act="event" data-id="${esc(e.id)}"><span class="txt"><b>${esc(e.title)}${e.pushed ? bolt : ''}</b>
        <span>${when(e.start)} · ${esc(e.venue.name)}</span></span>${icon('chevron-right', 'sm')}</button>`).join('')}</div>`);
    return;
  }
  openSheet(`<div class="shead"><h3>Was geht in Köln?</h3></div>
    <div class="seg">${Object.entries(FILTERS).reverse().map(([k, v]) => `<button data-act="filter" data-f="${k}" class="${S.filter === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <div class="cap">So leuchten die Häuser</div>
    <div class="list">${CAT_IDS.map(c => { const n = inCat(c).length; return `<button data-act="cat" data-c="${c}" ${n ? '' : 'disabled'}>${swatch(c, 0, 'lg')}
      <span class="txt"><b>${CATS[c].title}</b><span>${CATS[c].look}</span></span><span class="count">${n}</span>${icon('chevron-right', 'sm')}</button>`; }).join('')}</div>
    <div class="hint">Tippe eine Kategorie an und wähle ein Event – die Karte fliegt hin.</div>`);
}
function setFilter(f) { S.filter = f; $('filterLabel').textContent = FILTERS[f]; S.selected = null; S.building = null; S.pad = 0; reloadEvents(); }

const draft = { building: null };
function openCreate(prefill = null) {
  S.sheet = 'create'; draft.building = prefill;
  const soon = new Date(Date.now() + 3 * 36e5); soon.setMinutes(0, 0, 0);
  const local = new Date(soon - soon.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  openSheet(`<div class="shead"><button class="back" data-act="cancel">Abbrechen</button><h3>Event eintragen</h3><button class="done" data-act="publish" id="publish" disabled>Veröffentlichen</button></div>
    <div class="form">
      <div><div class="cap">Was?</div><div class="field"><input id="fTitle" placeholder="Titel" maxlength="60"><textarea id="fBlurb" rows="2" placeholder="Kurzbeschreibung"></textarea>
        <select id="fCat">${CAT_IDS.map(c => `<option value="${c}">${CATS[c].title}</option>`).join('')}</select></div></div>
      <div><div class="cap">Wo?</div><div class="field"><div class="inline"><input id="fAddr" placeholder="Straße und Hausnummer" value="${esc((prefill?.address || '').replace(/^bei /, '').split(',')[0])}">
        <button data-act="search">Suchen</button></div><div id="fFound" hidden></div></div>
        <div class="hint">Tommi ordnet die Adresse dem Gebäude zu. Das Haus leuchtet dann in der Farbe deiner Kategorie.</div></div>
      <div><div class="cap">Wann?</div><div class="field"><input id="fDate" type="datetime-local" value="${local}"></div></div>
      <div><div class="cap">Tickets oder Infoblatt</div><div class="field"><input id="fLink" type="url" inputmode="url" placeholder="https://"></div></div>
    </div>`);
  showFound();
  $('fTitle').addEventListener('input', showFound);
}
function showFound(error) {
  const el = $('fFound'); if (!el) return; const b = draft.building;
  el.hidden = !b && !error; el.className = b ? 'found' : 'err';
  el.innerHTML = b ? `${icon('check')}<span class="txt"><b>${esc(b.title)}</b><span>${esc([b.address, 'OSM ' + b.id].filter(Boolean).join(' · '))}</span></span>` : esc(error || '');
  $('publish').disabled = !(b && $('fTitle').value.trim());
}
$('sheet').addEventListener('click', async ev => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  if (act === 'cat') openLegend(el.dataset.c);
  if (act === 'back') openLegend();
  if (act === 'filter') { setFilter(el.dataset.f); openLegend(); }
  if (act === 'event') { const e = S.events.find(x => x.id === el.dataset.id); closeSheet(); if (e) setTimeout(() => select(e), 200); }
  if (act === 'cancel') closeSheet();
  if (act === 'search') {
    el.disabled = true; el.textContent = '…';
    try { draft.building = await findAddress($('fAddr').value); showFound(); }
    catch (e) { draft.building = null; showFound(e.message === 'notFound' ? 'Unter dieser Adresse haben wir in Köln kein Gebäude gefunden.' : 'Die Gebäudesuche ist gerade nicht erreichbar. Bitte noch einmal versuchen.'); }
    el.disabled = false; el.textContent = 'Suchen';
  }
  if (act === 'publish' && draft.building) {
    const b = draft.building, id = 'user-' + Date.now();
    let link = $('fLink').value.trim(); if (link && !/^https?:/i.test(link)) link = 'https://' + link;
    const venue = { id, name: b.title, area: (b.address || 'Köln').replace(/^bei /, ''), center: b.center, height: b.height, ring: b.ring };
    const e = { id, title: $('fTitle').value.trim(), cat: $('fCat').value, venue, start: new Date($('fDate').value || Date.now()), blurb: $('fBlurb').value.trim(), price: 'Info', link: link || null, pushed: false };
    S.events.push(e); if (!matches(e.start)) { S.filter = 'all'; $('filterLabel').textContent = FILTERS.all; }
    closeSheet(); reloadEvents(); setTimeout(() => select(e), 250);
  }
});

// ---------- Leiste, Knöpfe, Tabs ----------
$('legendBtn').addEventListener('click', () => openLegend());
$('filterBtn').addEventListener('click', () => { const keys = Object.keys(FILTERS); setFilter(keys[(keys.indexOf(S.filter) + 1) % keys.length]); });
$('zoomIn').addEventListener('click', () => { S.orbit = false; map.zoomIn(); });
$('zoomOut').addEventListener('click', () => { S.orbit = false; map.zoomOut(); });
$('home').addEventListener('click', () => { S.selected = null; S.building = null; S.selectionData = null; map.getSource('selection')?.setData({ type: 'FeatureCollection', features: [] }); renderDock(); goHome(); });
$('compass').addEventListener('click', () => { S.orbit = false; map.easeTo({ bearing: 0, duration: 500 }); });
function applyTheme() {
  document.documentElement.dataset.theme = S.dark ? 'dark' : 'light';
  $('themeIcon').className = `ic i-${S.dark ? 'sun' : 'moon'}`;
  document.querySelector('meta[name=theme-color]').content = S.dark ? '#0C0E12' : '#F2F3F6';
}
$('theme').addEventListener('click', () => { S.dark = !S.dark; localStorage.setItem('tommi-theme', S.dark ? 'dark' : 'light'); applyTheme(); S.ready = false; map.setStyle(styleURL()); });
$('plus').addEventListener('click', () => openCreate());
const TABS = { social: ['messages-square', 'Social', ['Chats und Gruppen', 'Freunde live auf der Karte', 'Events und Standort im Chat teilen']],
               activity: ['zap', 'Aktivität', ['Feed: Für dich und Freunde', 'Wer ist wo dabei', 'Bewertungen und Rückblicke']],
               profile: ['user', 'Profil', ['Deine vier Favoriten', 'Besuchte und erstellte Events', 'Business-Profil mit Insights']] };
document.querySelectorAll('#tabs [data-tab]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#tabs [data-tab]').forEach(x => x.classList.toggle('on', x === b));
  const t = TABS[b.dataset.tab], p = $('placeholder');
  p.hidden = !t; $('ui').style.visibility = t ? 'hidden' : '';
  $('tabs').style.visibility = 'visible';
  if (t) p.innerHTML = `<div>${icon(t[0])}<h1>${t[1]}</h1><p>Kommt als Nächstes</p><ul>${t[2].map(x => `<li>· ${x}</li>`).join('')}</ul></div>`;
}));

for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, e => e.preventDefault());

// ---------- Start ----------
applyTheme();
load().then(() => { initMap(); window.tommi = { S, select, get map() { return map; } }; })
      .catch(err => { document.body.insertAdjacentHTML('beforeend', `<p style="position:fixed;inset:auto 20px 120px;color:#ff453a">Daten konnten nicht geladen werden: ${esc(err.message)}</p>`); });
})();
