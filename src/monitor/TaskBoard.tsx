// SWE100821: Task board panel — active tasks with progress bars.

import { useAgentStore } from '../store/agent-store.ts';

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-gray-500',
  running: 'bg-yellow-500',
  done: 'bg-green-500',
  failed: 'bg-red-500',
};

export function TaskBoard() {
  const tasks = useAgentStore((s) => [...s.tasks.values()]);
  const agents = useAgentStore((s) => s.agents);

  const sorted = [...tasks].sort((a, b) => b.ts - a.ts).slice(0, 30);

  return (
    <div className="flex flex-col gap-1 p-2 overflow-y-auto max-h-full">
      <h3 className="text-sm font-semibold text-gray-400 px-2 mb-1">
        Tasks ({tasks.length})
      </h3>
      {sorted.map((t) => {
        const agent = agents.get(t.agentId);
        return (
          <div key={t.id} className="px-3 py-2 rounded-lg bg-gray-800/40">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-200 font-medium truncate">{t.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[t.status]} text-gray-900 font-semibold`}>
                {t.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${t.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500">{t.progress}%</span>
            </div>
            {agent && (
              <span className="text-[10px] text-gray-500 mt-1 block">{agent.name}</span>
            )}
          </div>
        );
      })}
      {tasks.length === 0 && (
        <p className="text-xs text-gray-600 px-2">No active tasks.</p>
      )}
    </div>
  );
}
