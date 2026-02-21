// SWE100821: Zustand store for UI panel state — selected agent, panel visibility, layout.

import { create } from 'zustand';

export type MonitorPanel = 'agents' | 'activity' | 'tasks' | 'detail';

interface UIStore {
  selectedAgentId: string | null;
  activePanel: MonitorPanel;
  splitRatio: number;

  selectAgent: (id: string | null) => void;
  setPanel: (panel: MonitorPanel) => void;
  setSplitRatio: (ratio: number) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedAgentId: null,
  activePanel: 'agents',
  splitRatio: 0.35,

  selectAgent: (id) => set({ selectedAgentId: id, activePanel: id ? 'detail' : 'agents' }),
  setPanel: (panel) => set({ activePanel: panel }),
  setSplitRatio: (ratio) => set({ splitRatio: Math.max(0.15, Math.min(0.65, ratio)) }),
}));
