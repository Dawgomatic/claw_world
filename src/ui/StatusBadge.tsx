// SWE100821: Lifecycle status badge — colored dot + label.

import type { AgentLifecycle } from '../bridge/protocol.ts';

const COLORS: Record<AgentLifecycle, string> = {
  live: 'bg-green-400',
  work: 'bg-yellow-400',
  rest: 'bg-blue-400',
};

export function StatusBadge({ lifecycle }: { lifecycle: AgentLifecycle }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`w-2 h-2 rounded-full ${COLORS[lifecycle]}`} />
      <span className="text-gray-300 capitalize">{lifecycle}</span>
    </span>
  );
}
