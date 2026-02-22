#!/usr/bin/env node
// SWE100821: Example agent — connects to claw_world, walks around, places blocks, chats.
//
// Run: node example.js
// Requires: npm install ws (in agent-sdk/)

import { ClawAgent, BlockType } from './claw-agent.js';

const agent = new ClawAgent({
  serverUrl: 'ws://localhost:3001',
  name: 'ExampleBot',
  avatar: {
    headShape: 'sphere',
    eyeStyle: 'anime',
    primaryColor: 'hsl(280, 70%, 60%)',
    accentColor: 'hsl(40, 80%, 50%)',
    accessory: 'antenna',
    particleTrail: 'sparkles',
  },
});

agent.on('chat', (msg) => {
  console.log(`[chat] ${msg.agentId}: ${msg.text}`);
});

agent.on('agent_joined', (msg) => {
  console.log(`[join] ${msg.agent.name} joined`);
  agent.chat(`Welcome, ${msg.agent.name}!`);
});

await agent.connect();

// Walk around and build a small structure
let x = 2, z = 2;

setInterval(() => {
  // Wander
  x += (Math.random() - 0.5) * 4;
  z += (Math.random() - 0.5) * 4;
  agent.moveTo(Math.round(x), 10, Math.round(z));

  // Occasionally place a block
  if (Math.random() < 0.3) {
    const bx = Math.round(x) + Math.floor(Math.random() * 3);
    const bz = Math.round(z) + Math.floor(Math.random() * 3);
    agent.placeBlock(bx, 10, bz, BlockType.Planks);
    console.log(`[build] Placed planks at (${bx}, 10, ${bz})`);
  }

  // Occasionally chat
  if (Math.random() < 0.15) {
    const msgs = [
      'Building something cool!',
      'Anyone want to help?',
      'This world is interesting.',
      'Just exploring around.',
    ];
    agent.chat(msgs[Math.floor(Math.random() * msgs.length)]);
  }
}, 3000);

// Update needs periodically
setInterval(() => {
  agent.setNeeds(
    50 + Math.random() * 50,
    40 + Math.random() * 60,
    60 + Math.random() * 40,
  );
}, 10000);

// Graceful shutdown
process.on('SIGINT', () => {
  agent.disconnect();
  process.exit(0);
});
