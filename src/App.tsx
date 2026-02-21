// SWE100821: Root app — wires mock bridge to stores, renders split layout.

import { useEffect } from 'react';
import { SplitLayout } from './ui/SplitLayout.tsx';
import { Monitor } from './monitor/Monitor.tsx';
import { WorldCanvas } from './world/WorldCanvas.tsx';
import { MockAdapter } from './bridge/mock-adapter.ts';
import { useAgentStore } from './store/agent-store.ts';

const bridge = new MockAdapter();

export function App() {
  useEffect(() => {
    bridge.onStateChange((id, lifecycle, zone) => {
      useAgentStore.getState().updateLifecycle(id, lifecycle, zone);
    });
    bridge.onMessage((msg) => {
      useAgentStore.getState().addMessage(msg);
    });
    bridge.onTaskUpdate((task) => {
      useAgentStore.getState().upsertTask(task);
    });
    bridge.onActivity((entry) => {
      useAgentStore.getState().addActivity(entry);
    });

    bridge.connect('mock://localhost').then(async () => {
      const agents = await bridge.listAgents();
      useAgentStore.getState().setAgents(agents);
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
