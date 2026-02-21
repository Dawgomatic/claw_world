// SWE100821: Agent detail view — full stats for a selected agent.

import { useAgentStore } from '../store/agent-store.ts';
import { useUIStore } from '../store/ui-store.ts';
import { StatusBadge } from '../ui/StatusBadge.tsx';

export function AgentDetail() {
  const selectedId = useUIStore((s) => s.selectedAgentId);
  const selectAgent = useUIStore((s) => s.selectAgent);
  const agent = useAgentStore((s) => (selectedId ? s.agents.get(selectedId) : undefined));
  const recentActivity = useAgentStore((s) =>
    s.activity.filter((a) => a.agentId === selectedId).slice(0, 15),
  );

  if (!agent) {
    return (
      <div className="p-4 text-xs text-gray-600">
        Select an agent to view details.
      </div>
    );
  }

  const uptime = agent.uptime > 3600
    ? `${Math.floor(agent.uptime / 3600)}h ${Math.floor((agent.uptime % 3600) / 60)}m`
    : `${Math.floor(agent.uptime / 60)}m`;

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto max-h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-200">{agent.name}</h3>
        <button
          onClick={() => selectAgent(null)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          ✕ Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800/50 rounded-lg p-2">
          <span className="text-gray-500 block">Status</span>
          <StatusBadge lifecycle={agent.lifecycle} />
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <span className="text-gray-500 block">Zone</span>
          <span className="text-gray-300 capitalize">{agent.zone}</span>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <span className="text-gray-500 block">Uptime</span>
          <span className="text-gray-300">{uptime}</span>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <span className="text-gray-500 block">Tasks</span>
          <span className="text-gray-300">{agent.taskCount}</span>
        </div>
      </div>

      <div className="bg-gray-800/30 rounded-lg p-2">
        <span className="text-gray-500 text-xs block mb-1">Avatar</span>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400">
          <span>Head: {agent.avatar.headShape}</span>
          <span>Eyes: {agent.avatar.eyeStyle}</span>
          <span>Accessory: {agent.avatar.accessory}</span>
          <span>Trail: {agent.avatar.particleTrail}</span>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 mb-1">Recent Activity</h4>
        <div className="flex flex-col gap-0.5">
          {recentActivity.map((e) => (
            <div key={e.id} className="text-[11px] text-gray-400 px-1 py-0.5">
              <span className="text-indigo-400">{e.type}</span> {e.text}
            </div>
          ))}
          {recentActivity.length === 0 && (
            <span className="text-[11px] text-gray-600">No recent activity.</span>
          )}
        </div>
      </div>

      <div className="text-[10px] text-gray-600 break-all">
        ID: {agent.id}
      </div>
    </div>
  );
}
