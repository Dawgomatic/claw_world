// SWE100821: Agent 3D entity — ties avatar mesh, nametag, status to scene lifecycle.
// Phase 2: agents positioned on voxel terrain using worldPos from protocol.

import { Vector3 } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle, StackPanel } from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';
import type { AgentInfo } from '../../bridge/protocol.ts';
import { buildAvatar } from '../avatar/avatar-builder.ts';
import { applyExpression } from '../avatar/expressions.ts';
import { stepToward, faceDirection } from './navigation.ts';

export interface AgentEntity {
  agentId: string;
  lifecycle: AgentInfo['lifecycle'];
  update: (dt: number, time: number) => void;
  setTarget: (x: number, y: number, z: number) => void;
  setLifecycle: (lc: AgentInfo['lifecycle'], zone: AgentInfo['zone']) => void;
  dispose: () => void;
}

export function createAgentEntity(scene: Scene, info: AgentInfo, guiTexture: AdvancedDynamicTexture): AgentEntity {
  const avatar = buildAvatar(scene, info.avatar, info.id);

  // SWE100821: spawn at worldPos from protocol (on voxel terrain surface)
  const startPos = new Vector3(
    info.worldPos?.x ?? 0,
    (info.worldPos?.y ?? 8) + 0.01,
    info.worldPos?.z ?? 0,
  );
  avatar.root.position = startPos;
  let targetPos = startPos.clone();
  let lifecycle = info.lifecycle;

  // Nametag GUI
  const nameRect = new Rectangle(`nameRect-${info.id}`);
  nameRect.width = '120px';
  nameRect.height = '40px';
  nameRect.cornerRadius = 8;
  nameRect.color = 'transparent';
  nameRect.background = 'rgba(0,0,0,0.55)';

  const stack = new StackPanel();
  nameRect.addControl(stack);

  const nameText = new TextBlock();
  nameText.text = info.name;
  nameText.color = '#e0e0e0';
  nameText.fontSize = 13;
  nameText.height = '20px';
  stack.addControl(nameText);

  const statusText = new TextBlock();
  statusText.text = lifecycle;
  statusText.color = lifecycleColor(lifecycle);
  statusText.fontSize = 11;
  statusText.height = '16px';
  stack.addControl(statusText);

  guiTexture.addControl(nameRect);
  nameRect.linkWithMesh(avatar.head);
  nameRect.linkOffsetY = -50;

  function update(dt: number, time: number) {
    const arrived = stepToward(avatar.root.position, targetPos, dt);
    if (!arrived) {
      avatar.root.rotation.y = faceDirection(avatar.root.position, targetPos);
    }
    applyExpression(avatar.body, avatar.head, avatar.eyeLeft, avatar.eyeRight, lifecycle, time);
  }

  function setTarget(x: number, y: number, z: number) {
    targetPos = new Vector3(x, y + 0.01, z);
  }

  function setLifecycle(lc: AgentInfo['lifecycle'], _zone: AgentInfo['zone']) {
    lifecycle = lc;
    statusText.text = lc;
    statusText.color = lifecycleColor(lc);
  }

  function dispose() {
    guiTexture.removeControl(nameRect);
    avatar.dispose();
  }

  return { agentId: info.id, lifecycle, update, setTarget, setLifecycle, dispose };
}

function lifecycleColor(lc: AgentInfo['lifecycle']): string {
  switch (lc) {
    case 'live': return '#6ee672';
    case 'work': return '#e6c84e';
    case 'rest': return '#7ea8e6';
  }
}
