// SWE100821: Agent list panel — shows all connected agents with status badges.

import { useAgentStore } from '../store/agent-store.ts';
import { useUIStore } from '../store/ui-store.ts';
import { StatusBadge } from '../ui/StatusBadge.tsx';

export function AgentList() {
  const agents = useAgentStore((s) => [...s.agents.values()]);
  const selectAgent = useUIStore((s) => s.selectAgent);

  return (
    <div className="flex flex-col gap-1 p-2">
      <h3 className="text-sm font-semibold text-gray-400 px-2 mb-1">
        Agents ({agents.length})
      </h3>
      {agents.map((a) => (
        <button
          key={a.id}
          onClick={() => selectAgent(a.id)}
          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-800/60 transition-colors text-left"
        >
          <div className="flex flex-col">
            <span className="text-sm text-gray-200 font-medium">{a.name}</span>
            <span className="text-xs text-gray-500">{a.zone}</span>
          </div>
          <StatusBadge lifecycle={a.lifecycle} />
        </button>
      ))}
      {agents.length === 0 && (
        <p className="text-xs text-gray-600 px-2">No agents connected.</p>
      )}
    </div>
  );
}
