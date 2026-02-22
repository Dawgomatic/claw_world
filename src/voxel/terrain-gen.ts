// SWE100821: Procedural terrain generator — creates natural-looking landscape.
// Simple noise-based heightmap with biome zones matching the existing zone layout.

import { Chunk, CHUNK_SIZE } from './chunk.ts';
import { BlockType } from './block-registry.ts';

/** Simple seeded pseudo-random for deterministic terrain. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** 2D value noise for heightmap. */
function noise2d(x: number, z: number, seed: number): number {
  const rng = seededRandom(Math.floor(x * 73856093) ^ Math.floor(z * 19349663) ^ seed);
  return rng();
}

function smoothNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;

  const v00 = noise2d(ix, iz, seed);
  const v10 = noise2d(ix + 1, iz, seed);
  const v01 = noise2d(ix, iz + 1, seed);
  const v11 = noise2d(ix + 1, iz + 1, seed);

  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);

  return (v00 * (1 - sx) + v10 * sx) * (1 - sz) + (v01 * (1 - sx) + v11 * sx) * sz;
}

function fbm(x: number, z: number, seed: number, octaves: number): number {
  let val = 0;
  let amp = 1;
  let freq = 1;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, z * freq, seed + i * 1000) * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val / maxAmp;
}

/** Height at world x,z. Returns block Y (integer). */
export function terrainHeight(wx: number, wz: number, seed = 42): number {
  const baseHeight = 4;
  const hillHeight = 8;
  const h = fbm(wx * 0.04, wz * 0.04, seed, 4);
  return baseHeight + Math.floor(h * hillHeight);
}

/** Generate terrain for a chunk. */
export function generateChunkTerrain(chunk: Chunk, seed = 42): void {
  const worldX = chunk.cx * CHUNK_SIZE;
  const worldY = chunk.cy * CHUNK_SIZE;
  const worldZ = chunk.cz * CHUNK_SIZE;

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = worldX + lx;
      const wz = worldZ + lz;
      const surfaceY = terrainHeight(wx, wz, seed);

      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const wy = worldY + ly;

        if (wy > surfaceY) {
          // Water fills up to Y=3
          if (wy <= 3) {
            chunk.set(lx, ly, lz, BlockType.Water);
          }
          continue;
        }

        if (wy === surfaceY) {
          if (surfaceY <= 3) {
            chunk.set(lx, ly, lz, BlockType.Sand);
          } else {
            chunk.set(lx, ly, lz, BlockType.Grass);
          }
        } else if (wy >= surfaceY - 3) {
          chunk.set(lx, ly, lz, BlockType.Dirt);
        } else if (wy >= 1) {
          chunk.set(lx, ly, lz, BlockType.Stone);
        } else {
          chunk.set(lx, ly, lz, BlockType.Stone);
        }

        // Ore veins in deep stone
        if (wy < surfaceY - 5 && chunk.get(lx, ly, lz) === BlockType.Stone) {
          const oreNoise = noise2d(wx * 7.1 + wy * 3.3, wz * 7.1, seed + 500);
          if (oreNoise > 0.92) chunk.set(lx, ly, lz, BlockType.Iron);
          else if (oreNoise > 0.96) chunk.set(lx, ly, lz, BlockType.Gold);
          else if (oreNoise > 0.985) chunk.set(lx, ly, lz, BlockType.Diamond);
        }
      }

      // Trees on grass above water level
      if (surfaceY > 4 && surfaceY < worldY + CHUNK_SIZE) {
        const treeNoise = noise2d(wx * 13.7, wz * 13.7, seed + 200);
        if (treeNoise > 0.82) {
          placeTree(chunk, lx, surfaceY - worldY + 1, lz);
        }
      }
    }
  }
}

function placeTree(chunk: Chunk, lx: number, baseY: number, lz: number): void {
  const trunkHeight = 4 + Math.floor(noise2d(lx, lz, 777) * 3);

  for (let y = 0; y < trunkHeight; y++) {
    chunk.set(lx, baseY + y, lz, BlockType.Wood);
  }

  // Leaf canopy
  const leafBase = baseY + trunkHeight - 1;
  for (let dy = 0; dy < 3; dy++) {
    const r = dy === 2 ? 1 : 2;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && dy < 2) continue;
        const nx = lx + dx;
        const nz = lz + dz;
        const ny = leafBase + dy;
        if (nx >= 0 && nx < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE && ny >= 0 && ny < CHUNK_SIZE) {
          if (chunk.get(nx, ny, nz) === BlockType.Air) {
            chunk.set(nx, ny, nz, BlockType.Leaves);
          }
        }
      }
    }
  }
}
