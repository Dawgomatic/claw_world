// SWE100821: Agent needs system — energy, social, curiosity drive agent behavior.
// Needs decay over time and are replenished by specific activities.
// Agents autonomously seek activities to satisfy their lowest need.

import type { AgentNeeds, AgentLifecycle } from '../bridge/protocol.ts';

export const DEFAULT_NEEDS: AgentNeeds = { energy: 100, social: 80, curiosity: 90 };

const DECAY_RATES: Record<keyof AgentNeeds, number> = {
  energy: 0.15,
  social: 0.08,
  curiosity: 0.05,
};

const REPLENISH: Record<AgentLifecycle, Partial<AgentNeeds>> = {
  rest: { energy: 0.8, social: 0, curiosity: 0.02 },
  live: { energy: -0.1, social: 0.5, curiosity: 0.15 },
  work: { energy: -0.2, social: 0.05, curiosity: 0.3 },
};

export function tickNeeds(needs: AgentNeeds, lifecycle: AgentLifecycle, dt: number): AgentNeeds {
  const replenish = REPLENISH[lifecycle];
  return {
    energy: clamp(needs.energy - DECAY_RATES.energy * dt + (replenish.energy ?? 0) * dt),
    social: clamp(needs.social - DECAY_RATES.social * dt + (replenish.social ?? 0) * dt),
    curiosity: clamp(needs.curiosity - DECAY_RATES.curiosity * dt + (replenish.curiosity ?? 0) * dt),
  };
}

/** Determine what the agent should do based on needs. */
export function suggestActivity(needs: AgentNeeds): AgentLifecycle {
  if (needs.energy < 20) return 'rest';
  if (needs.social < 25) return 'live';
  if (needs.curiosity < 30) return 'work';

  const lowest = Math.min(needs.energy, needs.social, needs.curiosity);
  if (lowest === needs.energy) return 'rest';
  if (lowest === needs.social) return 'live';
  return 'work';
}

/** Boost a specific need (e.g., after building, trading, chatting). */
export function boostNeed(needs: AgentNeeds, key: keyof AgentNeeds, amount: number): AgentNeeds {
  return { ...needs, [key]: clamp(needs[key] + amount) };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}
