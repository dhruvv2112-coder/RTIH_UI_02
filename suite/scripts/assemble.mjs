#!/usr/bin/env node
// Copies the three apps into apps/ so the suite server can serve them.
// Expects the repos cloned side by side:
//   RTIH_UI_01/  RTIH_UI_02/  RTIH_UI_03/  rtih-godavari-suite/
// Usage: node scripts/assemble.mjs [--src <folder containing the repos>]
// The pilgrim app (RTIH_UI_03) must be built first: npm install && npm run build.
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--src');
const SRC = i > 0 ? resolve(process.argv[i + 1]) : resolve(ROOT, '..');

const find = (...names) => names.map((n) => join(SRC, n)).find((p) => existsSync(p));
const plan = [
  { app: 'command', repo: find('RTIH_UI_01', 'rtih_ui_01'), files: ['index.html', 'src', 'public'] },
  { app: 'staff', repo: find('RTIH_UI_02', 'rtih_ui_02'), files: ['index.html', 'sw.js', 'manifest.webmanifest', 'assets', 'src'] },
  { app: 'pilgrim', repo: find('RTIH_UI_03', 'rtih_ui_03'), from: 'dist' },
];

let ok = true;
for (const p of plan) {
  const out = join(ROOT, 'apps', p.app);
  if (!p.repo) { console.error(`✗ ${p.app}: repo folder not found next to the suite`); ok = false; continue; }
  const base = p.from ? join(p.repo, p.from) : p.repo;
  if (!existsSync(base)) { console.error(`✗ ${p.app}: ${base} missing (build it first)`); ok = false; continue; }
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const f of p.files || readdirSync(base)) cpSync(join(base, f), join(out, f), { recursive: true });
  console.log(`✓ ${p.app.padEnd(8)} ← ${base}`);
}
process.exit(ok ? 0 : 1);
