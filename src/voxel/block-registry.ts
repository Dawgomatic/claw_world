// SWE100821: Block registry — defines all block types, their properties, and colors.
// Foundation of the voxel world. Every placeable/removable unit is a block.

import { Color3 } from '@babylonjs/core';

export const BlockType = {
  Air: 0,
  Stone: 1,
  Dirt: 2,
  Grass: 3,
  Wood: 4,
  Leaves: 5,
  Sand: 6,
  Water: 7,
  Glass: 8,
  Brick: 9,
  Iron: 10,
  Gold: 11,
  Diamond: 12,
  Planks: 13,
  Cobblestone: 14,
  Wool: 15,
  Torch: 16,
  Workbench: 17,
  Furnace: 18,
  Chest: 19,
} as const;

export type BlockType = (typeof BlockType)[keyof typeof BlockType];

export interface BlockDef {
  id: BlockType;
  name: string;
  solid: boolean;
  transparent: boolean;
  hardness: number;
  color: Color3;
  topColor?: Color3;
  emissive?: Color3;
  lightLevel: number;
  stackSize: number;
  breakTime: number;
  dropsItem: BlockType | null;
}

// SWE100821: Block definitions — color-based rendering (no texture atlas needed yet)
const DEFS: BlockDef[] = [
  { id: BlockType.Air,         name: 'Air',         solid: false, transparent: true,  hardness: 0,   color: new Color3(0, 0, 0),           lightLevel: 0,  stackSize: 0,   breakTime: 0,    dropsItem: null },
  { id: BlockType.Stone,       name: 'Stone',       solid: true,  transparent: false, hardness: 5,   color: new Color3(0.5, 0.5, 0.5),     lightLevel: 0,  stackSize: 64,  breakTime: 1.5,  dropsItem: BlockType.Cobblestone },
  { id: BlockType.Dirt,        name: 'Dirt',        solid: true,  transparent: false, hardness: 2,   color: new Color3(0.45, 0.3, 0.18),   lightLevel: 0,  stackSize: 64,  breakTime: 0.5,  dropsItem: BlockType.Dirt },
  { id: BlockType.Grass,       name: 'Grass',       solid: true,  transparent: false, hardness: 2,   color: new Color3(0.35, 0.25, 0.15),  topColor: new Color3(0.25, 0.55, 0.2), lightLevel: 0,  stackSize: 64,  breakTime: 0.6,  dropsItem: BlockType.Dirt },
  { id: BlockType.Wood,        name: 'Wood',        solid: true,  transparent: false, hardness: 3,   color: new Color3(0.4, 0.28, 0.12),   lightLevel: 0,  stackSize: 64,  breakTime: 1.0,  dropsItem: BlockType.Wood },
  { id: BlockType.Leaves,      name: 'Leaves',      solid: true,  transparent: true,  hardness: 1,   color: new Color3(0.15, 0.45, 0.12),  lightLevel: 0,  stackSize: 64,  breakTime: 0.3,  dropsItem: null },
  { id: BlockType.Sand,        name: 'Sand',        solid: true,  transparent: false, hardness: 2,   color: new Color3(0.85, 0.78, 0.55),  lightLevel: 0,  stackSize: 64,  breakTime: 0.5,  dropsItem: BlockType.Sand },
  { id: BlockType.Water,       name: 'Water',       solid: false, transparent: true,  hardness: 0,   color: new Color3(0.15, 0.3, 0.7),    lightLevel: 0,  stackSize: 0,   breakTime: 0,    dropsItem: null },
  { id: BlockType.Glass,       name: 'Glass',       solid: true,  transparent: true,  hardness: 1,   color: new Color3(0.8, 0.85, 0.9),    lightLevel: 0,  stackSize: 64,  breakTime: 0.3,  dropsItem: null },
  { id: BlockType.Brick,       name: 'Brick',       solid: true,  transparent: false, hardness: 6,   color: new Color3(0.6, 0.25, 0.18),   lightLevel: 0,  stackSize: 64,  breakTime: 2.0,  dropsItem: BlockType.Brick },
  { id: BlockType.Iron,        name: 'Iron Ore',    solid: true,  transparent: false, hardness: 8,   color: new Color3(0.55, 0.5, 0.45),   lightLevel: 0,  stackSize: 64,  breakTime: 3.0,  dropsItem: BlockType.Iron },
  { id: BlockType.Gold,        name: 'Gold Ore',    solid: true,  transparent: false, hardness: 8,   color: new Color3(0.75, 0.65, 0.2),   lightLevel: 0,  stackSize: 64,  breakTime: 3.0,  dropsItem: BlockType.Gold },
  { id: BlockType.Diamond,     name: 'Diamond Ore', solid: true,  transparent: false, hardness: 10,  color: new Color3(0.3, 0.75, 0.8),    lightLevel: 1,  stackSize: 64,  breakTime: 5.0,  dropsItem: BlockType.Diamond },
  { id: BlockType.Planks,      name: 'Planks',      solid: true,  transparent: false, hardness: 3,   color: new Color3(0.6, 0.45, 0.22),   lightLevel: 0,  stackSize: 64,  breakTime: 0.8,  dropsItem: BlockType.Planks },
  { id: BlockType.Cobblestone, name: 'Cobblestone', solid: true,  transparent: false, hardness: 6,   color: new Color3(0.4, 0.4, 0.4),     lightLevel: 0,  stackSize: 64,  breakTime: 1.5,  dropsItem: BlockType.Cobblestone },
  { id: BlockType.Wool,        name: 'Wool',        solid: true,  transparent: false, hardness: 1,   color: new Color3(0.9, 0.9, 0.88),    lightLevel: 0,  stackSize: 64,  breakTime: 0.3,  dropsItem: BlockType.Wool },
  { id: BlockType.Torch,       name: 'Torch',       solid: false, transparent: true,  hardness: 0,   color: new Color3(0.9, 0.7, 0.2),     emissive: new Color3(0.9, 0.6, 0.1), lightLevel: 14, stackSize: 64,  breakTime: 0.1,  dropsItem: BlockType.Torch },
  { id: BlockType.Workbench,   name: 'Workbench',   solid: true,  transparent: false, hardness: 3,   color: new Color3(0.55, 0.38, 0.15),  topColor: new Color3(0.5, 0.35, 0.2), lightLevel: 0,  stackSize: 1,   breakTime: 1.0,  dropsItem: BlockType.Workbench },
  { id: BlockType.Furnace,     name: 'Furnace',     solid: true,  transparent: false, hardness: 5,   color: new Color3(0.45, 0.45, 0.45),  lightLevel: 3,  stackSize: 1,   breakTime: 2.0,  dropsItem: BlockType.Furnace },
  { id: BlockType.Chest,       name: 'Chest',       solid: true,  transparent: false, hardness: 3,   color: new Color3(0.5, 0.35, 0.1),    lightLevel: 0,  stackSize: 1,   breakTime: 1.0,  dropsItem: BlockType.Chest },
];

const REGISTRY = new Map<BlockType, BlockDef>();
DEFS.forEach(d => REGISTRY.set(d.id, d));

export function getBlock(type: BlockType): BlockDef {
  return REGISTRY.get(type) ?? DEFS[0];
}

export function isOpaque(type: BlockType): boolean {
  const def = REGISTRY.get(type);
  return def ? def.solid && !def.transparent : false;
}

export function allBlockTypes(): BlockDef[] {
  return DEFS.filter(d => d.id !== BlockType.Air);
}

export const BLOCK_COUNT = DEFS.length;
