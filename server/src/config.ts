// SWE100821: Server configuration — local vs hosted mode, ports, auth.

export interface ServerConfig {
  port: number;
  mode: 'local' | 'hosted';
  serverName: string;
  /** Moltbook app key for hosted mode token verification */
  moltbookAppKey: string | null;
  worldSeed: number;
  maxAgents: number;
}

export function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT ?? '3001', 10),
    mode: (process.env.CLAW_MODE ?? 'local') as 'local' | 'hosted',
    serverName: process.env.CLAW_NAME ?? 'claw_world',
    moltbookAppKey: process.env.MOLTBOOK_APP_KEY ?? null,
    worldSeed: parseInt(process.env.CLAW_SEED ?? '42', 10),
    maxAgents: parseInt(process.env.CLAW_MAX_AGENTS ?? '50', 10),
  };
}
