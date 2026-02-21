// SWE100821: Xagent adapter — connects to xagent gateway HTTP API (:18790).
// Skeleton: polls /health and /a2a for agent data. WebSocket relay TBD.

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
} from './protocol.ts';
import { defaultAvatarFromId, LIFECYCLE_TO_ZONE } from './protocol.ts';

type StateChangeCb = (id: string, lifecycle: AgentLifecycle, zone: ZoneId) => void;
type MessageCb = (msg: AgentMessage) => void;
type TaskUpdateCb = (task: TaskUpdate) => void;
type ActivityCb = (entry: ActivityEntry) => void;
type AvatarUpdateCb = (id: string, config: AvatarConfig) => void;

export class XagentAdapter implements OpenClawBridge {
  private endpoint = '';
  private agents: Map<string, AgentInfo> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  private stateCbs: StateChangeCb[] = [];
  private messageCbs: MessageCb[] = [];
  private taskCbs: TaskUpdateCb[] = [];
  private activityCbs: ActivityCb[] = [];
  private avatarCbs: AvatarUpdateCb[] = [];

  async connect(endpoint: string): Promise<void> {
    this.endpoint = endpoint.replace(/\/$/, '');
    await this.pollAgents();
    this.pollTimer = setInterval(() => this.pollAgents(), 5000);
  }

  disconnect(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
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

  async sendTask(agentId: string, task: TaskRequest): Promise<void> {
    await fetch(`${this.endpoint}/a2a/${agentId}/task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
  }

  async sendMessage(agentId: string, text: string): Promise<void> {
    await fetch(`${this.endpoint}/a2a/${agentId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  }

  async getAvatarConfig(id: string): Promise<AvatarConfig> {
    return this.agents.get(id)?.avatar ?? defaultAvatarFromId(id);
  }

  // --- polling ---

  private async pollAgents(): Promise<void> {
    try {
      const res = await fetch(`${this.endpoint}/health`);
      if (!res.ok) return;
      const data = await res.json() as {
        agent_id?: string;
        name?: string;
        status?: string;
        uptime?: number;
      };

      const id = data.agent_id ?? 'xagent-0';
      const name = data.name ?? 'Xagent';
      const lifecycle = this.mapStatus(data.status);
      const zone = LIFECYCLE_TO_ZONE[lifecycle];
      const prev = this.agents.get(id);

      const agent: AgentInfo = {
        id,
        name,
        lifecycle,
        zone,
        avatar: prev?.avatar ?? defaultAvatarFromId(id),
        taskCount: prev?.taskCount ?? 0,
        uptime: data.uptime ?? 0,
      };

      if (prev?.lifecycle !== lifecycle) {
        this.stateCbs.forEach(cb => cb(id, lifecycle, zone));
        this.activityCbs.forEach(cb =>
          cb({
            id: `xact-${Date.now()}`,
            agentId: id,
            agentName: name,
            type: 'state_change',
            text: `→ ${lifecycle} (${zone})`,
            ts: Date.now(),
          }),
        );
      }
      this.agents.set(id, agent);
    } catch {
      // gateway unreachable — keep stale data
    }
  }

  private mapStatus(status?: string): AgentLifecycle {
    if (!status) return 'rest';
    if (status === 'busy' || status === 'working') return 'work';
    if (status === 'idle' || status === 'ready') return 'live';
    return 'rest';
  }
}
