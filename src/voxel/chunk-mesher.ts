// SWE100821: Chunk mesh generator — builds optimized Babylon.js mesh from chunk block data.
// Only renders exposed faces (faces adjacent to air/transparent blocks).
// Uses per-face coloring from block registry. Greedy meshing candidate for future optimization.

import {
  Mesh,
  VertexData,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import { type BlockType, getBlock, isOpaque, BlockType as BT } from './block-registry.ts';
import { Chunk, CHUNK_SIZE } from './chunk.ts';

type GetNeighborBlock = (wx: number, wy: number, wz: number) => BlockType;

// 6 face directions: +x, -x, +y, -y, +z, -z
const FACES: { dir: [number, number, number]; verts: [number, number, number][]; normal: [number, number, number] }[] = [
  { dir: [1, 0, 0],  normal: [1, 0, 0],  verts: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { dir: [-1, 0, 0], normal: [-1, 0, 0], verts: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { dir: [0, 1, 0],  normal: [0, 1, 0],  verts: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { dir: [0, -1, 0], normal: [0, -1, 0], verts: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { dir: [0, 0, 1],  normal: [0, 0, 1],  verts: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },
  { dir: [0, 0, -1], normal: [0, 0, -1], verts: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] },
];

/**
 * Generate a Babylon.js mesh from chunk data.
 * getNeighborBlock resolves blocks outside chunk boundaries (cross-chunk faces).
 */
export function meshChunk(
  scene: Scene,
  chunk: Chunk,
  getNeighborBlock: GetNeighborBlock,
  existingMesh?: Mesh,
): Mesh | null {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let vertCount = 0;

  const worldX = chunk.cx * CHUNK_SIZE;
  const worldY = chunk.cy * CHUNK_SIZE;
  const worldZ = chunk.cz * CHUNK_SIZE;

  for (let z = 0; z < CHUNK_SIZE; z++) {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const blockType = chunk.get(x, y, z);
        if (blockType === BT.Air) continue;

        const def = getBlock(blockType);
        if (!def.solid && blockType !== BT.Water) continue;

        for (let fi = 0; fi < 6; fi++) {
          const face = FACES[fi];
          const nx = x + face.dir[0];
          const ny = y + face.dir[1];
          const nz = z + face.dir[2];

          let neighborType: BlockType;
          if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE) {
            neighborType = chunk.get(nx, ny, nz);
          } else {
            neighborType = getNeighborBlock(worldX + nx, worldY + ny, worldZ + nz);
          }

          if (isOpaque(neighborType) && neighborType !== BT.Water) continue;
          if (blockType === BT.Water && neighborType === BT.Water) continue;

          // Use topColor for top face of grass/workbench
          const isTopFace = face.dir[1] === 1;
          const faceColor = (isTopFace && def.topColor) ? def.topColor : def.color;

          for (const vert of face.verts) {
            positions.push(worldX + x + vert[0], worldY + y + vert[1], worldZ + z + vert[2]);
            normals.push(face.normal[0], face.normal[1], face.normal[2]);
            colors.push(faceColor.r, faceColor.g, faceColor.b, def.transparent ? 0.6 : 1.0);
          }

          indices.push(vertCount, vertCount + 1, vertCount + 2);
          indices.push(vertCount, vertCount + 2, vertCount + 3);
          vertCount += 4;
        }
      }
    }
  }

  if (positions.length === 0) {
    if (existingMesh) existingMesh.dispose();
    return null;
  }

  const mesh = existingMesh ?? new Mesh(`chunk-${chunk.cx}_${chunk.cy}_${chunk.cz}`, scene);

  const vertexData = new VertexData();
  vertexData.positions = new Float32Array(positions);
  vertexData.normals = new Float32Array(normals);
  vertexData.colors = new Float32Array(colors);
  vertexData.indices = new Uint32Array(indices);
  vertexData.applyToMesh(mesh, true);

  if (!mesh.material) {
    const mat = new StandardMaterial(`chunkMat-${chunk.cx}_${chunk.cy}_${chunk.cz}`, scene);
    mat.specularColor = new Color3(0.1, 0.1, 0.1);
    mat.backFaceCulling = true;
    mesh.material = mat;
    mesh.hasVertexAlpha = true;
  }

  return mesh;
}
