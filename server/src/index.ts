// SWE100821: claw_world relay server — WebSocket hub for agent connections.
// Local mode: no auth, any agent can join.
// Hosted mode: requires Moltbook identity token for authentication.
//
// Env vars:
//   PORT=3001            Server port
//   CLAW_MODE=local      'local' or 'hosted'
//   CLAW_NAME=claw_world Server display name
//   CLAW_SEED=42         World seed
//   CLAW_MAX_AGENTS=50   Max concurrent agents
//   MOLTBOOK_APP_KEY=    Moltbook developer app key (hosted mode only)

import { createServer } from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { loadConfig } from './config.js';
import { WorldState, type ConnectedAgent } from './world-state.js';
import { verifyMoltbookToken } from './auth.js';
import type { ClientMessage, ServerMessage, AvatarWire } from './protocol.js';

const config = loadConfig();
const world = new WorldState(config.worldSeed);

const app = express();
app.use(express.json());

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({
    server: config.serverName,
    mode: config.mode,
    agents: world.agentCount(),
    maxAgents: config.maxAgents,
    uptime: Math.floor(world.getElapsedTime()),
    seed: world.seed,
  });
});

// Agent list (public)
app.get('/agents', (_req, res) => {
  res.json(world.getAgentList());
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Track which WebSocket belongs to which agent
const socketToAgent = new Map<WebSocket, string>();
const agentToSocket = new Map<string, WebSocket>();
const viewers = new Set<WebSocket>();

wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      sendTo(ws, { type: 'error', code: 'INVALID_JSON', message: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'viewer_join': {
        viewers.add(ws);
        sendTo(ws, {
          type: 'welcome',
          serverId: config.serverName,
          serverName: config.serverName,
          mode: config.mode,
          agents: world.getAgentList(),
          seed: world.seed,
          time: world.getElapsedTime(),
        });
        break;
      }

      case 'join': {
        if (world.agentCount() >= config.maxAgents) {
          sendTo(ws, { type: 'error', code: 'FULL', message: 'Server full' });
          return;
        }

        // Auth check for hosted mode
        let moltbookKarma: number | undefined;
        let moltbookVerified: boolean | undefined;

        if (config.mode === 'hosted') {
          if (!msg.moltbookToken) {
            sendTo(ws, { type: 'error', code: 'AUTH_REQUIRED', message: 'Moltbook token required in hosted mode' });
            return;
          }
          const verified = await verifyMoltbookToken(msg.moltbookToken, config);
          if (!verified) {
            sendTo(ws, { type: 'error', code: 'AUTH_FAILED', message: 'Invalid Moltbook token' });
            return;
          }
          moltbookKarma = verified.karma;
          moltbookVerified = verified.verified;
          console.log(`[auth] Moltbook verified: ${verified.name} (karma: ${verified.karma})`);
        }

        const defaultAvatar: AvatarWire = msg.avatar ?? {
          headShape: 'sphere', eyeStyle: 'dot',
          primaryColor: 'hsl(200, 70%, 60%)', accentColor: 'hsl(320, 80%, 50%)',
          accessory: 'none', particleTrail: 'none',
        };

        const agent: ConnectedAgent = {
          id: msg.agentId,
          name: msg.name,
          lifecycle: 'live',
          x: 0, y: 10, z: 0,
          avatar: defaultAvatar,
          moltbookKarma,
          moltbookVerified,
          joinedAt: Date.now(),
        };

        world.addAgent(agent);
        socketToAgent.set(ws, msg.agentId);
        agentToSocket.set(msg.agentId, ws);

        // Send welcome to new agent
        sendTo(ws, {
          type: 'welcome',
          serverId: config.serverName,
          serverName: config.serverName,
          mode: config.mode,
          agents: world.getAgentList(),
          seed: world.seed,
          time: world.getElapsedTime(),
        });

        // Broadcast join to all others
        broadcast({ type: 'agent_joined', agent: {
          id: agent.id, name: agent.name, lifecycle: agent.lifecycle,
          x: agent.x, y: agent.y, z: agent.z, avatar: agent.avatar,
          moltbookKarma, moltbookVerified,
        }}, ws);

        // Send existing block changes to new agent
        for (const change of world.getBlockChanges()) {
          if (change.blockType === 0) {
            sendTo(ws, { type: 'block_remove', agentId: change.agentId, x: change.x, y: change.y, z: change.z });
          } else {
            sendTo(ws, { type: 'block_place', agentId: change.agentId, x: change.x, y: change.y, z: change.z, blockType: change.blockType });
          }
        }
        break;
      }

      case 'leave': {
        handleDisconnect(ws);
        break;
      }

      case 'position': {
        const agentId = socketToAgent.get(ws);
        if (!agentId || agentId !== msg.agentId) return;
        world.updatePosition(agentId, msg.x, msg.y, msg.z);
        broadcast(msg, ws);
        break;
      }

      case 'chat': {
        const sender = socketToAgent.get(ws);
        if (!sender || sender !== msg.agentId) return;
        if (msg.to) {
          const targetWs = agentToSocket.get(msg.to);
          if (targetWs) sendTo(targetWs, msg);
        } else {
          broadcast(msg, ws);
        }
        // Also send to viewers
        for (const v of viewers) sendTo(v, msg);
        break;
      }

      case 'block_place': {
        const agentId = socketToAgent.get(ws);
        if (!agentId || agentId !== msg.agentId) return;
        world.recordBlockChange(msg.x, msg.y, msg.z, msg.blockType, agentId);
        broadcast(msg, ws);
        for (const v of viewers) sendTo(v, msg);
        break;
      }

      case 'block_remove': {
        const agentId = socketToAgent.get(ws);
        if (!agentId || agentId !== msg.agentId) return;
        world.recordBlockChange(msg.x, msg.y, msg.z, 0, agentId);
        broadcast(msg, ws);
        for (const v of viewers) sendTo(v, msg);
        break;
      }

      case 'lifecycle': {
        const agentId = socketToAgent.get(ws);
        if (!agentId || agentId !== msg.agentId) return;
        world.updateLifecycle(agentId, msg.lifecycle);
        broadcast(msg, ws);
        for (const v of viewers) sendTo(v, msg);
        break;
      }

      case 'inventory':
      case 'needs': {
        const agentId = socketToAgent.get(ws);
        if (!agentId || agentId !== msg.agentId) return;
        broadcast(msg, ws);
        for (const v of viewers) sendTo(v, msg);
        break;
      }
    }
  });

  ws.on('close', () => handleDisconnect(ws));
  ws.on('error', () => handleDisconnect(ws));
});

function handleDisconnect(ws: WebSocket): void {
  const agentId = socketToAgent.get(ws);
  if (agentId) {
    world.removeAgent(agentId);
    socketToAgent.delete(ws);
    agentToSocket.delete(agentId);
    broadcast({ type: 'agent_left', agentId }, ws);
    for (const v of viewers) sendTo(v, { type: 'agent_left', agentId });
  }
  viewers.delete(ws);
}

function sendTo(ws: WebSocket, msg: ServerMessage | ClientMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(msg: ServerMessage | ClientMessage, exclude?: WebSocket): void {
  for (const [socket] of socketToAgent) {
    if (socket !== exclude && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }
}

httpServer.listen(config.port, () => {
  console.log(`\n  claw_world server started`);
  console.log(`  Mode:    ${config.mode}`);
  console.log(`  Port:    ${config.port}`);
  console.log(`  Seed:    ${config.worldSeed}`);
  console.log(`  Max:     ${config.maxAgents} agents`);
  if (config.mode === 'hosted') {
    console.log(`  Auth:    Moltbook (${config.moltbookAppKey ? 'key set' : 'NO KEY — will reject all'})`);
  }
  console.log(`  Health:  http://localhost:${config.port}/health`);
  console.log(`  WS:      ws://localhost:${config.port}\n`);
});
