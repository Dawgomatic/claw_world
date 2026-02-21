// SWE100821: Mock adapter — runs 3-5 simulated agents locally for dev and demos.
// No real backend required. Agents transition between lifecycle states on timers.

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

const MOCK_NAMES = ['Claw-Alpha', 'Claw-Beta', 'Claw-Gamma', 'Claw-Delta', 'Claw-Epsilon'];
const CHAT_LINES = [
  'Hey, anyone working on the search task?',
  'Just finished indexing. Taking a break.',
  'I found an interesting pattern in the logs.',
  'Heading to the workshop — got a new task.',
  'Dream mode was wild last night.',
  'My avatar needs more sparkles.',
  'Checking the skill archive for web_fetch...',
  'Epoch journal saved. Time to rest.',
];

const TASK_TITLES = [
  'Scan repository for unused imports',
  'Summarize weekly activity log',
  'Index new skill files',
  'Generate dependency graph',
  'Run security audit on workspace',
];

let eid = 0;
function activityId(): string {
  return `act-${++eid}-${Date.now()}`;
}
function taskId(): string {
  return `task-${++eid}-${Date.now()}`;
}

export class MockAdapter implements OpenClawBridge {
  private agents: Map<string, AgentInfo> = new Map();
  private stateCbs: StateChangeCb[] = [];
  private messageCbs: MessageCb[] = [];
  private taskCbs: TaskUpdateCb[] = [];
  private activityCbs: ActivityCb[] = [];
  private avatarCbs: AvatarUpdateCb[] = [];
  private timers: ReturnType<typeof setInterval>[] = [];

  async connect(_endpoint: string): Promise<void> {
    for (let i = 0; i < 5; i++) {
      const id = `mock-agent-${i}`;
      const lifecycles: AgentLifecycle[] = ['live', 'work', 'rest'];
      const lc = lifecycles[i % 3];
      const agent: AgentInfo = {
        id,
        name: MOCK_NAMES[i],
        lifecycle: lc,
        zone: LIFECYCLE_TO_ZONE[lc],
        avatar: defaultAvatarFromId(id),
        taskCount: Math.floor(Math.random() * 5),
        uptime: Math.floor(Math.random() * 7200),
      };
      this.agents.set(id, agent);
    }
    this.startSimulation();
  }

  disconnect(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
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
    const agent = this.agents.get(agentId);
    if (!agent) return;
    const t: TaskUpdate = {
      id: taskId(),
      agentId,
      title: task.title,
      status: 'queued',
      progress: 0,
      ts: Date.now(),
    };
    this.taskCbs.forEach(cb => cb(t));
    this.emitActivity(agentId, agent.name, 'task', `Queued: ${task.title}`);
  }

  async sendMessage(agentId: string, text: string): Promise<void> {
    const msg: AgentMessage = { from: 'user', to: agentId, text, ts: Date.now() };
    this.messageCbs.forEach(cb => cb(msg));
  }

  async getAvatarConfig(id: string): Promise<AvatarConfig> {
    return this.agents.get(id)?.avatar ?? defaultAvatarFromId(id);
  }

  // --- simulation loop ---

  private startSimulation(): void {
    // Lifecycle transitions every 8-15s per agent
    this.timers.push(setInterval(() => this.randomTransition(), 6000));
    // Chat messages every 4-8s
    this.timers.push(setInterval(() => this.randomChat(), 5000));
    // Task progress every 3s
    this.timers.push(setInterval(() => this.randomTask(), 7000));
  }

  private randomTransition(): void {
    const agents = [...this.agents.values()];
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const states: AgentLifecycle[] = ['live', 'work', 'rest'];
    const next = states[Math.floor(Math.random() * states.length)];
    if (next === agent.lifecycle) return;

    const zone = LIFECYCLE_TO_ZONE[next];
    agent.lifecycle = next;
    agent.zone = zone;
    this.stateCbs.forEach(cb => cb(agent.id, next, zone));
    this.emitActivity(agent.id, agent.name, 'state_change', `→ ${next} (${zone})`);
  }

  private randomChat(): void {
    const agents = [...this.agents.values()];
    const from = agents[Math.floor(Math.random() * agents.length)];
    const text = CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)];
    const msg: AgentMessage = { from: from.id, to: null, text, ts: Date.now() };
    this.messageCbs.forEach(cb => cb(msg));
    this.emitActivity(from.id, from.name, 'message', text);
  }

  private randomTask(): void {
    const agents = [...this.agents.values()].filter(a => a.lifecycle === 'work');
    if (agents.length === 0) return;
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const title = TASK_TITLES[Math.floor(Math.random() * TASK_TITLES.length)];
    const progress = Math.floor(Math.random() * 100);
    const status = progress >= 100 ? 'done' : 'running';
    const t: TaskUpdate = {
      id: taskId(),
      agentId: agent.id,
      title,
      status,
      progress: Math.min(progress, 100),
      ts: Date.now(),
    };
    this.taskCbs.forEach(cb => cb(t));
    this.emitActivity(agent.id, agent.name, 'task', `${title} (${progress}%)`);
  }

  private emitActivity(
    agentId: string,
    agentName: string,
    type: ActivityEntry['type'],
    text: string,
  ): void {
    const entry: ActivityEntry = { id: activityId(), agentId, agentName, type, text, ts: Date.now() };
    this.activityCbs.forEach(cb => cb(entry));
  }
}
