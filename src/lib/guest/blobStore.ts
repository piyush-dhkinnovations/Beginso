// Logo / cover / background images the guest picked. They cannot be uploaded yet (POST /api/upload needs a
// session and a real formId), so the bytes wait here until the claim step. IndexedDB in the browser; a Map when
// IndexedDB is unavailable (private window, blocked storage) so the builder still works until the tab closes.

export interface BlobStore {
  put(key: string, blob: Blob): Promise<void>;
  get(key: string): Promise<Blob | undefined>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  totalBytes(): Promise<number>;
}

export function memoryBlobStore(): BlobStore {
  const map = new Map<string, Blob>();
  return {
    put: async (k, b) => void map.set(k, b),
    get: async (k) => map.get(k),
    remove: async (k) => void map.delete(k),
    clear: async () => map.clear(),
    totalBytes: async () => [...map.values()].reduce((n, b) => n + b.size, 0),
  };
}

const DB = 'beginso-guest';
const STORE = 'blobs';

function idbBlobStore(): BlobStore {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  };
  return {
    put: async (k, b) => void (await run('readwrite', (s) => s.put(b, k))),
    get: (k) => run<Blob | undefined>('readonly', (s) => s.get(k)),
    remove: async (k) => void (await run('readwrite', (s) => s.delete(k))),
    clear: async () => void (await run('readwrite', (s) => s.clear())),
    totalBytes: async () => (await run<Blob[]>('readonly', (s) => s.getAll())).reduce((n, b) => n + b.size, 0),
  };
}

// Picks IndexedDB when it opens, otherwise memory. Decided once, on first use.
let store: BlobStore | null = null;
let ready: Promise<BlobStore> | null = null;

export function setBlobStore(s: BlobStore | null) {
  store = s;
  ready = null;
}

export function getBlobStore(): Promise<BlobStore> {
  if (store) return Promise.resolve(store);
  ready ??= (async () => {
    try {
      const s = idbBlobStore();
      await s.totalBytes(); // proves IndexedDB is usable
      store = s;
    } catch {
      store = memoryBlobStore();
    }
    return store;
  })();
  return ready;
}
