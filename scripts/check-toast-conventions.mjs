/**
 * Quy ước toast (PLAN-toast-verify Phase 1.4):
 * - Không alert() trong src/
 * - Chỉ App.tsx và src/uiToast/uiToast.ts được import react-hot-toast trực tiếp
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");

function* walkFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      yield* walkFiles(p);
    } else if (/\.(ts|tsx)$/.test(name)) {
      yield p;
    }
  }
}

function normalizeRel(filePath) {
  return relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function allowReactHotToast(rel) {
  return rel === "src/App.tsx" || rel === "src/uiToast/uiToast.ts";
}

let errors = 0;

for (const file of walkFiles(ROOT)) {
  const rel = normalizeRel(file);
  const text = readFileSync(file, "utf8");

  if (/\balert\s*\(/.test(text)) {
    console.error(`[check-toast] Disallowed alert() in ${rel}`);
    errors += 1;
  }

  if (/from\s+["']react-hot-toast["']/.test(text) && !allowReactHotToast(rel)) {
    console.error(`[check-toast] Import react-hot-toast only in App.tsx or uiToast/uiToast.ts — ${rel}`);
    errors += 1;
  }
}

if (errors > 0) {
  console.error(`[check-toast] Failed with ${errors} issue(s).`);
  process.exit(1);
}
console.log("[check-toast] OK");
process.exit(0);
