/**
 * Replace arbitrary #FFFCF5 in Tailwind classes with theme token surface-panel.
 * Run: node scripts/sync-surface-panel-token.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src');

const REPLACEMENTS = [
  ['focus-within:ring-offset-[#FFFCF5]', 'focus-within:ring-offset-surface-panel'],
  ['focus-visible:ring-offset-[#FFFCF5]', 'focus-visible:ring-offset-surface-panel'],
  ['ring-offset-[#FFFCF5]', 'ring-offset-surface-panel'],
  ['from-[#FFFCF5]', 'from-surface-panel'],
  ['via-[#FFFCF5]', 'via-surface-panel'],
  ['to-[#FFFCF5]', 'to-surface-panel'],
  ['bg-[#FFFCF5]', 'bg-surface-panel'],
];

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(p);
  }
  return acc;
}

let changed = 0;
for (const file of walk(srcRoot)) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;
  for (const [a, b] of REPLACEMENTS) {
    if (s.includes(a)) s = s.split(a).join(b);
  }
  if (s !== orig) {
    fs.writeFileSync(file, s);
    changed++;
    console.log(file);
  }
}
console.log(`Updated ${changed} files.`);
