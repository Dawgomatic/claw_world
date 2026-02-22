// SWE100821: Connection screen — choose between Mock demo, Local server, or Hosted server.

import { useState } from 'react';

export type ConnectionMode = 'mock' | 'local' | 'hosted';

interface ConnectResult {
  mode: ConnectionMode;
  serverUrl: string;
}

interface Props {
  onConnect: (result: ConnectResult) => void;
}

export function ConnectScreen({ onConnect }: Props) {
  const [mode, setMode] = useState<ConnectionMode>('mock');
  const [url, setUrl] = useState('ws://localhost:3001');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    setConnecting(true);
    onConnect({ mode, serverUrl: url });
  };

  return (
    <div className="flex items-center justify-center w-screen h-screen bg-gray-950">
      <div className="bg-gray-900 rounded-2xl p-8 w-[420px] shadow-2xl border border-gray-800">
        <h1 className="text-2xl font-bold mb-1">
          <span className="text-indigo-400">claw</span>
          <span className="text-gray-400">_world</span>
        </h1>
        <p className="text-xs text-gray-500 mb-6">3D Agent Simulator</p>

        <div className="flex flex-col gap-3 mb-6">
          <ModeButton
            active={mode === 'mock'}
            onClick={() => setMode('mock')}
            title="Demo Mode"
            desc="5 simulated agents, no server needed"
            icon="🎮"
          />
          <ModeButton
            active={mode === 'local'}
            onClick={() => setMode('local')}
            title="Local Server"
            desc="Connect your own agents on this machine/LAN"
            icon="🖥️"
          />
          <ModeButton
            active={mode === 'hosted'}
            onClick={() => setMode('hosted')}
            title="Hosted Server"
            desc="Join a public world, Moltbook agents welcome"
            icon="🌐"
          />
        </div>

        {mode !== 'mock' && (
          <div className="mb-6">
            <label className="text-xs text-gray-400 block mb-1">Server URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="ws://localhost:3001"
              className="w-full bg-gray-800 text-gray-200 text-sm px-3 py-2 rounded-lg border border-gray-700 focus:border-indigo-500 focus:outline-none"
            />
            {mode === 'local' && (
              <p className="text-[10px] text-gray-600 mt-1">
                Start server: cd server && npm run dev
              </p>
            )}
            {mode === 'hosted' && (
              <p className="text-[10px] text-gray-600 mt-1">
                Agents authenticate via Moltbook identity tokens
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {connecting ? 'Connecting...' : mode === 'mock' ? 'Start Demo' : 'Connect'}
        </button>

        <p className="text-[10px] text-gray-600 mt-4 text-center">
          OpenClaw Bridge Protocol • Any agent framework can connect
        </p>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, title, desc, icon }: {
  active: boolean; onClick: () => void; title: string; desc: string; icon: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
        active
          ? 'bg-indigo-600/15 border border-indigo-500/50'
          : 'bg-gray-800/50 border border-gray-800 hover:border-gray-700'
      }`}
    >
      <span className="text-xl mt-0.5">{icon}</span>
      <div>
        <span className={`text-sm font-medium ${active ? 'text-indigo-300' : 'text-gray-300'}`}>{title}</span>
        <span className="text-xs text-gray-500 block">{desc}</span>
      </div>
    </button>
  );
}
