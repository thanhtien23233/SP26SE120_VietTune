import fs from 'node:fs';
import path from 'node:path';

function parseArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  return value && !value.startsWith('--') ? value : null;
}

const DEFAULT_URL =
  'https://viettunearchiveapi-fufkgcayeydnhdeq.japanwest-01.azurewebsites.net/swagger/v1/swagger.json';

const url = parseArg('--url') ?? process.env.SWAGGER_URL ?? DEFAULT_URL;
const outFile =
  parseArg('--out') ?? process.env.SWAGGER_OUT ?? path.join(process.cwd(), 'src', 'api', 'swagger.json');

if (!/^https?:\/\//i.test(url)) {
  throw new Error(`SWAGGER_URL không hợp lệ: ${url}`);
}

const res = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } });
if (!res.ok) {
  const text = await res.text().catch(() => '');
  throw new Error(`Tải swagger thất bại (${res.status} ${res.statusText}). ${text.slice(0, 300)}`);
}

const json = await res.json();
const dir = path.dirname(outFile);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(json, null, 2) + '\n', 'utf8');

console.log(`OK: saved swagger → ${outFile}`);
