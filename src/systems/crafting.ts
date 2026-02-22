// SWE100821: Crafting system — recipes that convert input items to output items.
// Agents craft at workbenches. Recipes are checked against inventory.

import { BlockType as BT, type BlockType } from '../voxel/block-registry.ts';
import { Inventory } from './inventory.ts';

export interface Recipe {
  id: string;
  name: string;
  inputs: { blockType: number; count: number }[];
  output: { blockType: number; count: number };
  requiresWorkbench: boolean;
}

export const RECIPES: Recipe[] = [
  {
    id: 'planks',
    name: 'Planks',
    inputs: [{ blockType: BT.Wood, count: 1 }],
    output: { blockType: BT.Planks, count: 4 },
    requiresWorkbench: false,
  },
  {
    id: 'workbench',
    name: 'Workbench',
    inputs: [{ blockType: BT.Planks, count: 4 }],
    output: { blockType: BT.Workbench, count: 1 },
    requiresWorkbench: false,
  },
  {
    id: 'furnace',
    name: 'Furnace',
    inputs: [{ blockType: BT.Cobblestone, count: 8 }],
    output: { blockType: BT.Furnace, count: 1 },
    requiresWorkbench: true,
  },
  {
    id: 'chest',
    name: 'Chest',
    inputs: [{ blockType: BT.Planks, count: 8 }],
    output: { blockType: BT.Chest, count: 1 },
    requiresWorkbench: true,
  },
  {
    id: 'brick',
    name: 'Brick',
    inputs: [{ blockType: BT.Stone, count: 4 }],
    output: { blockType: BT.Brick, count: 4 },
    requiresWorkbench: true,
  },
  {
    id: 'glass',
    name: 'Glass',
    inputs: [{ blockType: BT.Sand, count: 1 }],
    output: { blockType: BT.Glass, count: 1 },
    requiresWorkbench: true,
  },
  {
    id: 'torch',
    name: 'Torch',
    inputs: [{ blockType: BT.Wood, count: 1 }, { blockType: BT.Cobblestone, count: 1 }],
    output: { blockType: BT.Torch, count: 4 },
    requiresWorkbench: false,
  },
  {
    id: 'wool',
    name: 'Wool',
    inputs: [{ blockType: BT.Leaves, count: 4 }],
    output: { blockType: BT.Wool, count: 1 },
    requiresWorkbench: true,
  },
];

/** Check if agent can craft a recipe. */
export function canCraft(inventory: Inventory, recipe: Recipe): boolean {
  return recipe.inputs.every(inp => inventory.hasItem(inp.blockType as BlockType, inp.count));
}

/** Execute a craft. Removes inputs, adds output. Returns true on success. */
export function executeCraft(inventory: Inventory, recipe: Recipe): boolean {
  if (!canCraft(inventory, recipe)) return false;

  for (const inp of recipe.inputs) {
    inventory.removeItem(inp.blockType as BlockType, inp.count);
  }
  inventory.addItem(recipe.output.blockType as BlockType, recipe.output.count);
  return true;
}

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find(r => r.id === id);
}
