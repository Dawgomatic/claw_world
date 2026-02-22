// SWE100821: Monitor container — tabbed panel switching between views.

import { useUIStore, type MonitorPanel } from '../store/ui-store.ts';
import { useAgentStore } from '../store/agent-store.ts';
import { AgentList } from './AgentList.tsx';
import { ActivityFeed } from './ActivityFeed.tsx';
import { TaskBoard } from './TaskBoard.tsx';
import { AgentDetail } from './AgentDetail.tsx';

const TABS: { id: MonitorPanel; label: string }[] = [
  { id: 'agents', label: 'Agents' },
  { id: 'activity', label: 'Activity' },
  { id: 'tasks', label: 'Tasks' },
];

export function Monitor() {
  const activePanel = useUIStore((s) => s.activePanel);
  const setPanel = useUIStore((s) => s.setPanel);
  const selectedAgentId = useUIStore((s) => s.selectedAgentId);
  const worldTime = useAgentStore((s) => s.worldTime);
  const dayLabel = useAgentStore((s) => s.dayLabel);

  const showDetail = activePanel === 'detail' && selectedAgentId;

  return (
    <div className="flex flex-col h-full bg-gray-900/95 text-gray-100">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-indigo-400">claw</span>
          <span className="text-gray-400">_world</span>
        </h1>
        <p className="text-[10px] text-gray-600 mt-0.5">3D Agent Simulator</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPanel(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activePanel === tab.id && !showDetail
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {showDetail ? (
          <AgentDetail />
        ) : activePanel === 'agents' ? (
          <AgentList />
        ) : activePanel === 'activity' ? (
          <ActivityFeed />
        ) : (
          <TaskBoard />
        )}
      </div>

      {/* SWE100821: Footer with world time */}
      <div className="px-3 py-2 border-t border-gray-800 text-[10px] text-gray-600 flex justify-between">
        <span>OpenClaw Bridge • Mock Adapter</span>
        <span className="text-gray-400">{worldTime} • {dayLabel}</span>
      </div>
    </div>
  );
}
