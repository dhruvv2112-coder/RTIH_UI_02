// Godavari Hub adapter for the Field app. Active only when the app is served by the local hub
// (GET /api/health answers); on Vercel or file hosting it does nothing and the demo runs offline.
//
//  hub → field   task.created  (pilgrim SOS / Command dispatch) → incoming-dispatch overlay
//                task.updated  (cancelled by pilgrim / Command)   → task closed with a toast
//  field → hub   accept / decline / complete / note / escalate    → POST /api/tasks/:id/<action>
//                field report submitted                           → POST /api/reports (Command alert)
//                staff SOS                                        → POST /api/alerts (critical)
//                verify pilgrim pass                              → GET  /api/bookings/:id/verify
import { state, subscribe, emit, findTask } from './store.js';
import { actions } from './bus.js';
import { toast, openSheet, closeSheet } from './ui.js';
import { openDispatch, dismissDispatch } from './overlays.js';
import { icon } from './icons.js';
import { esc, haptic, $ } from './util.js';

const STAFF_NAME = 'Ramesh Kumar';
let live = false;
const sent = new Map(); // task id → { status, notes, escalated } last pushed to the hub

async function api(path, body) {
  const r = await fetch(path, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}
const snap = (t) => ({ status: t.status, notes: (t.notes || []).length, escalated: !!t.escalated });

export async function startLive() {
  actions.openVerify = openVerify; // works offline too (payload check only)
  try {
    const h = await api('/api/health');
    if (!h.ok || h.data?.name !== 'godavari-hub') return;
  } catch { return; }
  live = true;
  document.documentElement.dataset.hub = 'live';
  for (const t of state.tasks) if (t.hub) sent.set(t.id, snap(t));
  connect();
  subscribe(onLocalChange);
  actions.onStaffSOS = () => api('/api/alerts', { type: 'medical', severity: 'critical', zone: 'A', title: `Staff SOS — ${STAFF_NAME}`, desc: 'Zone Marshal pressed SOS on the Field app · Ghat #3, Zone A', source: 'Field app SOS', lat: 16.99809, lng: 81.77297 }).catch(() => {});
  actions.onStaffSOSCancel = () => {};
  toast('Connected to Command Centre (Godavari Hub)', 'info', 2200);
}

function connect() {
  const es = new EventSource('/api/events?app=field&topics=task,reset,booking');
  const data = (e) => JSON.parse(e.data).data;
  es.addEventListener('task.created', (e) => {
    const t = data(e);
    if (t.assignee && t.assignee !== STAFF_NAME) return;
    if (findTask(t.id)) return;
    if (!state.authed) state.authed = true;
    sent.set(t.id, { status: 'dispatch', notes: 0, escalated: false });
    state.notifications.unshift({ id: 'n' + Date.now(), type: t.priority === 'urgent' ? 'urgent' : 'normal', title: t.priority === 'urgent' ? 'Urgent Dispatch' : 'New Task Assigned', body: `${t.short} — ${t.location}`, t: Date.now(), read: false });
    openDispatch(t);
  });
  es.addEventListener('task.updated', (e) => {
    const t = data(e);
    const local = findTask(t.id);
    if (!local) return;
    if (t.status === 'cancelled' && local.status !== 'declined' && local.status !== 'completed') {
      dismissDispatch(t.id);
      local.status = 'declined';
      local.declineReason = 'Cancelled — pilgrim marked safe';
      sent.set(t.id, snap(local));
      haptic('medium');
      toast(`${t.short || 'Task'} cancelled — pilgrim marked safe`, 'info', 3500);
      emit('task');
    }
  });
  es.addEventListener('reset', () => toast('Hub data was reset', 'info'));
  es.onerror = () => { document.documentElement.dataset.hub = 'reconnecting'; };
  es.onopen = () => { document.documentElement.dataset.hub = 'live'; };
}

function onLocalChange(reason) {
  if (!live) return;
  // Tasks that came from the hub: push status / notes / escalation changes.
  for (const t of state.tasks) {
    if (!t.hub) continue;
    const prev = sent.get(t.id) || { status: 'dispatch', notes: 0, escalated: false };
    const now = snap(t);
    if (now.status !== prev.status) {
      if ((now.status === 'active' || now.status === 'accepted') && !['active', 'accepted'].includes(prev.status)) post(t, 'accept');
      else if (now.status === 'completed') post(t, 'complete');
      else if (now.status === 'declined' && t.declineReason !== 'Cancelled — pilgrim marked safe') post(t, 'decline', { reason: t.declineReason || '' });
    }
    if (now.notes > prev.notes) (t.notes || []).slice(prev.notes).forEach((n) => post(t, 'note', { text: n.text }));
    if (now.escalated && !prev.escalated) post(t, 'escalate');
    sent.set(t.id, now);
  }
  // Field report → Command alert.
  if (reason === 'report' && state.lastReport && !state.lastReport.sent) {
    const r = state.lastReport;
    r.sent = true;
    api('/api/reports', { type: r.type, severity: r.severity, description: r.description, photos: r.photos, zone: 'A', lat: 16.99809, lng: 81.77297, by: STAFF_NAME })
      .then((x) => x.ok && toast('Report received by Command Centre', 'success'))
      .catch(() => {});
  }
}

function post(t, action, body = {}) {
  api(`/api/tasks/${encodeURIComponent(t.id)}/${action}`, body).catch(() => {});
}

/* ---------- Verify pilgrim pass (booking QR) ---------- */
// QR payload from the Pilgrim app: PUSHKARALU27|<bookingId>|<date>|<start-end>|<GHAT>|M<n>
function parsePass(text) {
  const s = String(text || '').trim();
  if (s.startsWith('PUSHKARALU27|')) {
    const [, id, date, time, ghat, m] = s.split('|');
    return { id, date, time, ghat, members: Number(String(m || '').replace(/\D/g, '')) || null };
  }
  if (/^PK/i.test(s)) return { id: s.toUpperCase() };
  return null;
}

export function openVerify() {
  const canScan = 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia && window.isSecureContext;
  openSheet({
    id: 'verify', label: 'Verify pilgrim pass', snap: 0.85,
    html: `<h2 class="t-h2" style="margin:0 0 4px">Verify Pilgrim Pass</h2>
      <p class="t-body c-secondary" style="margin:0 0 16px">Scan the QR on the pilgrim's phone, or type the booking ID printed under it.</p>
      ${canScan ? `<div class="verify-cam" id="vCam" style="position:relative;border-radius:16px;overflow:hidden;background:#111;aspect-ratio:4/3;margin-bottom:12px;display:none"><video id="vVideo" playsinline muted style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;inset:18%;border:3px solid #fff;border-radius:16px;box-shadow:0 0 0 999px rgba(0,0,0,.35)"></div></div>
      <button class="btn btn--primary btn--lg btn--block" id="vScan" style="margin-bottom:12px">${icon('scan-line')}Scan QR with camera</button>` : ''}
      <label class="t-caption-strong c-secondary" for="vId" style="display:block;margin-bottom:6px">BOOKING ID</label>
      <div style="display:flex;gap:8px"><input id="vId" class="input" autocomplete="off" autocapitalize="characters" placeholder="PK-2027-123456" style="flex:1;min-height:52px;font:600 18px var(--font-mono, monospace);padding:0 14px;border-radius:12px;border:1.5px solid var(--color-border-default);background:var(--color-bg-primary);color:var(--color-text-primary)">
      <button class="btn btn--success btn--lg" id="vGo">Check</button></div>
      <div id="vOut" aria-live="polite" style="margin-top:16px"></div>`,
    onMount: (sheet) => {
      const input = $('#vId', sheet), out = $('#vOut', sheet);
      let stream = null, timer = null;
      const stop = () => { clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); stream = null; };
      const check = async (raw) => {
        const pass = parsePass(raw);
        if (!pass) { out.innerHTML = result(false, 'Not a Pushkaralu pass', 'The code does not start with PUSHKARALU27 or PK-.'); haptic('alert'); return; }
        input.value = pass.id;
        out.innerHTML = `<div class="t-body c-secondary">Checking ${esc(pass.id)}…</div>`;
        if (!live) { out.innerHTML = result(true, 'Pass format valid (offline check)', `${esc(pass.id)} · ${esc(pass.ghat || '')} ${esc(pass.time || '')}<br>Connect to the hub to confirm the booking and check in.`); return; }
        try {
          const r = await api(`/api/bookings/${encodeURIComponent(pass.id)}/verify`);
          if (!r.ok || !r.data?.valid) { haptic('alert'); out.innerHTML = result(false, 'Booking not found', `${esc(pass.id)} is not in the booking system. Ask for ID and direct to Help Desk.`); return; }
          const b = r.data.booking;
          haptic('medium');
          out.innerHTML = result(!b.checkedInAt, b.checkedInAt ? 'Already checked in' : 'Valid pass', `<b>${esc(b.name)}</b> + ${b.people - 1} · ${esc(b.ghat)}<br>${esc(r.data.note)}<br><span class="t-mono">${esc(b.id)}</span>`)
            + (b.checkedInAt ? '' : `<button class="btn btn--success btn--lg btn--block" id="vIn" style="margin-top:12px">${icon('check')}Check in ${b.people} pilgrim${b.people > 1 ? 's' : ''}</button>`);
          $('#vIn', sheet)?.addEventListener('click', async () => {
            const c = await api(`/api/bookings/${encodeURIComponent(b.id)}/checkin`, {});
            if (c.ok) { toast(`Checked in · ${b.name} (${b.people})`, 'success'); closeSheet(); }
          });
        } catch { out.innerHTML = result(false, 'Could not reach the hub', 'Try again in a moment.'); }
      };
      $('#vGo', sheet).addEventListener('click', () => check(input.value));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(input.value); });
      $('#vScan', sheet)?.addEventListener('click', async () => {
        try {
          const det = new window.BarcodeDetector({ formats: ['qr_code'] });
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          const v = $('#vVideo', sheet); v.srcObject = stream; await v.play();
          $('#vCam', sheet).style.display = 'block'; $('#vScan', sheet).style.display = 'none';
          timer = setInterval(async () => {
            const codes = await det.detect(v).catch(() => []);
            if (codes[0]) { stop(); $('#vCam', sheet).style.display = 'none'; $('#vScan', sheet).style.display = ''; check(codes[0].rawValue); }
          }, 300);
        } catch { stop(); toast('Camera unavailable — type the booking ID', 'warning'); }
      });
      const obs = new MutationObserver(() => { if (!sheet.isConnected) { stop(); obs.disconnect(); } });
      obs.observe(document.body, { childList: true, subtree: true });
    },
  });
}

function result(ok, title, body) {
  return `<div class="card" style="padding:16px;border-left:6px solid var(--color-status-${ok ? 'normal' : 'critical'});display:flex;gap:12px;align-items:flex-start">
    <span style="color:var(--color-status-${ok ? 'normal' : 'critical'})">${icon(ok ? 'check-circle-2' : 'alert-triangle', { size: 28 })}</span>
    <div><div class="t-h3">${title}</div><div class="t-body c-secondary" style="margin-top:4px">${body}</div></div></div>`;
}
