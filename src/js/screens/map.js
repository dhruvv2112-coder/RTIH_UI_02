// Screen 2 — Zone Map · Brief §4.2
// Vector zone map standing in for the Mapbox offline tile package. Privacy (§1.3): radar zones
// render only as counts + flow arrows — never imagery.
import { icon, iconAt } from '../icons.js';
import { state, activeTask, emit } from '../store.js';
import { MAP_FACILITIES, RADAR_ZONES, FACILITY_META } from '../data.js';
import { esc, haptic, $, $$ } from '../util.js';
import { toast } from '../ui.js';
import { actions } from '../bus.js';
import { create3D, makeTransform, injectMarkerCSS, GHAT_GEO } from '../map3d.js';

// Zone A schematic (1100 × 900) → WGS84: Ghat #3 = Main Ghat #3, ghats run along the bank towards
// Saraswati Ghat, river to the west (up on the schematic). ~1.3 m per unit.
const toGeo = makeTransform({ LAT0: 17.00702267, LNG0: 81.76313321, A: -0.0000110729, B: 0.0000036644, C: 0.0000038303, D: 0.000011574 });
const FAC_COLOUR = { medical: '#DC2626', toilet: '#2563EB', kiosk: '#7C3AED', vending: '#059669', water: '#0891B2' };
let mode3d = true; // live 3D city by default when online; schematic map offline / on request
let m3 = null;
let host = null; // the MapLibre container survives screen re-renders (moved into each new #m3)
let loading = false;

const W = 1100, H = 900;
const USER = { x: 500, y: 478 };
const view = { s: 1.35, x: 0, y: 0 };

function flowArrow(cx, cy, dir) {
  const rot = { E: 0, SE: 40, S: 90, N: -90, W: 180 }[dir] || 0;
  return `<g transform="translate(${cx} ${cy + 26}) rotate(${rot})" class="flow"><path d="M-22 0 H14 M6 -8 L16 0 L6 8" stroke="var(--color-status-radar)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

export function mapSVG({ mini = false, pin = null, interactive = true } = {}) {
  const L = mini ? { crowd: true, facilities: true, radar: true, staff: false, traffic: false } : state.layers;
  const t = pin || activeTask();
  const ghats = [1, 2, 3, 4, 5].map((n, i) => {
    const gx = 300 + i * 120, gy = 318 - i * 6;
    return `<g><path d="M${gx} ${gy} l100 -6 l4 26 l-100 6z" fill="var(--map-land-2)" stroke="var(--map-road-major)" stroke-width="1.5"/>
      ${[0, 1, 2].map((k) => `<path d="M${gx + 2} ${gy + 6 + k * 6} l100 -6" stroke="var(--map-road-major)" stroke-width="1" opacity=".7"/>`).join('')}
      <text x="${gx + 50}" y="${gy + 52}" text-anchor="middle" class="map-label map-label--strong">GHAT #${n}</text></g>`;
  }).join('');

  const heat = L.crowd ? `
    <g class="heat" opacity="0.4" filter="url(#blur)">
      <circle cx="560" cy="380" r="95" fill="url(#hRed)"/>
      <circle cx="705" cy="365" r="110" fill="url(#hRed)"/>
      <circle cx="440" cy="390" r="90" fill="url(#hAmber)"/>
      <circle cx="820" cy="420" r="90" fill="url(#hAmber)"/>
      <circle cx="330" cy="400" r="80" fill="url(#hGreen)"/>
      <circle cx="600" cy="560" r="120" fill="url(#hGreen)"/>
      <circle cx="880" cy="600" r="90" fill="url(#hGreen)"/>
    </g>` : '';

  const radar = L.radar ? RADAR_ZONES.map((z) => {
    const over = z.count > z.cap;
    return `<g class="radar" role="img" aria-label="Radar zone ${z.id}, ${z.count} people, radar only">
      <path d="${z.path}" fill="rgba(163,113,247,0.14)" stroke="var(--color-status-radar)" stroke-width="2.5" stroke-dasharray="8 6"/>
      <g transform="translate(${z.cx - 52} ${z.cy - 84})">
        <rect width="104" height="40" rx="8" fill="var(--color-bg-elevated)" stroke="var(--color-status-radar)" stroke-width="1.5"/>
        ${iconAt('shield', 8, 8, 16, 'var(--color-status-radar)')}
        <text x="28" y="19" class="map-radar-count" fill="${over ? 'var(--color-status-critical)' : 'var(--color-text-primary)'}">${z.count.toLocaleString('en-IN')}</text>
        <text x="28" y="32" class="map-radar-cap">RADAR ONLY · ${z.id}</text>
      </g>
      <path d="M${z.cx} ${z.cy - 44} V ${z.cy - 8}" stroke="var(--color-status-radar)" stroke-width="1.5" stroke-dasharray="2 3"/>
      ${flowArrow(z.cx, z.cy, z.flow)}
    </g>`;
  }).join('') : '';

  const fac = L.facilities ? MAP_FACILITIES.map((f) => {
    const m = FACILITY_META[f.kind];
    return `<g class="fac" transform="translate(${f.x - 16} ${f.y - 16})" role="img" aria-label="${m.label}: ${esc(f.name)}">
      <circle cx="16" cy="16" r="17" fill="var(--color-bg-primary)" opacity=".5"/>
      <circle cx="16" cy="16" r="15" fill="${m.color}"/>
      ${iconAt(m.icon, 7, 7, 18, '#fff', 2.25)}
    </g>`;
  }).join('') : '';

  const traffic = L.traffic ? `<g class="traffic" stroke-width="7" stroke-linecap="round" fill="none" opacity=".85">
      <path d="M120 620 C 320 600, 420 640, 560 640" stroke="var(--color-status-critical)"/>
      <path d="M560 640 C 700 640, 820 600, 980 640" stroke="var(--color-status-warning)"/>
      <path d="M760 470 L 780 780" stroke="var(--color-status-normal)"/></g>` : '';

  const staff = L.staff ? [[620, 440, 'TC-04'], [700, 500, 'MD-02'], [420, 520, 'ZM-09'], [780, 380, 'ZM-11']].map(([x, y, id]) =>
    `<g transform="translate(${x} ${y})"><circle r="9" fill="var(--color-status-normal)" stroke="var(--color-bg-primary)" stroke-width="3"/><text y="-14" text-anchor="middle" class="map-label map-label--strong">${id}</text></g>`).join('') : '';

  const taskPin = t?.pin ? `<g class="task-pin" transform="translate(${t.pin.x} ${t.pin.y})" role="img" aria-label="Task location: ${esc(t.location)}">
      <ellipse cx="0" cy="2" rx="9" ry="3.5" fill="#000" opacity=".35"/>
      <g class="task-pin__body">
        <path d="M0 0 C -6 -14 -20 -22 -20 -36 A20 20 0 1 1 20 -36 C 20 -22 6 -14 0 0Z" fill="${t.priority === 'high' ? 'var(--color-status-warning)' : 'var(--color-status-critical)'}" stroke="#fff" stroke-width="2.5"/>
        ${iconAt(t.priority === 'urgent' ? 'alert-triangle' : 'map-pin', -11, -48, 22, '#fff', 2.5)}
      </g></g>` : '';

  return `
  <svg class="zone-map" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" ${interactive ? 'role="application" aria-label="Zone A map. Drag to pan, use zoom buttons to zoom."' : 'aria-hidden="true"'}>
    <defs>
      <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
      <radialGradient id="hRed"><stop offset="0" stop-color="#F85149"/><stop offset=".55" stop-color="#D29922"/><stop offset="1" stop-color="#3FB950" stop-opacity="0"/></radialGradient>
      <radialGradient id="hAmber"><stop offset="0" stop-color="#D29922"/><stop offset="1" stop-color="#3FB950" stop-opacity="0"/></radialGradient>
      <radialGradient id="hGreen"><stop offset="0" stop-color="#3FB950"/><stop offset="1" stop-color="#3FB950" stop-opacity="0"/></radialGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="var(--map-road)" stroke-width=".6" opacity=".5"/></pattern>
      <pattern id="ripple" width="60" height="18" patternUnits="userSpaceOnUse"><path d="M0 9 q15 -7 30 0 t30 0" fill="none" stroke="var(--map-water-edge)" stroke-width="1.2" opacity=".5"/></pattern>
    </defs>
    <g class="map-world">
      <rect x="-400" y="-400" width="${W + 800}" height="${H + 800}" fill="var(--map-land)"/>
      <rect x="-400" y="-400" width="${W + 800}" height="${H + 800}" fill="url(#grid)"/>
      <!-- Godavari river -->
      <path d="M-400 120 C 100 60, 400 330, 700 290 S 1100 220, 1500 280 L1500 -400 L-400 -400Z" fill="var(--map-water)"/>
      <path d="M-400 120 C 100 60, 400 330, 700 290 S 1100 220, 1500 280 L1500 -400 L-400 -400Z" fill="url(#ripple)"/>
      <path d="M-400 120 C 100 60, 400 330, 700 290 S 1100 220, 1500 280" fill="none" stroke="var(--map-water-edge)" stroke-width="3"/>
      <text x="230" y="150" class="map-water-label" transform="rotate(10 230 150)">GODAVARI · గోదావరి</text>
      <!-- Promenade + roads -->
      <path d="M-400 175 C 100 120, 400 390, 700 350 S 1100 285, 1500 340" fill="none" stroke="var(--map-road-major)" stroke-width="16" stroke-linecap="round"/>
      <path d="M-400 175 C 100 120, 400 390, 700 350 S 1100 285, 1500 340" fill="none" stroke="var(--map-road)" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 14" opacity=".7"/>
      <g fill="none" stroke="var(--map-road-major)" stroke-width="12" stroke-linecap="round">
        <path d="M-400 640 C 300 600, 420 650, 600 640 S 900 600, 1500 650"/>
        <path d="M480 360 C 470 500, 520 600, 500 1300"/>
        <path d="M760 340 C 770 480, 760 640, 790 1300"/>
        <path d="M200 260 C 230 480, 230 700, 180 1300"/>
      </g>
      <g fill="none" stroke="var(--map-road)" stroke-width="5" stroke-linecap="round" opacity=".9">
        <path d="M200 470 H 1000"/><path d="M620 360 V 640"/><path d="M340 520 C 420 540, 560 540, 640 520"/><path d="M880 330 C 900 480, 940 560, 1000 760"/><path d="M200 780 H 1000"/>
      </g>
      <text x="640" y="628" class="map-label">EAST CORRIDOR</text>
      <text x="512" y="760" class="map-label" transform="rotate(-88 512 760)">STATION ROAD</text>
      <text x="230" y="590" class="map-zone">ZONE A</text>
      <text x="840" y="740" class="map-zone">ZONE B</text>
      <path d="M690 380 L 700 900" stroke="var(--color-text-tertiary)" stroke-width="2" stroke-dasharray="3 7" opacity=".6"/>
      <!-- Parking & vendor rows -->
      <rect x="250" y="680" width="150" height="80" rx="8" fill="var(--map-land-2)" stroke="var(--map-road-major)"/><text x="325" y="726" text-anchor="middle" class="map-label">PARKING B</text>
      ${[0, 1, 2].map((r) => `<rect x="${700}" y="${505 + r * 26}" width="120" height="16" rx="3" fill="var(--map-land-2)" stroke="var(--map-road-major)"/>`).join('')}
      <text x="830" y="548" class="map-label">VENDOR ROWS 1–3</text>
      ${ghats}
      ${heat}
      ${traffic}
      ${radar}
      ${fac}
      ${staff}
      ${taskPin}
      ${t?.pin ? `<path d="M${USER.x} ${USER.y} Q ${(USER.x + t.pin.x) / 2 - 30} ${(USER.y + t.pin.y) / 2 + 30} ${t.pin.x} ${t.pin.y - 4}" fill="none" stroke="var(--color-brand-secondary)" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round" class="route"/>` : ''}
      <g class="me" transform="translate(${USER.x} ${USER.y})" role="img" aria-label="You are here">
        <circle r="36" fill="var(--color-brand-secondary)" opacity=".3"/>
        <circle r="9" class="me__pulse" fill="none" stroke="var(--color-brand-secondary)" stroke-width="3"/>
        <circle r="9" fill="var(--color-brand-primary)" stroke="#fff" stroke-width="3"/>
      </g>
    </g>
  </svg>`;
}

export function renderMap() {
  const t = activeTask();
  return `
  <div class="map-screen screen-enter">
    <div class="map-viewport" id="mapvp">${mapSVG()}</div>
    <div class="m3-wrap" id="m3" hidden><span class="m3-badge">Loading 3D city…</span></div>
    <div class="map-chips">
      <span class="map-chip">${icon('users')}<span><b>Crowd</b> · live 10s</span></span>
      <span class="map-chip">${icon(state.online ? 'wifi' : 'wifi-off')}<span>${state.online ? 'Offline tiles ready' : 'Offline tiles'}</span></span>
    </div>
    <div class="map-legend card" id="legend" hidden>
      <div class="t-caption-strong c-secondary" style="text-transform:uppercase;margin-bottom:6px">Legend</div>
      <div class="lg"><i style="background:linear-gradient(90deg,#3FB950,#D29922,#F85149)"></i>Crowd density</div>
      <div class="lg"><i style="border:2px dashed var(--color-status-radar)"></i>Radar zone · counts only</div>
      <div class="lg"><i style="background:var(--color-status-critical);border-radius:50%"></i>Medical</div>
      <div class="lg"><i style="background:var(--color-status-info);border-radius:50%"></i>Toilet</div>
      <div class="lg"><i style="background:var(--color-status-radar);border-radius:50%"></i>Kiosk</div>
      <div class="lg"><i style="background:var(--color-status-normal);border-radius:50%"></i>Vending / Water</div>
    </div>
    <div class="map-controls">
      <button class="map-ctl map-ctl--3d" id="toggle3d" aria-pressed="${mode3d && state.online}" aria-label="Switch between live 3D city and offline zone map"><span style="font:800 13px var(--font-sans, Inter)">${mode3d && state.online ? '3D' : '2D'}</span></button>
      <button class="map-ctl" data-zoom="1" aria-label="Zoom in">${icon('plus')}</button>
      <button class="map-ctl" data-zoom="-1" aria-label="Zoom out">${icon('minus')}</button>
      <button class="map-ctl" id="recentre" aria-label="Re-centre on my location">${icon('locate-fixed')}</button>
      <button class="map-ctl" id="legendBtn" aria-label="Show legend" aria-expanded="false">${icon('info')}</button>
    </div>
    ${t ? `
    <div class="task-strip" id="strip" role="region" aria-label="Active task">
      <div class="task-strip__handle"></div>
      <div class="task-strip__row">
        <div class="task-strip__info">
          <div class="t-caption-strong c-critical" style="text-transform:uppercase;display:flex;align-items:center;gap:6px"><span class="pulse-dot"></span>Active</div>
          <div class="t-h3" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.short || t.title)} — ${esc(t.location.split(',')[0])}</div>
          <div class="t-caption c-secondary">${icon('footprints', { size: 14 })} ${t.distance}m · ETA ${t.eta} min walking</div>
        </div>
      </div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn--primary" id="go">${icon('navigation')}Navigate</button>
        <button class="btn btn--ghost" id="call">${icon('phone')}Call Dispatch</button>
      </div>
    </div>` : `
    <div class="task-strip"><div class="t-h3">No active task</div><div class="t-caption c-secondary">You're on patrol in Zone A. New dispatches will pin here.</div></div>`}
  </div>`;
}

let navInterval;
export function bindMap(root) {
  const vp = $('#mapvp', root);
  const svg = $('svg', vp);
  const world = $('.map-world', svg);
  const apply = (anim) => {
    world.style.transition = anim ? 'transform 400ms var(--ease-default)' : 'none';
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
  };
  const centreOn = (p, anim = true) => { view.x = W / 2 - p.x * view.s; view.y = H / 2 - p.y * view.s; apply(anim); };
  if (!view.init) { view.init = true; centreOn(USER, false); } else apply(false);

  const sc = () => Math.max(vp.clientWidth / W, vp.clientHeight / H);
  const scaleRatio = () => 1 / sc();
  const toUser = (cx, cy) => { const r = vp.getBoundingClientRect(), k = sc(); return { x: (cx - r.left - (r.width - W * k) / 2) / k, y: (cy - r.top - (r.height - H * k) / 2) / k }; };
  const zoomAt = (factor, cx = W / 2, cy = H / 2) => {
    const ns = Math.min(4, Math.max(0.8, view.s * factor));
    view.x = cx - (cx - view.x) * (ns / view.s); view.y = cy - (cy - view.y) * (ns / view.s); view.s = ns; apply(true);
  };
  $$('[data-zoom]', root).forEach((b) => b.addEventListener('click', () => { haptic('light'); if (m3) return b.dataset.zoom === '1' ? m3.zoomIn() : m3.zoomOut(); zoomAt(b.dataset.zoom === '1' ? 1.4 : 1 / 1.4); }));
  $('#recentre', root).addEventListener('click', () => { haptic('light'); if (m3) return m3.flyTo(toGeo(USER.x, USER.y), 17.3); centreOn(USER); });
  const tg = $('#toggle3d', root);
  tg.addEventListener('click', () => {
    haptic('light');
    mode3d = !m3;
    tg.setAttribute('aria-pressed', String(mode3d)); tg.firstElementChild.textContent = mode3d ? '3D' : '2D';
    mode3d ? start3D(root) : stop3D(root);
  });
  if (mode3d && state.online) start3D(root); else { tg.setAttribute('aria-pressed', 'false'); tg.firstElementChild.textContent = '2D'; }
  const lb = $('#legendBtn', root), lg = $('#legend', root);
  lb.addEventListener('click', () => { lg.hidden = !lg.hidden; lb.setAttribute('aria-expanded', String(!lg.hidden)); });

  // One-finger pan, wheel zoom, double-tap zoom (§6.2)
  let drag = null, lastTap = 0;
  vp.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; vp.setPointerCapture(e.pointerId); });
  vp.addEventListener('pointermove', (e) => { if (!drag) return; const k = scaleRatio(); view.x = drag.vx + (e.clientX - drag.x) * k; view.y = drag.vy + (e.clientY - drag.y) * k; apply(false); });
  vp.addEventListener('pointerup', (e) => {
    const moved = drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6; drag = null;
    if (moved) return;
    const now = Date.now();
    if (now - lastTap < 300) { const p = toUser(e.clientX, e.clientY); zoomAt(1.6, p.x, p.y); }
    lastTap = now;
  });
  vp.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });

  const t = activeTask();
  $('#go', root)?.addEventListener('click', () => {
    haptic('medium');
    if (m3) { route3D(t); toast(`Walking route · ${t.distance}m via promenade`, 'info'); return; }
    centreOn({ x: (USER.x + t.pin.x) / 2, y: (USER.y + t.pin.y) / 2 });
    svg.classList.add('is-navigating');
    toast(`Walking route · ${t.distance}m via promenade`, 'info');
  });
  $('#call', root)?.addEventListener('click', () => { haptic('light'); toast('Calling Command Centre…', 'info'); });

  // Drag the strip up → full task sheet
  const strip = $('#strip', root);
  if (strip && t) {
    let sy = null;
    strip.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) sy = e.clientY; });
    strip.addEventListener('pointerup', (e) => { if (sy != null && (sy - e.clientY > 30 || Math.abs(sy - e.clientY) < 6)) actions.openTask(t.id, { snap: 0.85 }); sy = null; });
  }
}

/* ---------- live 3D city (MapLibre + OpenFreeMap) ---------- */
const taskGeo = (t) => (t.geo ? [t.geo.lng, t.geo.lat] : toGeo(t.pin.x, t.pin.y));
async function start3D(root) {
  const wrap = $('#m3', root);
  if (!wrap) return;
  injectMarkerCSS();
  wrap.hidden = false;
  const badge = $('.m3-badge', wrap);
  if (host) {
    wrap.prepend(host);
    if (m3) { badge.textContent = 'Live 3D · OpenStreetMap'; m3.resize(); draw3D(); }
    return;
  }
  if (loading) return;
  loading = true;
  host = document.createElement('div');
  host.style.cssText = 'position:absolute;inset:0';
  wrap.prepend(host);
  try {
    const t = activeTask();
    const me = toGeo(USER.x, USER.y);
    m3 = await create3D(host, { center: t?.pin ? [(me[0] + taskGeo(t)[0]) / 2, (me[1] + taskGeo(t)[1]) / 2] : me, zoom: 16.6, pitch: 62, bearing: -20 });
    const cur = host.parentElement;
    if (cur) $('.m3-badge', cur).textContent = 'Live 3D · OpenStreetMap';
    m3.resize();
    draw3D();
  } catch (err) {
    host = null;
    badge.textContent = `3D unavailable — ${err.message}. Showing offline map.`;
    badge.classList.add('is-err');
    setTimeout(() => stop3D(root), 2500);
  } finally { loading = false; }
}
function stop3D(root) {
  m3?.destroy(); m3 = null; host?.remove(); host = null;
  const wrap = $('#m3', root); if (wrap) wrap.hidden = true;
  const tg = $('#toggle3d', root); if (tg) { tg.setAttribute('aria-pressed', 'false'); tg.firstElementChild.textContent = '2D'; }
}
function draw3D() {
  if (!m3) return;
  const L = state.layers, t = activeTask(), items = [];
  m3.setGeo('radar', 'fill', L.radar ? RADAR_ZONES.map((z) => {
    const pts = [...z.path.matchAll(/(\d+) (\d+)/g)].map((m) => toGeo(+m[1], +m[2]));
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] } };
  }) : [], { 'fill-color': '#8B5CF6', 'fill-opacity': 0.28 });
  m3.setGeo('crowd', 'circle', L.crowd ? [[560, 380, 2], [705, 365, 2], [440, 390, 1], [820, 420, 1], [330, 400, 0], [600, 560, 0], [880, 600, 0]].map(([x, y, l]) => ({ type: 'Feature', properties: { l }, geometry: { type: 'Point', coordinates: toGeo(x, y) } })) : [],
    { 'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 14, 10, 19, 260], 'circle-color': ['match', ['get', 'l'], 2, '#EF4444', 1, '#F59E0B', '#22C55E'], 'circle-opacity': 0.3, 'circle-blur': 0.8, 'circle-pitch-alignment': 'map' });
  for (const g of Object.values(GHAT_GEO)) {
    const el = document.createElement('div'); el.className = 'm3-tag'; el.textContent = g.name;
    items.push({ el, at: g.at, anchor: 'top' });
  }
  if (L.facilities) for (const f of MAP_FACILITIES) {
    const el = document.createElement('div'); el.className = 'm3-fac'; el.style.background = FAC_COLOUR[f.kind] || '#1E3A5F'; el.title = f.name;
    items.push({ el, at: toGeo(f.x, f.y) });
  }
  if (L.radar) for (const z of RADAR_ZONES) {
    const el = document.createElement('div'); el.className = 'm3-tag'; el.style.color = z.count > z.cap ? '#DC2626' : '#5B21B6';
    el.textContent = `${z.count.toLocaleString('en-IN')} · RADAR ONLY ${z.id}`;
    items.push({ el, at: toGeo(z.cx, z.cy - 40) });
  }
  const me = document.createElement('div'); me.className = 'm3-me'; me.title = 'You';
  items.push({ el: me, at: toGeo(USER.x, USER.y) });
  if (t?.pin) {
    const el = document.createElement('div'); el.className = `m3-alert ${t.priority === 'urgent' ? 'is-crit' : ''}`;
    el.style.background = t.priority === 'high' ? '#D97706' : '#DC2626'; el.innerHTML = '<i>!</i>'; el.title = t.location;
    items.push({ el, at: taskGeo(t), anchor: 'bottom', onClick: () => actions.openTask(t.id, { snap: 0.85 }) });
  }
  m3.setMarkers(items);
}
function route3D(t) {
  if (!m3 || !t?.pin) return;
  const a = toGeo(USER.x, USER.y), b = taskGeo(t), mid = toGeo((USER.x + t.pin.x) / 2 + 40, (USER.y + t.pin.y) / 2 + 30);
  const pts = t.geo ? [a, b] : [a, mid, b];
  m3.setGeo('route', 'line', [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts } }], { 'line-color': '#2563EB', 'line-width': 5, 'line-dasharray': [1, 1.5] }, { 'line-cap': 'round' });
  m3.fit([[Math.min(a[0], b[0]), Math.min(a[1], b[1])], [Math.max(a[0], b[0]), Math.max(a[1], b[1])]], 90);
}

export function layersPanel() {
  const rows = [
    ['crowd', 'Crowd Density', 'users'],
    ['facilities', 'Facilities', 'map-pin'],
    ['radar', 'Radar Zones', 'shield'],
    ['staff', 'Staff Positions', 'user', 'Supervisor only'],
    ['traffic', 'Traffic', 'car'],
  ];
  const sup = state.role === 'supervisor';
  return `
    <h2 class="t-h1 sheet__title">Map Layers</h2>
    <p class="t-caption c-secondary" style="margin:0 0 12px">Zone A offline package · 48 MB · updated weekly</p>
    <div class="card settings">
      ${rows.map(([k, label, ic, note]) => {
        const locked = k === 'staff' && !sup;
        return `<div class="set-row">${icon(ic)}<span class="set-row__label">${label}${note ? `<span class="t-caption c-tertiary" style="display:block">${note}${locked ? ' · locked' : ''}</span>` : ''}</span>
        <button class="switch" role="switch" data-layer="${k}" aria-checked="${state.layers[k] && !locked}" aria-label="${label}" ${locked ? 'disabled style="opacity:.4"' : ''}></button></div>`;
      }).join('')}
    </div>`;
}
export function bindLayers(sheet) {
  $$('[data-layer]', sheet).forEach((sw) => sw.addEventListener('click', () => {
    const k = sw.dataset.layer; state.layers[k] = !state.layers[k];
    sw.setAttribute('aria-checked', String(state.layers[k])); haptic('light'); emit('layers');
  }));
}
