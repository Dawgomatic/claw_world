// SWE100821: Zustand store for agent state — single source of truth for all agent data.

import { create } from 'zustand';
import type {
  AgentInfo,
  AgentMessage,
  TaskUpdate,
  ActivityEntry,
  AgentLifecycle,
  ZoneId,
} from '../bridge/protocol.ts';

const MAX_ACTIVITY = 200;
const MAX_MESSAGES = 100;

interface AgentStore {
  agents: Map<string, AgentInfo>;
  activity: ActivityEntry[];
  messages: AgentMessage[];
  tasks: Map<string, TaskUpdate>;

  setAgents: (agents: AgentInfo[]) => void;
  updateAgent: (id: string, patch: Partial<AgentInfo>) => void;
  updateLifecycle: (id: string, lifecycle: AgentLifecycle, zone: ZoneId) => void;
  addActivity: (entry: ActivityEntry) => void;
  addMessage: (msg: AgentMessage) => void;
  upsertTask: (task: TaskUpdate) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: new Map(),
  activity: [],
  messages: [],
  tasks: new Map(),

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
}));
