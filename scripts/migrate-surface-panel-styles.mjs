/**
 * One-off / repeatable: merge `style={{ backgroundColor: '#FFFCF5' }}` into Tailwind `bg-surface-panel`.
 * Run: node scripts/migrate-surface-panel-styles.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const STYLE_PROP = String.raw`style={{ backgroundColor: '#FFFCF5' }}`;

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith('.tsx')) acc.push(p);
  }
  return acc;
}

function migrate(content) {
  let s = content;

  // className="..."  +  style={{ backgroundColor: '#FFFCF5' }} (same line)
  s = s.replace(
    /className="([^"]*)"\s+style=\{\{ backgroundColor: '#FFFCF5' \}\}/g,
    (_, c) => `className="${c} bg-surface-panel"`,
  );

  // className="..." newline style={{...}}
  s = s.replace(
    /className="([^"]*)"\s*\r?\n\s*style=\{\{ backgroundColor: '#FFFCF5' \}\}/g,
    (_, c) => `className="${c} bg-surface-panel"`,
  );

  // className={`...`} + style same line
  s = s.replace(
    /className=\{`([^`]*)`\}\s+style=\{\{ backgroundColor: '#FFFCF5' \}\}/g,
    (_, c) => `className={\`${c} bg-surface-panel\`}`,
  );

  // lone style on its own line; previous line ends with className="..."
  s = s.replace(
    /className="([^"]*)"\s*\r?\n\s*style=\{\{ backgroundColor: '#FFFCF5' \}\}/g,
    (_, c) => `className="${c} bg-surface-panel"`,
  );

  return s;
}

let total = 0;
for (const file of walk(path.join(root, 'src'))) {
  const before = fs.readFileSync(file, 'utf8');
  const after = migrate(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    total++;
    console.log(file);
  }
}
console.log(`Updated ${total} files.`);
