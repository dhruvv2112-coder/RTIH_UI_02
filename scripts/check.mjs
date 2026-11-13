// Static checks: every module/import and asset referenced from index.html + sw.js exists.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
let failed = 0;
const fail = (m) => { console.error('✗', m); failed++; };

const html = readFileSync(join(root, 'index.html'), 'utf8');
for (const [, ref] of html.matchAll(/(?:href|src)="((?!https?:|#)[^"]+)"/g)) if (!existsSync(join(root, ref))) fail(`index.html → ${ref}`);

const seen = new Set();
const walk = (file) => {
  if (seen.has(file)) return; seen.add(file);
  const src = readFileSync(file, 'utf8');
  for (const [, ref] of src.matchAll(/from '(\.[^']+)'/g)) {
    const target = join(dirname(file), ref);
    if (!existsSync(target)) fail(`${file.replace(root, '')} → ${ref}`); else walk(target);
  }
};
walk(join(root, 'src/js/app.js'));

const sw = readFileSync(join(root, 'sw.js'), 'utf8');
// precache list is relative to the worker scope (works at / and at /staff/)
const list = sw.slice(sw.indexOf('const ASSETS'), sw.indexOf('].map('));
for (const [, ref] of list.matchAll(/'([^']+)'/g)) if (ref !== './' && !existsSync(join(root, ref))) fail(`sw.js precache → ${ref}`);
const jsModules = [...seen].map((f) => f.replace(root, '').replace(/\\/g, '/').replace(/^\//, ''));
for (const m of jsModules) if (!list.includes(`'${m}'`)) fail(`sw.js does not precache ${m}`);

console.log(failed ? `${failed} problem(s)` : `✓ ${seen.size} modules, all references resolve and are precached`);
process.exit(failed ? 1 : 0);
