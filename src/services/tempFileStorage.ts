/**
 * Client-Side Temporary File Storage (IndexedDB Sandbox)
 * 
 * 🔒 PRIVACY GUARANTEE:
 * Files are NEVER sent to or stored in any database.
 * Files are stored purely in the user's device temporary storage (IndexedDB)
 * and are automatically cleared or manually purged by the user.
 */

export interface TempFileRecord {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  data: string; // Base64 payload
  kind: 'image' | 'file';
  conversationId?: string | null;
  createdAt: number;
  expiresAt: number;
}

export interface TempAttachment {
  id: string;
  data: string;
  mimeType: string;
  name: string;
  kind: 'image' | 'file';
  sizeBytes?: number;
}

const DB_NAME = 'cosmo_device_temp_vault';
const STORE_NAME = 'temp_files';
const DB_VERSION = 1;
const DEFAULT_RETENTION_HOURS = 24;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('conversationId', 'conversationId', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }

  return dbPromise;
}

/**
 * Save attachment to temporary device storage.
 * Automatically sets expiration for 24 hours.
 */
export async function saveTempAttachment(
  attachment: { data: string; mimeType: string; name: string; kind: 'image' | 'file'; sizeBytes?: number },
  conversationId?: string | null
): Promise<string> {
  try {
    const db = await getDB();
    const id = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();
    const expiresAt = now + DEFAULT_RETENTION_HOURS * 60 * 60 * 1000;

    const record: TempFileRecord = {
      id,
      name: attachment.name,
      size: attachment.sizeBytes || Math.round((attachment.data.length * 3) / 4),
      mimeType: attachment.mimeType,
      data: attachment.data,
      kind: attachment.kind,
      conversationId: conversationId || null,
      createdAt: now,
      expiresAt,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve(id);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Temporary storage fallback to in-memory ID:', err);
    return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
}

/**
 * Get attachment from temporary device storage by ID.
 */
export async function getTempAttachment(id: string): Promise<TempAttachment | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const record = req.result as TempFileRecord | undefined;
        if (!record) {
          resolve(null);
          return;
        }
        resolve({
          id: record.id,
          data: record.data,
          mimeType: record.mimeType,
          name: record.name,
          kind: record.kind,
          sizeBytes: record.size,
        });
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Delete a specific temporary file from device storage.
 */
export async function deleteTempAttachment(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

/**
 * Purge all expired temporary files (run on startup).
 */
export async function cleanExpiredTempFiles(): Promise<number> {
  try {
    const db = await getDB();
    const now = Date.now();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
      const req = index.openCursor(range);
      let deletedCount = 0;

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cursor) {
          cursor.delete();
          deletedCount += 1;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

/**
 * Retrieve total temporary files count and aggregate size on user device.
 */
export async function getTempStorageStats(): Promise<{ count: number; totalBytes: number }> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      let count = 0;
      let totalBytes = 0;

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
        if (cursor) {
          count += 1;
          const val = cursor.value as TempFileRecord;
          totalBytes += val.size || 0;
          cursor.continue();
        } else {
          resolve({ count, totalBytes });
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return { count: 0, totalBytes: 0 };
  }
}

/**
 * Wipe all temporary files from device storage.
 */
export async function clearAllTempFiles(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
