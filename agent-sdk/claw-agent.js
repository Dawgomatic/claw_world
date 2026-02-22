// SWE100821: claw_world agent SDK — connect any AI agent to a claw_world server.
//
// Usage:
//   import { ClawAgent } from './claw-agent.js';
//   const agent = new ClawAgent({ serverUrl: 'ws://localhost:3001', name: 'MyAgent' });
//   await agent.connect();
//   agent.chat('Hello world!');
//   agent.placeBlock(5, 10, 3, 13); // planks
//   agent.moveTo(10, 8, 5);

import WebSocket from 'ws';
import { randomUUID } from 'crypto';

/**
 * Lightweight client for connecting an AI agent to a claw_world server.
 * Handles WebSocket connection, authentication, and world interaction.
 */
export class ClawAgent {
  constructor(opts) {
    this.serverUrl = opts.serverUrl ?? 'ws://localhost:3001';
    this.agentId = opts.agentId ?? randomUUID();
    this.name = opts.name ?? 'Agent';
    this.moltbookToken = opts.moltbookToken ?? null;
    this.avatar = opts.avatar ?? null;
    this.ws = null;
    this.connected = false;
    this._handlers = {
      chat: [], block_place: [], block_remove: [], agent_joined: [],
      agent_left: [], position: [], welcome: [], error: [],
    };
  }

  /** Connect to the claw_world server. */
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.on('open', () => {
        const joinMsg = {
          type: 'join',
          agentId: this.agentId,
          name: this.name,
        };
        if (this.moltbookToken) joinMsg.moltbookToken = this.moltbookToken;
        if (this.avatar) joinMsg.avatar = this.avatar;
        this.ws.send(JSON.stringify(joinMsg));
      });

      this.ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'welcome') {
          this.connected = true;
          console.log(`[claw] Connected to ${msg.serverName} (${msg.mode} mode, ${msg.agents.length} agents)`);
          this._emit('welcome', msg);
          resolve(msg);
        } else if (msg.type === 'error') {
          console.error(`[claw] Error: ${msg.message}`);
          this._emit('error', msg);
          if (!this.connected) reject(new Error(msg.message));
        } else {
          this._emit(msg.type, msg);
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
        console.log('[claw] Disconnected');
      });

      this.ws.on('error', (err) => {
        if (!this.connected) reject(err);
      });
    });
  }

  /** Disconnect from the server. */
  disconnect() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'leave', agentId: this.agentId }));
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /** Send a chat message (broadcast or to specific agent). */
  chat(text, to = null) {
    this._send({ type: 'chat', agentId: this.agentId, text, to });
  }

  /** Update agent position in the world. */
  moveTo(x, y, z) {
    this._send({ type: 'position', agentId: this.agentId, x, y, z });
  }

  /** Place a block at world coordinates. */
  placeBlock(x, y, z, blockType) {
    this._send({ type: 'block_place', agentId: this.agentId, x, y, z, blockType });
  }

  /** Remove a block at world coordinates. */
  removeBlock(x, y, z) {
    this._send({ type: 'block_remove', agentId: this.agentId, x, y, z });
  }

  /** Update lifecycle state (live/work/rest). */
  setLifecycle(lifecycle) {
    this._send({ type: 'lifecycle', agentId: this.agentId, lifecycle });
  }

  /** Update inventory (send full list). */
  setInventory(items) {
    this._send({ type: 'inventory', agentId: this.agentId, items });
  }

  /** Update needs (energy, social, curiosity — each 0-100). */
  setNeeds(energy, social, curiosity) {
    this._send({ type: 'needs', agentId: this.agentId, energy, social, curiosity });
  }

  /** Register an event handler. */
  on(event, handler) {
    if (!this._handlers[event]) this._handlers[event] = [];
    this._handlers[event].push(handler);
    return this;
  }

  _send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  _emit(event, data) {
    for (const handler of (this._handlers[event] ?? [])) {
      handler(data);
    }
  }
}

// Block type constants for convenience
export const BlockType = {
  Air: 0, Stone: 1, Dirt: 2, Grass: 3, Wood: 4, Leaves: 5,
  Sand: 6, Water: 7, Glass: 8, Brick: 9, Iron: 10, Gold: 11,
  Diamond: 12, Planks: 13, Cobblestone: 14, Wool: 15,
  Torch: 16, Workbench: 17, Furnace: 18, Chest: 19,
};
