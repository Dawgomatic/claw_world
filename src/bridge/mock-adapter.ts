// SWE100821: Mock adapter v2 — simulated agents that gather, build, craft, chat, and rest.
// Agents have inventories, needs, and positions on the voxel terrain.
// No real backend required.

import type {
  OpenClawBridge,
  AgentInfo,
  AgentMessage,
  TaskUpdate,
  TaskRequest,
  AvatarConfig,
  ActivityEntry,
  AgentLifecycle,
  ZoneId,
  BlockAction,
  CraftAction,
  TradeAction,
  ItemStack,
  AgentNeeds,
  WorldPos,
} from './protocol.ts';
import { defaultAvatarFromId, LIFECYCLE_TO_ZONE } from './protocol.ts';
import { Inventory } from '../systems/inventory.ts';
import { tickNeeds, suggestActivity, boostNeed, DEFAULT_NEEDS } from '../systems/needs.ts';
import { RECIPES, canCraft, executeCraft } from '../systems/crafting.ts';
import { BlockType } from '../voxel/block-registry.ts';
import type { ChunkManager } from '../voxel/chunk-manager.ts';

type StateChangeCb = (id: string, lifecycle: AgentLifecycle, zone: ZoneId) => void;
type MessageCb = (msg: AgentMessage) => void;
type TaskUpdateCb = (task: TaskUpdate) => void;
type ActivityCb = (entry: ActivityEntry) => void;
type AvatarUpdateCb = (id: string, config: AvatarConfig) => void;
type BlockActionCb = (action: BlockAction) => void;
type CraftActionCb = (action: CraftAction) => void;
type TradeActionCb = (action: TradeAction) => void;
type InventoryUpdateCb = (agentId: string, inventory: ItemStack[]) => void;
type NeedsUpdateCb = (agentId: string, needs: AgentNeeds) => void;
type PositionUpdateCb = (agentId: string, pos: WorldPos) => void;

const MOCK_NAMES = ['Claw-Alpha', 'Claw-Beta', 'Claw-Gamma', 'Claw-Delta', 'Claw-Epsilon'];
const CHAT_LINES = [
  'Found some good stone over here!',
  'Just finished building a wall. Taking a break.',
  'Anyone want to trade iron for planks?',
  'Heading to gather more wood.',
  'The sunset is beautiful from up here.',
  'I crafted a workbench! Come use it.',
  'My energy is low, going to rest.',
  'Check out the house I built!',
  'Need more cobblestone for the furnace.',
  'Dream mode was wild last night.',
];

let eid = 0;
function activityId(): string { return `act-${++eid}-${Date.now()}`; }

interface SimAgent {
  info: AgentInfo;
  inventory: Inventory;
  needs: AgentNeeds;
  targetPos: WorldPos;
  actionTimer: number;
  moveTimer: number;
}

export class MockAdapter implements OpenClawBridge {
  private agents: Map<string, SimAgent> = new Map();
  private stateCbs: StateChangeCb[] = [];
  private messageCbs: MessageCb[] = [];
  private taskCbs: TaskUpdateCb[] = [];
  private activityCbs: ActivityCb[] = [];
  private avatarCbs: AvatarUpdateCb[] = [];
  private blockCbs: BlockActionCb[] = [];
  private craftCbs: CraftActionCb[] = [];
  private tradeCbs: TradeActionCb[] = [];
  private invCbs: InventoryUpdateCb[] = [];
  private needsCbs: NeedsUpdateCb[] = [];
  private posCbs: PositionUpdateCb[] = [];
  private timers: ReturnType<typeof setInterval>[] = [];

  async connect(_endpoint: string): Promise<void> {
    for (let i = 0; i < 5; i++) {
      const id = `mock-agent-${i}`;
      const lifecycles: AgentLifecycle[] = ['live', 'work', 'rest'];
      const lc = lifecycles[i % 3];

      // Scatter agents across terrain
      const x = (i - 2) * 8;
      const z = ((i % 3) - 1) * 6;

      const info: AgentInfo = {
        id,
        name: MOCK_NAMES[i],
        lifecycle: lc,
        zone: LIFECYCLE_TO_ZONE[lc],
        avatar: defaultAvatarFromId(id),
        taskCount: 0,
        uptime: 0,
        worldPos: { x, y: 0, z },
        inventory: [],
        needs: { ...DEFAULT_NEEDS },
      };

      const inventory = new Inventory(id);
      // Give each agent some starter materials
      inventory.addItem(BlockType.Wood, 5);
      inventory.addItem(BlockType.Stone, 3);
      info.inventory = inventory.getStacks();

      const simAgent: SimAgent = {
        info,
        inventory,
        needs: { ...DEFAULT_NEEDS },
        targetPos: { x, y: 0, z },
        actionTimer: 2 + Math.random() * 4,
        moveTimer: 1 + Math.random() * 3,
      };
      this.agents.set(id, simAgent);
    }
    this.startSimulation();
  }

  disconnect(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  async listAgents(): Promise<AgentInfo[]> {
    return [...this.agents.values()].map(a => ({ ...a.info, inventory: a.inventory.getStacks(), needs: a.needs }));
  }

  async getAgentStatus(id: string): Promise<AgentInfo | undefined> {
    const a = this.agents.get(id);
    if (!a) return undefined;
    return { ...a.info, inventory: a.inventory.getStacks(), needs: a.needs };
  }

  onStateChange(cb: StateChangeCb): void { this.stateCbs.push(cb); }
  onMessage(cb: MessageCb): void { this.messageCbs.push(cb); }
  onTaskUpdate(cb: TaskUpdateCb): void { this.taskCbs.push(cb); }
  onActivity(cb: ActivityCb): void { this.activityCbs.push(cb); }
  onAvatarUpdate(cb: AvatarUpdateCb): void { this.avatarCbs.push(cb); }
  onBlockAction(cb: BlockActionCb): void { this.blockCbs.push(cb); }
  onCraftAction(cb: CraftActionCb): void { this.craftCbs.push(cb); }
  onTradeAction(cb: TradeActionCb): void { this.tradeCbs.push(cb); }
  onInventoryUpdate(cb: InventoryUpdateCb): void { this.invCbs.push(cb); }
  onNeedsUpdate(cb: NeedsUpdateCb): void { this.needsCbs.push(cb); }
  onPositionUpdate(cb: PositionUpdateCb): void { this.posCbs.push(cb); }

  async sendTask(agentId: string, task: TaskRequest): Promise<void> {
    const a = this.agents.get(agentId);
    if (!a) return;
    this.emitActivity(agentId, a.info.name, 'task', `Queued: ${task.title}`);
  }

  async sendMessage(agentId: string, text: string): Promise<void> {
    const msg: AgentMessage = { from: 'user', to: agentId, text, ts: Date.now() };
    this.messageCbs.forEach(cb => cb(msg));
  }

  async getAvatarConfig(id: string): Promise<AvatarConfig> {
    return this.agents.get(id)?.info.avatar ?? defaultAvatarFromId(id);
  }

  // --- Simulation Loop ---

  private startSimulation(): void {
    // Main sim tick: 500ms
    this.timers.push(setInterval(() => this.simTick(0.5), 500));
    // Chat every 6s
    this.timers.push(setInterval(() => this.randomChat(), 6000));
  }

  private simTick(dt: number): void {
    for (const agent of this.agents.values()) {
      // Tick needs
      agent.needs = tickNeeds(agent.needs, agent.info.lifecycle, dt);
      this.needsCbs.forEach(cb => cb(agent.info.id, agent.needs));

      // Check if agent should change lifecycle based on needs
      const suggested = suggestActivity(agent.needs);
      if (suggested !== agent.info.lifecycle) {
        agent.actionTimer -= dt;
        if (agent.actionTimer <= 0) {
          this.transitionAgent(agent, suggested);
          agent.actionTimer = 5 + Math.random() * 10;
        }
      }

      // Periodic actions based on lifecycle
      agent.moveTimer -= dt;
      if (agent.moveTimer <= 0) {
        this.doAction(agent);
        agent.moveTimer = 3 + Math.random() * 5;
      }

      // Uptime
      agent.info.uptime += dt;
    }
  }

  private transitionAgent(agent: SimAgent, lc: AgentLifecycle): void {
    const zone = LIFECYCLE_TO_ZONE[lc];
    agent.info.lifecycle = lc;
    agent.info.zone = zone;
    this.stateCbs.forEach(cb => cb(agent.info.id, lc, zone));
    this.emitActivity(agent.info.id, agent.info.name, 'state_change', `→ ${lc} (${zone})`);
  }

  private doAction(agent: SimAgent): void {
    const cm = this.getChunkManager();

    switch (agent.info.lifecycle) {
      case 'work':
        this.doWork(agent, cm);
        break;
      case 'live':
        this.doSocial(agent, cm);
        break;
      case 'rest':
        this.doRest(agent);
        break;
    }
  }

  private doWork(agent: SimAgent, cm: ChunkManager | null): void {
    if (!cm) return;
    const roll = Math.random();

    if (roll < 0.3) {
      // Gather: mine a block near agent
      const wx = Math.floor(agent.info.worldPos.x + (Math.random() - 0.5) * 6);
      const wz = Math.floor(agent.info.worldPos.z + (Math.random() - 0.5) * 6);
      const surfY = cm.getSurfaceY(wx, wz) - 1;
      if (surfY > 1) {
        const removed = cm.removeBlock(wx, surfY, wz);
        if (removed !== null && removed !== BlockType.Air) {
          agent.inventory.addItem(removed, 1);
          const action: BlockAction = { agentId: agent.info.id, action: 'remove', x: wx, y: surfY, z: wz, blockType: removed, ts: Date.now() };
          this.blockCbs.forEach(cb => cb(action));
          this.invCbs.forEach(cb => cb(agent.info.id, agent.inventory.getStacks()));
          this.emitActivity(agent.info.id, agent.info.name, 'gather', `Mined block at (${wx},${surfY},${wz})`);
          agent.needs = boostNeed(agent.needs, 'curiosity', 5);
        }
      }
    } else if (roll < 0.6) {
      // Build: place a block
      const stacks = agent.inventory.getStacks();
      const buildTypes = [BlockType.Planks, BlockType.Cobblestone, BlockType.Brick, BlockType.Wood] as number[];
      const buildable = stacks.find(s => buildTypes.includes(s.blockType));
      if (buildable) {
        const wx = Math.floor(agent.info.worldPos.x + (Math.random() - 0.5) * 4);
        const wz = Math.floor(agent.info.worldPos.z + (Math.random() - 0.5) * 4);
        const surfY = cm.getSurfaceY(wx, wz);
        if (surfY < 20 && cm.placeBlock(wx, surfY, wz, buildable.blockType as BlockType)) {
          agent.inventory.removeItem(buildable.blockType as BlockType, 1);
          const action: BlockAction = { agentId: agent.info.id, action: 'place', x: wx, y: surfY, z: wz, blockType: buildable.blockType, ts: Date.now() };
          this.blockCbs.forEach(cb => cb(action));
          this.invCbs.forEach(cb => cb(agent.info.id, agent.inventory.getStacks()));
          this.emitActivity(agent.info.id, agent.info.name, 'build', `Placed block at (${wx},${surfY},${wz})`);
          agent.needs = boostNeed(agent.needs, 'curiosity', 8);
        }
      }
    } else {
      // Craft
      const craftable = RECIPES.find(r => canCraft(agent.inventory, r));
      if (craftable) {
        executeCraft(agent.inventory, craftable);
        const craftAction: CraftAction = {
          agentId: agent.info.id,
          recipe: craftable.id,
          inputs: craftable.inputs,
          output: craftable.output,
          ts: Date.now(),
        };
        this.craftCbs.forEach(cb => cb(craftAction));
        this.invCbs.forEach(cb => cb(agent.info.id, agent.inventory.getStacks()));
        this.emitActivity(agent.info.id, agent.info.name, 'craft', `Crafted ${craftable.name}`);
        agent.needs = boostNeed(agent.needs, 'curiosity', 10);
      }
    }

    // Move toward action area
    this.wander(agent, 8);
  }

  private doSocial(agent: SimAgent, _cm: ChunkManager | null): void {
    // Move toward another agent
    const others = [...this.agents.values()].filter(a => a.info.id !== agent.info.id);
    if (others.length > 0) {
      const target = others[Math.floor(Math.random() * others.length)];
      const tx = target.info.worldPos.x + (Math.random() - 0.5) * 3;
      const tz = target.info.worldPos.z + (Math.random() - 0.5) * 3;
      agent.targetPos = { x: tx, y: agent.info.worldPos.y, z: tz };
      agent.info.worldPos = agent.targetPos;
      this.posCbs.forEach(cb => cb(agent.info.id, agent.info.worldPos));
      agent.needs = boostNeed(agent.needs, 'social', 12);
    }
  }

  private doRest(agent: SimAgent): void {
    agent.needs = boostNeed(agent.needs, 'energy', 15);
    this.wander(agent, 3);
  }

  private wander(agent: SimAgent, radius: number): void {
    const dx = (Math.random() - 0.5) * radius;
    const dz = (Math.random() - 0.5) * radius;
    agent.info.worldPos = {
      x: agent.info.worldPos.x + dx,
      y: agent.info.worldPos.y,
      z: agent.info.worldPos.z + dz,
    };

    // Clamp to terrain surface
    const cm = this.getChunkManager();
    if (cm) {
      const surfY = cm.getSurfaceY(Math.floor(agent.info.worldPos.x), Math.floor(agent.info.worldPos.z));
      agent.info.worldPos.y = surfY;
    }

    this.posCbs.forEach(cb => cb(agent.info.id, agent.info.worldPos));
  }

  private randomChat(): void {
    const agents = [...this.agents.values()];
    const from = agents[Math.floor(Math.random() * agents.length)];
    const text = CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)];
    const msg: AgentMessage = { from: from.info.id, to: null, text, ts: Date.now() };
    this.messageCbs.forEach(cb => cb(msg));
    this.emitActivity(from.info.id, from.info.name, 'message', text);
  }

  private getChunkManager(): ChunkManager | null {
    return (window as unknown as Record<string, unknown>).__chunkManager as ChunkManager | null;
  }

  private emitActivity(agentId: string, agentName: string, type: ActivityEntry['type'], text: string): void {
    const entry: ActivityEntry = { id: activityId(), agentId, agentName, type, text, ts: Date.now() };
    this.activityCbs.forEach(cb => cb(entry));
  }
}
