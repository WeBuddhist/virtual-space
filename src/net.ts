import type { FlowerId } from '../shared/offerings';
import type { BowStyle } from './rooms/types';

// Presence client. Message shapes follow the observed sansatemple protocol
// (snapshot / move / seat / leave + practice events), carried as JSON.

export type NetPose = 'walk' | 'kneel' | 'beads' | 'idle';
export type Act = 'hello' | 'bow' | 'stand' | 'bead' | 'incense' | 'flowers';
/** what an offering was and where: the flower kind, and the shower centre or incense holder */
export interface ActDetail { item?: FlowerId; at?: [number, number, number] }

export interface Visitor {
  id: string;
  name: number;
  color: string;
  x: number; z: number; yaw: number;
  pose: NetPose;
  seat: number | null;
  /** proximity voice: 0 off, 1 listening, 2 speaking */
  voice?: VoiceState;
}

export type VoiceState = 0 | 1 | 2;
/** WebRTC connection setup relayed through the room: a description or an ICE candidate */
export type RtcSignal = { sdp: RTCSessionDescriptionInit } | { candidate: RTCIceCandidateInit | null };

export type ServerMsg =
  | { type: 'snapshot'; room: string; selfId: string; capacity: number; visitors: Visitor[] }
  | { type: 'join'; visitor: Visitor }
  | { type: 'leave'; id: string }
  | { type: 'move'; id: string; x: number; z: number; yaw: number; pose: NetPose }
  | ({ type: 'act'; id: string; act: Act; style?: BowStyle } & ActDetail)
  | { type: 'seat'; id: string; seat: number | null }
  | { type: 'seat-granted'; seat: number }
  | { type: 'seat-unavailable' }
  | { type: 'voice'; id: string; state: VoiceState }
  | { type: 'rtc'; from: string; data: RtcSignal }
  | { type: 'full' };

export type Status = 'connecting' | 'online' | 'offline' | 'full';

export interface NetCallbacks {
  onMessage(msg: ServerMsg): void;
  onStatus(s: Status): void;
}

export class Net {
  private socket?: WebSocket;
  private retry = 0;
  private retryTimer?: number;
  private pingTimer?: number;
  private moveTimer?: number;
  private pendingMove?: { x: number; z: number; yaw: number; pose: NetPose };
  private lastMove = '';
  private closed = false;
  status: Status = 'connecting';
  selfId = '';

  constructor(public room: string, private cb: NetCallbacks) {}

  connect() {
    if (this.closed) return;
    clearTimeout(this.retryTimer);
    this.setStatus('connecting');
    const url = new URL('/presence', location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('room', this.room);
    const ws = new WebSocket(url);
    this.socket = ws;
    ws.addEventListener('open', () => {
      this.retry = 0;
      // heartbeat: the server drops sockets that stay silent for 90s
      clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 20_000);
    });
    ws.addEventListener('message', (e) => {
      let msg: ServerMsg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type === 'snapshot') {
        this.selfId = msg.selfId;
        this.lastMove = '';
        this.setStatus('online');
      }
      if (msg.type === 'full') {
        this.closed = true;
        this.setStatus('full');
      }
      this.cb.onMessage(msg);
    });
    ws.addEventListener('close', () => {
      if (this.socket !== ws) return;
      clearInterval(this.pingTimer);
      if (this.closed) return;
      this.setStatus('offline');
      const delay = Math.min(15_000, 800 * 2 ** this.retry++);
      this.retryTimer = window.setTimeout(() => this.connect(), delay);
    });
  }

  private setStatus(s: Status) {
    if (this.status === s) return;
    this.status = s;
    this.cb.onStatus(s);
  }

  private send(obj: object) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(obj));
  }

  /** coalesced: at most ~10 updates per second, and only when something changed */
  move(x: number, z: number, yaw: number, pose: NetPose) {
    this.pendingMove = { x: +x.toFixed(2), z: +z.toFixed(2), yaw: +yaw.toFixed(2), pose };
    if (this.moveTimer) return;
    this.moveTimer = window.setTimeout(() => {
      this.moveTimer = undefined;
      const m = this.pendingMove!;
      const key = `${m.x},${m.z},${m.yaw},${m.pose}`;
      if (key === this.lastMove) return;
      this.lastMove = key;
      this.send({ type: 'move', ...m });
    }, 100);
  }

  act(act: Act, style?: BowStyle, detail: ActDetail = {}) { this.send({ type: 'act', act, style, ...detail }); }
  seat(seat: number) { this.send({ type: 'seat', seat }); }
  voice(state: VoiceState) { this.send({ type: 'voice', state }); }
  rtc(to: string, data: RtcSignal) { this.send({ type: 'rtc', to, data }); }
  stand() { this.send({ type: 'stand' }); }

  close() {
    this.closed = true;
    clearTimeout(this.retryTimer);
    clearInterval(this.pingTimer);
    this.send({ type: 'leave' });
    this.socket?.close(1000, 'Leaving');
  }
}

export async function fetchRoomCounts(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch('/rooms');
    if (!res.ok) return null;
    return (await res.json()).counts;
  } catch {
    return null;
  }
}
