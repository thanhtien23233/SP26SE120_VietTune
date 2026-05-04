/**
 * IndexedDB-backed storage service — no practical size limit (replaces localStorage/sessionStorage).
 * Uses in-memory cache for sync reads; all writes persist to IndexedDB.
 */

const DB_NAME = 'VietTuneDB';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
const SESSION_PREFIX = 'session_';

/** Values larger than this are not kept in memory to avoid OOM (e.g. localRecordings with base64). */
const MAX_CACHE_VALUE_SIZE = 200 * 1024; // 200KB

/** Max cache entries to avoid unbounded memory growth. */
const MAX_CACHE_KEYS = 200;

/** Auth-critical keys that must be in cache after hydrate so sync getItem works on app init. */
const AUTH_KEYS = ['user', 'access_token'];

let db: IDBDatabase | null = null;
const cache = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const database = await openDB();
  const tx = database.transaction(STORE_NAME, mode);
  return tx.objectStore(STORE_NAME);
}

/**
 * Put one key-value into IndexedDB. Used during migration to avoid holding all values in memory.
 */
function putOne(database: IDBDatabase, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Migrate all keys from localStorage and sessionStorage into IndexedDB.
 * Processes one key at a time to avoid OOM when localRecordings or other large values exist.
 * Session keys are stored with prefix "session_" so they can be read via getItem("session_*").
 */
async function migrateFromLegacy(): Promise<void> {
  if (typeof window === 'undefined') return;

  const database = await openDB();

  // Collect only keys (cheap); then process each key's value one-by-one so we never hold multiple large values.
  const localKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) localKeys.push(k);
  }
  const sessionKeys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k) sessionKeys.push(k);
  }

  for (const key of localKeys) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      await putOne(database, key, value);
      if (value.length <= MAX_CACHE_VALUE_SIZE && cache.size < MAX_CACHE_KEYS) {
        cache.set(key, value);
      }
    }
  }
  for (const key of sessionKeys) {
    const value = sessionStorage.getItem(key);
    if (value !== null) {
      const storedKey = SESSION_PREFIX + key;
      await putOne(database, storedKey, value);
      if (value.length <= MAX_CACHE_VALUE_SIZE && cache.size < MAX_CACHE_KEYS) {
        cache.set(storedKey, value);
      }
    }
  }

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // ignore
  }
}

/**
 * Load keys from IndexedDB into the in-memory cache (for sync getItem).
 * Values larger than MAX_CACHE_VALUE_SIZE are skipped to avoid OOM (e.g. localRecordings).
 * Stops when cache has MAX_CACHE_KEYS entries to cap memory.
 */
async function loadAllIntoCache(): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if (cache.size >= MAX_CACHE_KEYS) {
          resolve();
          return;
        }
        const value = cursor.value as string;
        if (typeof value === 'string' && value.length <= MAX_CACHE_VALUE_SIZE) {
          cache.set(cursor.key as string, value);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Ensure auth-critical keys are in cache so sync getItem("user") / getItem("access_token") work
 * after hydrate (loadAllIntoCache may stop at MAX_CACHE_KEYS and skip these).
 */
async function ensureAuthKeysInCache(): Promise<void> {
  const database = await openDB();
  for (const key of AUTH_KEYS) {
    if (cache.has(key)) continue;
    const value = await new Promise<string | null>((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    if (value !== null && value.length <= MAX_CACHE_VALUE_SIZE) {
      cache.set(key, value);
    }
  }
}

/**
 * Run once before app uses storage: migrate legacy storage and hydrate cache.
 * Must be awaited before rendering the app.
 */
export async function hydrate(): Promise<void> {
  if (typeof window === 'undefined') return;
  await openDB();
  await migrateFromLegacy();
  await loadAllIntoCache();
  await ensureAuthKeysInCache();
}

/**
 * Sync get (from cache). Returns null if key is missing or not cached (e.g. large values).
 */
export function getItem(key: string): string | null {
  const v = cache.get(key);
  return v !== undefined ? v : null;
}

/**
 * Async get: from cache or from IndexedDB. Use for large keys (e.g. localRecordings) to avoid OOM.
 */
export async function getItemAsync(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const store = await getStore('readonly');
  return new Promise<string | null>((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Evict oldest cache entries (by insertion order) until size <= MAX_CACHE_KEYS.
 */
function evictCacheIfNeeded(): void {
  if (cache.size <= MAX_CACHE_KEYS) return;
  const toDelete = cache.size - MAX_CACHE_KEYS;
  const keys = Array.from(cache.keys());
  for (let i = 0; i < toDelete && i < keys.length; i++) {
    cache.delete(keys[i]);
  }
}

/**
 * Async set: updates cache immediately and persists to IndexedDB.
 * Large values are not cached to avoid OOM. Cache size is capped by MAX_CACHE_KEYS.
 */
export async function setItem(key: string, value: string): Promise<void> {
  if (value.length <= MAX_CACHE_VALUE_SIZE) {
    cache.set(key, value);
    evictCacheIfNeeded();
  } else {
    cache.delete(key);
  }
  const store = await getStore('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Async remove: deletes from cache and IndexedDB.
 */
export async function removeItem(key: string): Promise<void> {
  cache.delete(key);
  const store = await getStore('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Session key helpers: map session_* keys so callers can use the same key names as sessionStorage.
 * e.g. sessionGetItem("fromLogout") -> getItem("session_fromLogout")
 */
export function sessionGetItem(key: string): string | null {
  return getItem(SESSION_PREFIX + key);
}

export function sessionSetItem(key: string, value: string): Promise<void> {
  return setItem(SESSION_PREFIX + key, value);
}

export function sessionRemoveItem(key: string): Promise<void> {
  return removeItem(SESSION_PREFIX + key);
}

export const storage = {
  getItem,
  getItemAsync,
  setItem,
  removeItem,
  hydrate,
  sessionGetItem,
  sessionSetItem,
  sessionRemoveItem,
};

export default storage;
