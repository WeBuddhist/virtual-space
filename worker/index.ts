// Cloudflare Worker: serves the built site, routes /presence to one Durable Object
// per room, and answers /rooms from a single Lobby object that rooms report to.
// Mirrors the observed sansatemple behaviour: 100 rooms, 100 visitors each,
// seat reservations, and practice events relayed to everyone in the room.
import { DurableObject } from 'cloudflare:workers';
import { ALL_ROOM_IDS, ROOM_CAPACITY as CAPACITY, SEATING, parseRoom } from '../shared/rooms';

interface Env {
  ASSETS: Fetcher;
  ROOM: DurableObjectNamespace<Room>;
  LOBBY: DurableObjectNamespace<Lobby>;
}

const NAME_COUNT = 24;
const COLORS = ['#bdc5ad', '#cbbdab', '#b9c8c2', '#c8bd9c', '#c9b3b8', '#b4bfd0', '#d1c3a3', '#b8c9b0'];
const POSES = new Set(['walk', 'kneel', 'beads', 'idle']);
const ACTS = new Set(['hello', 'bow', 'stand', 'bead', 'incense']);
const ROOM_IDS = ALL_ROOM_IDS;
const ROOM_SET = new Set(ROOM_IDS);
const DEFAULT_ROOM = ROOM_IDS[0];

interface Visitor {
  id: string; name: number; color: string;
  x: number; z: number; yaw: number;
  pose: string; seat: number | null;
}
/** per-socket state, kept as a hibernation attachment */
interface Attachment { room: string; v: Visitor; lastMove: number; joined: number }

// clients ping every 20s; the runtime answers without waking the room, and an
// alarm sweeps sockets that went silent (e.g. a handshake abandoned mid-reload)
const STALE_MS = 90_000;
const SWEEP_MS = 60_000;

const finite = (n: unknown, lim: number): n is number => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= lim;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/presence') {
      if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      const room = ROOM_SET.has(url.searchParams.get('room') ?? '') ? url.searchParams.get('room')! : DEFAULT_ROOM;
      const forward = new URL(req.url);
      forward.searchParams.set('room', room);
      return env.ROOM.get(env.ROOM.idFromName(room)).fetch(new Request(forward, req));
    }
    if (url.pathname === '/rooms') {
      const stored = await env.LOBBY.get(env.LOBBY.idFromName('lobby')).counts();
      const counts = Object.fromEntries(ROOM_IDS.map((id) => [id, stored[id] ?? 0]));
      return Response.json({ capacity: CAPACITY, counts }, { headers: { 'cache-control': 'no-store' } });
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;

export class Room extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async alarm() {
    const now = Date.now();
    for (const ws of this.sockets()) {
      const a = this.attachment(ws)!;
      const lastPing = this.ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() ?? 0;
      if (now - Math.max(lastPing, a.joined, a.lastMove) > STALE_MS) {
        try { ws.close(4000, 'Stale'); } catch { /* already gone */ }
        await this.depart(ws);
      }
    }
    const live = this.sockets();
    if (live.length) {
      // refresh the lobby so a room that is restarted mid-visit doesn't leave a stale count
      await this.report(this.attachment(live[0])!.room);
      await this.ctx.storage.setAlarm(now + SWEEP_MS);
    }
  }

  async fetch(req: Request): Promise<Response> {
    const room = new URL(req.url).searchParams.get('room') ?? DEFAULT_ROOM;
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    const others = this.sockets();
    if (others.length > CAPACITY) {
      server.send(JSON.stringify({ type: 'full' }));
      server.close(1000, 'Full');
      return new Response(null, { status: 101, webSocket: client });
    }
    const v: Visitor = {
      id: crypto.randomUUID().slice(0, 8),
      name: Math.floor(Math.random() * NAME_COUNT),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      x: (Math.random() - 0.5) * 1.6, z: 7 + Math.random(), yaw: Math.PI,
      pose: 'idle',
      seat: null,
    };
    server.serializeAttachment({ room, v, lastMove: 0, joined: Date.now() } satisfies Attachment);
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + SWEEP_MS);
    const visitors = this.sockets().map((ws) => this.attachment(ws)?.v).filter((x): x is Visitor => !!x);
    server.send(JSON.stringify({ type: 'snapshot', room, selfId: v.id, capacity: CAPACITY, visitors }));
    this.broadcast({ type: 'join', visitor: v }, server);
    await this.report(room);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const a = this.attachment(ws);
    if (!a || typeof raw !== 'string') return;
    let m: any;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    const v = a.v;
    switch (m.type) {
      case 'move': {
        const now = Date.now();
        if (now - a.lastMove < 60) return;
        if (!finite(m.x, 40) || !finite(m.z, 40) || !finite(m.yaw, 100) || !POSES.has(m.pose)) return;
        a.lastMove = now;
        Object.assign(v, { x: m.x, z: m.z, yaw: m.yaw, pose: m.pose });
        if (m.pose === 'walk' && v.seat !== null) {
          v.seat = null;
          this.broadcast({ type: 'seat', id: v.id, seat: null }, ws);
        }
        ws.serializeAttachment(a);
        this.broadcast({ type: 'move', id: v.id, x: v.x, z: v.z, yaw: v.yaw, pose: v.pose }, ws);
        break;
      }
      case 'act':
        if (ACTS.has(m.act)) this.broadcast({ type: 'act', id: v.id, act: m.act }, ws);
        break;
      case 'seat': {
        const seat = m.seat;
        // each temple has its own cushions, some held by resident practitioners
        const seating = SEATING[parseRoom(a.room)!.temple];
        const taken = seating.residents.includes(seat) || this.sockets().some((s) => s !== ws && this.attachment(s)?.v.seat === seat);
        if (!Number.isInteger(seat) || seat < 0 || seat >= seating.cushions || taken) {
          ws.send(JSON.stringify({ type: 'seat-unavailable' }));
          break;
        }
        v.seat = seat;
        ws.serializeAttachment(a);
        ws.send(JSON.stringify({ type: 'seat-granted', seat }));
        this.broadcast({ type: 'seat', id: v.id, seat }, ws);
        break;
      }
      case 'stand':
        v.seat = null;
        ws.serializeAttachment(a);
        this.broadcast({ type: 'seat', id: v.id, seat: null }, ws);
        break;
      case 'leave':
        ws.close(1000, 'Leaving');
        await this.depart(ws);
        break;
    }
  }

  async webSocketClose(ws: WebSocket) { await this.depart(ws); }
  async webSocketError(ws: WebSocket) { await this.depart(ws); }

  private async depart(ws: WebSocket) {
    const a = this.attachment(ws);
    if (!a || (a as Attachment & { gone?: boolean }).gone) return;
    ws.serializeAttachment({ ...a, gone: true });
    this.broadcast({ type: 'leave', id: a.v.id }, ws);
    await this.report(a.room, ws);
  }

  private attachment(ws: WebSocket) {
    return ws.deserializeAttachment() as (Attachment & { gone?: boolean }) | null;
  }

  /** live sockets, excluding ones that already left */
  private sockets() {
    return this.ctx.getWebSockets().filter((ws) => !this.attachment(ws)?.gone);
  }

  private broadcast(msg: object, except?: WebSocket) {
    const data = JSON.stringify(msg);
    for (const ws of this.sockets()) {
      if (ws === except) continue;
      try { ws.send(data); } catch { /* socket already closing */ }
    }
  }

  private async report(room: string, leaving?: WebSocket) {
    const n = this.sockets().filter((ws) => ws !== leaving).length;
    await this.env.LOBBY.get(this.env.LOBBY.idFromName('lobby')).setCount(room, n);
  }
}

/** keeps the visitor count of every room for the room picker; rooms re-report on each sweep */
export class Lobby extends DurableObject<Env> {
  async setCount(room: string, n: number) {
    if (n > 0) await this.ctx.storage.put(room, { n, at: Date.now() });
    else await this.ctx.storage.delete(room);
  }

  async counts(): Promise<Record<string, number>> {
    const fresh = Date.now() - SWEEP_MS * 2.5;
    const out: Record<string, number> = {};
    for (const [room, e] of await this.ctx.storage.list<{ n: number; at: number }>()) {
      if (e.at >= fresh) out[room] = e.n;
    }
    return out;
  }
}
