// Presence server: one in-memory room per id, JSON messages over WebSocket.
// Mirrors the observed sansatemple behaviour: 100 rooms, 100 visitors each,
// seat reservations, and practice events relayed to everyone in the room.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, join as joinPath, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.RITRO_PORT ?? process.env.PORT ?? 8787);
const ROOM_COUNT = 100;
const CAPACITY = 100;
const CUSHIONS = 18;
const RESIDENT_SEATS = [0, 2, 5, 9]; // held by the four resident practitioners
const NAME_COUNT = 24;
const COLORS = ['#bdc5ad', '#cbbdab', '#b9c8c2', '#c8bd9c', '#c9b3b8', '#b4bfd0', '#d1c3a3', '#b8c9b0'];
const POSES = new Set(['walk', 'kneel', 'beads', 'idle']);
const ACTS = new Set(['hello', 'bow', 'stand', 'bead', 'incense']);

const roomIds = new Set(Array.from({ length: ROOM_COUNT }, (_, i) => (i === 0 ? 'room' : `room-${String(i + 1).padStart(2, '0')}`)));
/** @type {Map<string, Map<string, {ws: import('ws').WebSocket, v: any}>>} */
const rooms = new Map();

function roomOf(id) {
  let r = rooms.get(id);
  if (!r) rooms.set(id, (r = new Map()));
  return r;
}

function broadcast(room, msg, exceptId) {
  const data = JSON.stringify(msg);
  for (const [id, { ws }] of room) if (id !== exceptId && ws.readyState === 1) ws.send(data);
}

const finite = (n, lim) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= lim;

const http = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/rooms') {
    const counts = {};
    for (const id of roomIds) counts[id] = rooms.get(id)?.size ?? 0;
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ capacity: CAPACITY, counts }));
    return;
  }
  serveStatic(url.pathname, res);
});

// In production the same process serves the built site from dist/.
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

async function serveStatic(pathname, res) {
  let file = normalize(joinPath(DIST, decodeURIComponent(pathname)));
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = joinPath(file, 'index.html');
  } catch {
    file = joinPath(DIST, 'index.html'); // unknown paths fall back to the app shell
  }
  try {
    const body = await readFile(file);
    const hashed = file.includes(`${sep}assets${sep}`);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}

const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

http.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname !== '/presence') return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
    join(ws, url.searchParams.get('room') ?? 'room');
  });
});

function join(ws, roomId) {
  if (!roomIds.has(roomId)) roomId = 'room';
  const room = roomOf(roomId);
  if (room.size >= CAPACITY) {
    ws.send(JSON.stringify({ type: 'full' }));
    ws.close(1000, 'Full');
    return;
  }
  const id = randomUUID().slice(0, 8);
  const v = {
    id,
    name: Math.floor(Math.random() * NAME_COUNT),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    x: (Math.random() - 0.5) * 1.6, z: 7 + Math.random(), yaw: Math.PI,
    pose: 'idle',
    seat: null,
  };
  room.set(id, { ws, v });
  ws.send(JSON.stringify({ type: 'snapshot', room: roomId, selfId: id, capacity: CAPACITY, visitors: [...room.values()].map((e) => e.v) }));
  broadcast(room, { type: 'join', visitor: v }, id);

  let lastMove = 0;
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(String(raw)); } catch { return; }
    if (!m || typeof m !== 'object') return;
    switch (m.type) {
      case 'move': {
        const now = Date.now();
        if (now - lastMove < 60) return;
        lastMove = now;
        if (!finite(m.x, 40) || !finite(m.z, 40) || !finite(m.yaw, 100) || !POSES.has(m.pose)) return;
        Object.assign(v, { x: m.x, z: m.z, yaw: m.yaw, pose: m.pose });
        if (m.pose === 'walk' && v.seat !== null) {
          v.seat = null;
          broadcast(room, { type: 'seat', id, seat: null }, id);
        }
        broadcast(room, { type: 'move', id, x: v.x, z: v.z, yaw: v.yaw, pose: v.pose }, id);
        break;
      }
      case 'act':
        if (ACTS.has(m.act)) broadcast(room, { type: 'act', id, act: m.act }, id);
        break;
      case 'seat': {
        const seat = m.seat;
        const taken = RESIDENT_SEATS.includes(seat) || [...room.values()].some((e) => e.v.seat === seat && e.v.id !== id);
        if (!Number.isInteger(seat) || seat < 0 || seat >= CUSHIONS || taken) {
          ws.send(JSON.stringify({ type: 'seat-unavailable' }));
          break;
        }
        v.seat = seat;
        ws.send(JSON.stringify({ type: 'seat-granted', seat }));
        broadcast(room, { type: 'seat', id, seat }, id);
        break;
      }
      case 'stand':
        v.seat = null;
        broadcast(room, { type: 'seat', id, seat: null }, id);
        break;
      case 'leave':
        ws.close(1000, 'Leaving');
        break;
    }
  });
  ws.on('close', () => {
    room.delete(id);
    broadcast(room, { type: 'leave', id });
    if (room.size === 0) rooms.delete(roomId);
  });
}

// drop sockets that stopped answering pings
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

http.listen(PORT, () => console.log(`presence server on :${PORT}`));
