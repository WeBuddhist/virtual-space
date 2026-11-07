import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { photo } from '../../../kit/textures';
import type { Box2 } from '../../types';
import { at, Batch, cutout, hipRoofGeometry, instances, std, TEX } from './util';

// The Daibutsuden (Great Buddha Hall) of Tōdai-ji as rebuilt in 1709: 57 × 50 m and
// about 47 m tall, one of the largest wooden buildings in the world. A stone podium,
// dark timber framing with white plaster, a pent roof (mokoshi) all round under the
// great hipped roof, Daibutsuyō bracket sets, golden shibi on the ridge and the
// karahafu wave gable with the face-viewing window (kansō-mado) over the doors.
// Inside: one vast dim volume of red composite pillars bound with iron hoops, tie
// beams and a red lattice ceiling high over the Buddha.
//
// Hall-centred: origin at the middle of the hall at courtyard level; +x east, +z
// south. The doors are in the south wall at z = FRONT.

export const HALL_Y = 1.2;
/** outer face of the lower walls */
export const W = 28.5;
export const FRONT = 25;
export const BACK = -25;
export const PODIUM = { x: 31.5, z0: -28, z1: 28 };
export const STEPS = { halfW: 9, z0: 28, z1: 31.6 };
export const DOOR = { halfW: 4.6, top: HALL_Y + 10 };
/** the inner ring of 30 m pillars around the Buddha, and the shorter middle ring */
export const INNER_X = 14.5;
export const MID_X = 21.5;
export const ROWS = [14, 3, -8, -19];
/** the ceilings: over the aisles, and high over the Buddha (the nave) */
export const AISLE_Y = HALL_Y + 12.8;
export const NAVE_Y = 33;
/** the nostril pillar, with the hole children crawl through */
export const NOSTRIL = new THREE.Vector3(INNER_X, 0, ROWS[3]);

const UX = 24, UZ = 21; // upper storey walls
const MAIN_EAVE = 29.5;

// photographed surfaces
// one bay per tile: a post at its edge and the deep tie beams (nuki) in horizontal bands, so the
// plaster shows as long low strips, as on the real front (not a half-timbered grid)
const plaster = photo(std(0xe8e2d4, 0.9), TEX + 'plaster-nuki.jpg', { repeat: [1, 1], bump: 0.6 });
const pillarWood = photo(std(0xb4584a, 0.75), TEX + 'pillar-wood.jpg', { repeat: [1, 1], bump: 0.8, keepColor: true });
const beamWood = photo(std(0x7a3a2a, 0.8), TEX + 'pillar-wood.jpg', { repeat: [1, 1], mirror: true, keepColor: true });
const roofTiles = photo(std(0x7c8084, 0.75, 0.05), TEX + 'roof-tiles.jpg', { repeat: [1, 1], keepColor: true });
const stone = photo(std(0x7a766e, 0.9), TEX + 'stone-floor.jpg', { repeat: [7, 6], mirror: true, keepColor: true });
const podiumStone = photo(std(0x9a9284, 0.95), TEX + 'courtyard-paving.jpg', { repeat: [1, 1], mirror: true });
const ceiling = photo(std(0x6a3226, 0.95), TEX + 'ceiling-lattice.jpg', { repeat: [1, 1], mirror: true });
/** lattice whose gaps (not its bars) glow: light behind, by day inside or by night outside */
function glowLattice(color: number, glow: number) {
  const m = photo(std(color, 0.9, 0, { emissive: glow, emissiveIntensity: 0 }), TEX + 'lattice.jpg', { repeat: [1, 1], keepColor: true });
  const g = photo(std(0xffffff), TEX + 'lattice-glow.jpg', { repeat: [1, 1] });
  Object.defineProperty(m, 'emissiveMap', { get() { return g.map; }, set() {}, configurable: true });
  return m;
}
const lattice = glowLattice(0x8a7a6a, 0xffd9a0);
/** the hall's high windows seen from inside: grey daylight between the bars */
const latticeIn = glowLattice(0x6a5a4a, 0xc9d2da);
const doorMat = photo(std(0x4a3524, 0.8), TEX + 'doors.jpg');
const darkWood = std(0x2b1d14, 0.9);
const extTimber = std(0x2e2018, 0.85);
// the eaves' undersides sit in deep shadow under the bracket sets
const eaveLining = std(0x0d0907, 1, 0, { side: THREE.BackSide, envMapIntensity: 0 });
const iron = std(0x1d1b19, 0.5, 0.6);
const gold = new THREE.MeshStandardMaterial({ color: 0xd9b04c, metalness: 1, roughness: 0.3 });
const karaTiles = std(0x4c4f52, 0.7, 0.1);
const greenBronze = std(0x4f7a68, 0.55, 0.5);

/** scale a geometry's uvs to metres / tile so photo textures keep their size */
function uvMetres(g: THREE.BufferGeometry, su: number, sv: number) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}
/** a wall box whose faces show the photo at `tile` metres per repeat */
function wallGeo(w: number, h: number, d: number, tileW: number, tileH: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const along = Math.abs(n.getX(i)) > 0.5 ? d : w;
    uv.setXY(i, (uv.getX(i) * along) / tileW, (uv.getY(i) * h) / tileH);
  }
  return g;
}
function plane(w: number, h: number, tw: number, th: number) {
  return uvMetres(new THREE.PlaneGeometry(w, h), w / tw, h / th);
}

/** a Daibutsuyō bracket: stacked arms thrust straight out of the post (local +z), cloud-cut ends */
function bracketGeo(scale: number) {
  const g = mergeGeometries([
    new THREE.BoxGeometry(0.7, 0.5, 0.7).translate(0, 0.25, 0),
    new THREE.BoxGeometry(0.36, 0.34, 1.3).translate(0, 0.62, 0.4),
    new THREE.BoxGeometry(0.6, 0.3, 0.5).translate(0, 0.9, 1.0),
    new THREE.BoxGeometry(0.36, 0.34, 2.2).translate(0, 1.2, 0.85),
    new THREE.BoxGeometry(0.6, 0.3, 0.5).translate(0, 1.5, 1.9),
    new THREE.BoxGeometry(0.36, 0.34, 3.0).translate(0, 1.8, 1.25),
    new THREE.BoxGeometry(1.6, 0.3, 0.5).translate(0, 2.1, 2.6),
  ].map((b) => b.toNonIndexed()))!;
  g.scale(scale, scale, scale);
  return g;
}

/** a golden shibi: the photographed fish-tail on black becomes its own cutout */
const shibiMat = cutout(TEX + 'shibi.jpg', { alphaTest: 0.2, color: 0xc8962e, metalness: 0.55, roughness: 0.42 });

/** the karahafu wave gable hooding the doors, with the face window under it */
function karahafu(b: Batch, group: THREE.Group, faceWindow: THREE.Mesh) {
  const halfW = 9.5, base = 12.8, z0 = UZ - 1, z1 = PODIUM.z1 + 0.6;
  // wave profile: a gentle rise at the ends, a cusped bulge in the middle
  const wave = (x: number) => base + 3.0 + 4.8 * Math.pow(Math.cos((Math.min(1, Math.abs(x) / halfW) * Math.PI) / 2), 1.6) - 0.6 * Math.pow(Math.abs(x) / halfW, 2);
  const N = 40;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) { const x = -halfW + (i / N) * 2 * halfW; pts.push(new THREE.Vector2(x, wave(x))); }
  // gable infill (plaster and timber) under the wave, set back a little
  const infill = new THREE.Shape([new THREE.Vector2(-halfW, base), ...pts, new THREE.Vector2(halfW, base)]);
  const fill = new THREE.ShapeGeometry(infill, 1);
  uvMetres(fill, 1, 1);
  const pos = fill.attributes.position, uv = fill.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 6, pos.getY(i) / 6);
  b.add(fill, plaster, 0, 0, z1 - 1.4);
  // the curved roof: a thick band along the wave, extruded front to back
  const band = new THREE.Shape([...pts.map((p) => new THREE.Vector2(p.x * 1.06, p.y + 0.15)), ...pts.slice().reverse().map((p) => new THREE.Vector2(p.x * 1.06, p.y + 0.95))]);
  const roof = new THREE.ExtrudeGeometry(band, { depth: z1 - z0, bevelEnabled: false, steps: 1 });
  const rp = roof.attributes.position, ru = roof.attributes.uv;
  for (let i = 0; i < rp.count; i++) ru.setXY(i, rp.getX(i) / 1.2, rp.getZ(i) / 1.2);
  b.add(roof, karaTiles, 0, 0, z0);
  // gilt edge along the front of the wave and its bargeboard
  const edge = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x * 1.06, p.y + 0.12, z1 + 0.02))), 60, 0.14, 6);
  b.add(edge, gold);
  const barge = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x * 1.02, p.y - 0.35, z1 - 0.2))), 60, 0.22, 6);
  b.add(barge, extTimber);
  // the ornament on the crest
  b.add(new THREE.SphereGeometry(0.7, 12, 8), greenBronze, 0, wave(0) + 1.4, z1 - 0.6);
  b.add(new THREE.ConeGeometry(0.35, 1.2, 8), greenBronze, 0, wave(0) + 2.3, z1 - 0.6);
  // posts and a beam framing the face window
  b.box(extTimber, 0.5, 6, 0.6, -4.2, base + 3, z1 - 1.3).box(extTimber, 0.5, 6, 0.6, 4.2, base + 3, z1 - 1.3);
  b.box(extTimber, 9.6, 0.5, 0.6, 0, base + 0.2, z1 - 1.3).box(extTimber, 9.6, 0.45, 0.6, 0, base + 5.6, z1 - 1.3);
  faceWindow.position.set(0, base + 2.9, z1 - 1.35);
  group.add(faceWindow);
}

export function buildHall() {
  const group = new THREE.Group();
  const b = new Batch();
  const colliders: Box2[] = [];
  const cameraSolids: (Box2 & { y0?: number })[] = [];

  // ---- podium, steps, interior floor ----
  const pw = PODIUM.x * 2, pd = PODIUM.z1 - PODIUM.z0, pz = (PODIUM.z0 + PODIUM.z1) / 2;
  const podium = new THREE.Mesh(wallGeo(pw, HALL_Y, pd, 3, 3), podiumStone);
  podium.position.set(0, HALL_Y / 2, pz);
  podium.receiveShadow = true;
  group.add(podium);
  const treads: THREE.Mesh[] = [];
  const nT = 3, tz = (STEPS.z1 - STEPS.z0) / nT;
  for (let i = 0; i < nT; i++) {
    const h = HALL_Y * (nT - i) / (nT + 1);
    const s = new THREE.Mesh(wallGeo(STEPS.halfW * 2, h, tz * (i + 1), 3, 3), podiumStone);
    s.position.set(0, h / 2, STEPS.z0 + (tz * (i + 1)) / 2);
    s.receiveShadow = true;
    group.add(s);
    treads.push(s);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, FRONT - BACK), stone);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, HALL_Y + 0.01, 0);
  floor.receiveShadow = true;
  group.add(floor);
  // a low stone balustrade round the podium edge, open at the steps
  const railMat = std(0xb9b2a3, 0.9);
  const railRun = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0);
    b.add(new THREE.BoxGeometry(0.18, 0.14, len), railMat, (x0 + x1) / 2, HALL_Y + 0.85, (z0 + z1) / 2, yaw);
    const n = Math.round(len / 2.2);
    for (let i = 0; i <= n; i++) b.box(railMat, 0.22, 0.85, 0.22, x0 + ((x1 - x0) * i) / n, HALL_Y + 0.42, z0 + ((z1 - z0) * i) / n);
    colliders.push({ x0: Math.min(x0, x1) - 0.2, x1: Math.max(x0, x1) + 0.2, z0: Math.min(z0, z1) - 0.2, z1: Math.max(z0, z1) + 0.2 });
  };
  const R = PODIUM.x - 0.25, Zf = PODIUM.z1 - 0.25, Zb = PODIUM.z0 + 0.25;
  railRun(-R, Zf, -STEPS.halfW - 0.3, Zf);
  railRun(STEPS.halfW + 0.3, Zf, R, Zf);
  railRun(-R, Zb, R, Zb);
  railRun(-R, Zb, -R, Zf);
  railRun(R, Zb, R, Zf);

  // ---- lower walls (outside: white plaster in dark timber; the doors in the middle bay) ----
  const wallH = AISLE_Y - HALL_Y, wy = HALL_Y + wallH / 2, t = 0.9;
  const sideW = W - DOOR.halfW;
  const bayW = (2 * W) / 7;
  const fw = (w: number, x: number) => b.add(wallGeo(w, wallH, t, bayW, wallH / 2), plaster, x, wy, FRONT - t / 2);
  fw(sideW, -(DOOR.halfW + sideW / 2));
  fw(sideW, DOOR.halfW + sideW / 2);
  b.add(wallGeo(DOOR.halfW * 2, AISLE_Y - DOOR.top, t, bayW, wallH / 2), plaster, 0, (DOOR.top + AISLE_Y) / 2, FRONT - t / 2);
  b.add(wallGeo(W * 2, wallH, t, bayW, wallH / 2), plaster, 0, wy, BACK + t / 2);
  for (const sx of [-1, 1]) b.add(wallGeo(t, wallH, FRONT - BACK, bayW, wallH / 2), plaster, sx * (W - t / 2), wy, 0);
  colliders.push(
    { x0: -W - 0.2, x1: -DOOR.halfW, z0: FRONT - t - 0.2, z1: FRONT + 0.2 },
    { x0: DOOR.halfW, x1: W + 0.2, z0: FRONT - t - 0.2, z1: FRONT + 0.2 },
    { x0: -W - 0.2, x1: W + 0.2, z0: BACK - 0.2, z1: BACK + t + 0.2 },
    { x0: -W - 0.2, x1: -W + t + 0.2, z0: BACK, z1: FRONT },
    { x0: W - t - 0.2, x1: W + 0.2, z0: BACK, z1: FRONT },
  );
  cameraSolids.push(
    { x0: -W, x1: -DOOR.halfW, z0: FRONT - t, z1: FRONT },
    { x0: DOOR.halfW, x1: W, z0: FRONT - t, z1: FRONT },
    { x0: -DOOR.halfW, x1: DOOR.halfW, z0: FRONT - t, z1: FRONT, y0: DOOR.top },
    { x0: -W, x1: W, z0: BACK, z1: BACK + t },
    { x0: -W, x1: -W + t, z0: BACK, z1: FRONT },
    { x0: W - t, x1: W, z0: BACK, z1: FRONT },
  );
  // facade posts at the bay lines, a sill and two tie-beam bands; closed plank doors in the bays beside the entrance
  for (let i = 0; i <= 7; i++) {
    const x = -W + i * bayW;
    b.cyl(extTimber, 0.55, 0.5, x, FRONT + 0.15, HALL_Y, AISLE_Y);
    b.cyl(extTimber, 0.55, 0.5, x, BACK - 0.15, HALL_Y, AISLE_Y);
  }
  for (let i = 0; i <= 6; i++) {
    const z = BACK + (i * (FRONT - BACK)) / 6;
    for (const sx of [-1, 1]) b.cyl(extTimber, 0.55, 0.5, sx * (W + 0.15), z, HALL_Y, AISLE_Y);
  }
  for (const sx of [-1, 1]) b.box(extTimber, sideW + 0.3, 0.55, 0.5, sx * (DOOR.halfW + sideW / 2 + 0.15), HALL_Y + 0.25, FRONT + 0.1);
  b.box(extTimber, W * 2 + 0.6, 0.55, 0.5, 0, HALL_Y + 0.25, BACK - 0.1);
  for (const sx of [-1, 1]) b.box(extTimber, 0.5, 0.55, FRONT - BACK + 0.6, sx * (W + 0.1), HALL_Y + 0.25, 0);
  for (const y of [DOOR.top + 0.3, AISLE_Y - 0.6]) {
    b.box(extTimber, W * 2 + 0.6, 0.55, 0.5, 0, y, FRONT + 0.1);
    b.box(extTimber, W * 2 + 0.6, 0.55, 0.5, 0, y, BACK - 0.1);
    for (const sx of [-1, 1]) b.box(extTimber, 0.5, 0.55, FRONT - BACK + 0.6, sx * (W + 0.1), y, 0);
  }
  for (const k of [-3, -2, -1, 1, 2, 3]) {
    const x = Math.sign(k) * (DOOR.halfW + (Math.abs(k) - 0.5) * bayW);
    const w = Math.abs(k) === 3 ? W - DOOR.halfW - 2.5 * bayW - 1.2 : bayW - 1.4;
    const xc = Math.abs(k) === 3 ? Math.sign(k) * (W - 0.6 - w / 2) : x;
    b.add(plane(w, DOOR.top - HALL_Y - 0.6, w, DOOR.top - HALL_Y - 0.6), doorMat, xc, (HALL_Y + DOOR.top) / 2, FRONT + 0.02);
    // dark barred transom over each door, as on the real front
    b.add(plane(w, 1.6, 2.4, 1.6), lattice, xc, DOOR.top + 1.45, FRONT + 0.03);
  }
  // the great doors themselves stand open, folded back inside
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Mesh(plane(DOOR.halfW, DOOR.top - HALL_Y, DOOR.halfW, DOOR.top - HALL_Y), doorMat);
    leaf.material = doorMat;
    leaf.position.set(sx * (DOOR.halfW + 0.15), (HALL_Y + DOOR.top) / 2, FRONT - t - DOOR.halfW / 2);
    leaf.rotation.y = sx * Math.PI / 2;
    (leaf.material as THREE.Material).side = THREE.DoubleSide;
    group.add(leaf);
    colliders.push({ x0: sx > 0 ? DOOR.halfW : -DOOR.halfW - 0.35, x1: sx > 0 ? DOOR.halfW + 0.35 : -DOOR.halfW, z0: FRONT - t - DOOR.halfW, z1: FRONT - t });
  }

  // ---- upper storey walls between the two roofs, with a lattice band ----
  // it starts just above the aisle ceiling, so no strip of its plaster shows inside the hall
  const uh = MAIN_EAVE - AISLE_Y, uy = AISLE_Y + 0.03 + uh / 2;
  b.add(wallGeo(UX * 2, uh, 0.6, bayW, uh / 2), plaster, 0, uy, UZ);
  b.add(wallGeo(UX * 2, uh, 0.6, bayW, uh / 2), plaster, 0, uy, -UZ);
  for (const sx of [-1, 1]) b.add(wallGeo(0.6, uh, UZ * 2, bayW, uh / 2), plaster, sx * UX, uy, 0);
  for (let i = 0; i <= 8; i++) {
    const x = -UX + (i * 2 * UX) / 8;
    b.cyl(extTimber, 0.5, 0.45, x, UZ + 0.3, AISLE_Y, MAIN_EAVE);
    b.cyl(extTimber, 0.5, 0.45, x, -UZ - 0.3, AISLE_Y, MAIN_EAVE);
  }
  for (let i = 0; i <= 6; i++) {
    const z = -UZ + (i * 2 * UZ) / 6;
    for (const sx of [-1, 1]) b.cyl(extTimber, 0.5, 0.45, sx * (UX + 0.3), z, AISLE_Y, MAIN_EAVE);
  }
  for (const y of [21.5, 25.8]) {
    b.box(extTimber, UX * 2 + 0.6, 0.5, 0.4, 0, y, UZ + 0.35).box(extTimber, UX * 2 + 0.6, 0.5, 0.4, 0, y, -UZ - 0.35);
    for (const sx of [-1, 1]) b.box(extTimber, 0.4, 0.5, UZ * 2 + 0.6, sx * (UX + 0.35), y, 0);
  }
  for (const [x, z, ry, len] of [[0, UZ + 0.32, 0, UX * 2 - 1], [0, -UZ - 0.32, Math.PI, UX * 2 - 1], [UX + 0.32, 0, Math.PI / 2, UZ * 2 - 1], [-UX - 0.32, 0, -Math.PI / 2, UZ * 2 - 1]] as const) {
    b.add(plane(len, 2.4, 3, 2.4), lattice, x, 23.6, z, ry);
  }

  // ---- roofs ----
  // the photo holds twelve rows of round tiles: at 4.4 m a tile the rows are ~0.37 m apart, the
  // size of the hall's great hongawara, so they still read as lines from the gate
  const mokoshi = hipRoofGeometry(32.6, 29.4, UX, UZ, AISLE_Y + 0.6, 20.2, 0, 1.4, 1.25, 4.4);
  const main = hipRoofGeometry(30.8, 27.2, 12, 0, MAIN_EAVE, 49.5, 0, 2.2, 1.3, 4.4);
  for (const g of [mokoshi, main]) {
    const r = new THREE.Mesh(g, roofTiles);
    r.castShadow = r.receiveShadow = true;
    group.add(r);
    const lining = new THREE.Mesh(g, eaveLining);
    lining.position.y = -0.45;
    group.add(lining);
  }
  // ridge and the golden shibi at its ends
  b.box(roofTiles, 24.6, 1.3, 1.7, 0, 49.9, 0);
  b.box(darkWood, 24.8, 0.4, 1.9, 0, 49.3, 0);
  for (const sx of [-1, 1]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.5), shibiMat);
    s.position.set(sx * 11.6, 50.3 + 2.2, 0);
    s.scale.x = sx; // the hooks curl inward, toward the middle of the ridge
    s.castShadow = true;
    group.add(s);
    // a thin second card at right angles gives the horn some body from the side
    const s2 = s.clone();
    s2.rotation.y = Math.PI / 2;
    s2.scale.x = 0.45;
    group.add(s2);
  }
  cameraSolids.push({ x0: -PODIUM.x - 1, x1: PODIUM.x + 1, z0: PODIUM.z0 - 1, z1: PODIUM.z1 + 1, y0: AISLE_Y });

  // ---- bracket sets under both eaves: Daibutsuyō arms stacked six deep, and on every post a
  // second cluster thrust straight through it at mid height ----
  const bmats: THREE.Matrix4[] = [];
  for (let x = -W + 1.2; x <= W - 1.2; x += 2.3) {
    bmats.push(at(x, AISLE_Y - 3.1, FRONT + 0.1, 0, 1.2), at(x, AISLE_Y - 3.1, BACK - 0.1, Math.PI, 1.2));
  }
  for (let z = BACK + 1.2; z <= FRONT - 1.2; z += 2.3) {
    bmats.push(at(W + 0.1, AISLE_Y - 3.1, z, Math.PI / 2, 1.2), at(-W - 0.1, AISLE_Y - 3.1, z, -Math.PI / 2, 1.2));
  }
  for (let x = -UX + 1.2; x <= UX - 1.2; x += 2.2) {
    bmats.push(at(x, MAIN_EAVE - 3.4, UZ + 0.4, 0, 1.45), at(x, MAIN_EAVE - 3.4, -UZ - 0.4, Math.PI, 1.45));
  }
  for (let z = -UZ + 1.2; z <= UZ - 1.2; z += 2.2) {
    bmats.push(at(UX + 0.4, MAIN_EAVE - 3.4, z, Math.PI / 2, 1.45), at(-UX - 0.4, MAIN_EAVE - 3.4, z, -Math.PI / 2, 1.45));
  }
  for (let i = 0; i <= 7; i++) {
    const x = -W + i * bayW;
    bmats.push(at(x, DOOR.top + 0.9, FRONT + 0.2, 0, 0.8), at(x, DOOR.top + 0.9, BACK - 0.2, Math.PI, 0.8));
  }
  for (let i = 0; i <= 8; i++) bmats.push(at(-UX + (i * 2 * UX) / 8, 22.2, UZ + 0.4, 0, 0.9), at(-UX + (i * 2 * UX) / 8, 22.2, -UZ - 0.4, Math.PI, 0.9));
  group.add(instances(bracketGeo(1), extTimber, bmats, false));

  // ---- the karahafu and face window ----
  const faceWindow = new THREE.Mesh(plane(7.6, 4.4, 2.5, 2.2), lattice);
  karahafu(b, group, faceWindow);

  // ---- interior: pillars ----
  const tallH = NAVE_Y - HALL_Y, shortH = AISLE_Y - HALL_Y;
  const pillarGeo = (h: number) => uvMetres(new THREE.CylinderGeometry(0.78, 0.82, h, 20, 1, true).translate(0, h / 2, 0), 3, h / 4);
  const tall: THREE.Matrix4[] = [], short: THREE.Matrix4[] = [], hoops: THREE.Matrix4[] = [];
  const pillarAt = (x: number, z: number, tallOne: boolean) => {
    (tallOne ? tall : short).push(at(x, HALL_Y, z));
    for (const hy of tallOne ? [2.4, 7.5, 12.4, 19, 26] : [2.4, 7.5]) {
      hoops.push(new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(x, HALL_Y + hy, z));
    }
    colliders.push({ x0: x - 0.95, x1: x + 0.95, z0: z - 0.95, z1: z + 0.95 });
  };
  for (const z of ROWS) for (const sx of [-1, 1]) {
    pillarAt(sx * INNER_X, z, true);
    pillarAt(sx * MID_X, z, false);
  }
  group.add(instances(pillarGeo(tallH), pillarWood, tall), instances(pillarGeo(shortH), pillarWood, short));
  group.add(instances(new THREE.TorusGeometry(0.84, 0.07, 6, 28), iron, hoops, false));
  // the nostril pillar's crawl hole
  b.box(std(0x070605, 1), 0.62, 0.5, 1.7, NOSTRIL.x, HALL_Y + 0.27, NOSTRIL.z);

  // ---- tie beams, ceilings and the nave's upper walls ----
  const beam = (x0: number, z0: number, x1: number, z1: number, y: number, h = 0.9, d = 0.6) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    b.add(new THREE.BoxGeometry(d, h, len), beamWood, (x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0));
  };
  // across the hall only in the aisles: nothing crosses the nave between the doors and the Buddha
  for (const z of ROWS) for (const sx of [-1, 1]) beam(sx * W, z, sx * INNER_X, z, AISLE_Y - 0.5);
  for (const z of [ROWS[0], ROWS[3]]) beam(-INNER_X, z, INNER_X, z, NAVE_Y - 0.6, 1.1, 0.7);
  beam(-INNER_X, ROWS[0], INNER_X, ROWS[0], AISLE_Y - 0.5);
  for (const sx of [-1, 1]) {
    beam(sx * INNER_X, FRONT, sx * INNER_X, BACK, AISLE_Y - 0.5);
    beam(sx * MID_X, FRONT, sx * MID_X, BACK, AISLE_Y - 1.6);
    beam(sx * INNER_X, ROWS[0], sx * INNER_X, ROWS[3], 22.5, 1.1, 0.7);
  }
  // gilt cloud-ended bracket arms at the tops of the great pillars, reaching into the nave
  const arm = mergeGeometries([new THREE.BoxGeometry(0.5, 0.6, 3.2).translate(0, 0, 1.6).toNonIndexed(), new THREE.BoxGeometry(0.5, 0.4, 2.0).translate(0, 0.5, 1.0).toNonIndexed()])!;
  const tip = new THREE.CylinderGeometry(0.45, 0.45, 0.55, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0, 3.2);
  const arms: THREE.Matrix4[] = [];
  for (const z of ROWS) for (const sx of [-1, 1]) for (const y of [21.3, NAVE_Y - 1.8]) arms.push(at(sx * INNER_X, y, z, -sx * Math.PI / 2));
  group.add(instances(arm, beamWood, arms, false), instances(tip, gold, arms, false));
  // ceilings
  const ceil = (x0: number, x1: number, z0: number, z1: number, y: number) => {
    const g = plane(x1 - x0, z1 - z0, 4.5, 4.5);
    b.add(g, ceiling, (x0 + x1) / 2, y, (z0 + z1) / 2, 0, Math.PI / 2);
  };
  ceil(-W, W, ROWS[0], FRONT, AISLE_Y);
  ceil(-W, W, BACK, ROWS[3], AISLE_Y);
  ceil(-W, -INNER_X, ROWS[3], ROWS[0], AISLE_Y);
  ceil(INNER_X, W, ROWS[3], ROWS[0], AISLE_Y);
  ceil(-INNER_X, INNER_X, ROWS[3], ROWS[0], NAVE_Y);
  // the nave walls rising from the aisle ceiling: boarding with a lattice clerestory
  const naveH = NAVE_Y - AISLE_Y, naveY = (NAVE_Y + AISLE_Y) / 2;
  const naveLen = ROWS[0] - ROWS[3], naveMid = (ROWS[0] + ROWS[3]) / 2;
  b.add(plane(INNER_X * 2, naveH, 4, 4), darkWood, 0, naveY, ROWS[0] + 0.4, Math.PI);
  b.add(plane(INNER_X * 2, naveH, 4, 4), darkWood, 0, naveY, ROWS[3] - 0.4);
  for (const sx of [-1, 1]) b.add(plane(naveLen, naveH, 4, 4), darkWood, sx * (INNER_X + 0.4), naveY, naveMid, -sx * Math.PI / 2);
  for (const [x, z, ry, len] of [[0, ROWS[0] + 0.3, Math.PI, INNER_X * 2], [0, ROWS[3] - 0.3, 0, INNER_X * 2], [INNER_X + 0.3, naveMid, -Math.PI / 2, naveLen], [-INNER_X - 0.3, naveMid, Math.PI / 2, naveLen]] as const) {
    b.add(plane(len, 4.2, 3, 2.4), latticeIn, x, 27.6, z, ry);
  }
  // inside face of the walls: dark boarding above a plaster dado
  b.add(plane((W - t) * 2, wallH, 4, 4), darkWood, 0, wy, BACK + t + 0.02);
  for (const sx of [-1, 1]) b.add(plane(FRONT - BACK - 2 * t, wallH, 4, 4), darkWood, sx * (W - t - 0.02), wy, 0, -sx * Math.PI / 2);
  for (const sx of [-1, 1]) b.add(plane(sideW - 0.2, wallH, 4, 4), darkWood, sx * (DOOR.halfW + sideW / 2), wy, FRONT - t - 0.02, Math.PI);
  // high lattice windows in the side walls letting in grey light
  for (let i = 0; i < 5; i++) {
    const z = BACK + 6 + i * 9.5;
    for (const sx of [-1, 1]) b.add(plane(5, 2.6, 2.5, 2.6), latticeIn, sx * (W - t - 0.05), AISLE_Y - 3.2, z, -sx * Math.PI / 2);
  }

  // ---- the green bronze banners (ban) hanging on the great pillars before the Buddha ----
  const banShape = new THREE.Shape();
  banShape.moveTo(-1.1, 0);
  banShape.lineTo(1.1, 0);
  banShape.lineTo(1.25, -1.2);
  banShape.lineTo(0.9, -1.4);
  banShape.lineTo(1.05, -3.2);
  banShape.lineTo(0.7, -3.4);
  banShape.lineTo(0.85, -5.6);
  banShape.lineTo(0.0, -7.2);
  banShape.lineTo(-0.85, -5.6);
  banShape.lineTo(-0.7, -3.4);
  banShape.lineTo(-1.05, -3.2);
  banShape.lineTo(-0.9, -1.4);
  banShape.lineTo(-1.25, -1.2);
  banShape.closePath();
  const banGeo = new THREE.ExtrudeGeometry(banShape, { depth: 0.08, bevelEnabled: false });
  for (const sx of [-1, 1]) for (const z of [ROWS[0], ROWS[1]]) {
    b.add(banGeo, greenBronze, sx * INNER_X, HALL_Y + 13.2, z + 0.86);
    b.add(banGeo, greenBronze, sx * INNER_X, HALL_Y + 13.2, z - 0.94);
  }

  b.build(group);

  // ---- light through the doors and the night ----
  // a cool shaft of daylight from the open doors onto the altar and lotus
  const shaft = new THREE.SpotLight(0xe6eeff, 0, 70, 0.32, 0.55, 1.2);
  shaft.position.set(0, HALL_Y + 7.5, FRONT + 6);
  shaft.target.position.set(0, HALL_Y + 3, -2);
  group.add(shaft, shaft.target);
  // night (Mantō-e): floodlit facade timbers and the glowing face window
  const floods: THREE.SpotLight[] = [];
  for (const x of [-16, 16]) {
    const f = new THREE.SpotLight(0xffc27a, 0, 80, 0.55, 0.8, 1.2);
    f.position.set(x * 0.6, 2, FRONT + 26);
    f.target.position.set(x, 16, FRONT);
    group.add(f, f.target);
    floods.push(f);
  }
  const doorGlow = new THREE.PointLight(0xffbe78, 0, 26, 1.5);
  doorGlow.position.set(0, HALL_Y + 5, FRONT + 2);
  group.add(doorGlow);

  return {
    group,
    colliders,
    cameraSolids,
    floor: [floor, podium, ...treads],
    update(night: number) {
      shaft.intensity = (1 - night) * 380;
      lattice.emissiveIntensity = night * 1.1;
      latticeIn.emissiveIntensity = (1 - night) * 0.55 + night * 0.03;
      for (const f of floods) f.intensity = night * 320;
      doorGlow.intensity = night * 90;
    },
  };
}
