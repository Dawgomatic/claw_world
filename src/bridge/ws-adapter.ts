// SWE100821: WebSocket bridge adapter — connects browser to claw_world relay server.
// Used for both local and hosted modes. Receives real agent data over WebSocket.

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
import { LIFECYCLE_TO_ZONE, defaultAvatarFromId } from './protocol.ts';

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

let eid = 0;
function activityId(): string { return `ws-act-${++eid}-${Date.now()}`; }

export class WebSocketAdapter implements OpenClawBridge {
  private ws: WebSocket | null = null;
  private agents: Map<string, AgentInfo> = new Map();
  public serverMode: 'local' | 'hosted' = 'local';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private endpoint = '';

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

  async connect(endpoint: string): Promise<void> {
    this.endpoint = endpoint;
    return new Promise((resolve, reject) => {
      const wsUrl = endpoint.replace(/^http/, 'ws');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Join as viewer (browser watching the world)
        this.ws!.send(JSON.stringify({ type: 'viewer_join' }));
      };

      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string);
        this.handleMessage(msg);
        if (msg.type === 'welcome') resolve();
      };

      this.ws.onerror = () => reject(new Error('WebSocket connection failed'));
      this.ws.onclose = () => this.scheduleReconnect();
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  async listAgents(): Promise<AgentInfo[]> {
    return [...this.agents.values()];
  }

  async getAgentStatus(id: string): Promise<AgentInfo | undefined> {
    return this.agents.get(id);
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

  async sendTask(_agentId: string, _task: TaskRequest): Promise<void> {
    // Tasks are sent via the agent's own connection, not the viewer
  }

  async sendMessage(agentId: string, text: string): Promise<void> {
    this.ws?.send(JSON.stringify({ type: 'chat', agentId: '__viewer__', text, to: agentId }));
  }

  async getAvatarConfig(id: string): Promise<AvatarConfig> {
    return this.agents.get(id)?.avatar ?? defaultAvatarFromId(id);
  }

  // --- message handling ---

  private handleMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case 'welcome': {
        this.serverMode = msg.mode as 'local' | 'hosted';
        const agents = msg.agents as Array<Record<string, unknown>>;
        for (const a of agents) this.upsertAgent(a);
        this.emitActivity('__server__', 'Server', 'state_change',
          `Connected to ${msg.serverName} (${msg.mode} mode, ${agents.length} agents)`);
        break;
      }

      case 'agent_joined': {
        const a = msg.agent as Record<string, unknown>;
        this.upsertAgent(a);
        this.emitActivity(a.id as string, a.name as string, 'state_change', 'Joined the world');
        break;
      }

      case 'agent_left': {
        const id = msg.agentId as string;
        const agent = this.agents.get(id);
        this.agents.delete(id);
        if (agent) {
          this.stateCbs.forEach(cb => cb(id, 'rest', 'garden'));
          this.emitActivity(id, agent.name, 'state_change', 'Left the world');
        }
        break;
      }

      case 'position': {
        const id = msg.agentId as string;
        const pos: WorldPos = { x: msg.x as number, y: msg.y as number, z: msg.z as number };
        const agent = this.agents.get(id);
        if (agent) agent.worldPos = pos;
        this.posCbs.forEach(cb => cb(id, pos));
        break;
      }

      case 'chat': {
        const chatMsg: AgentMessage = {
          from: msg.agentId as string,
          to: (msg.to as string) ?? null,
          text: msg.text as string,
          ts: Date.now(),
        };
        this.messageCbs.forEach(cb => cb(chatMsg));
        const agent = this.agents.get(msg.agentId as string);
        this.emitActivity(msg.agentId as string, agent?.name ?? 'Unknown', 'message', msg.text as string);
        break;
      }

      case 'block_place': {
        const action: BlockAction = {
          agentId: msg.agentId as string,
          action: 'place',
          x: msg.x as number, y: msg.y as number, z: msg.z as number,
          blockType: msg.blockType as number,
          ts: Date.now(),
        };
        this.blockCbs.forEach(cb => cb(action));
        const agent = this.agents.get(msg.agentId as string);
        this.emitActivity(msg.agentId as string, agent?.name ?? 'Unknown', 'build',
          `Placed block at (${msg.x},${msg.y},${msg.z})`);
        break;
      }

      case 'block_remove': {
        const action: BlockAction = {
          agentId: msg.agentId as string,
          action: 'remove',
          x: msg.x as number, y: msg.y as number, z: msg.z as number,
          blockType: 0,
          ts: Date.now(),
        };
        this.blockCbs.forEach(cb => cb(action));
        const agent = this.agents.get(msg.agentId as string);
        this.emitActivity(msg.agentId as string, agent?.name ?? 'Unknown', 'gather',
          `Removed block at (${msg.x},${msg.y},${msg.z})`);
        break;
      }

      case 'lifecycle': {
        const id = msg.agentId as string;
        const lc = msg.lifecycle as AgentLifecycle;
        const zone = LIFECYCLE_TO_ZONE[lc];
        const agent = this.agents.get(id);
        if (agent) {
          agent.lifecycle = lc;
          agent.zone = zone;
        }
        this.stateCbs.forEach(cb => cb(id, lc, zone));
        this.emitActivity(id, agent?.name ?? 'Unknown', 'state_change', `→ ${lc}`);
        break;
      }

      case 'inventory': {
        const id = msg.agentId as string;
        const items = msg.items as ItemStack[];
        const agent = this.agents.get(id);
        if (agent) agent.inventory = items;
        this.invCbs.forEach(cb => cb(id, items));
        break;
      }

      case 'needs': {
        const id = msg.agentId as string;
        const needs: AgentNeeds = {
          energy: msg.energy as number,
          social: msg.social as number,
          curiosity: msg.curiosity as number,
        };
        const agent = this.agents.get(id);
        if (agent) agent.needs = needs;
        this.needsCbs.forEach(cb => cb(id, needs));
        break;
      }
    }
  }

  private upsertAgent(a: Record<string, unknown>): void {
    const av = a.avatar as Record<string, string> | undefined;
    const info: AgentInfo = {
      id: a.id as string,
      name: a.name as string,
      lifecycle: (a.lifecycle as AgentLifecycle) ?? 'live',
      zone: LIFECYCLE_TO_ZONE[(a.lifecycle as AgentLifecycle) ?? 'live'],
      avatar: av ? {
        headShape: av.headShape as AvatarConfig['headShape'],
        eyeStyle: av.eyeStyle as AvatarConfig['eyeStyle'],
        primaryColor: av.primaryColor,
        accentColor: av.accentColor,
        accessory: av.accessory as AvatarConfig['accessory'],
        particleTrail: av.particleTrail as AvatarConfig['particleTrail'],
      } : defaultAvatarFromId(a.id as string),
      taskCount: 0,
      uptime: 0,
      worldPos: { x: (a.x as number) ?? 0, y: (a.y as number) ?? 10, z: (a.z as number) ?? 0 },
      inventory: [],
      needs: { energy: 100, social: 80, curiosity: 90 },
    };
    this.agents.set(info.id, info);
  }

  private emitActivity(agentId: string, agentName: string, type: ActivityEntry['type'], text: string): void {
    const entry: ActivityEntry = { id: activityId(), agentId, agentName, type, text, ts: Date.now() };
    this.activityCbs.forEach(cb => cb(entry));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[ws-adapter] Reconnecting...');
      this.connect(this.endpoint).catch(() => this.scheduleReconnect());
    }, 3000);
  }
}
