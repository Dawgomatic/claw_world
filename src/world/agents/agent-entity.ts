// SWE100821: Agent 3D entity — ties avatar mesh, nametag, status to scene lifecycle.

import { Vector3 } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle, StackPanel } from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';
import type { AgentInfo } from '../../bridge/protocol.ts';
import type { AvatarMeshGroup } from '../avatar/avatar-builder.ts';
import { buildAvatar } from '../avatar/avatar-builder.ts';
import { applyExpression } from '../avatar/expressions.ts';
import { randomPointInZone } from '../scene/zones.ts';
import { stepToward, faceDirection } from './navigation.ts';

export interface AgentEntity {
  agentId: string;
  avatar: AvatarMeshGroup;
  targetPos: Vector3;
  lifecycle: AgentInfo['lifecycle'];
  update: (dt: number, time: number) => void;
  moveTo: (zone: AgentInfo['zone']) => void;
  setLifecycle: (lc: AgentInfo['lifecycle'], zone: AgentInfo['zone']) => void;
  dispose: () => void;
}

export function createAgentEntity(scene: Scene, info: AgentInfo, guiTexture: AdvancedDynamicTexture): AgentEntity {
  const avatar = buildAvatar(scene, info.avatar, info.id);
  const startPos = randomPointInZone(info.zone);
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

  function moveTo(zone: AgentInfo['zone']) {
    targetPos = randomPointInZone(zone);
  }

  function setLifecycle(lc: AgentInfo['lifecycle'], zone: AgentInfo['zone']) {
    lifecycle = lc;
    statusText.text = lc;
    statusText.color = lifecycleColor(lc);
    moveTo(zone);
  }

  function dispose() {
    guiTexture.removeControl(nameRect);
    avatar.dispose();
  }

  return { agentId: info.id, avatar, targetPos, lifecycle, update, moveTo, setLifecycle, dispose };
}

function lifecycleColor(lc: AgentInfo['lifecycle']): string {
  switch (lc) {
    case 'live': return '#6ee672';
    case 'work': return '#e6c84e';
    case 'rest': return '#7ea8e6';
  }
}
