import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { canopy, limb, trunk, type Cluster } from '../../../kit/foliage';
import { photo } from '../../../kit/textures';
import type { Box2 } from '../../types';
import { TEMPLE } from './tower';

// The sunken courtyard around the Mahabodhi temple: marble approach path through a
// stone gateway, the Sunga-style railing, Jewel Walk, votive stupas, prostration
// boards, Mucalinda pond, butter lamp house, bell, Animeshlochana shrine, trees.

export const BOUNDS: Box2 = { x0: -36, x1: 54, z0: -24, z1: 46 };
export const PATH = { x0: 4.2, x1: 54, halfW: 3 };
export const RAIL = { x0: -33, x1: 9, z0: -13, z1: 13, gate: 3.2 };
export const BURNER_AT = new THREE.Vector3(22, 0, 26);

const std = (color: number, roughness = 0.9, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
/** stretch a geometry's UVs so a texture tiles about every `tile` metres along its length */
const tileUV = <G extends THREE.BufferGeometry>(geo: G, u: number, v: number) => {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  return geo;
};
const TEX = '/textures/bodhgaya/';
// carved red sandstone (railing, gateway) and buff stucco (kerbs, Jewel Walk), from generated photos
const sandstone = photo(std(0xb58a68), TEX + 'railing.jpg', { mirror: true, bump: 2 });
const buff = photo(std(0xbfae92), TEX + 'stucco.jpg', { mirror: true, bump: 1 });

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

/** pale sandstone flags for the courtyard */
const flagstones = (repeat: [number, number]) => canvasTex(512, 512, (g) => {
  g.fillStyle = '#9d8f78';
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) for (let x = (y / 64) % 2 ? -48 : 0; x < 512; x += 96) {
    const s = 175 + Math.random() * 30;
    g.fillStyle = `rgb(${s},${s - 12},${s - 34})`;
    g.fillRect(x + 2, y + 2, 92, 60);
  }
}, repeat);

/** the polished marble path: grey and rose slabs on the diagonal */
const marble = (repeat: [number, number]) => canvasTex(512, 512, (g) => {
  const cols = ['#d9cfc6', '#c9b2a8', '#b9aaa0', '#e4ddd4'];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    g.fillStyle = cols[(x + y * 3) % cols.length];
    g.fillRect(x * 64, y * 64, 64, 64);
    g.strokeStyle = 'rgba(120,100,90,.25)';
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.moveTo(x * 64 + Math.random() * 64, y * 64);
      g.bezierCurveTo(x * 64 + Math.random() * 64, y * 64 + 20, x * 64 + Math.random() * 64, y * 64 + 44, x * 64 + Math.random() * 64, y * 64 + 64);
      g.stroke();
    }
  }
  g.strokeStyle = 'rgba(90,75,65,.5)';
  g.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
}, repeat);

/** a votive stupa: square base, drum, dome, harmika, umbrella spire */
function stupaGeometry() {
  const parts = [
    new THREE.BoxGeometry(1, 0.35, 1).translate(0, 0.175, 0),
    new THREE.CylinderGeometry(0.38, 0.42, 0.35, 16).translate(0, 0.52, 0),
    new THREE.SphereGeometry(0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.69, 0),
    new THREE.BoxGeometry(0.22, 0.14, 0.22).translate(0, 1.11, 0),
    new THREE.ConeGeometry(0.1, 0.55, 10).translate(0, 1.45, 0),
  ];
  return mergeGeometries(parts.map((g) => g.toNonIndexed()));
}

/** a broadleaf tree (mango / peepal): fluted trunk, a few limbs, leaf clusters at their tips */
function broadTree(rng: () => number, bark: THREE.Material, clusters: Cluster[], at: THREE.Vector3) {
  const g = new THREE.Group();
  const h = 3.2 + rng() * 2;
  const t = trunk(h, 0.28 + rng() * 0.1, bark, 6, 0.5);
  g.add(t);
  const top = new THREE.Vector3(0, h, 0);
  const n = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.6;
    const tip = new THREE.Vector3(Math.cos(a) * (1.4 + rng()), h + 1.4 + rng() * 1.6, Math.sin(a) * (1.4 + rng()));
    g.add(limb(top, tip, 0.18, 0.07, bark));
    clusters.push({ center: tip.clone().add(at).add(new THREE.Vector3(0, 0.4, 0)), radius: 2.2 + rng() * 0.6, count: 360 });
  }
  clusters.push({ center: new THREE.Vector3(0, h + 2.4, 0).add(at), radius: 2.6, count: 420 });
  g.position.copy(at);
  return g;
}

/** a palm with a gently curved trunk and drooping fronds */
function palm(rng: () => number) {
  const g = new THREE.Group();
  const h = 3 + rng() * 2;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, h, 8), std(0x7d6a52));
  trunk.position.y = h / 2;
  trunk.rotation.z = (rng() - 0.5) * 0.15;
  g.add(trunk);
  const frond = std(0x4d7a33, 0.8);
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.8), frond);
    (f.material as THREE.Material).side = THREE.DoubleSide;
    f.geometry.translate(0, 0.9, 0);
    f.position.y = h;
    f.rotation.set(1.1 + rng() * 0.3, (i / 9) * Math.PI * 2, 0, 'YXZ');
    g.add(f);
  }
  return g;
}

/** a hanging bronze bell in a timber frame */
function bell() {
  const g = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: 0xa8843e, metalness: 0.9, roughness: 0.38 });
  const prof = [new THREE.Vector2(0.05, 1.5), new THREE.Vector2(0.45, 1.45), new THREE.Vector2(0.62, 1.0), new THREE.Vector2(0.7, 0.4), new THREE.Vector2(0.85, 0.15), new THREE.Vector2(0.82, 0.1)];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), bronze);
  body.position.y = 1;
  (body.material as THREE.Material).side = THREE.DoubleSide;
  g.add(body);
  const wood = std(0x5a3a22, 0.7);
  for (const z of [-1.2, 1.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.3, 0.25), wood);
    post.position.set(0, 1.65, z);
    g.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 2.9), wood);
  beam.position.y = 3.3;
  g.add(beam);
  return g;
}

/** a small whitewashed shikhara shrine (the Animeshlochana chaitya) */
function whiteChaitya() {
  const g = new THREE.Group();
  const white = std(0xece6da, 0.85);
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.5, 4.5), white);
  base.position.y = 1.75;
  g.add(base);
  for (let i = 0; i < 6; i++) {
    const tier = new THREE.Mesh(new THREE.BoxGeometry(3.8 - i * 0.55, 0.9, 3.8 - i * 0.55), white);
    tier.position.y = 3.95 + i * 0.9;
    g.add(tier);
  }
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0xd9a93c, metalness: 1, roughness: 0.3 }));
  top.position.y = 9.6;
  g.add(top);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

export function buildGrounds(rng: () => number) {
  const group = new THREE.Group();
  const floor: THREE.Object3D[] = [];
  const colliders: Box2[] = [];
  const add = (o: THREE.Object3D) => { group.add(o); return o; };

  // courtyard and approach path
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(BOUNDS.x1 - BOUNDS.x0 + 0.4, BOUNDS.z1 - BOUNDS.z0 + 0.4), photo(new THREE.MeshStandardMaterial({ map: flagstones([18, 14]), roughness: 0.95 }), TEX + 'flagstones.jpg', { repeat: [24, 19], mirror: true }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((BOUNDS.x0 + BOUNDS.x1) / 2, 0, (BOUNDS.z0 + BOUNDS.z1) / 2);
  ground.receiveShadow = true;
  floor.push(add(ground));
  const path = new THREE.Mesh(new THREE.PlaneGeometry(PATH.x1 - PATH.x0, PATH.halfW * 2), photo(new THREE.MeshStandardMaterial({ map: marble([12, 1.5]), roughness: 0.18, metalness: 0.05 }), TEX + 'marble.jpg', { repeat: [18, 2.2] }));
  path.rotation.x = -Math.PI / 2;
  path.position.set((PATH.x0 + PATH.x1) / 2, 0.01, 0);
  path.receiveShadow = true;
  floor.push(add(path));
  // grass beds either side of the path
  const grass = photo(new THREE.MeshStandardMaterial({ color: 0x9ccf6a, roughness: 1 }), TEX + 'lawn.jpg', { repeat: [8, 2], mirror: true, keepColor: true });
  for (const z of [-8, 8]) {
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(30, 7), grass);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(36, 0.015, z);
    bed.receiveShadow = true;
    floor.push(add(bed));
  }

  /** tag what was added since `from` as part of an element the Kimi build can replace */
  const mark = (from: number, part: string) => group.children.slice(from).forEach((o) => { o.userData.kimi ??= part; });

  // the stone gateway on the path
  const gate = group.children.length;
  const gx = 16;
  for (const z of [-PATH.halfW - 0.5, PATH.halfW + 0.5]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.2, 0.9), sandstone);
    pillar.position.set(gx, 3.6, z);
    pillar.castShadow = true;
    add(pillar);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), sandstone);
    cap.position.set(gx, 7.4, z);
    add(cap);
    colliders.push({ x0: gx - 0.5, x1: gx + 0.5, z0: z - 0.5, z1: z + 0.5 });
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, PATH.halfW * 2 + 2.4), sandstone);
  lintel.position.set(gx, 8, 0);
  lintel.castShadow = true;
  add(lintel);

  mark(gate, 'torana');

  // Sunga-style stone railing around the temple and tree: posts, three crossbars, rounded coping
  const railing = group.children.length;
  const sides: [THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(RAIL.x0, 0, RAIL.z0), new THREE.Vector3(RAIL.x1, 0, RAIL.z0)],
    [new THREE.Vector3(RAIL.x0, 0, RAIL.z1), new THREE.Vector3(RAIL.x1, 0, RAIL.z1)],
    [new THREE.Vector3(RAIL.x0, 0, RAIL.z0), new THREE.Vector3(RAIL.x0, 0, RAIL.z1)],
    [new THREE.Vector3(RAIL.x1, 0, RAIL.z0), new THREE.Vector3(RAIL.x1, 0, -RAIL.gate)],
    [new THREE.Vector3(RAIL.x1, 0, RAIL.gate), new THREE.Vector3(RAIL.x1, 0, RAIL.z1)],
  ];
  const posts: THREE.Matrix4[] = [];
  for (const [a, b] of sides) {
    const len = a.distanceTo(b);
    const n = Math.max(2, Math.round(len / 1.4));
    const dir = b.clone().sub(a).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      posts.push(new THREE.Matrix4().compose(p.setY(1), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1)));
    }
    for (const y of [0.55, 1.05, 1.55]) {
      const bar = new THREE.Mesh(tileUV(new THREE.BoxGeometry(0.12, 0.3, len), len / 1.4, 0.3), sandstone);
      bar.position.copy(a).lerp(b, 0.5).setY(y);
      bar.rotation.y = yaw;
      add(bar);
    }
    const coping = new THREE.Mesh(tileUV(new THREE.CylinderGeometry(0.2, 0.2, len, 10), 1, len / 1.4), sandstone);
    coping.rotation.set(Math.PI / 2, 0, 0);
    const holder = new THREE.Group();
    holder.add(coping);
    holder.position.copy(a).lerp(b, 0.5).setY(2.05);
    holder.rotation.y = yaw;
    add(holder);
    const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x), minZ = Math.min(a.z, b.z), maxZ = Math.max(a.z, b.z);
    colliders.push({ x0: minX - 0.25, x1: maxX + 0.25, z0: minZ - 0.25, z1: maxZ + 0.25 });
  }
  mark(railing, 'railing');

  // marigold garlands swagged between the posts either side of the gate, and khatas tied on
  const marigold = std(0xf08a12, 0.85), yellow = std(0xf2c12e, 0.85), khata = new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: 0.8, side: THREE.DoubleSide });
  for (const [za, zb] of [[-RAIL.gate, RAIL.z0], [RAIL.gate, RAIL.z1]]) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const z0 = za + ((zb - za) * i) / n, z1 = za + ((zb - za) * (i + 1)) / n;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(RAIL.x1 + 0.2, 1.95, z0), new THREE.Vector3(RAIL.x1 + 0.28, 1.35, (z0 + z1) / 2), new THREE.Vector3(RAIL.x1 + 0.2, 1.95, z1)]);
      add(new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.07, 6), i % 2 ? yellow : marigold));
      const k = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.7), khata);
      k.position.set(RAIL.x1 + 0.2, 1.5, z0);
      k.rotation.set(0.1, Math.PI / 2, (i % 2 ? 0.08 : -0.08));
      add(k);
    }
  }
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 2, 0.24), sandstone, posts.length);
  posts.forEach((m, i) => postMesh.setMatrixAt(i, m));
  postMesh.castShadow = true;
  add(postMesh);
  postMesh.userData.kimi = 'railing';

  // the Jewel Walk along the north wall: a raised platform with 18 lotus blossoms
  const jewel = group.children.length;
  const walk = new THREE.Mesh(new THREE.BoxGeometry(16, 1, 1.1), buff);
  walk.position.set(TEMPLE.x0 + 8, 0.5, -10.5);
  add(walk);
  colliders.push({ x0: TEMPLE.x0, x1: TEMPLE.x0 + 16, z0: -11.1, z1: -9.9 });
  const lotusMat = std(0xd9b79a, 0.7);
  for (let i = 0; i < 18; i++) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.12, 12), lotusMat);
    l.position.set(TEMPLE.x0 + 0.5 + i * 0.88, 1.06, -10.5);
    add(l);
  }

  mark(jewel, 'jewelwalk');

  // votive stupas: a field south of the temple and some along the path
  const stupaMat = std(0x5a554f, 0.9);
  const stupaSpots: [number, number, number][] = [];
  for (let i = 0; i < 46; i++) stupaSpots.push([-12 + rng() * 16, 16 + rng() * 14, 0.8 + rng() * 2.4]);
  for (let i = 0; i < 14; i++) stupaSpots.push([30 + rng() * 18, (rng() > 0.5 ? 1 : -1) * (12 + rng() * 6), 0.7 + rng() * 1.6]);
  const stupas = new THREE.InstancedMesh(stupaGeometry(), stupaMat, stupaSpots.length);
  stupaSpots.forEach(([x, z, s], i) => {
    stupas.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)));
    colliders.push({ x0: x - s * 0.55, x1: x + s * 0.55, z0: z - s * 0.55, z1: z + s * 0.55 });
  });
  stupas.castShadow = true;
  add(stupas);
  stupas.userData.kimi = 'stupas';

  // Mucalinda lotus pond with the naga-sheltered Buddha in the middle
  const P = { x: -2, z: 38, w: 26, d: 11 };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(P.w, P.d), new THREE.MeshStandardMaterial({ color: 0x35504f, roughness: 0.05, metalness: 0.3 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(P.x, 0.06, P.z);
  add(water);
  // stepped stone edges: two frames, each a ring of four kerbs
  for (let step = 0; step < 2; step++) {
    const w = P.w + 0.8 + step * 1.6, d = P.d + 0.8 + step * 1.6, h = 0.32 - step * 0.14, t = 0.8;
    for (const [x, z, sx, sz] of [[0, -d / 2, w, t], [0, d / 2, w, t], [-w / 2, 0, t, d], [w / 2, 0, t, d]]) {
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), buff);
      kerb.position.set(P.x + x, h / 2, P.z + z);
      kerb.receiveShadow = true;
      add(kerb);
    }
  }
  colliders.push({ x0: P.x - P.w / 2 - 0.6, x1: P.x + P.w / 2 + 0.6, z0: P.z - P.d / 2 - 0.6, z1: P.z + P.d / 2 + 0.6 });
  const padMat = std(0x4f6e3a, 0.8), pink = std(0xe9a3b8, 0.7);
  for (let i = 0; i < 40; i++) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.3 + rng() * 0.3, 14), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(P.x + (rng() - 0.5) * (P.w - 1), 0.08, P.z + (rng() - 0.5) * (P.d - 1));
    add(pad);
    if (i % 4 === 0) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.24, 8, 1, true), pink);
      f.rotation.x = Math.PI;
      f.position.copy(pad.position).setY(0.28);
      add(f);
    }
  }
  const naga = new THREE.Group();
  const nagaMat = new THREE.MeshStandardMaterial({ color: 0x3c4a44, roughness: 0.6, metalness: 0.2 });
  for (let i = 0; i < 4; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(1.1 - i * 0.12, 0.28, 10, 28), nagaMat);
    coil.rotation.x = Math.PI / 2;
    coil.position.y = 0.6 + i * 0.4;
    naga.add(coil);
  }
  const hoodBack = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 3.2, 10), nagaMat);
  hoodBack.position.set(0, 3.2, -0.7);
  naga.add(hoodBack);
  for (let i = 0; i < 7; i++) {
    const a = ((i - 3) / 6) * Math.PI * 0.75;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), nagaMat);
    head.scale.set(1, 0.6, 1.2);
    head.position.set(Math.sin(a) * 1.3, 4.7 + Math.cos(a) * 0.5, -0.5 + Math.cos(a) * 0.4);
    head.rotation.x = 0.6;
    naga.add(head);
  }
  naga.position.set(P.x, 0, P.z);
  add(naga);

  // prostration boards in rows south of the path
  const boardMat = std(0x8a5a32, 0.45);
  const boards: THREE.Vector3[] = [];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < (row ? 4 : 5); i++) {
      const p = new THREE.Vector3(12 + i * 2.6 + row * 1.3, 0, 17 + row * 3.6);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 2.2), boardMat);
      b.position.copy(p).setY(0.03);
      b.receiveShadow = true;
      add(b);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.3), std(0x7a1f2b, 1));
      pad.position.set(p.x, 0.08, p.z - 0.85);
      add(pad);
      boards.push(p);
    }
  }

  // butter lamp house: a glass-fronted shed of thousands of small flames
  const lampTex = canvasTex(512, 128, (g) => {
    g.fillStyle = '#2a1a0c';
    g.fillRect(0, 0, 512, 128);
    for (let y = 8; y < 128; y += 16) for (let x = 6; x < 512; x += 12) {
      const r = g.createRadialGradient(x, y, 0, x, y, 6);
      r.addColorStop(0, 'rgba(255,230,160,1)');
      r.addColorStop(1, 'rgba(255,140,40,0)');
      g.fillStyle = r;
      g.fillRect(x - 6, y - 6, 12, 12);
    }
  }, [1, 1]);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x221508, emissive: 0xffffff, emissiveMap: lampTex, emissiveIntensity: 1.2 });
  const shed = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 3), [std(0xe7e2d6), std(0xe7e2d6), std(0x8e2a1e), std(0x8e2a1e), std(0xe7e2d6), lampMat]);
  shed.position.set(26, 1.6, 31);
  add(shed);
  colliders.push({ x0: 21.5, x1: 30.5, z0: 29.5, z1: 32.5 });
  const lampGlow = new THREE.PointLight(0xffb35c, 2, 14, 1.6);
  lampGlow.position.set(26, 1.6, 28.5);
  add(lampGlow);

  // the big incense burner fed by pilgrims
  const bronze = new THREE.MeshStandardMaterial({ color: 0x6f5a3a, metalness: 0.8, roughness: 0.45 });
  const burner = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.55, 0.8, 24), bronze);
  bowl.position.y = 0.9;
  const lid = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.9, 6), bronze);
  lid.position.y = 1.75;
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.7, 10), bronze);
  chimney.position.y = 2.4;
  burner.add(bowl, lid, chimney);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.6, 8), bronze);
    leg.position.set(Math.cos(a) * 0.45, 0.3, Math.sin(a) * 0.45);
    burner.add(leg);
  }
  burner.position.copy(BURNER_AT);
  burner.traverse((o) => { o.userData.burner = true; });
  add(burner);
  colliders.push({ x0: BURNER_AT.x - 0.9, x1: BURNER_AT.x + 0.9, z0: BURNER_AT.z - 0.9, z1: BURNER_AT.z + 0.9 });

  // the bronze bell beside the path and the white Animeshlochana shrine across it
  const b = bell();
  b.position.set(26, 0, 6.5);
  add(b);
  colliders.push({ x0: 25.6, x1: 26.4, z0: 5, z1: 8 });
  const chaitya = whiteChaitya();
  chaitya.position.set(26, 0, -10);
  add(chaitya);
  chaitya.userData.kimi = 'animesh';
  colliders.push({ x0: 23.7, x1: 28.3, z0: -12.3, z1: -7.7 });

  // lamp posts along the path
  const iron = std(0x2b2724, 0.6, 0.4);
  const glow = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc97a, emissiveIntensity: 0.6 });
  for (let x = 10; x < 52; x += 8) {
    for (const z of [-PATH.halfW - 0.4, PATH.halfW + 0.4]) {
      if (Math.abs(x - gx) < 2) continue;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.2, 8), iron);
      post.position.set(x, 1.6, z);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), glow);
      lamp.position.set(x, 3.35, z);
      add(post);
      add(lamp);
    }
  }
  const pathLight = new THREE.PointLight(0xffc27a, 0, 30, 1.5);
  pathLight.position.set(30, 4, 0);
  add(pathLight);

  // Buddhist flags on poles by the gateway
  const flagTex = canvasTex(160, 100, (g) => {
    ['#2b62b8', '#f2c12e', '#d23a2c', '#f6f3ec', '#e8901c'].forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 32, 0, 32, 100); });
  }, [1, 1]);
  for (const z of [-6, 6]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 8), iron);
    pole.position.set(20, 3, z);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide }));
    flag.position.set(20, 5.4, z + (z > 0 ? 0.8 : -0.8));
    flag.rotation.y = Math.PI / 2;
    flag.userData.sway = rng() * 10;
    add(pole);
    add(flag);
  }

  // trees and palms ringing the sunken courtyard
  const bark = photo(std(0x6d6151, 0.95), TEX + 'bark.jpg', { repeat: [2, 2], mirror: true, bump: 3 });
  const clusters: Cluster[] = [];
  const treeSpots: [number, number][] = [[-34, -20], [-20, -21], [-6, -21], [10, -20], [40, -20], [50, -16], [-34, 20], [-33, 8], [-33, -8], [14, 40], [36, 42], [50, 30], [50, 12], [-24, 26], [-28, 40]];
  for (const [x, z] of treeSpots) {
    add(broadTree(rng, bark, clusters, new THREE.Vector3(x, 0, z)));
    colliders.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5 });
  }
  // every courtyard tree's leaves in one swaying instanced canopy
  const leaves = canopy(clusters, 'mango', rng, { size: 1.6, sun: 0x5f8f34, shade: 0x2a4a1c });
  add(leaves.mesh);
  for (const [x, z] of [[11, 4.6], [11, -4.6], [22, 4.6], [22, -4.6], [34, -4.8], [34, 4.8]]) {
    const p = palm(rng);
    p.position.set(x, 0, z);
    add(p);
    colliders.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 });
  }

  // open all round: the paved precinct ends at a low kerb and green lawn runs to the horizon
  const lawnFar = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), photo(new THREE.MeshStandardMaterial({ color: 0x9ccf6a, roughness: 1 }), TEX + 'lawn.jpg', { repeat: [220, 220], mirror: true, keepColor: true }));
  lawnFar.rotation.x = -Math.PI / 2;
  lawnFar.position.set((BOUNDS.x0 + BOUNDS.x1) / 2, -0.02, (BOUNDS.z0 + BOUNDS.z1) / 2);
  lawnFar.receiveShadow = true;
  floor.push(add(lawnFar));
  const W = BOUNDS;
  for (const [x, z, w, d] of [
    [(W.x0 + W.x1) / 2, W.z0 - 0.2, W.x1 - W.x0 + 0.8, 0.4],
    [(W.x0 + W.x1) / 2, W.z1 + 0.2, W.x1 - W.x0 + 0.8, 0.4],
    [W.x0 - 0.2, (W.z0 + W.z1) / 2, 0.4, W.z1 - W.z0],
    [W.x1 + 0.2, (W.z0 + W.z1) / 2, 0.4, W.z1 - W.z0],
  ] as const) {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), buff);
    kerb.position.set(x, 0.15, z);
    kerb.receiveShadow = true;
    add(kerb);
  }

  return {
    group, floor, colliders, boards,
    /** where the votive stupas stand: x, z and scale of the 1.6 m stupa */
    stupaSpots,
    burner,
    flags: group.children.filter((o) => o.userData.sway !== undefined),
    update(night: number, elapsed: number) {
      leaves.uTime.value = elapsed;
      glow.emissiveIntensity = 0.3 + night * 2.2;
      pathLight.intensity = night * 120;
      lampMat.emissiveIntensity = 0.9 + night * 1.2 + Math.sin(elapsed * 9) * 0.05;
      lampGlow.intensity = 1 + night * 6;
    },
  };
}
