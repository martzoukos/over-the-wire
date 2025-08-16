// storage.ts
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "audio-rec";
const STORE = "recordings";

export type IDBRecording = {
  id: string;
  blobs: Blob[];
  ts: number;
};

interface AudioRecDB extends DBSchema {
  [STORE]: {
    key: string;
    value: IDBRecording; // keep a timestamp if you want ordering/metadata
    indexes: { "by-ts": number };
  };
}

let dbPromise: Promise<IDBPDatabase<AudioRecDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<AudioRecDB>(DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: false,
        });
        store.createIndex("by-ts", "ts");
      },
    });
  }
  return dbPromise;
}

export async function createRecording(id: string, blobs: Blob[]) {
  return (await db()).add(STORE, { id, blobs, ts: Date.now() });
}

export async function getRecording(
  id: string,
): Promise<IDBRecording | undefined> {
  return (await db()).get(STORE, id);
}

export async function addChunksToRecording(recordingId: string, blobs: Blob[]) {
  console.log("Adding chunks to recording", blobs, "with id: ", recordingId);
  const d = await db();
  const tx = d.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  // Get the existing recording
  const existing = await store.get(recordingId);
  if (!existing) {
    throw new Error(`Recording with id ${recordingId} not found`);
  }

  // Add the new blob to the existing blobs array
  existing.blobs.push(...blobs);

  // Save the updated recording back
  await store.put(existing);
  await tx.done;
}

export async function getAllRecordings(): Promise<IDBRecording[]> {
  const d = await db();
  const tx = d.transaction(STORE, "readonly");
  const idx = tx.store.index("by-ts");
  const out: IDBRecording[] = [];
  for await (const cursor of idx.iterate()) {
    out.push(cursor.value);
  }
  await tx.done;
  return out.reverse();
}

export async function deleteRecording(id: string) {
  const d = await db();
  const tx = d.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  // Get the existing recording
  const existing = await store.get(id);
  if (!existing) {
    throw new Error(`Recording with id ${id} not found`);
  }

  // Delete the recording
  await store.delete(id);
  await tx.done;
}

export async function clearRecordings() {
  return (await db()).clear(STORE);
}

export async function hasRecordings(): Promise<boolean> {
  return (await db()).count(STORE).then((c) => c > 0);
}
