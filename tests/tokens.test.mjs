// Design-token guard rails: contrast targets from Brief §1.2 / §2.1 and CSS ↔ JSON parity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url)));
const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

const hex = (h) => { const n = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255); };
const lum = (h) => { const [r, g, b] = hex(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const D = Object.fromEntries(Object.entries(tokens.color.dark).map(([k, v]) => [k, v.$value]));
const L = { ...D, ...Object.fromEntries(Object.entries(tokens.color.light).map(([k, v]) => [k, v.$value])) };

test('dark: critical text meets 7:1 (AAA, sunlight legibility)', () => {
  for (const bg of ['bg-primary', 'bg-secondary', 'bg-elevated']) {
    assert.ok(contrast(D['text-primary'], D[bg]) >= 7, `text-primary on ${bg}`);
  }
});

test('dark: status colours are legible as text on app background (≥ 4.5:1)', () => {
  for (const s of ['status-normal', 'status-warning', 'status-critical', 'status-info']) {
    const r = contrast(D[s], D['bg-primary']);
    assert.ok(r >= 4.5, `${s} = ${r.toFixed(2)}:1`);
  }
});

test('dark: secondary text passes AA body (≥ 4.5:1)', () => {
  assert.ok(contrast(D['text-secondary'], D['bg-primary']) >= 4.5);
  assert.ok(contrast(D['text-secondary'], D['bg-secondary']) >= 4.5);
});

test('light: primary/secondary text pass', () => {
  assert.ok(contrast(L['text-primary'], L['bg-primary']) >= 7);
  assert.ok(contrast(L['text-secondary'], L['bg-primary']) >= 4.5);
});

test('light (default): status text tokens and brand text pass AA on white and secondary surface', () => {
  for (const k of ['status-normal-fg', 'status-warning-fg', 'status-critical-fg', 'status-info-fg', 'brand-secondary']) {
    for (const bg of ['bg-primary', 'bg-secondary']) assert.ok(contrast(L[k], L[bg]) >= 4.5, `${k} on ${bg} = ${contrast(L[k], L[bg]).toFixed(2)}`);
  }
});

test('every JSON colour token exists in tokens.css with the same value', () => {
  for (const [k, v] of Object.entries(tokens.color.dark)) {
    const m = css.match(new RegExp(`--color-${k}:\\s*([^;]+);`));
    assert.ok(m, `--color-${k} missing from CSS`);
    assert.equal(m[1].trim().toLowerCase(), v.$value.toLowerCase());
  }
});

test('touch targets and spacing follow the 4px grid (§2.3, P5)', () => {
  for (const [k, v] of Object.entries(tokens.space)) assert.equal(parseInt(v.$value) % 4, 0, `space-${k}`);
  assert.match(css, /--touch-min:\s*48px/);
});
