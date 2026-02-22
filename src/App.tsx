// SWE100821: Root app — wires mock bridge to stores, renders split layout.
// Phase 2: also wires block actions, inventory, needs, and position updates.

import { useEffect } from 'react';
import { SplitLayout } from './ui/SplitLayout.tsx';
import { Monitor } from './monitor/Monitor.tsx';
import { WorldCanvas } from './world/WorldCanvas.tsx';
import { MockAdapter } from './bridge/mock-adapter.ts';
import { useAgentStore } from './store/agent-store.ts';

const bridge = new MockAdapter();

export function App() {
  useEffect(() => {
    const s = () => useAgentStore.getState();

    bridge.onStateChange((id, lifecycle, zone) => s().updateLifecycle(id, lifecycle, zone));
    bridge.onMessage((msg) => s().addMessage(msg));
    bridge.onTaskUpdate((task) => s().upsertTask(task));
    bridge.onActivity((entry) => s().addActivity(entry));

    // SWE100821: Phase 2 callbacks
    bridge.onBlockAction((action) => s().addBlockAction(action));
    bridge.onInventoryUpdate((id, inv) => s().updateInventory(id, inv));
    bridge.onNeedsUpdate((id, needs) => s().updateNeeds(id, needs));
    bridge.onPositionUpdate((id, pos) => s().updatePosition(id, pos));

    bridge.connect('mock://localhost').then(async () => {
      const agents = await bridge.listAgents();
      s().setAgents(agents);
    });

    return () => bridge.disconnect();
  }, []);

  return (
    <SplitLayout
      left={<Monitor />}
      right={<WorldCanvas />}
    />
  );
}
