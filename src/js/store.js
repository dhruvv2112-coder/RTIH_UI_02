// Minimal reactive store with offline queue semantics (Brief §7).
// Mirrors the Zustand + MMKV shape planned for the React Native build.
import { seedTasks, seedNotifications, CHECKLIST, STAFF, DISPATCH_POOL, REPORT_TYPES } from './data.js';

const KEY = 'rtih.godavari-field.v2'; // v2: light theme default
const listeners = new Set();

function freshReport() {
  return { type: null, severity: null, description: '', photos: [], voice: null, location: 'auto' };
}
function freshInspection() {
  return { sections: structuredClone(CHECKLIST), grade: null, gradeTouched: false, notes: '', photos: [] };
}

function initial() {
  return {
    authed: true,
    theme: 'light', // day theme by default (outdoor glare); dark is a Profile toggle
    lang: 'en',
    online: true,
    sync: 'idle', // idle | syncing | synced
    queue: [],
    route: 'tasks', // tasks | map | report | inspection | profile
    tasks: seedTasks(),
    notifications: seedNotifications(),
    report: freshReport(),
    inspection: freshInspection(),
    settings: { sound: true, vibration: true, location: true, offlineMB: 127 },
    layers: { crowd: true, facilities: true, radar: true, staff: false, traffic: false },
    session: { tasks: 0, inspections: 0, reports: 0 },
    dispatchIdx: 0,
    role: 'marshal',
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial();
    const saved = JSON.parse(raw);
    return { ...initial(), ...saved, online: true, sync: 'idle' };
  } catch { return initial(); }
}

export const state = load();

let saveT;
function persist() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      const { sync, ...rest } = state;
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch { /* storage unavailable — in-memory only */ }
  }, 150);
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit(reason) { persist(); listeners.forEach((fn) => fn(reason)); }
export function set(patch, reason = 'set') { Object.assign(state, patch); emit(reason); }

export function resetDemo() {
  const keep = { theme: state.theme };
  Object.assign(state, initial(), keep);
  try { localStorage.removeItem(KEY); } catch {}
  emit('reset');
}

/* ---------- selectors ---------- */
export const byStatus = (s) => state.tasks.filter((t) => t.status === s);
export const activeTask = () => state.tasks.find((t) => t.status === 'active') || null;
export const findTask = (id) => state.tasks.find((t) => t.id === id);
export const unreadCount = () => state.notifications.filter((n) => !n.read).length;
export const kpis = () => ({
  tasks: STAFF.base.tasks + state.session.tasks,
  inspections: STAFF.base.inspections + state.session.inspections,
  reports: STAFF.base.reports + state.session.reports,
});

/* ---------- live link (filled by live.js when the suite server is present) ---------- */
export const sink = { send: null };
function remote(path, body) {
  if (!sink.send) return;
  if (state.online) sink.send(path, body);
  else if (state.queue.length) state.queue[state.queue.length - 1].remote = { path, body };
}

/* ---------- offline queue ---------- */
function enqueue(action, label) {
  if (state.online) return false;
  state.queue.push({ id: crypto.randomUUID?.() || String(Math.random()), action, label, t: Date.now() });
  return true;
}

export function setOnline(online) {
  if (state.online === online) return;
  state.online = online;
  if (online && state.queue.length) {
    state.sync = 'syncing';
    emit('net');
    // FIFO sync (§7.1) — simulated round-trips
    const step = () => {
      const item = state.queue.shift();
      if (item) {
        if (item.remote && sink.send) sink.send(item.remote.path, item.remote.body);
        state.tasks.forEach((t) => { if (t.pendingSync === item.id) { t.pendingSync = null; t.synced = true; } });
        emit('sync-step');
        setTimeout(step, 450);
      } else {
        state.sync = 'synced';
        emit('net');
        setTimeout(() => { state.sync = 'idle'; emit('net'); }, 2000);
      }
    };
    setTimeout(step, 600);
  } else {
    state.sync = 'idle';
    emit('net');
  }
}

/* ---------- task actions (§13 endpoints) ---------- */
function stamp(task, action, label) {
  const queued = enqueue(action, label);
  if (queued) { task.pendingSync = state.queue[state.queue.length - 1].id; task.synced = false; }
  else { task.synced = true; }
  return queued;
}

export function acceptTask(id) {
  const t = findTask(id); if (!t) return;
  let hasActive = !!activeTask();
  let paused = null;
  // An urgent dispatch from Command (e.g. a pilgrim SOS) pre-empts the current task,
  // which moves to Up Next and resumes when this one completes.
  if (hasActive && t.live && t.priority === 'urgent') {
    paused = activeTask();
    paused.status = 'accepted';
    paused.notes = paused.notes || [];
    paused.notes.push({ t: Date.now(), text: `Paused for urgent dispatch ${t.id}` });
    hasActive = false;
  }
  t.status = hasActive ? 'accepted' : 'active';
  t.acceptedAt = Date.now();
  t.progress = t.progress || 0;
  const queued = stamp(t, `POST /tasks/${id}/accept`, 'Accept');
  if (t.live) remote(`tasks/${id}/accept`, { active: !hasActive, queued });
  emit('task');
  return { queued, becameActive: !hasActive, paused };
}

export function declineTask(id, reason) {
  const t = findTask(id); if (!t) return;
  t.status = 'declined'; t.declineReason = reason;
  const queued = stamp(t, `POST /tasks/${id}/decline`, 'Decline');
  if (t.live) remote(`tasks/${id}/decline`, { reason });
  emit('task');
  return { queued };
}

export function completeTask(id) {
  const t = findTask(id); if (!t) return;
  t.status = 'completed';
  t.completedAt = Date.now();
  t.duration = Math.max(1, Math.round((Date.now() - (t.acceptedAt || t.dispatchedAt || Date.now())) / 60000));
  state.session.tasks += 1;
  if (t.kind === 'inspection') state.session.inspections += 0; // inspections counted on submit
  const queued = stamp(t, `POST /tasks/${id}/complete`, 'Complete');
  if (t.live) remote(`tasks/${id}/complete`, {});
  const next = state.tasks.find((x) => x.status === 'accepted');
  if (next) { next.status = 'active'; if (next.live) remote(`tasks/${next.id}/accept`, { active: true }); }
  emit('task');
  return { queued, next };
}

export function addNote(id, text) {
  const t = findTask(id); if (!t || !text.trim()) return;
  t.notes = t.notes || [];
  t.notes.push({ t: Date.now(), text: text.trim() });
  if (t.status === 'active') t.progress = Math.min(95, (t.progress || 0) + 10);
  stamp(t, `POST /tasks/${id}/notes`, 'Note');
  if (t.live) remote(`tasks/${id}/note`, { text: text.trim() });
  emit('task');
}

export function escalateTask(id) {
  const t = findTask(id); if (!t) return;
  t.escalated = true;
  t.notes = t.notes || [];
  t.notes.push({ t: Date.now(), text: 'Escalated to Shift Supervisor' });
  const queued = stamp(t, `POST /tasks/${id}/escalate`, 'Escalate');
  if (t.live) remote(`tasks/${id}/escalate`, {});
  emit('task');
  return { queued };
}

/** A dispatch that arrived from the Command dashboard via the suite server. */
export function receiveDispatch(task) {
  const existing = findTask(task.id);
  if (existing) return existing;
  state.tasks.unshift(task);
  state.notifications.unshift({ id: 'n' + Date.now(), type: task.priority === 'urgent' ? 'urgent' : 'normal', title: task.priority === 'urgent' ? 'Urgent Dispatch' : 'New Task Assigned', body: `${task.short} — ${task.location}`, t: Date.now(), read: false });
  emit('dispatch');
  return task;
}

export function nextDispatch() {
  const base = DISPATCH_POOL[state.dispatchIdx % DISPATCH_POOL.length];
  state.dispatchIdx += 1;
  const n = String(420 + state.dispatchIdx).padStart(4, '0');
  const task = { ...structuredClone(base), id: `TSK-27-${n}`, status: 'dispatch', dispatchedAt: Date.now(), notes: [] };
  state.tasks.unshift(task);
  state.notifications.unshift({ id: 'n' + Date.now(), type: task.priority === 'urgent' ? 'urgent' : 'normal', title: task.priority === 'urgent' ? 'Urgent Dispatch' : 'New Task Assigned', body: `${task.short} — ${task.location}`, t: Date.now(), read: false });
  emit('dispatch');
  return task;
}

/* ---------- report & inspection ---------- */
export function submitReport() {
  const queued = enqueue('POST /reports', 'Field report');
  const r = state.report;
  remote('reports', { type: r.type, typeLabel: { maintenance: 'Maintenance' }[r.type] || REPORT_TYPES.find((x) => x.id === r.type)?.label, severity: r.severity, description: r.description, photos: r.photos.length, voice: !!r.voice, place: r.locationName || 'Ghat #3, Zone A', by: `${STAFF.name} (${STAFF.id})`, zone: 'A' });
  state.session.reports += 1;
  state.report = freshReport();
  emit('report');
  return { queued };
}
export function submitInspection() {
  const queued = enqueue('PUT /inspections/VND-2027-47', 'Inspection');
  const ins = state.inspection;
  const failed = ins.sections.flatMap((sec) => sec.items || []).filter((i) => i.state === 'fail' || i.value === 'fail').length;
  remote('inspections', { vendor: 'Stall #47 · VND-2027-47', grade: ins.grade, failed, notes: ins.notes, photos: ins.photos.length, by: `${STAFF.name} (${STAFF.id})` });
  state.session.inspections += 1;
  const t = state.tasks.find((x) => x.kind === 'inspection' && ['active', 'accepted', 'incoming'].includes(x.status));
  if (t) {
    t.status = 'completed'; t.completedAt = Date.now();
    t.duration = Math.max(1, Math.round((Date.now() - (t.acceptedAt || t.dispatchedAt)) / 60000));
    t.synced = !queued; state.session.tasks += 1;
    if (queued) t.pendingSync = state.queue[state.queue.length - 1].id;
    const next = state.tasks.find((x) => x.status === 'accepted');
    if (!activeTask() && next) next.status = 'active';
  }
  state.inspection = freshInspection();
  emit('inspection');
  return { queued };
}
export function resetReport() { state.report = freshReport(); emit('report'); }
