// SWE100821: Root app — connection screen -> bridge setup -> split layout.
// Phase 3: supports Mock, Local Server, and Hosted Server modes.

import { useEffect, useState, useCallback } from 'react';
import { SplitLayout } from './ui/SplitLayout.tsx';
import { ConnectScreen, type ConnectionMode } from './ui/ConnectScreen.tsx';
import { Monitor } from './monitor/Monitor.tsx';
import { WorldCanvas } from './world/WorldCanvas.tsx';
import { MockAdapter } from './bridge/mock-adapter.ts';
import { WebSocketAdapter } from './bridge/ws-adapter.ts';
import type { OpenClawBridge } from './bridge/protocol.ts';
import { useAgentStore } from './store/agent-store.ts';

export function App() {
  const [bridge, setBridge] = useState<OpenClawBridge | null>(null);
  const [connected, setConnected] = useState(false);

  const handleConnect = useCallback(async ({ mode, serverUrl }: { mode: ConnectionMode; serverUrl: string }) => {
    let b: OpenClawBridge;
    if (mode === 'mock') {
      b = new MockAdapter();
    } else {
      b = new WebSocketAdapter();
    }

    const s = () => useAgentStore.getState();

    b.onStateChange((id, lifecycle, zone) => s().updateLifecycle(id, lifecycle, zone));
    b.onMessage((msg) => s().addMessage(msg));
    b.onTaskUpdate((task) => s().upsertTask(task));
    b.onActivity((entry) => s().addActivity(entry));
    b.onBlockAction((action) => s().addBlockAction(action));
    b.onInventoryUpdate((id, inv) => s().updateInventory(id, inv));
    b.onNeedsUpdate((id, needs) => s().updateNeeds(id, needs));
    b.onPositionUpdate((id, pos) => s().updatePosition(id, pos));

    try {
      const endpoint = mode === 'mock' ? 'mock://localhost' : serverUrl;
      await b.connect(endpoint);
      const agents = await b.listAgents();
      s().setAgents(agents);
      setBridge(b);
      setConnected(true);
    } catch (err) {
      console.error('Connection failed:', err);
      alert(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  useEffect(() => {
    return () => { bridge?.disconnect(); };
  }, [bridge]);

  if (!connected) {
    return <ConnectScreen onConnect={handleConnect} />;
  }

  return (
    <SplitLayout
      left={<Monitor />}
      right={<WorldCanvas />}
    />
  );
}
