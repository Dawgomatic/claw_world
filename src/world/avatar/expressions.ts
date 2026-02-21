// SWE100821: Avatar expression animations — maps lifecycle state to visual cues.

import { Vector3 } from '@babylonjs/core';
import type { Mesh } from '@babylonjs/core';
import type { AgentLifecycle } from '../../bridge/protocol.ts';

export interface ExpressionState {
  bodyBob: number;
  headTilt: number;
  eyeScale: number;
}

const EXPRESSIONS: Record<AgentLifecycle, ExpressionState> = {
  live: { bodyBob: 0.08, headTilt: 0, eyeScale: 1 },
  work: { bodyBob: 0.03, headTilt: -0.1, eyeScale: 0.85 },
  rest: { bodyBob: 0.02, headTilt: 0.15, eyeScale: 0.6 },
};

/** Animate avatar meshes based on lifecycle state. Called each frame. */
export function applyExpression(
  body: Mesh,
  head: Mesh,
  eyeL: Mesh,
  eyeR: Mesh,
  lifecycle: AgentLifecycle,
  time: number,
): void {
  const expr = EXPRESSIONS[lifecycle];
  const bobY = Math.sin(time * 2) * expr.bodyBob;
  body.position.y = 1.0 + bobY;
  head.position.y = 2.3 + bobY;
  head.rotation.z = Math.sin(time * 0.8) * expr.headTilt;

  const ey = 2.45 + bobY;
  eyeL.position.y = ey;
  eyeR.position.y = ey;
  eyeL.scaling = new Vector3(expr.eyeScale, expr.eyeScale, expr.eyeScale);
  eyeR.scaling = eyeL.scaling.clone();
}
