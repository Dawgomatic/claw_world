// SWE100821: Chunk manager — loads/unloads chunks, manages world grid, coordinates meshing.
// Central authority for all voxel world data. Handles cross-chunk block queries.

import type { Scene } from '@babylonjs/core';
import type { Mesh } from '@babylonjs/core';
import { Chunk, CHUNK_SIZE, chunkKey, worldToChunk } from './chunk.ts';
import { BlockType } from './block-registry.ts';
import { meshChunk } from './chunk-mesher.ts';
import { generateChunkTerrain } from './terrain-gen.ts';

export interface WorldConfig {
  seed: number;
  renderDistance: number;
  worldHeightChunks: number;
}

const DEFAULT_CONFIG: WorldConfig = {
  seed: 42,
  renderDistance: 3,
  worldHeightChunks: 2,
};

export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private meshes = new Map<string, Mesh>();
  private scene: Scene;
  private config: WorldConfig;

  constructor(scene: Scene, config: Partial<WorldConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Load/generate all chunks within render distance of center. */
  loadAround(centerX: number, centerZ: number): void {
    const { chunk: center } = worldToChunk(Math.floor(centerX), 0, Math.floor(centerZ));
    const rd = this.config.renderDistance;

    const needed = new Set<string>();

    for (let cx = center.cx - rd; cx <= center.cx + rd; cx++) {
      for (let cz = center.cz - rd; cz <= center.cz + rd; cz++) {
        for (let cy = 0; cy < this.config.worldHeightChunks; cy++) {
          const key = chunkKey(cx, cy, cz);
          needed.add(key);

          if (!this.chunks.has(key)) {
            const chunk = new Chunk(cx, cy, cz);
            generateChunkTerrain(chunk, this.config.seed);
            this.chunks.set(key, chunk);
          }
        }
      }
    }

    // Unload distant chunks
    for (const [key] of this.chunks) {
      if (!needed.has(key)) {
        this.chunks.delete(key);
        const mesh = this.meshes.get(key);
        if (mesh) {
          mesh.dispose();
          this.meshes.delete(key);
        }
      }
    }

    // Mesh dirty chunks
    this.remeshDirty();
  }

  /** Rebuild meshes for all dirty chunks. */
  private remeshDirty(): void {
    for (const [key, chunk] of this.chunks) {
      if (!chunk.dirty) continue;

      const existing = this.meshes.get(key);
      const mesh = meshChunk(this.scene, chunk, (wx, wy, wz) => this.getBlock(wx, wy, wz), existing ?? undefined);

      if (mesh) {
        this.meshes.set(key, mesh);
      } else if (existing) {
        existing.dispose();
        this.meshes.delete(key);
      }
      chunk.dirty = false;
    }
  }

  /** Get block at world position. */
  getBlock(wx: number, wy: number, wz: number): BlockType {
    const { chunk: cc, local } = worldToChunk(wx, wy, wz);
    const key = chunkKey(cc.cx, cc.cy, cc.cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return BlockType.Air;
    return chunk.get(local[0], local[1], local[2]);
  }

  /** Set block at world position. Marks chunk dirty for remesh. */
  setBlock(wx: number, wy: number, wz: number, type: BlockType): boolean {
    const { chunk: cc, local } = worldToChunk(wx, wy, wz);
    const key = chunkKey(cc.cx, cc.cy, cc.cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return false;

    chunk.set(local[0], local[1], local[2], type);

    // Also mark neighbor chunks dirty if on boundary
    if (local[0] === 0) this.markDirty(cc.cx - 1, cc.cy, cc.cz);
    if (local[0] === CHUNK_SIZE - 1) this.markDirty(cc.cx + 1, cc.cy, cc.cz);
    if (local[1] === 0) this.markDirty(cc.cx, cc.cy - 1, cc.cz);
    if (local[1] === CHUNK_SIZE - 1) this.markDirty(cc.cx, cc.cy + 1, cc.cz);
    if (local[2] === 0) this.markDirty(cc.cx, cc.cy, cc.cz - 1);
    if (local[2] === CHUNK_SIZE - 1) this.markDirty(cc.cx, cc.cy, cc.cz + 1);

    this.remeshDirty();
    return true;
  }

  /** Place a block if target is air. Returns true on success. */
  placeBlock(wx: number, wy: number, wz: number, type: BlockType): boolean {
    if (this.getBlock(wx, wy, wz) !== BlockType.Air) return false;
    return this.setBlock(wx, wy, wz, type);
  }

  /** Remove a block (set to air). Returns removed block type, or null if already air. */
  removeBlock(wx: number, wy: number, wz: number): BlockType | null {
    const current = this.getBlock(wx, wy, wz);
    if (current === BlockType.Air) return null;
    this.setBlock(wx, wy, wz, BlockType.Air);
    return current;
  }

  /** Get surface Y at world x,z (highest non-air block). */
  getSurfaceY(wx: number, wz: number): number {
    const maxY = this.config.worldHeightChunks * CHUNK_SIZE - 1;
    for (let y = maxY; y >= 0; y--) {
      if (this.getBlock(wx, y, wz) !== BlockType.Air) return y + 1;
    }
    return 0;
  }

  /** Get all loaded chunk keys (for persistence). */
  getLoadedChunks(): Map<string, Chunk> {
    return this.chunks;
  }

  /** Load a chunk from persistence (replaces generated terrain). */
  loadChunk(cx: number, cy: number, cz: number, data: ArrayBuffer): void {
    const key = chunkKey(cx, cy, cz);
    const chunk = Chunk.deserialize(cx, cy, cz, data);
    this.chunks.set(key, chunk);
  }

  private markDirty(cx: number, cy: number, cz: number): void {
    const chunk = this.chunks.get(chunkKey(cx, cy, cz));
    if (chunk) chunk.dirty = true;
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) mesh.dispose();
    this.meshes.clear();
    this.chunks.clear();
  }
}
