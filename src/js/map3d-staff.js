// Godavari Field 3D view: my position, the active task pin and walking line,
// radar bathing areas as crowd columns and facilities over real 3D buildings.
// Opened from the "3D" button on the Zone A map; needs internet (MapLibre + OpenFreeMap).
import { activeTask, state, subscribe } from './store.js';
import { MAP_FACILITIES, RADAR_ZONES } from './data.js';
import { toLngLat } from './geo.js';
import { mount3D, fc, point, polygon, line, ring, heat } from './map3d.js';
import { esc } from './util.js';

/** This app's Zone A map (1100 × 900) → Command map units → [lng, lat]. */
const ll = ({ x, y }) => toLngLat([420 + ((x - 60) / 980) * 315, 180 + ((y - 60) / 780) * 320]);
const USER = { x: 500, y: 478 };
const FAC = { medical: '#DC2626', toilet: '#0EA5E9', kiosk: '#7C3AED', vending: '#16A34A', water: '#16A34A' };

function pathPoints(d) { return [...d.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map((m) => ({ x: +m[1], y: +m[2] })); }

function data() {
  const t = activeTask();
  const crowd = fc(RADAR_ZONES.map((r) => {
    const d = r.count / r.cap;
    return polygon(ring(pathPoints(r.path).map(ll)), { color: heat(Math.min(0.99, d)), h: Math.round(10 + Math.min(1.2, d) * 60), label: r.label, html: `<b>${esc(r.label)}</b>Radar only · ${r.count.toLocaleString('en-IN')} / ${r.cap.toLocaleString('en-IN')} people` });
  }));
  const facilities = fc(MAP_FACILITIES.map((f) => point(ll(f), { color: FAC[f.kind] || '#334155', html: `<b>${esc(f.name)}</b>${f.kind}` })));
  const user = ll(USER);
  const pin = t?.pin ? ll(t.pin) : null;
  return {
    crowd, facilities, user, pin, pinLabel: t ? `${t.short || t.title}` : '',
    route: pin ? fc([line([user, ll({ x: (USER.x + t.pin.x) / 2 - 30, y: (USER.y + t.pin.y) / 2 + 30 }), pin])]) : fc([]),
  };
}

let open = null;
export async function toggle3D(app) {
  if (open) { close3D(); return false; }
  // Lives beside the re-rendered shell so store updates don't tear it down;
  // sized to the content area between the header and the tab bar.
  const content = app.querySelector('.content');
  const host = document.createElement('div');
  const a = app.getBoundingClientRect(), c = content.getBoundingClientRect();
  host.style.cssText = `position:absolute;left:0;right:0;top:${c.top - a.top}px;height:${c.height}px;z-index:40;`;
  app.append(host);
  const d = data();
  const ctl = await mount3D(host, {
    centre: d.pin ? [(d.user[0] + d.pin[0]) / 2, (d.user[1] + d.pin[1]) / 2] : d.user,
    zoom: 16.6, pitch: 62, bearing: -20, data: d, labels: { close: '← 2D map' }, onClose: () => close3D(),
  });
  const unsub = subscribe(() => { if (state.route !== 'map' || !state.authed) close3D(); else ctl.update(data()); });
  open = { ctl, host, unsub };
  return true;
}
export function close3D() {
  if (!open) return;
  open.unsub();
  open.ctl.destroy();
  open.host.remove();
  document.querySelector('#map3dBtn')?.setAttribute('aria-pressed', 'false');
  open = null;
}
