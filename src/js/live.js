// Live link to the local RTIH suite server (server/server.mjs).
// Served by the suite (http://<laptop>:8080/staff/), dispatches made on the
// Pushkaralu Command dashboard arrive here as real incoming-dispatch screens,
// and accept / decline / notes / complete / reports / SOS go back to Command.
// Served on its own (Vercel, scripts/serve.mjs) the health check fails and the
// app keeps its built-in simulated dispatches.
import { state, sink, findTask, emit, activeTask } from './store.js';
import { STAFF, RESOURCES } from './data.js';
import { actions } from './bus.js';
import { toast } from './ui.js';
import { coordLabel } from './geo.js';

export const live = { connected: false, presence: null };

const api = (path, body) => fetch(`/api/${path}`, {
  method: body ? 'POST' : 'GET',
  headers: body ? { 'content-type': 'application/json' } : undefined,
  body: body ? JSON.stringify(body) : undefined,
}).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });

/** Command map units (Zone A spans x 420–735, y 180–500) → this app's Zone A map (1100 × 900). */
function toZoneMap([x, y]) {
  const cx = Math.max(420, Math.min(735, x)), cy = Math.max(180, Math.min(500, y));
  return { x: Math.round(60 + ((cx - 420) / 315) * 980), y: Math.round(60 + ((cy - 180) / 320) * 780) };
}

function toLocalTask(t) {
  const pos = t.mapPos || [560, 395];
  return {
    id: t.id, live: true, alertId: t.alertId, kind: t.kind, priority: t.priority, status: 'dispatch',
    title: t.title, short: t.short, location: t.location, coords: coordLabel(pos), pin: toZoneMap(pos),
    distance: t.distance, eta: t.eta, dispatchedAt: t.dispatchedAt, dispatchedBy: t.dispatchedBy,
    instructions: t.instructions, notes: [], resources: RESOURCES.ghat3,
  };
}

function onTaskUpdate(t) {
  const local = findTask(t.id);
  if (!local) return;
  if (t.status === 'cancelled' && !['completed', 'declined'].includes(local.status)) {
    const wasActive = local.status === 'active';
    local.status = 'declined'; local.declineReason = 'Recalled by Command';
    if (wasActive && !activeTask()) { const nx = state.tasks.find((x) => x.status === 'accepted'); if (nx) nx.status = 'active'; }
    import('./overlays.js').then((m) => m.dispatchRecall.get(t.id)?.());
    emit('task');
    toast(`Command recalled ${t.short || 'the dispatch'}`, 'warning', 4000);
  }
}

function onBroadcast(m) {
  state.notifications.unshift({ id: m.id, type: m.kind === 'emergency' && m.active ? 'emergency' : 'normal', title: m.title, body: m.body, t: m.at, read: false });
  emit('notif');
  toast(m.title, m.kind === 'emergency' && m.active ? 'critical' : 'info', 6000);
  if (navigator.vibrate && m.active) navigator.vibrate([300, 120, 300]);
}

function connect() {
  const es = new EventSource('/api/events?app=staff');
  es.addEventListener('hello', () => { live.connected = true; document.documentElement.dataset.live = 'on'; emit('live'); });
  es.onerror = () => { live.connected = false; document.documentElement.dataset.live = 'off'; };
  es.addEventListener('presence', (e) => { live.presence = JSON.parse(e.data); });
  es.addEventListener('task:new', (e) => {
    const t = JSON.parse(e.data);
    if (!t.staff?.onApp || findTask(t.id)) return;
    if (!state.authed) state.authed = true;
    actions.openDispatch(toLocalTask(t));
  });
  es.addEventListener('task:update', (e) => onTaskUpdate(JSON.parse(e.data)));
  es.addEventListener('broadcast', (e) => onBroadcast(JSON.parse(e.data)));
  es.addEventListener('reset', () => {
    state.tasks = state.tasks.filter((t) => !t.live);
    if (!activeTask()) { const nx = state.tasks.find((x) => x.status === 'accepted'); if (nx) nx.status = 'active'; }
    emit('task');
    toast('Live demo data was reset', 'info');
  });
}

async function boot() {
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 1500);
    const h = await fetch('/api/health', { signal: ctl.signal }).then((r) => r.ok && r.json());
    clearTimeout(to);
    if (!h?.ok) return;
  } catch { return; }

  sink.send = (path, body) => api(path, body).catch(() => toast('Command Centre did not confirm — will retry when online', 'warning'));
  sink.sos = () => api('sos', { from: 'staff', name: STAFF.name, staffId: STAFF.id, place: 'Ghat #3, Zone A', location: [560, 395], zone: 'A' });
  sink.sosCancel = (id) => api(`sos/${id}/cancel`, {}).catch(() => {});

  // pick up dispatches made while this phone was closed
  try {
    const s = await api('state');
    s.tasks.filter((t) => t.staff?.onApp && t.status === 'dispatched' && !findTask(t.id)).reverse()
      .forEach((t) => { const lt = toLocalTask(t); lt.status = 'incoming'; state.tasks.unshift(lt); });
    emit('task');
  } catch { /* ignore */ }
  connect();
}

boot();
