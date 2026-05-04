import type { Page } from "@playwright/test";

const DB_NAME = "VietTuneDB";
const DB_VERSION = 1;
const STORE_NAME = "kv";

/**
 * App auth lives in IndexedDB (see `storageService.ts`). Playwright `storageState` does not
 * persist IDB — seed keys then reload so `hydrate()` picks them up.
 */
export async function seedIndexedDBAuth(
  page: Page,
  access_token: string,
  userJson: string,
): Promise<void> {
  await page.evaluate(
    async ({ access_token: token, userJson: u, dbName, dbVersion, storeName }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open(dbName, dbVersion);
        r.onerror = () => reject(r.error);
        r.onsuccess = () => resolve(r.result);
        r.onupgradeneeded = () => {
          const d = r.result;
          if (!d.objectStoreNames.contains(storeName)) {
            d.createObjectStore(storeName);
          }
        };
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        const store = tx.objectStore(storeName);
        store.put(token, "access_token");
        store.put(u, "user");
      });
      db.close();
    },
    {
      access_token,
      userJson,
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      storeName: STORE_NAME,
    },
  );
  await page.reload({ waitUntil: "load", timeout: 90_000 });
}

export async function readAuthFromIndexedDB(page: Page): Promise<{
  access_token: string | null;
  user: string | null;
}> {
  return page.evaluate(
    async ({ dbName, dbVersion, storeName }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open(dbName, dbVersion);
        r.onerror = () => reject(r.error);
        r.onsuccess = () => resolve(r.result);
        r.onupgradeneeded = () => {
          const d = r.result;
          if (!d.objectStoreNames.contains(storeName)) {
            d.createObjectStore(storeName);
          }
        };
      });
      const read = (key: string) =>
        new Promise<string | null>((resolve, reject) => {
          const tx = db.transaction(storeName, "readonly");
          const req = tx.objectStore(storeName).get(key);
          req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : null);
          req.onerror = () => reject(req.error);
        });
      const access_token = await read("access_token");
      const user = await read("user");
      db.close();
      return { access_token, user };
    },
    { dbName: DB_NAME, dbVersion: DB_VERSION, storeName: STORE_NAME },
  );
}
