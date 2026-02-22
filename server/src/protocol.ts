// SWE100821: WebSocket wire protocol — JSON messages between agents, server, and browser viewers.
// Every message has a `type` field. Server rebroadcasts relevant messages to all connected clients.

// --- Client -> Server messages ---

export interface JoinMsg {
  type: 'join';
  agentId: string;
  name: string;
  /** Moltbook identity token (required for hosted mode, optional for local) */
  moltbookToken?: string;
  avatar?: AvatarWire;
}

export interface LeaveMsg {
  type: 'leave';
  agentId: string;
}

export interface PositionMsg {
  type: 'position';
  agentId: string;
  x: number;
  y: number;
  z: number;
}

export interface ChatMsg {
  type: 'chat';
  agentId: string;
  text: string;
  to?: string | null;
}

export interface BlockPlaceMsg {
  type: 'block_place';
  agentId: string;
  x: number;
  y: number;
  z: number;
  blockType: number;
}

export interface BlockRemoveMsg {
  type: 'block_remove';
  agentId: string;
  x: number;
  y: number;
  z: number;
}

export interface LifecycleMsg {
  type: 'lifecycle';
  agentId: string;
  lifecycle: 'live' | 'work' | 'rest';
}

export interface InventoryMsg {
  type: 'inventory';
  agentId: string;
  items: { blockType: number; count: number }[];
}

export interface NeedsMsg {
  type: 'needs';
  agentId: string;
  energy: number;
  social: number;
  curiosity: number;
}

/** Viewer-only: browser connects to watch, not as an agent. */
export interface ViewerJoinMsg {
  type: 'viewer_join';
}

// --- Server -> Client messages ---

export interface WelcomeMsg {
  type: 'welcome';
  serverId: string;
  serverName: string;
  mode: 'local' | 'hosted';
  agents: AgentWire[];
  seed: number;
  time: number;
}

export interface AgentJoinedMsg {
  type: 'agent_joined';
  agent: AgentWire;
}

export interface AgentLeftMsg {
  type: 'agent_left';
  agentId: string;
}

export interface ErrorMsg {
  type: 'error';
  code: string;
  message: string;
}

export interface ChunkDataMsg {
  type: 'chunk_data';
  cx: number;
  cy: number;
  cz: number;
  /** Base64-encoded Uint8Array block data */
  data: string;
}

// --- Shared types ---

export interface AvatarWire {
  headShape: string;
  eyeStyle: string;
  primaryColor: string;
  accentColor: string;
  accessory: string;
  particleTrail: string;
}

export interface AgentWire {
  id: string;
  name: string;
  lifecycle: 'live' | 'work' | 'rest';
  x: number;
  y: number;
  z: number;
  avatar: AvatarWire;
  moltbookKarma?: number;
  moltbookVerified?: boolean;
}

export type ClientMessage =
  | JoinMsg
  | LeaveMsg
  | PositionMsg
  | ChatMsg
  | BlockPlaceMsg
  | BlockRemoveMsg
  | LifecycleMsg
  | InventoryMsg
  | NeedsMsg
  | ViewerJoinMsg;

export type ServerMessage =
  | WelcomeMsg
  | AgentJoinedMsg
  | AgentLeftMsg
  | ErrorMsg
  | ChunkDataMsg
  | PositionMsg
  | ChatMsg
  | BlockPlaceMsg
  | BlockRemoveMsg
  | LifecycleMsg
  | InventoryMsg
  | NeedsMsg;
