// SWE100821: OpenClaw bridge protocol — generic interface for any agent framework.
// Xagent is the reference implementation, but any OpenClaw-compatible agent can plug in.

export type AgentLifecycle = 'live' | 'work' | 'rest';

export type ZoneId = 'plaza' | 'workshop' | 'garden' | 'lab';

export const LIFECYCLE_TO_ZONE: Record<AgentLifecycle, ZoneId> = {
  live: 'plaza',
  work: 'workshop',
  rest: 'garden',
};

export type HeadShape = 'sphere' | 'cube' | 'teardrop';
export type EyeStyle = 'dot' | 'anime' | 'visor' | 'led';
export type Accessory = 'hat' | 'antenna' | 'cape' | 'wings' | 'aura' | 'none';
export type ParticleTrail = 'fireflies' | 'sparkles' | 'smoke' | 'binary' | 'none';

export interface AvatarConfig {
  headShape: HeadShape;
  eyeStyle: EyeStyle;
  primaryColor: string;
  accentColor: string;
  accessory: Accessory;
  particleTrail: ParticleTrail;
}

// SWE100821: Agent position in 3D world (voxel coordinates)
export interface WorldPos {
  x: number;
  y: number;
  z: number;
}

// SWE100821: Inventory item slot
export interface ItemStack {
  blockType: number;
  count: number;
}

// SWE100821: Agent needs (drive behavior in simulation)
export interface AgentNeeds {
  energy: number;
  social: number;
  curiosity: number;
}

export interface AgentInfo {
  id: string;
  name: string;
  lifecycle: AgentLifecycle;
  zone: ZoneId;
  avatar: AvatarConfig;
  taskCount: number;
  uptime: number;
  worldPos: WorldPos;
  inventory: ItemStack[];
  needs: AgentNeeds;
}

export interface AgentMessage {
  from: string;
  to: string | null;
  text: string;
  ts: number;
}

export interface TaskUpdate {
  id: string;
  agentId: string;
  title: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress: number;
  ts: number;
}

export interface TaskRequest {
  title: string;
  description: string;
}

export interface ActivityEntry {
  id: string;
  agentId: string;
  agentName: string;
  type: 'state_change' | 'message' | 'task' | 'tool_call' | 'build' | 'gather' | 'craft' | 'trade';
  text: string;
  ts: number;
}

// SWE100821: World interaction events
export interface BlockAction {
  agentId: string;
  action: 'place' | 'remove';
  x: number;
  y: number;
  z: number;
  blockType: number;
  ts: number;
}

export interface CraftAction {
  agentId: string;
  recipe: string;
  inputs: ItemStack[];
  output: ItemStack;
  ts: number;
}

export interface TradeAction {
  from: string;
  to: string;
  give: ItemStack[];
  receive: ItemStack[];
  ts: number;
}

/** Generic bridge interface any agent framework can implement. */
export interface OpenClawBridge {
  connect(endpoint: string): Promise<void>;
  disconnect(): void;

  listAgents(): Promise<AgentInfo[]>;
  getAgentStatus(id: string): Promise<AgentInfo | undefined>;

  onStateChange(cb: (id: string, lifecycle: AgentLifecycle, zone: ZoneId) => void): void;
  onMessage(cb: (msg: AgentMessage) => void): void;
  onTaskUpdate(cb: (task: TaskUpdate) => void): void;
  onActivity(cb: (entry: ActivityEntry) => void): void;

  sendTask(agentId: string, task: TaskRequest): Promise<void>;
  sendMessage(agentId: string, text: string): Promise<void>;

  getAvatarConfig(id: string): Promise<AvatarConfig>;
  onAvatarUpdate(cb: (id: string, config: AvatarConfig) => void): void;

  // SWE100821: Phase 2 — world interaction
  onBlockAction(cb: (action: BlockAction) => void): void;
  onCraftAction(cb: (action: CraftAction) => void): void;
  onTradeAction(cb: (action: TradeAction) => void): void;
  onInventoryUpdate(cb: (agentId: string, inventory: ItemStack[]) => void): void;
  onNeedsUpdate(cb: (agentId: string, needs: AgentNeeds) => void): void;
  onPositionUpdate(cb: (agentId: string, pos: WorldPos) => void): void;
}

/** Deterministic default avatar derived from agent ID hash. */
export function defaultAvatarFromId(id: string): AvatarConfig {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const abs = Math.abs(h);

  const heads: HeadShape[] = ['sphere', 'cube', 'teardrop'];
  const eyes: EyeStyle[] = ['dot', 'anime', 'visor', 'led'];
  const accessories: Accessory[] = ['hat', 'antenna', 'cape', 'wings', 'aura', 'none'];
  const trails: ParticleTrail[] = ['fireflies', 'sparkles', 'smoke', 'binary', 'none'];

  const hue = abs % 360;
  const hue2 = (hue + 120 + (abs % 60)) % 360;

  return {
    headShape: heads[abs % heads.length],
    eyeStyle: eyes[abs % eyes.length],
    primaryColor: `hsl(${hue}, 70%, 60%)`,
    accentColor: `hsl(${hue2}, 80%, 50%)`,
    accessory: accessories[abs % accessories.length],
    particleTrail: trails[abs % trails.length],
  };
}
