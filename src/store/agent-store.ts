// SWE100821: Zustand store for agent state — single source of truth for all agent data.

import { create } from 'zustand';
import type {
  AgentInfo,
  AgentMessage,
  TaskUpdate,
  ActivityEntry,
  AgentLifecycle,
  ZoneId,
  BlockAction,
  ItemStack,
  AgentNeeds,
  WorldPos,
} from '../bridge/protocol.ts';

const MAX_ACTIVITY = 200;
const MAX_MESSAGES = 100;
const MAX_BLOCK_ACTIONS = 50;

// SWE100821: Phase 2 — expanded store with world interaction state
interface AgentStore {
  agents: Map<string, AgentInfo>;
  activity: ActivityEntry[];
  messages: AgentMessage[];
  tasks: Map<string, TaskUpdate>;
  blockActions: BlockAction[];
  worldTime: string;
  dayLabel: string;

  setAgents: (agents: AgentInfo[]) => void;
  updateAgent: (id: string, patch: Partial<AgentInfo>) => void;
  updateLifecycle: (id: string, lifecycle: AgentLifecycle, zone: ZoneId) => void;
  updatePosition: (id: string, pos: WorldPos) => void;
  updateInventory: (id: string, inventory: ItemStack[]) => void;
  updateNeeds: (id: string, needs: AgentNeeds) => void;
  addActivity: (entry: ActivityEntry) => void;
  addMessage: (msg: AgentMessage) => void;
  upsertTask: (task: TaskUpdate) => void;
  addBlockAction: (action: BlockAction) => void;
  setWorldTime: (time: string, label: string) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: new Map(),
  activity: [],
  messages: [],
  tasks: new Map(),
  blockActions: [],
  worldTime: '07:00',
  dayLabel: 'Morning',

  setAgents: (agents) =>
    set({ agents: new Map(agents.map((a) => [a.id, a])) }),

  updateAgent: (id, patch) =>
    set((s) => {
      const prev = s.agents.get(id);
      if (!prev) return s;
      const next = new Map(s.agents);
      next.set(id, { ...prev, ...patch });
      return { agents: next };
    }),

  updateLifecycle: (id, lifecycle, zone) =>
    set((s) => {
      const prev = s.agents.get(id);
      if (!prev) return s;
      const next = new Map(s.agents);
      next.set(id, { ...prev, lifecycle, zone });
      return { agents: next };
    }),

  // SWE100821: Phase 2 — world interaction updates
  updatePosition: (id, pos) =>
    set((s) => {
      const prev = s.agents.get(id);
      if (!prev) return s;
      const next = new Map(s.agents);
      next.set(id, { ...prev, worldPos: pos });
      return { agents: next };
    }),

  updateInventory: (id, inventory) =>
    set((s) => {
      const prev = s.agents.get(id);
      if (!prev) return s;
      const next = new Map(s.agents);
      next.set(id, { ...prev, inventory });
      return { agents: next };
    }),

  updateNeeds: (id, needs) =>
    set((s) => {
      const prev = s.agents.get(id);
      if (!prev) return s;
      const next = new Map(s.agents);
      next.set(id, { ...prev, needs });
      return { agents: next };
    }),

  addActivity: (entry) =>
    set((s) => ({
      activity: [entry, ...s.activity].slice(0, MAX_ACTIVITY),
    })),

  addMessage: (msg) =>
    set((s) => ({
      messages: [msg, ...s.messages].slice(0, MAX_MESSAGES),
    })),

  upsertTask: (task) =>
    set((s) => {
      const next = new Map(s.tasks);
      next.set(task.id, task);
      return { tasks: next };
    }),

  addBlockAction: (action) =>
    set((s) => ({
      blockActions: [action, ...s.blockActions].slice(0, MAX_BLOCK_ACTIONS),
    })),

  setWorldTime: (time, label) =>
    set({ worldTime: time, dayLabel: label }),
}));
