const DB_NAME = "finca_meeting_audio_v1";
const DB_VERSION = 1;
const STORE = "pending_chunks";

function openDb() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error("Stockage local audio indisponible."));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("meetingId", "meetingId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Impossible d’ouvrir le stockage audio local."));
  });
}

function withStore(mode, callback) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;
    try { result = callback(store); } catch (error) {
      db.close();
      reject(error);
      return;
    }
    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("Erreur de stockage audio local."));
    };
    transaction.onabort = transaction.onerror;
  }));
}

export async function savePendingChunk(meetingId, seq, blob) {
  const key = `${meetingId}:${String(seq).padStart(8, "0")}`;
  await withStore("readwrite", (store) => {
    store.put({
      key,
      meetingId,
      seq,
      mimeType: blob.type || "application/octet-stream",
      size: blob.size,
      blob,
      savedAt: new Date().toISOString()
    });
  });
  return key;
}

export async function deletePendingChunk(meetingId, seq) {
  const key = `${meetingId}:${String(seq).padStart(8, "0")}`;
  await withStore("readwrite", (store) => store.delete(key));
}

export async function listPendingChunks(meetingId) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const index = transaction.objectStore(STORE).index("meetingId");
      const request = index.getAll(IDBKeyRange.only(meetingId));
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => a.seq - b.seq));
      request.onerror = () => reject(request.error || new Error("Lecture des blocs audio impossible."));
    });
  } finally {
    db.close();
  }
}

export async function pendingChunkCount(meetingId) {
  const chunks = await listPendingChunks(meetingId);
  return chunks.length;
}
