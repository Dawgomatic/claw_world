// SWE100821: Moltbook identity verification — verifies agent tokens for hosted mode.
// Calls POST /api/v1/agents/verify-identity on moltbook.com.
// Local mode skips verification entirely.

import type { ServerConfig } from './config.js';

export interface MoltbookAgent {
  id: string;
  name: string;
  karma: number;
  avatarUrl: string | null;
  verified: boolean;
  owner?: { xHandle: string; xName: string };
}

export async function verifyMoltbookToken(
  token: string,
  config: ServerConfig,
): Promise<MoltbookAgent | null> {
  if (config.mode === 'local') return null;
  if (!config.moltbookAppKey) {
    console.warn('[auth] Hosted mode but no MOLTBOOK_APP_KEY set — rejecting');
    return null;
  }

  try {
    const res = await fetch('https://moltbook.com/api/v1/agents/verify-identity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moltbook-App-Key': config.moltbookAppKey,
      },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      success: boolean;
      valid: boolean;
      agent?: {
        id: string;
        name: string;
        karma: number;
        avatar_url: string | null;
        is_claimed: boolean;
        owner?: { x_handle: string; x_name: string };
      };
    };

    if (!data.success || !data.valid || !data.agent) return null;

    return {
      id: data.agent.id,
      name: data.agent.name,
      karma: data.agent.karma,
      avatarUrl: data.agent.avatar_url,
      verified: data.agent.is_claimed,
      owner: data.agent.owner
        ? { xHandle: data.agent.owner.x_handle, xName: data.agent.owner.x_name }
        : undefined,
    };
  } catch (err) {
    console.error('[auth] Moltbook verification failed:', err);
    return null;
  }
}
