const DB_NAME = "akiha-drafts";
const STORE_NAME = "captures";
const CAPTURE_KEY = "current";

let pendingCapture: File | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function storePendingCapture(file: File) {
  pendingCapture = file;
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(file, CAPTURE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });
  database.close();
}

export async function loadPendingCapture() {
  if (pendingCapture) return pendingCapture;
  const database = await openDatabase();
  if (!database) return null;
  const file = await new Promise<File | null>((resolve) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(CAPTURE_KEY);
    request.onsuccess = () => resolve(request.result instanceof File ? request.result : null);
    request.onerror = () => resolve(null);
  });
  database.close();
  pendingCapture = file;
  return file;
}

export async function clearPendingCapture() {
  pendingCapture = null;
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(CAPTURE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });
  database.close();
}

export function takePendingCapture() {
  const capture = pendingCapture;
  pendingCapture = null;
  return capture;
}
