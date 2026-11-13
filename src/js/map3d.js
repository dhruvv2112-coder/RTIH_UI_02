// Live 3D city map — MapLibre GL JS + OpenFreeMap vector tiles (OpenStreetMap data).
// No API key, no billing: 3D building extrusions, pitch/rotate, fly-to. Loaded from a CDN on first
// use; callers keep their schematic SVG map as the fallback when offline / no WebGL.
// Shared by Pushkaralu Command (RTIH_UI_01) and Godavari Field (RTIH_UI_02) — same file in both repos.

const CDN = 'https://unpkg.com/maplibre-gl@4.7.1/dist';
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** Ghat positions on the Rajamahendravaram river front (OpenStreetMap; Kotilingala and #3 approximate). */
export const GHAT_GEO = {
  kotilingala: { name: 'Kotilingala Ghat', at: [81.766, 17.0215] },
  pushkar: { name: 'Pushkar Ghat', at: [81.76695, 17.0084] },
  main3: { name: 'Main Ghat #3', at: [81.7689, 17.0016] },
  saraswati: { name: 'Saraswati Ghat', at: [81.77087, 16.99483] },
  gowthami: { name: 'Gowthami Ghat', at: [81.7752, 16.9898] },
};

let loader = null;
export function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = `${CDN}/maplibre-gl.css`;
    document.head.append(css);
    const s = document.createElement('script');
    s.src = `${CDN}/maplibre-gl.js`; s.async = true;
    s.onload = () => (window.maplibregl ? resolve(window.maplibregl) : reject(new Error('maplibre missing')));
    s.onerror = () => { loader = null; reject(new Error('Map library unreachable (offline?)')); };
    document.head.append(s);
    setTimeout(() => reject(new Error('Map library timed out')), 12000);
  });
  return loader;
}

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Linear map from schematic (x, y) units to [lng, lat]: lat = LAT0 + A·x + B·y, lng = LNG0 + C·x + D·y. */
export function makeTransform({ LAT0, LNG0, A, B, C, D }) {
  return (x, y) => [LNG0 + C * x + D * y, LAT0 + A * x + B * y];
}

const BUILDING_COLOR = ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 9], 0, '#efe3d0', 30, '#e2c9a6', 90, '#c99a6b'];
// OSM buildings in Rajamahendravaram rarely carry heights — give them a believable 9 m default.
const BUILDING_HEIGHT = ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, ['max', ['coalesce', ['get', 'render_height'], 0], 9]];

/**
 * Create a 3D map in `container`. Resolves to a small API once the style has loaded.
 * opts: { center:[lng,lat], zoom, pitch, bearing, bounds:[[w,s],[e,n]], padding }
 */
export async function create3D(container, opts = {}) {
  if (!webglAvailable()) throw new Error('WebGL not available');
  const lib = await loadMapLibre();
  const map = new lib.Map({
    container, style: MAP_STYLE,
    center: opts.center || GHAT_GEO.pushkar.at, zoom: opts.zoom ?? 15.5,
    pitch: opts.pitch ?? 60, bearing: opts.bearing ?? -30, maxPitch: 75,
    attributionControl: { compact: true }, fadeDuration: 150,
  });
  await new Promise((resolve, reject) => {
    const tm = setTimeout(() => reject(new Error('Map tiles timed out')), 15000);
    map.once('load', () => { clearTimeout(tm); resolve(); });
  });
  const style = map.getStyle();
  if (map.getLayer('building-3d')) {
    map.setLayerZoomRange('building-3d', 13, 24);
    map.setPaintProperty('building-3d', 'fill-extrusion-color', BUILDING_COLOR);
    map.setPaintProperty('building-3d', 'fill-extrusion-height', BUILDING_HEIGHT);
  } else {
    const src = Object.keys(style.sources).find((k) => style.sources[k].type === 'vector') || 'openmaptiles';
    map.addLayer({ id: 'building-3d', type: 'fill-extrusion', source: src, 'source-layer': 'building', minzoom: 13,
      paint: { 'fill-extrusion-color': BUILDING_COLOR, 'fill-extrusion-height': BUILDING_HEIGHT, 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 0.92 } });
  }
  if (opts.bounds) map.fitBounds(opts.bounds, { padding: opts.padding ?? 40, pitch: opts.pitch ?? 60, bearing: opts.bearing ?? -30, duration: 0 });

  let markers = [];
  const api = {
    map, lib,
    /** Replace all HTML markers. items: [{ el, at:[lng,lat], anchor?, onClick? }] */
    setMarkers(items) {
      markers.forEach((m) => m.remove());
      markers = items.map((it) => {
        if (it.onClick) { it.el.style.cursor = 'pointer'; it.el.addEventListener('click', (e) => { e.stopPropagation(); it.onClick(); }); }
        return new lib.Marker({ element: it.el, anchor: it.anchor || 'center' }).setLngLat(it.at).addTo(map);
      });
    },
    /** GeoJSON layer helper: kind 'fill' | 'line' | 'circle'. Creates on first call, updates after. */
    setGeo(id, kind, features, paint = {}, layout = {}) {
      const data = { type: 'FeatureCollection', features };
      if (map.getSource(id)) { map.getSource(id).setData(data); return; }
      map.addSource(id, { type: 'geojson', data });
      map.addLayer({ id, type: kind, source: id, paint, layout }, kind === 'fill' ? 'building-3d' : undefined);
    },
    flyTo(at, zoom = 17) { map.flyTo({ center: at, zoom, pitch: Math.max(map.getPitch(), 50), duration: 1200 }); },
    fit(bounds, padding = 40) { map.fitBounds(bounds, { padding, pitch: 60, bearing: -30, duration: 900 }); },
    setPitch(on) { map.easeTo({ pitch: on ? 60 : 0, bearing: on ? -30 : 0, duration: 800 }); if (map.getLayer('building-3d')) map.setLayoutProperty('building-3d', 'visibility', on ? 'visible' : 'none'); },
    zoomIn() { map.zoomIn(); }, zoomOut() { map.zoomOut(); },
    resize() { map.resize(); },
    destroy() { markers.forEach((m) => m.remove()); map.remove(); },
  };
  return api;
}

/** Shared marker CSS — injected once. */
export function injectMarkerCSS() {
  if (document.getElementById('map3d-css')) return;
  const st = document.createElement('style');
  st.id = 'map3d-css';
  st.textContent = `
  .m3-wrap{position:absolute;inset:0;z-index:1;background:#f2ede4}
  .m3-wrap .maplibregl-ctrl-bottom-right{bottom:auto;top:56px}
  .m3-pin{display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 4px rgba(0,0,0,.3))}
  .m3-pin svg{display:block}
  .m3-tag{margin-top:2px;background:rgba(255,255,255,.95);color:#1F2937;font:700 11px/1.2 Inter,system-ui,sans-serif;padding:3px 8px;border-radius:999px;white-space:nowrap}
  .m3-dot{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 10px Inter,sans-serif;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)}
  .m3-alert{width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35);display:grid;place-items:center}
  .m3-alert i{transform:rotate(45deg);font:900 14px Inter,sans-serif;color:#fff;font-style:normal}
  .m3-alert.is-crit{animation:m3pulse 1.4s infinite}
  .m3-me{width:20px;height:20px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 8px rgba(37,99,235,.18),0 2px 6px rgba(0,0,0,.35)}
  .m3-fac{width:22px;height:22px;border-radius:6px;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.3)}
  .m3-badge{position:absolute;left:12px;top:12px;z-index:3;display:inline-flex;gap:6px;align-items:center;background:rgba(255,255,255,.95);color:#065F46;font:700 12px Inter,sans-serif;padding:6px 10px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.15)}
  .m3-badge.is-err{color:#92400E}
  @keyframes m3pulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.6),0 3px 8px rgba(0,0,0,.35)}50%{box-shadow:0 0 0 12px rgba(220,38,38,0),0 3px 8px rgba(0,0,0,.35)}}
  @media (prefers-reduced-motion:reduce){.m3-alert.is-crit{animation:none}}`;
  document.head.append(st);
}
