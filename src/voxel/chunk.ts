// SWE100821: Chunk data structure — 16x16x16 voxel grid stored as flat Uint8Array.
// Each chunk is the atomic unit of the world. Addressed by chunk coordinates (cx, cy, cz).

import { BlockType } from './block-registry.ts';

export const CHUNK_SIZE = 16;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;

export interface ChunkCoord {
  cx: number;
  cy: number;
  cz: number;
}

export function chunkKey(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`;
}

export function keyToCoord(key: string): ChunkCoord {
  const [cx, cy, cz] = key.split(',').map(Number);
  return { cx, cy, cz };
}

/** Convert world block position to chunk coord + local offset. */
export function worldToChunk(wx: number, wy: number, wz: number): { chunk: ChunkCoord; local: [number, number, number] } {
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cy = Math.floor(wy / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  return { chunk: { cx, cy, cz }, local: [lx, ly, lz] };
}

/** Index into flat array from local x,y,z. */
function idx(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
}

export class Chunk {
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
  readonly blocks: Uint8Array;
  dirty = true;

  constructor(cx: number, cy: number, cz: number, data?: Uint8Array) {
    this.cx = cx;
    this.cy = cy;
    this.cz = cz;
    this.blocks = data ?? new Uint8Array(CHUNK_VOLUME);
  }

  get(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) {
      return BlockType.Air;
    }
    return this.blocks[idx(x, y, z)] as BlockType;
  }

  set(x: number, y: number, z: number, type: BlockType): void {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) return;
    this.blocks[idx(x, y, z)] = type;
    this.dirty = true;
  }

  fill(type: BlockType): void {
    this.blocks.fill(type);
    this.dirty = true;
  }

  isEmpty(): boolean {
    for (let i = 0; i < CHUNK_VOLUME; i++) {
      if (this.blocks[i] !== BlockType.Air) return false;
    }
    return true;
  }

  /** Serialize for persistence. */
  serialize(): ArrayBuffer {
    const copy = new Uint8Array(this.blocks.length);
    copy.set(this.blocks);
    return copy.buffer as ArrayBuffer;
  }

  static deserialize(cx: number, cy: number, cz: number, buf: ArrayBuffer): Chunk {
    return new Chunk(cx, cy, cz, new Uint8Array(buf));
  }
}
