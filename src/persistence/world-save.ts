// SWE100821: IndexedDB world persistence — save/load voxel chunks, agent state, time.
// Uses a single IDB database with object stores for chunks, agents, and world metadata.

import type { AgentNeeds, ItemStack } from '../bridge/protocol.ts';
import { chunkKey, keyToCoord, type ChunkCoord } from '../voxel/chunk.ts';

const DB_NAME = 'claw_world';
const DB_VERSION = 1;

interface WorldMeta {
  seed: number;
  elapsed: number;
  dayCount: number;
  savedAt: number;
}

interface SavedAgent {
  id: string;
  name: string;
  inventory: ItemStack[];
  needs: AgentNeeds;
  worldX: number;
  worldY: number;
  worldZ: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('chunks')) {
        db.createObjectStore('chunks');
      }
      if (!db.objectStoreNames.contains('agents')) {
        db.createObjectStore('agents', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Save a chunk's block data. */
export async function saveChunk(cx: number, cy: number, cz: number, data: ArrayBuffer): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('chunks', 'readwrite');
  tx.objectStore('chunks').put(data, chunkKey(cx, cy, cz));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Load a chunk's block data. Returns null if not saved. */
export async function loadChunk(cx: number, cy: number, cz: number): Promise<ArrayBuffer | null> {
  const db = await openDB();
  const tx = db.transaction('chunks', 'readonly');
  const req = tx.objectStore('chunks').get(chunkKey(cx, cy, cz));
  return new Promise((resolve, reject) => {
    req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Save all loaded chunks in batch. */
export async function saveAllChunks(chunks: Map<string, { cx: number; cy: number; cz: number; blocks: Uint8Array }>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('chunks', 'readwrite');
  const store = tx.objectStore('chunks');
  for (const [key, chunk] of chunks) {
    store.put(chunk.blocks.buffer.slice(0), key);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Load all saved chunk keys. */
export async function listSavedChunks(): Promise<ChunkCoord[]> {
  const db = await openDB();
  const tx = db.transaction('chunks', 'readonly');
  const req = tx.objectStore('chunks').getAllKeys();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      db.close();
      resolve((req.result as string[]).map(k => keyToCoord(k)));
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Save agent state. */
export async function saveAgent(agent: SavedAgent): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('agents', 'readwrite');
  tx.objectStore('agents').put(agent);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Load all saved agents. */
export async function loadAgents(): Promise<SavedAgent[]> {
  const db = await openDB();
  const tx = db.transaction('agents', 'readonly');
  const req = tx.objectStore('agents').getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => { db.close(); resolve(req.result ?? []); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Save world metadata (seed, time). */
export async function saveWorldMeta(meta: WorldMeta): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('meta', 'readwrite');
  tx.objectStore('meta').put(meta, 'world');
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Load world metadata. */
export async function loadWorldMeta(): Promise<WorldMeta | null> {
  const db = await openDB();
  const tx = db.transaction('meta', 'readonly');
  const req = tx.objectStore('meta').get('world');
  return new Promise((resolve, reject) => {
    req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Clear all saved data (new world). */
export async function clearWorld(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(['chunks', 'agents', 'meta'], 'readwrite');
  tx.objectStore('chunks').clear();
  tx.objectStore('agents').clear();
  tx.objectStore('meta').clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
