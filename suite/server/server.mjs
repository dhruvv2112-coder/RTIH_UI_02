#!/usr/bin/env node
// RTIH Godavari Pushkaralu 2027 — one local server for all three apps.
//
//   /command/   Pushkaralu Command  (RTIH_UI_01, surveillance dashboard)
//   /staff/     Godavari Field      (RTIH_UI_02, staff & vendor app)
//   /pilgrim/   Godavari Yatra      (RTIH_UI_03, pilgrim app)
//   /api/*      live link between them (REST + Server-Sent Events)
//
// Zero dependencies: needs only Node.js 18+. Run `node server/server.mjs`
// (or double-click start-windows.bat). PORT and HOST can be set in the env.

import http from 'node:http';
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join, extname, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = join(ROOT, 'data', 'live-state.json');

const APPS = {
  command: { dir: join(ROOT, 'apps', 'command'), name: 'Pushkaralu Command', who: 'Command Centre dashboard' },
  staff: { dir: join(ROOT, 'apps', 'staff'), name: 'Godavari Field', who: 'Staff & vendor mobile app' },
  pilgrim: { dir: join(ROOT, 'apps', 'pilgrim'), name: 'Godavari Yatra', who: 'Pilgrim mobile app' },
};

// The staff member signed in on the Godavari Field app. Dispatches from the
// dashboard to this person arrive on the phone; anyone else is simulated.
const FIELD_APP_STAFF = { id: 'ST-001', appId: 'STF-A-0117', name: 'Ramesh K', fullName: 'Ramesh Kumar', pos: [560, 395] };

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

/* ------------------------------------------------------------------ state */
const blank = () => ({ seq: 3000, taskSeq: 900, alerts: [], tasks: [], sos: [], reports: [], broadcasts: [], log: [] });
let db = blank();
try { if (existsSync(DATA_FILE)) db = { ...blank(), ...JSON.parse(await readFile(DATA_FILE, 'utf8')) }; } catch { db = blank(); }

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await mkdir(dirname(DATA_FILE), { recursive: true }); await writeFile(DATA_FILE, JSON.stringify(db, null, 1)); } catch (e) { console.warn('  ! could not save state:', e.message); }
  }, 200);
}
function audit(text, by = 'system') {
  db.log.unshift({ t: Date.now(), by, text });
  db.log.length = Math.min(db.log.length, 300);
}

/* ------------------------------------------------------------------- SSE */
const clients = new Set(); // { res, app, id }
function presence() {
  const p = { command: 0, staff: 0, pilgrim: 0, other: 0 };
  for (const c of clients) p[c.app in p ? c.app : 'other'] += 1;
  return p;
}
function send(res, event, data) { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); }
function broadcast(event, data) {
  for (const c of clients) { try { send(c.res, event, data); } catch { /* dropped */ } }
}
setInterval(() => { for (const c of clients) { try { c.res.write(': ping\n\n'); } catch { /* */ } } }, 20000);

/* --------------------------------------------------------------- helpers */
const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': MIME['.json'], 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(body));
};
async function body(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 2e6) throw new Error('payload too large'); }
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new Error('invalid JSON'); }
}
const metres = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]) * 4.2);
const findAlert = (id) => db.alerts.find((a) => a.id === id);
const findTask = (id) => db.tasks.find((t) => t.id === id);
const PRIORITY = { critical: 'urgent', high: 'high', medium: 'normal', low: 'low' };
const KIND = { crowd: 'crowd', medical: 'medical', lost: 'safety', sos: 'medical', drowning: 'safety', gate: 'crowd', object: 'safety', fire: 'safety', water: 'sensor', traffic: 'traffic', camera: 'report', report: 'report' };

function nextAlertId() { db.seq += 1; return `AL-${db.seq}`; }

function sosUpdate(alert, phase, extra = {}) {
  if (!alert?.sosId) return;
  const s = db.sos.find((x) => x.id === alert.sosId);
  if (!s) return;
  Object.assign(s, { phase, ...extra, updatedAt: Date.now() });
  broadcast('sos:update', s);
}

function upsertAlert(a) {
  const i = db.alerts.findIndex((x) => x.id === a.id);
  if (i >= 0) db.alerts[i] = { ...db.alerts[i], ...a }; else db.alerts.unshift(a);
  db.alerts.length = Math.min(db.alerts.length, 200);
  return findAlert(a.id);
}

/** Simulated responders for staff who are not on the field app. */
function simulateResponder(task) {
  setTimeout(() => {
    const t = findTask(task.id);
    if (!t || t.status !== 'dispatched') return;
    t.status = 'accepted'; t.acceptedAt = Date.now();
    const a = findAlert(t.alertId);
    if (a) { a.state = 'dispatched'; a.progress = 'en route'; broadcast('alert:update', a); sosUpdate(a, 'accepted', { staff: t.staff }); }
    broadcast('task:update', t); audit(`${t.staff.name} accepted ${t.id} (radio)`, t.staff.name); save();
  }, 6000);
}

/* ---------------------------------------------------------------- routes */
const routes = {
  'GET /api/health': () => ({ ok: true, name: 'RTIH Godavari suite', time: Date.now(), presence: presence(), fieldAppStaff: FIELD_APP_STAFF }),
  'GET /api/state': () => ({ ...db, presence: presence(), fieldAppStaff: FIELD_APP_STAFF }),

  // Pilgrim (or staff) SOS → critical alert on the Command dashboard.
  'POST /api/sos': (b) => {
    const from = b.from === 'staff' ? 'staff' : 'pilgrim';
    const sos = { id: `SOS-${randomUUID().slice(0, 8).toUpperCase()}`, from, name: String(b.name || (from === 'staff' ? 'Field staff' : 'Pilgrim')).slice(0, 60), phone: b.phone || null, lang: b.lang || 'te', phase: 'alerting', createdAt: Date.now(), place: b.place || 'Pushkar Ghat, Zone A', online: b.online !== false };
    db.sos.unshift(sos);
    const location = Array.isArray(b.location) ? b.location : [585 + Math.round(Math.random() * 40), 425 + Math.round(Math.random() * 20)];
    const alert = upsertAlert({
      id: nextAlertId(), live: true, sosId: sos.id, type: from === 'staff' ? 'sos' : 'sos', severity: 'critical', zone: b.zone || 'A',
      title: from === 'staff' ? `Staff SOS — ${sos.name}` : `Pilgrim SOS — ${sos.place.split(',')[0]}`,
      desc: from === 'staff' ? `Emergency protocol from ${sos.name} (${b.staffId || 'field app'}), ${sos.place}` : `${sos.name}${b.group ? ` + ${b.group} family` : ''} pressed SOS · ${sos.place}${sos.online ? '' : ' · via SMS fallback'}`,
      location, cams: ['A-01', 'A-02', 'A-03'], suggestion: from === 'staff' ? 'Send nearest police and medical to the staff member; call on radio CH-A01.' : 'Send nearest available marshal or medical staff; family has been notified.',
      source: from === 'staff' ? 'Staff app SOS' : 'Pilgrim app SOS', ts: Date.now(), state: 'unread', notes: '',
    });
    broadcast('alert:new', alert); broadcast('sos:update', sos);
    audit(`${alert.title} (${sos.id})`, sos.name); save();
    return { sos, alert };
  },
  'POST /api/sos/:id/cancel': (b, p) => {
    const s = db.sos.find((x) => x.id === p.id); if (!s) throw httpError(404, 'SOS not found');
    s.phase = 'cancelled'; s.updatedAt = Date.now();
    const a = db.alerts.find((x) => x.sosId === s.id);
    if (a) { a.state = 'resolved'; a.notes = `${a.notes ? a.notes + ' · ' : ''}Cancelled by ${s.from}: reported safe`; broadcast('alert:update', a); }
    const t = db.tasks.find((x) => x.alertId === a?.id && !['completed', 'declined', 'cancelled'].includes(x.status));
    if (t) { t.status = 'cancelled'; broadcast('task:update', t); }
    broadcast('sos:update', s); audit(`${s.id} cancelled — safe`, s.name); save();
    return s;
  },

  // Command dashboard registers an alert it created locally (simulation) so it can be dispatched.
  'POST /api/alerts': (b) => { const a = upsertAlert({ ...b, live: true }); broadcast('alert:new', a); save(); return a; },
  'POST /api/alerts/:id/state': (b, p) => {
    const a = findAlert(p.id); if (!a) throw httpError(404, 'alert not found');
    a.state = b.state; if (b.assignee !== undefined) a.assignee = b.assignee;
    broadcast('alert:update', a);
    if (b.state === 'resolved') sosUpdate(a, 'resolved');
    if (b.state === 'acknowledged') sosUpdate(a, 'seen');
    audit(`${a.id} → ${b.state}`, b.by || 'Command'); save();
    return a;
  },

  // Command → staff dispatch. Creates a task; the field app picks it up live.
  'POST /api/dispatch': (b) => {
    if (!b.alert || !b.staff) throw httpError(400, 'alert and staff are required');
    const a = upsertAlert({ ...b.alert, live: true, state: 'dispatched', assignee: b.staff.name, severity: b.priority || b.alert.severity });
    // supersede an older open task for this alert
    db.tasks.filter((t) => t.alertId === a.id && ['dispatched', 'accepted', 'active'].includes(t.status)).forEach((t) => { t.status = 'cancelled'; broadcast('task:update', t); });
    db.taskSeq += 1;
    const onApp = b.staff.id === FIELD_APP_STAFF.id;
    const from = b.staff.pos || FIELD_APP_STAFF.pos;
    const dist = metres(a.location || from, from);
    const task = {
      id: `TSK-27-${String(db.taskSeq).padStart(4, '0')}`, alertId: a.id, sosId: a.sosId || null, status: 'dispatched',
      staff: { id: b.staff.id, name: b.staff.name, role: b.staff.role || '', onApp }, dispatchedBy: b.by || 'Command Centre',
      kind: KIND[a.type] || 'safety', priority: PRIORITY[b.priority || a.severity] || 'high', type: a.type,
      title: a.title, short: a.title.split(' — ')[0], location: a.desc ? `${a.desc.split(',')[0]}, Zone ${a.zone}` : `Zone ${a.zone}`, zone: a.zone,
      mapPos: a.location || null, distance: dist, eta: Math.max(1, Math.round(dist / 75)),
      instructions: b.instruction || a.suggestion || 'Proceed to the location and report on arrival.',
      dispatchedAt: Date.now(), notes: [],
    };
    db.tasks.unshift(task);
    broadcast('alert:update', a); broadcast('task:new', task);
    sosUpdate(a, 'assigned', { staff: { name: onApp ? FIELD_APP_STAFF.fullName : b.staff.name, role: b.staff.role || 'Zone Marshal', distance: dist, eta: task.eta } });
    audit(`${task.id}: ${b.staff.name} dispatched to ${a.id}`, b.by || 'Command'); save();
    if (!onApp) simulateResponder(task);
    return { task, alert: a };
  },
  'POST /api/recall/:alertId': (b, p) => {
    const a = findAlert(p.alertId); if (!a) throw httpError(404, 'alert not found');
    Object.assign(a, { state: b.state || 'acknowledged', assignee: b.assignee ?? null });
    db.tasks.filter((t) => t.alertId === a.id && ['dispatched', 'accepted', 'active'].includes(t.status)).forEach((t) => { t.status = 'cancelled'; broadcast('task:update', t); });
    broadcast('alert:update', a); sosUpdate(a, 'alerting', { staff: null }); save();
    return a;
  },

  // Field app task lifecycle (Brief §13 endpoints).
  'POST /api/tasks/:id/:action': (b, p) => {
    const t = findTask(p.id); if (!t) throw httpError(404, 'task not found');
    const a = findAlert(t.alertId);
    const who = t.staff?.name || 'Field staff';
    switch (p.action) {
      case 'accept':
        t.status = b.queued ? 'accepted' : (b.active === false ? 'accepted' : 'active'); t.acceptedAt = Date.now();
        if (a) { a.state = 'dispatched'; a.assignee = who; a.progress = 'en route'; }
        sosUpdate(a, 'accepted', { staff: db.sos.find((s) => s.id === a?.sosId)?.staff });
        audit(`${who} accepted ${t.id}`, who); break;
      case 'decline':
        t.status = 'declined'; t.declineReason = b.reason || '';
        if (a) { a.state = 'acknowledged'; a.assignee = null; a.progress = `declined by ${who}: ${t.declineReason}`; }
        sosUpdate(a, 'alerting', { staff: null });
        audit(`${who} declined ${t.id} (${t.declineReason})`, who); break;
      case 'complete':
        t.status = 'completed'; t.completedAt = Date.now();
        if (a) { a.state = 'resolved'; a.progress = `resolved by ${who}`; }
        sosUpdate(a, 'resolved');
        audit(`${who} completed ${t.id}`, who); break;
      case 'note':
        t.notes.push({ t: Date.now(), text: String(b.text || '').slice(0, 500) });
        if (a) a.progress = String(b.text || '').slice(0, 120);
        audit(`${t.id} note: ${b.text}`, who); break;
      case 'escalate':
        t.escalated = true;
        if (a) { a.severity = 'critical'; a.progress = `escalated by ${who}`; }
        audit(`${who} escalated ${t.id}`, who); break;
      default: throw httpError(404, 'unknown action');
    }
    broadcast('task:update', t); if (a) broadcast('alert:update', a); save();
    return t;
  },

  // Field report / inspection from the staff app → new alert on the dashboard.
  'POST /api/reports': (b) => {
    const r = { id: `RPT-${randomUUID().slice(0, 6).toUpperCase()}`, ...b, at: Date.now() };
    db.reports.unshift(r);
    const sev = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' }[b.severity] || 'medium';
    const typeMap = { incident: 'object', maintenance: 'gate', crowd: 'crowd', water: 'water', vendor: 'object', safety: 'object', medical: 'medical', other: 'object' };
    const a = upsertAlert({
      id: nextAlertId(), live: true, reportId: r.id, type: typeMap[b.type] || 'object', severity: sev, zone: b.zone || 'A',
      title: `Field report — ${b.typeLabel || b.type || 'Observation'}`, desc: `${b.place ? `${b.place} · ` : ''}${b.by || 'Field staff'}: ${String(b.description || '').slice(0, 140) || 'No description'}`,
      location: Array.isArray(b.location) ? b.location : [560, 395], place: b.place || null, cams: ['A-04', 'A-05'], suggestion: 'Review photos and assign follow-up.', source: 'Staff app report', ts: Date.now(), state: 'unread', notes: '',
      photos: b.photos || 0,
    });
    broadcast('alert:new', a); broadcast('report:new', r); audit(`${r.id} filed by ${b.by || 'staff'}`); save();
    return { report: r, alert: a };
  },
  'POST /api/inspections': (b) => {
    const r = { id: `INS-${randomUUID().slice(0, 6).toUpperCase()}`, kind: 'inspection', ...b, at: Date.now() };
    db.reports.unshift(r); broadcast('report:new', r);
    if (['C', 'D', 'F', 'fail'].includes(b.grade)) {
      const a = upsertAlert({ id: nextAlertId(), live: true, type: 'object', severity: 'medium', zone: 'B', title: `Vendor inspection failed — ${b.vendor || 'Stall'}`, desc: `Grade ${b.grade} · ${b.failed || 0} items failed · by ${b.by || 'staff'}`, location: [730, 470], cams: [], suggestion: 'Notify Vendor Cell; schedule re-inspection in 2 h.', source: 'Staff app inspection', ts: Date.now(), state: 'unread', notes: '' });
      broadcast('alert:new', a);
    }
    audit(`${r.id} inspection ${b.vendor || ''} grade ${b.grade}`); save();
    return r;
  },

  // Command emergency protocol / PA broadcast → staff + pilgrim phones.
  'POST /api/broadcast': (b) => {
    const m = { id: `BC-${Date.now()}`, kind: b.kind || 'advisory', zone: b.zone || null, title: String(b.title || 'Advisory').slice(0, 120), body: String(b.body || '').slice(0, 400), active: b.active !== false, at: Date.now() };
    db.broadcasts.unshift(m); db.broadcasts.length = Math.min(db.broadcasts.length, 50);
    broadcast('broadcast', m); audit(`Broadcast: ${m.title}`, 'Command'); save();
    return m;
  },

  'POST /api/reset': () => { db = blank(); broadcast('reset', {}); save(); audit('Demo state reset'); return { ok: true }; },
};

function httpError(code, msg) { const e = new Error(msg); e.code = code; return e; }

function match(method, path) {
  for (const key of Object.keys(routes)) {
    const [m, pattern] = key.split(' ');
    if (m !== method) continue;
    const a = pattern.split('/'), b = path.split('/');
    if (a.length !== b.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < a.length; i++) {
      if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
      else if (a[i] !== b[i]) { ok = false; break; }
    }
    if (ok) return { fn: routes[key], params };
  }
  return null;
}

/* ---------------------------------------------------------------- static */
async function serveFile(res, file, { spa } = {}) {
  try {
    const s = await stat(file);
    if (s.isDirectory()) return serveFile(res, join(file, 'index.html'), { spa });
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    const noCache = type.startsWith('text/html') || file.endsWith('sw.js');
    res.writeHead(200, { 'content-type': type, 'cache-control': noCache ? 'no-cache' : 'public, max-age=300' });
    res.end(await readFile(file));
  } catch {
    if (spa) return serveFile(res, spa);
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found');
  }
}

function safeJoin(base, rel) {
  const p = normalize(join(base, rel));
  return p.startsWith(base) ? p : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const path = url.pathname;
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST' }); return res.end(); }

    if (path === '/api/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'access-control-allow-origin': '*' });
      const c = { res, app: url.searchParams.get('app') || 'other', id: randomUUID() };
      clients.add(c);
      send(res, 'hello', { id: c.id, presence: presence(), fieldAppStaff: FIELD_APP_STAFF });
      broadcast('presence', presence());
      req.on('close', () => { clients.delete(c); broadcast('presence', presence()); });
      return;
    }

    if (path.startsWith('/api/')) {
      const m = match(req.method, path);
      if (!m) return json(res, 404, { error: 'unknown endpoint' });
      const b = req.method === 'POST' ? await body(req) : {};
      return json(res, 200, await m.fn(b, m.params));
    }

    // apps
    const [, first, ...rest] = path.split('/');
    if (APPS[first]) {
      if (path === `/${first}`) { res.writeHead(301, { location: `/${first}/` }); return res.end(); }
      const app = APPS[first];
      const file = safeJoin(app.dir, rest.join('/') || 'index.html');
      if (!file) { res.writeHead(400); return res.end(); }
      return serveFile(res, file, { spa: first === 'pilgrim' ? join(app.dir, 'index.html') : null });
    }

    // landing + shared assets
    const file = safeJoin(join(ROOT, 'landing'), path === '/' ? 'index.html' : path.slice(1));
    if (file && existsSync(file)) return serveFile(res, file);
    const shared = path.startsWith('/shared/') && safeJoin(ROOT, path.slice(1));
    if (shared && existsSync(shared)) return serveFile(res, shared);
    const docs = path.startsWith('/docs/') && safeJoin(ROOT, path.slice(1));
    if (docs && existsSync(docs)) return serveFile(res, docs);
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found');
  } catch (e) {
    json(res, e.code || 500, { error: e.message });
  }
});

function lanAddresses() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) out.push(n.address);
  return out;
}
routes['GET /api/lan'] = () => ({ port: PORT, addresses: lanAddresses() });

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\n  Port ${PORT} is busy. Close the other server or run with another port, e.g.  set PORT=8090 && node server\\server.mjs\n`);
  else console.error(e);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const lan = lanAddresses();
  const line = '─'.repeat(64);
  console.log(`\n  ${line}\n  RTIH · Godavari Pushkaralu 2027 — local suite is running\n  ${line}`);
  console.log(`  ${'Home'.padEnd(19)} http://localhost:${PORT}/`);
  for (const [k, a] of Object.entries(APPS)) console.log(`  ${a.name.padEnd(19)} http://localhost:${PORT}/${k}/${existsSync(a.dir) ? '' : '   (missing — run scripts/assemble.mjs)'}`);
  if (lan.length) console.log(`\n  On a phone on the same Wi-Fi:  ${lan.map((ip) => `http://${ip}:${PORT}/`).join('   ')}`);
  console.log(`\n  Live state is saved to data/live-state.json. Press Ctrl+C to stop.\n`);
});
