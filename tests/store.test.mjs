// Offline-first task flow (Brief §7, §14 critical scenarios 1 & 5).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = await import('../src/js/store.js');
const { state, acceptTask, completeTask, declineTask, setOnline, activeTask, byStatus, resetDemo, nextDispatch, addNote, kpis } = store;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
beforeEach(() => resetDemo());

test('seed: one active, two incoming, five completed', () => {
  assert.equal(activeTask().id, 'TSK-27-0412');
  assert.equal(byStatus('incoming').length, 2);
  assert.equal(byStatus('completed').length, 5);
});

test('accepting while a task is active queues it as Up Next', () => {
  const r = acceptTask('TSK-27-0416');
  assert.equal(r.becameActive, false);
  assert.equal(byStatus('accepted').length, 1);
});

test('completing the active task promotes Up Next and bumps KPIs', () => {
  acceptTask('TSK-27-0416');
  const before = kpis().tasks;
  completeTask('TSK-27-0412');
  assert.equal(activeTask().id, 'TSK-27-0416');
  assert.equal(kpis().tasks, before + 1);
});

test('offline: actions queue FIFO and drain on reconnect (scenario 1)', async () => {
  setOnline(false);
  acceptTask('TSK-27-0415');
  addNote('TSK-27-0412', 'Arrived');
  completeTask('TSK-27-0412');
  assert.equal(state.queue.length, 3);
  assert.deepEqual(state.queue.map((q) => q.label), ['Accept', 'Note', 'Complete']);
  setOnline(true);
  assert.equal(state.sync, 'syncing');
  await wait(600 + 450 * 4);
  assert.equal(state.queue.length, 0);
  assert.equal(state.sync, 'synced');
});

test('decline records a reason', () => {
  declineTask('TSK-27-0415', 'Too Far');
  const t = state.tasks.find((x) => x.id === 'TSK-27-0415');
  assert.equal(t.status, 'declined');
  assert.equal(t.declineReason, 'Too Far');
});

test('two dispatches within a second both register (scenario 5)', () => {
  const a = nextDispatch();
  const b = nextDispatch();
  assert.notEqual(a.id, b.id);
  assert.equal(state.tasks.filter((t) => t.status === 'dispatch').length, 2);
});
