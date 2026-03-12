// ══════════════════════════════════════════════════════════════════
// IndexedDB 儲存層 — 取代 localStorage，支援更大的資料量
// 向下相容：首次載入時自動從 localStorage 遷移資料
// ══════════════════════════════════════════════════════════════════

const DB_NAME = "bcode-db";
const DB_VERSION = 1;
const STORE_NAME = "kv";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function migrateFromLocalStorage() {
  try {
    const migrated = localStorage.getItem("bcode:__migrated_to_idb");
    if (migrated) return;

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey && fullKey.startsWith("bcode:")) {
        const key = fullKey.replace("bcode:", "");
        const value = localStorage.getItem(fullKey);
        store.put({ key, value });
      }
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });

    localStorage.setItem("bcode:__migrated_to_idb", "1");
    db.close();
  } catch {
    // Migration failed, will use localStorage as fallback
  }
}

// Initialize migration on load
migrateFromLocalStorage();

export const storage = {
  async get(key) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          db.close();
          const result = request.result;
          resolve(result ? { key, value: result.value } : null);
        };
        request.onerror = () => { db.close(); resolve(null); };
      });
    } catch {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem("bcode:" + key);
        return raw !== null ? { key, value: raw } : null;
      } catch { return null; }
    }
  },

  async set(key, value) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put({ key, value });
        tx.oncomplete = () => { db.close(); resolve({ key, value }); };
        tx.onerror = () => { db.close(); resolve(null); };
      });
    } catch {
      try {
        localStorage.setItem("bcode:" + key, value);
        return { key, value };
      } catch { return null; }
    }
  },

  async delete(key) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);
        tx.oncomplete = () => { db.close(); resolve({ key, deleted: true }); };
        tx.onerror = () => { db.close(); resolve(null); };
      });
    } catch {
      try {
        localStorage.removeItem("bcode:" + key);
        return { key, deleted: true };
      } catch { return null; }
    }
  },

  async list(prefix = "") {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAllKeys();
        request.onsuccess = () => {
          db.close();
          const keys = request.result.filter(k => k.startsWith(prefix));
          resolve({ keys });
        };
        request.onerror = () => { db.close(); resolve({ keys: [] }); };
      });
    } catch {
      // Fallback to localStorage
      try {
        const keys = [];
        const fullPrefix = "bcode:" + prefix;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(fullPrefix)) {
            keys.push(k.replace("bcode:", ""));
          }
        }
        return { keys };
      } catch { return { keys: [] }; }
    }
  },
};
