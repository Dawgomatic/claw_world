// SWE100821: Agent detail view — full stats, inventory, needs for a selected agent.
// Phase 2: shows inventory stacks, needs bars, world position.

import { useAgentStore } from '../store/agent-store.ts';
import { useUIStore } from '../store/ui-store.ts';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { getBlock, type BlockType } from '../voxel/block-registry.ts';

export function AgentDetail() {
  const selectedId = useUIStore((s) => s.selectedAgentId);
  const selectAgent = useUIStore((s) => s.selectAgent);
  const agent = useAgentStore((s) => (selectedId ? s.agents.get(selectedId) : undefined));
  const recentActivity = useAgentStore((s) =>
    s.activity.filter((a) => a.agentId === selectedId).slice(0, 10),
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
        <button onClick={() => selectAgent(null)} className="text-xs text-gray-500 hover:text-gray-300">
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
          <span className="text-gray-500 block">Position</span>
          <span className="text-gray-300 text-[10px]">
            {Math.round(agent.worldPos.x)}, {Math.round(agent.worldPos.y)}, {Math.round(agent.worldPos.z)}
          </span>
        </div>
      </div>

      {/* SWE100821: Agent needs bars */}
      <div className="bg-gray-800/30 rounded-lg p-2">
        <span className="text-gray-500 text-xs block mb-1.5">Needs</span>
        <NeedBar label="Energy" value={agent.needs.energy} color="bg-green-500" />
        <NeedBar label="Social" value={agent.needs.social} color="bg-blue-500" />
        <NeedBar label="Curiosity" value={agent.needs.curiosity} color="bg-purple-500" />
      </div>

      {/* SWE100821: Inventory */}
      <div className="bg-gray-800/30 rounded-lg p-2">
        <span className="text-gray-500 text-xs block mb-1.5">
          Inventory ({agent.inventory.length} slots)
        </span>
        <div className="grid grid-cols-4 gap-1">
          {agent.inventory.map((item, i) => {
            const def = getBlock(item.blockType as BlockType);
            return (
              <div key={i} className="bg-gray-700/50 rounded p-1 text-center">
                <div
                  className="w-5 h-5 rounded mx-auto mb-0.5"
                  style={{ backgroundColor: `rgb(${Math.round(def.color.r * 255)},${Math.round(def.color.g * 255)},${Math.round(def.color.b * 255)})` }}
                />
                <span className="text-[9px] text-gray-400 block truncate">{def.name}</span>
                <span className="text-[9px] text-gray-500">×{item.count}</span>
              </div>
            );
          })}
          {agent.inventory.length === 0 && (
            <span className="text-[10px] text-gray-600 col-span-4">Empty</span>
          )}
        </div>
      </div>

      {/* Avatar info */}
      <div className="bg-gray-800/30 rounded-lg p-2">
        <span className="text-gray-500 text-xs block mb-1">Avatar</span>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400">
          <span>Head: {agent.avatar.headShape}</span>
          <span>Eyes: {agent.avatar.eyeStyle}</span>
          <span>Accessory: {agent.avatar.accessory}</span>
          <span>Trail: {agent.avatar.particleTrail}</span>
        </div>
      </div>

      {/* Recent activity */}
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

      <div className="text-[10px] text-gray-600 break-all">ID: {agent.id}</div>
    </div>
  );
}

function NeedBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[10px] text-gray-400 w-14">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 w-7 text-right">{Math.round(value)}</span>
    </div>
  );
}
