// SWE100821: Simple agent navigation — smooth lerp between zone positions.

import { Vector3 } from '@babylonjs/core';

export interface NavTarget {
  position: Vector3;
  arrived: boolean;
}

const SPEED = 3.5;

/** Move current position toward target. Returns true when arrived. */
export function stepToward(current: Vector3, target: Vector3, dt: number): boolean {
  const diff = target.subtract(current);
  diff.y = 0;
  const dist = diff.length();
  if (dist < 0.3) return true;

  const move = diff.normalize().scale(Math.min(SPEED * dt, dist));
  current.x += move.x;
  current.z += move.z;
  return false;
}

/** Face direction of movement (Y-axis rotation). */
export function faceDirection(current: Vector3, target: Vector3): number {
  const dx = target.x - current.x;
  const dz = target.z - current.z;
  return Math.atan2(dx, dz);
}
