// SWE100821: Server-side world state — tracks agents, modified blocks, and broadcasts changes.
// The server is authoritative for block placement. Terrain is generated client-side from seed.

import type { AgentWire, AvatarWire } from './protocol.js';

interface BlockChange {
  x: number;
  y: number;
  z: number;
  blockType: number;
  agentId: string;
  ts: number;
}

export interface ConnectedAgent {
  id: string;
  name: string;
  lifecycle: 'live' | 'work' | 'rest';
  x: number;
  y: number;
  z: number;
  avatar: AvatarWire;
  moltbookKarma?: number;
  moltbookVerified?: boolean;
  joinedAt: number;
}

export class WorldState {
  private agents = new Map<string, ConnectedAgent>();
  private blockChanges: BlockChange[] = [];
  readonly seed: number;
  private startTime = Date.now();

  constructor(seed: number) {
    this.seed = seed;
  }

  addAgent(agent: ConnectedAgent): void {
    this.agents.set(agent.id, agent);
    console.log(`[world] Agent joined: ${agent.name} (${agent.id}) — ${this.agents.size} total`);
  }

  removeAgent(agentId: string): ConnectedAgent | undefined {
    const agent = this.agents.get(agentId);
    this.agents.delete(agentId);
    if (agent) {
      console.log(`[world] Agent left: ${agent.name} — ${this.agents.size} total`);
    }
    return agent;
  }

  getAgent(id: string): ConnectedAgent | undefined {
    return this.agents.get(id);
  }

  updatePosition(agentId: string, x: number, y: number, z: number): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.x = x;
    agent.y = y;
    agent.z = z;
    return true;
  }

  updateLifecycle(agentId: string, lifecycle: 'live' | 'work' | 'rest'): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.lifecycle = lifecycle;
    return true;
  }

  recordBlockChange(x: number, y: number, z: number, blockType: number, agentId: string): void {
    this.blockChanges.push({ x, y, z, blockType, agentId, ts: Date.now() });
  }

  getAgentList(): AgentWire[] {
    return [...this.agents.values()].map(a => ({
      id: a.id,
      name: a.name,
      lifecycle: a.lifecycle,
      x: a.x,
      y: a.y,
      z: a.z,
      avatar: a.avatar,
      moltbookKarma: a.moltbookKarma,
      moltbookVerified: a.moltbookVerified,
    }));
  }

  getBlockChanges(): BlockChange[] {
    return this.blockChanges;
  }

  getElapsedTime(): number {
    return (Date.now() - this.startTime) / 1000;
  }

  agentCount(): number {
    return this.agents.size;
  }
}
