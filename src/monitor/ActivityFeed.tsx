// SWE100821: Real-time activity feed — scrollable log of agent actions.

import { useAgentStore } from '../store/agent-store.ts';

const TYPE_ICONS: Record<string, string> = {
  state_change: '🔄',
  message: '💬',
  task: '⚡',
  tool_call: '🔧',
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export function ActivityFeed() {
  const activity = useAgentStore((s) => s.activity);

  return (
    <div className="flex flex-col gap-0.5 p-2 overflow-y-auto max-h-full">
      <h3 className="text-sm font-semibold text-gray-400 px-2 mb-1">Activity</h3>
      {activity.slice(0, 50).map((e) => (
        <div key={e.id} className="flex gap-2 px-2 py-1.5 text-xs rounded hover:bg-gray-800/40">
          <span>{TYPE_ICONS[e.type] ?? '•'}</span>
          <div className="flex-1 min-w-0">
            <span className="text-indigo-400 font-medium">{e.agentName}</span>
            <span className="text-gray-400 ml-1">{e.text}</span>
          </div>
          <span className="text-gray-600 flex-shrink-0">{timeAgo(e.ts)}</span>
        </div>
      ))}
      {activity.length === 0 && (
        <p className="text-xs text-gray-600 px-2">No activity yet.</p>
      )}
    </div>
  );
}
