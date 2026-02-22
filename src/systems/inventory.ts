// SWE100821: Inventory system — manages agent item stacks with capacity limits.
// Each agent has a fixed number of slots; items stack up to their stackSize.

import { getBlock, type BlockType, BlockType as BT } from '../voxel/block-registry.ts';
import type { ItemStack } from '../bridge/protocol.ts';

export const INVENTORY_SLOTS = 20;

export class Inventory {
  readonly agentId: string;
  private slots: (ItemStack | null)[];

  constructor(agentId: string, initial?: ItemStack[]) {
    this.agentId = agentId;
    this.slots = new Array(INVENTORY_SLOTS).fill(null);
    if (initial) {
      initial.forEach((item, i) => {
        if (i < INVENTORY_SLOTS) this.slots[i] = { ...item };
      });
    }
  }

  /** Try to add items. Returns count actually added. */
  addItem(blockType: BlockType, count: number): number {
    if (count <= 0 || blockType === BT.Air) return 0;
    const maxStack = getBlock(blockType).stackSize;
    if (maxStack === 0) return 0;

    let remaining = count;

    // Stack into existing slots first
    for (let i = 0; i < INVENTORY_SLOTS && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot && slot.blockType === blockType && slot.count < maxStack) {
        const add = Math.min(remaining, maxStack - slot.count);
        slot.count += add;
        remaining -= add;
      }
    }

    // Fill empty slots
    for (let i = 0; i < INVENTORY_SLOTS && remaining > 0; i++) {
      if (!this.slots[i]) {
        const add = Math.min(remaining, maxStack);
        this.slots[i] = { blockType, count: add };
        remaining -= add;
      }
    }

    return count - remaining;
  }

  /** Remove items. Returns count actually removed. */
  removeItem(blockType: BlockType, count: number): number {
    let remaining = count;

    for (let i = INVENTORY_SLOTS - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i];
      if (slot && slot.blockType === blockType) {
        const take = Math.min(remaining, slot.count);
        slot.count -= take;
        remaining -= take;
        if (slot.count <= 0) this.slots[i] = null;
      }
    }

    return count - remaining;
  }

  /** Check if agent has at least `count` of a block type. */
  hasItem(blockType: BlockType, count = 1): boolean {
    let total = 0;
    for (const slot of this.slots) {
      if (slot && slot.blockType === blockType) {
        total += slot.count;
        if (total >= count) return true;
      }
    }
    return false;
  }

  /** Count total of a block type across all slots. */
  countItem(blockType: BlockType): number {
    let total = 0;
    for (const slot of this.slots) {
      if (slot && slot.blockType === blockType) total += slot.count;
    }
    return total;
  }

  /** Get non-null stacks for serialization/display. */
  getStacks(): ItemStack[] {
    return this.slots.filter((s): s is ItemStack => s !== null);
  }

  /** Total number of occupied slots. */
  usedSlots(): number {
    return this.slots.filter(s => s !== null).length;
  }

  isFull(): boolean {
    return this.usedSlots() >= INVENTORY_SLOTS;
  }
}
