import * as THREE from 'three';
import { photo } from '../../../kit/textures';
import type { Box2 } from '../../types';
import { PODIUM, STEPS } from './hall';
import { at, Batch, gableRoofGeometry, hipRoofGeometry, instances, std, TEX } from './util';

// The courtyard before the Great Buddha Hall: gravel and lawns inside the vermilion
// cloister (kairō), the stone path from the Middle Gate (Chūmon) to the hall steps,
// the 8th-century gilt-bronze octagonal lantern on the axis, the roofed incense
// burner (jōkōro), a purification basin, sika deer on the lawns, and Nara's wooded
// hills beyond. Distances follow the real precinct (OpenStreetMap): the Middle Gate stands
// 100 m south of the hall's doors and the cloister runs about 75 m either side of the axis;
// beyond the gate the stone avenue runs on to the Great South Gate (Nandaimon), and the
// bell tower stands on its rise to the east.

/** the cloister's inner faces and the gate */
export const COURT = { x: 72, z0: 11, z1: 121 };
export const LANTERN = new THREE.Vector3(0, 0, 39);
export const BURNER_AT = new THREE.Vector3(0, 0.55, 50);
export const BOUNDS = { x0: -COURT.x + 0.6, x1: COURT.x - 0.6, z0: -24, z1: COURT.z1 - 0.6 };
/** where the deer may wander: the two lawns */
const LAWNS = [{ x0: -62, x1: -8, z0: 37, z1: 114 }, { x0: 8, x1: 62, z0: 37, z1: 114 }];

const gravelMat = photo(std(0xb9ad96, 1), TEX + 'gravel.jpg', { repeat: [36, 28], mirror: true });
const lawnMat = photo(std(0x5b7a3e, 1), TEX + 'lawn.jpg', { repeat: [16, 22], mirror: true });
const fieldMat = photo(std(0x5b7a3e, 1), TEX + 'lawn.jpg', { repeat: [80, 80], mirror: true });
const pavingMat = photo(std(0x9e9c96, 0.95), TEX + 'courtyard-paving.jpg', { repeat: [3, 32], mirror: true, keepColor: true });
const apronMat = photo(std(0x9e9c96, 0.95), TEX + 'courtyard-paving.jpg', { repeat: [8, 2], mirror: true, keepColor: true });
const plaster = photo(std(0xe8e2d4, 0.9), TEX + 'plaster-timber.jpg', { repeat: [1, 1], mirror: true });
const roofTiles = photo(std(0x55585c, 0.8, 0.05), TEX + 'roof-tiles.jpg', { repeat: [1, 1] });
const lattice = photo(std(0x7a8a6a, 0.9), TEX + 'lattice.jpg', { repeat: [1, 1], keepColor: true });
const doorMat = photo(std(0x4a3524, 0.8), TEX + 'doors.jpg');
const vermilion = std(0x8e3a24, 0.75);
const darkTimber = std(0x2e2018, 0.85);
const lining = std(0x2a1c12, 0.95, 0, { side: THREE.BackSide });
const patina = std(0x4d5d53, 0.5, 0.65);
const gilt = std(0xa0723f, 0.4, 0.85);
const stoneMat = std(0x9a958a, 0.95);

function ground(mat: THREE.Material, w: number, d: number, x: number, z: number, y: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

/** the gilt-bronze octagonal lantern (kondō hakkaku tōrō), 4.6 m */
function octagonalLantern(b: Batch, lit: THREE.Material) {
  const { x, z } = LANTERN;
  const oct = (r0: number, r1: number, y0: number, y1: number, mat: THREE.Material) =>
    b.add(new THREE.CylinderGeometry(r1, r0, y1 - y0, 8).rotateY(Math.PI / 8), mat, x, (y0 + y1) / 2, z);
  oct(1.5, 1.4, 0, 0.35, stoneMat);
  oct(1.1, 1.0, 0.35, 0.6, stoneMat);
  oct(0.75, 0.55, 0.6, 0.95, patina); // lotus base
  oct(0.2, 0.2, 0.95, 2.15, patina); // shaft
  b.add(new THREE.TorusGeometry(0.24, 0.05, 6, 8).rotateX(Math.PI / 2), gilt, x, 1.55, z);
  oct(0.35, 0.75, 2.15, 2.5, patina); // the platform under the fire chamber
  oct(0.75, 0.75, 2.5, 2.6, gilt);
  // fire chamber: eight posts, lit panels between (bodhisattvas and lions in openwork)
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(0.09, 1.05, 0.09), gilt, x + Math.sin(a) * 0.6, 3.12, z + Math.cos(a) * 0.6);
  }
  const panel = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 1.0, 8, 1, true).rotateY(Math.PI / 8), lit);
  panel.position.set(x, 3.12, z);
  // roof with upturned corners and the jewel finial
  const roof = hipRoofGeometry(1.15, 1.15, 0.12, 0.12, 3.7, 4.15, 0, 0.18, 1.4, 0.4);
  roof.rotateY(Math.PI / 8);
  b.add(roof, patina, x, 0, z);
  b.add(new THREE.SphereGeometry(0.17, 10, 8), gilt, x, 4.3, z);
  b.add(new THREE.ConeGeometry(0.1, 0.36, 8), gilt, x, 4.55, z);
  return panel;
}

/** the roofed bronze incense burner, where visitors light senkō and waft the smoke */
function incenseBurner() {
  const g = new THREE.Group();
  const bronzeB = std(0x3f4a40, 0.5, 0.7);
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.4, -0.55), new THREE.Vector2(0.9, -0.35), new THREE.Vector2(1.15, 0.0), new THREE.Vector2(1.2, 0.68), new THREE.Vector2(1.08, 0.7),
  ], 24), bronzeB);
  const ash = new THREE.Mesh(new THREE.CircleGeometry(1.08, 24), std(0xa59d90, 1));
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.66;
  g.add(bowl, ash);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 8), bronzeB);
    leg.position.set(Math.cos(a) * 0.6, -0.4, Math.sin(a) * 0.6);
    g.add(leg);
  }
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 3.2), stoneMat);
  plinth.position.y = -0.55 + 0.12 - 0.1;
  g.add(plinth);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 3.4, 8), bronzeB);
    post.position.set(sx * 1.4, -0.45 + 1.7, sz * 1.4);
    g.add(post);
  }
  const roof = new THREE.Mesh(hipRoofGeometry(2.4, 2.4, 0.25, 0.25, 2.95, 3.85, 0, 0.3, 1.4, 0.5), bronzeB);
  roof.castShadow = true;
  const under = new THREE.Mesh(roof.geometry, lining);
  under.position.y = -0.1;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bronzeB);
  knob.position.y = 4.05;
  g.add(roof, under, knob);
  g.traverse((o) => {
    o.userData.burner = true;
    if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
  });
  g.position.copy(BURNER_AT);
  return g;
}

/** one stretch of roofed cloister: posts both sides, a central wall with lattice windows */
function corridor(b: Batch, x0: number, z0: number, x1: number, z1: number, colliders: Box2[], cam: (Box2 & { y0?: number })[]) {
  const len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(z1 - z0, x1 - x0); // along local +x
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, lx: number, ly: number, lz: number) => {
    const c = Math.cos(-yaw), s = Math.sin(-yaw);
    b.add(geo.clone().rotateY(-yaw), mat, cx + lx * c + lz * s, ly, cz - lx * s + lz * c);
  };
  const n = Math.max(1, Math.round(len / 4.2));
  for (let i = 0; i <= n; i++) {
    const lx = -len / 2 + (i * len) / n;
    for (const lz of [-3.1, 3.1]) put(new THREE.CylinderGeometry(0.2, 0.22, 4.6, 10), vermilion, lx, 2.3 + 0.35, lz);
    put(new THREE.BoxGeometry(0.4, 4.6, 0.5), vermilion, lx, 2.3 + 0.35, 0);
  }
  // the wall: white plaster above and below a band of green-barred windows
  const wallGeo = (h: number, th: number) => {
    const g = new THREE.BoxGeometry(len, h, 0.36);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * len) / 4.2, (uv.getY(i) * h) / th);
    return g;
  };
  put(wallGeo(1.6, 3.2), plaster, 0, 0.35 + 0.8, 0);
  put(wallGeo(1.0, 2.0), plaster, 0, 0.35 + 4.1, 0);
  const win = new THREE.PlaneGeometry(len, 2.0);
  const wu = win.attributes.uv;
  for (let i = 0; i < wu.count; i++) wu.setXY(i, (wu.getX(i) * len) / 2.4, wu.getY(i));
  put(win, lattice, 0, 0.35 + 2.6, 0.05);
  put(win.clone().rotateY(Math.PI), lattice, 0, 0.35 + 2.6, -0.05);
  for (const y of [0.35 + 1.62, 0.35 + 3.6, 0.35 + 4.62]) put(new THREE.BoxGeometry(len, 0.22, 6.6), vermilion, 0, y, 0);
  put(new THREE.BoxGeometry(len + 0.4, 0.35, 7.4), stoneMat, 0, 0.17, 0);
  const roof = gableRoofGeometry(len + 0.6, 4.3, 4.85, 7.3, 1.6);
  put(roof, roofTiles, 0, 0, 0);
  put(roof, lining, 0, -0.15, 0);
  put(new THREE.BoxGeometry(len + 0.6, 0.4, 0.5), roofTiles, 0, 7.35, 0);
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1), minZ = Math.min(z0, z1), maxZ = Math.max(z0, z1);
  const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const box = horiz ? { x0: minX, x1: maxX, z0: cz - 3.6, z1: cz + 3.6 } : { x0: cx - 3.6, x1: cx + 3.6, z0: minZ, z1: maxZ };
  colliders.push(box);
  cam.push({ ...box, y0: 4.4 });
  cam.push(horiz ? { x0: minX, x1: maxX, z0: cz - 0.3, z1: cz + 0.3 } : { x0: cx - 0.3, x1: cx + 0.3, z0: minZ, z1: maxZ });
}

/** the Middle Gate: a two-storey, five-bay gate on the axis, kept shut */
function chumon(b: Batch, z: number, colliders: Box2[], cam: (Box2 & { y0?: number })[]) {
  const hw = 13, hd = 6;
  for (let i = 0; i <= 5; i++) for (const sz of [-1, 0, 1]) {
    b.add(new THREE.CylinderGeometry(0.42, 0.46, 9, 12), vermilion, -hw + i * (2 * hw / 5), 0.6 + 4.5, z + sz * hd);
  }
  b.box(stoneMat, hw * 2 + 3, 0.6, hd * 2 + 3, 0, 0.3, z);
  // closed doors in the three middle bays, plaster in the end bays
  for (let i = 0; i < 5; i++) {
    const x = -hw + (i + 0.5) * (2 * hw / 5);
    const g = new THREE.PlaneGeometry(2 * hw / 5 - 0.9, 7.2);
    if (i > 0 && i < 4) {
      b.add(g, doorMat, x, 0.6 + 3.6, z + 0.02);
      b.add(g, doorMat, x, 0.6 + 3.6, z - 0.02, Math.PI);
    } else {
      b.box(plaster, 2 * hw / 5 - 0.7, 7.2, 0.4, x, 0.6 + 3.6, z);
    }
  }
  for (const y of [8.2, 9.2]) b.box(vermilion, hw * 2 + 1, 0.5, hd * 2 + 1, 0, y, z);
  // bracket band and the lower roof
  const bm: THREE.Matrix4[] = [];
  for (let x = -hw; x <= hw; x += 2.2) bm.push(at(x, 9.4, z + hd + 0.2, 0, 0.7), at(x, 9.4, z - hd - 0.2, Math.PI, 0.7));
  const unit = new THREE.BoxGeometry(0.4, 1.2, 1.6).translate(0, 0.6, 0.6);
  b.add(hipRoofGeometry(hw + 3.6, hd + 3.4, hw - 2, hd - 2.5, 10.8, 13.4, 0, 0.6, 1.3, 1.6), roofTiles, 0, 0, z);
  b.add(hipRoofGeometry(hw + 3.6, hd + 3.4, hw - 2, hd - 2.5, 10.8, 13.4, 0, 0.6, 1.3, 1.6), lining, 0, -0.2, z);
  // upper storey and roof
  b.box(plaster, (hw - 2) * 2, 4.4, (hd - 2.5) * 2, 0, 14.5, z);
  for (let i = 0; i <= 4; i++) {
    const x = -(hw - 2) + i * ((hw - 2) * 2 / 4);
    b.add(new THREE.CylinderGeometry(0.36, 0.38, 4.6, 10), vermilion, x, 14.5, z + hd - 2.4);
    b.add(new THREE.CylinderGeometry(0.36, 0.38, 4.6, 10), vermilion, x, 14.5, z - hd + 2.4);
  }
  b.add(new THREE.PlaneGeometry((hw - 2) * 2 - 1, 1.8), lattice, 0, 15, z + hd - 2.48);
  b.add(hipRoofGeometry(hw + 1.2, hd + 1.4, hw - 6, 0, 16.8, 22.5, 0, 0.9, 1.5, 1.6), roofTiles, 0, 0, z);
  b.add(hipRoofGeometry(hw + 1.2, hd + 1.4, hw - 6, 0, 16.8, 22.5, 0, 0.9, 1.5, 1.6), lining, 0, -0.2, z);
  b.box(roofTiles, (hw - 6) * 2 + 1, 0.7, 0.9, 0, 22.7, z);
  colliders.push({ x0: -hw - 1.5, x1: hw + 1.5, z0: z - hd - 1.5, z1: z + hd + 1.5 });
  cam.push({ x0: -hw, x1: hw, z0: z - 0.4, z1: z + 0.4 }, { x0: -hw - 3.6, x1: hw + 3.6, z0: z - hd - 3.4, z1: z + hd + 3.4, y0: 9.5 });
  return instances(unit, darkTimber, bm, false);
}

/**
 * The Great South Gate (Nandaimon, 1199): five bays, two storeys, about 29 × 11 m and 25 m
 * tall, in bare weathered Daibutsuyō timber with tiers of bracket arms thrust through the
 * posts. Seen from the courtyard only as a far roofline over the Middle Gate.
 */
function nandaimon(b: Batch, z: number) {
  const hw = 14.4, hd = 5.4;
  const weathered = std(0x5b4d40, 0.95);
  for (let i = 0; i <= 5; i++) for (const sz of [-1, 0, 1]) {
    b.add(new THREE.CylinderGeometry(0.5, 0.52, 19, 12), weathered, -hw + i * (2 * hw / 5), 0.6 + 9.5, z + sz * hd);
  }
  b.box(stoneMat, hw * 2 + 4, 0.6, hd * 2 + 4, 0, 0.3, z);
  // the through-post bracket tiers (sashi-hijiki), six deep under each roof
  for (const y of [7.6, 9.0, 10.4, 17.0, 18.4, 19.8]) {
    b.box(weathered, hw * 2 + 2.2, 0.55, hd * 2 + 2.2, 0, y, z);
    b.box(weathered, hw * 2 + 4.4, 0.45, 0.6, 0, y + 0.5, z + hd + 2.0).box(weathered, hw * 2 + 4.4, 0.45, 0.6, 0, y + 0.5, z - hd - 2.0);
  }
  b.add(hipRoofGeometry(hw + 4.2, hd + 4.2, hw - 3, hd - 3, 11.4, 14.2, 0, 0.6, 1.3, 4), roofTiles, 0, 0, z);
  b.add(hipRoofGeometry(hw + 4.2, hd + 4.2, hw - 3, hd - 3, 11.4, 14.2, 0, 0.6, 1.3, 4), lining, 0, -0.2, z);
  b.add(hipRoofGeometry(hw + 4.4, hd + 4.4, hw - 7, 0, 20.6, 25.6, 0, 0.9, 1.4, 4), roofTiles, 0, 0, z);
  b.add(hipRoofGeometry(hw + 4.4, hd + 4.4, hw - 7, 0, 20.6, 25.6, 0, 0.9, 1.4, 4), lining, 0, -0.2, z);
  b.box(roofTiles, (hw - 7) * 2 + 1, 0.8, 1.0, 0, 25.8, z);
}

/** the bell tower (shōrō, 1207–10) on its rise east of the hall: four great posts, a heavy hipped
 * roof, and the 26-tonne bell of 752 hanging in the open with its log striker */
function shoro(b: Batch, x: number, y: number, z: number) {
  const hw = 4.2, timber = std(0x5a4637, 0.9);
  b.box(stoneMat, hw * 2 + 3, 0.8, hw * 2 + 3, x, y + 0.4, z);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(new THREE.CylinderGeometry(0.42, 0.46, 8.5, 12), timber, x + sx * hw, y + 0.8 + 4.25, z + sz * hw);
  for (const yy of [6.6, 8.6, 9.6]) b.box(timber, hw * 2 + 1.6, 0.5, hw * 2 + 1.6, x, y + yy, z);
  b.add(hipRoofGeometry(hw + 4.4, hw + 4.4, 2.2, 0, y + 10.2, y + 15.5, 0, 0.8, 1.4, 4), roofTiles, x, 0, z);
  b.add(hipRoofGeometry(hw + 4.4, hw + 4.4, 2.2, 0, y + 10.2, y + 15.5, 0, 0.8, 1.4, 4), lining, x, -0.2, z);
  const bell = new THREE.LatheGeometry([
    new THREE.Vector2(0.01, 3.86), new THREE.Vector2(1.05, 3.8), new THREE.Vector2(1.2, 3.4), new THREE.Vector2(1.22, 1.2),
    new THREE.Vector2(1.36, 0.1), new THREE.Vector2(1.3, 0), new THREE.Vector2(1.1, 0.05),
  ], 20);
  b.add(bell, std(0x3a3a32, 0.55, 0.6), x, y + 3.0, z);
  b.add(new THREE.CylinderGeometry(0.3, 0.3, 4.48, 10).rotateZ(Math.PI / 2), timber, x - 3.6, y + 3.6, z);
  // the knoll it stands on
  b.add(new THREE.SphereGeometry(1, 18, 10), std(0x4f6b3a, 1), x, y - 30, z, 0, 0, 0, 34, 30, 34);
}

/** sika deer: a body that walks, a head that dips to graze */
function makeDeer(coat: THREE.Material, pale: THREE.Material, dark: THREE.Material) {
  const deer = new THREE.Group();
  const body = new Batch(false);
  body.add(new THREE.SphereGeometry(0.5, 12, 8).scale(0.62, 0.62, 1.15), coat, 0, 0.9, 0);
  body.add(new THREE.SphereGeometry(0.2, 8, 6).scale(1, 0.9, 0.5), pale, 0, 0.95, -0.55);
  for (const [lx, lz] of [[-0.17, 0.38], [0.17, 0.38], [-0.17, -0.38], [0.17, -0.38]]) {
    body.add(new THREE.CylinderGeometry(0.05, 0.035, 0.75, 6), coat, lx, 0.45, lz);
    body.add(new THREE.CylinderGeometry(0.035, 0.03, 0.06, 6), dark, lx, 0.05, lz);
  }
  body.add(new THREE.ConeGeometry(0.06, 0.16, 6).rotateX(-2.4), pale, 0, 1.05, -0.6);
  body.build(deer, true);
  const head = new THREE.Group();
  head.position.set(0, 1.05, 0.48);
  const hb = new Batch(false);
  hb.add(new THREE.CylinderGeometry(0.1, 0.15, 0.6, 8).rotateX(0.55), coat, 0, 0.22, 0.12);
  hb.add(new THREE.SphereGeometry(0.15, 10, 8).scale(0.8, 0.8, 1.35), coat, 0, 0.48, 0.3);
  hb.add(new THREE.SphereGeometry(0.06, 8, 6), dark, 0, 0.44, 0.5);
  for (const sx of [-1, 1]) hb.add(new THREE.ConeGeometry(0.06, 0.2, 6).rotateZ(sx * 1.1), coat, sx * 0.12, 0.6, 0.24);
  hb.build(head, true);
  deer.add(head);
  return { deer, head };
}

export function buildGrounds(rng: () => number) {
  const group = new THREE.Group();
  const b = new Batch();
  const colliders: Box2[] = [];
  const cameraSolids: (Box2 & { y0?: number })[] = [];
  const floor: THREE.Object3D[] = [];

  // ground: lawn all round, gravel in the courtyard, lawns either side of the stone path
  const field = ground(fieldMat, 900, 900, 0, 0, -0.01);
  const gravel = ground(gravelMat, COURT.x * 2, COURT.z1 - COURT.z0 + 4, 0, (COURT.z0 + COURT.z1) / 2, 0.005);
  group.add(field, gravel);
  floor.push(field, gravel);
  for (const l of LAWNS) {
    const m = ground(lawnMat, l.x1 - l.x0, l.z1 - l.z0, (l.x0 + l.x1) / 2, (l.z0 + l.z1) / 2, 0.012);
    group.add(m);
    floor.push(m);
  }
  const pathLen = COURT.z1 - STEPS.z1;
  const path = ground(pavingMat, 8, pathLen, 0, STEPS.z1 + pathLen / 2, 0.02);
  const apron = ground(apronMat, STEPS.halfW * 2 + 6, 4, 0, STEPS.z1 + 2, 0.021);
  group.add(path, apron);
  floor.push(path, apron);
  // low stone kerbs round the lawns
  for (const l of LAWNS) {
    b.box(stoneMat, l.x1 - l.x0, 0.12, 0.2, (l.x0 + l.x1) / 2, 0.06, l.z0).box(stoneMat, l.x1 - l.x0, 0.12, 0.2, (l.x0 + l.x1) / 2, 0.06, l.z1);
    b.box(stoneMat, 0.2, 0.12, l.z1 - l.z0, l.x0, 0.06, (l.z0 + l.z1) / 2).box(stoneMat, 0.2, 0.12, l.z1 - l.z0, l.x1, 0.06, (l.z0 + l.z1) / 2);
  }

  // the octagonal lantern and the incense burner on the axis
  const lit = new THREE.MeshStandardMaterial({ color: 0x3a3226, emissive: 0xffb45a, emissiveIntensity: 0.2, roughness: 0.6, side: THREE.DoubleSide });
  const panel = octagonalLantern(b, lit);
  group.add(panel);
  colliders.push({ x0: LANTERN.x - 1.6, x1: LANTERN.x + 1.6, z0: LANTERN.z - 1.6, z1: LANTERN.z + 1.6 });
  const burner = incenseBurner();
  group.add(burner);
  colliders.push({ x0: BURNER_AT.x - 1.7, x1: BURNER_AT.x + 1.7, z0: BURNER_AT.z - 1.7, z1: BURNER_AT.z + 1.7 });

  // purification basin (chōzuya) to the east of the path
  const cz = { x: 18, z: 60 };
  b.box(stoneMat, 3, 0.8, 1.4, cz.x, 0.4, cz.z);
  b.box(std(0x5a7a8a, 0.1, 0.2), 2.7, 0.05, 1.1, cz.x, 0.79, cz.z);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(new THREE.CylinderGeometry(0.14, 0.15, 3.2, 8), vermilion, cz.x + sx * 2, 1.6, cz.z + sz * 1.4);
  b.add(gableRoofGeometry(5.6, 2.6, 3.1, 4.2, 0.8), roofTiles, cz.x, 0, cz.z);
  b.add(gableRoofGeometry(5.6, 2.6, 3.1, 4.2, 0.8), lining, cz.x, -0.1, cz.z);
  colliders.push({ x0: cz.x - 2.3, x1: cz.x + 2.3, z0: cz.z - 1.7, z1: cz.z + 1.7 });

  // the cloister: across the front with the gate in it, up both sides, and in to the hall's flanks
  const cw = COURT.x + 3.6;
  const gateZ = COURT.z1 + 3.6;
  corridor(b, -cw, gateZ, -14.5, gateZ, colliders, cameraSolids);
  corridor(b, 14.5, gateZ, cw, gateZ, colliders, cameraSolids);
  corridor(b, -cw, COURT.z0 - 3.6, -cw, gateZ + 3.6, colliders, cameraSolids);
  corridor(b, cw, COURT.z0 - 3.6, cw, gateZ + 3.6, colliders, cameraSolids);
  corridor(b, -cw + 3.6, COURT.z0 - 3.6, -PODIUM.x - 0.3, COURT.z0 - 3.6, colliders, cameraSolids);
  corridor(b, PODIUM.x + 0.3, COURT.z0 - 3.6, cw - 3.6, COURT.z0 - 3.6, colliders, cameraSolids);
  group.add(chumon(b, gateZ, colliders, cameraSolids));

  // beyond the Middle Gate: the stone avenue south to the Great South Gate, and the bell tower
  const avenue = ground(pavingMat, 10, 230, 0, gateZ + 9 + 115, 0.02);
  group.add(avenue);
  nandaimon(b, gateZ + 230);
  shoro(b, 190, 4, -5);

  // paper lanterns along the path for the lantern-offering night (Mantō-e)
  const andonLit = new THREE.MeshStandardMaterial({ color: 0xbdb39f, emissive: 0xffb86a, emissiveIntensity: 0.05, roughness: 0.8 });
  const andon: THREE.Matrix4[] = [];
  for (let z = STEPS.z1 + 6; z < COURT.z1 - 4; z += 3.2) for (const sx of [-1, 1]) if (Math.abs(z - LANTERN.z) > 3 && Math.abs(z - BURNER_AT.z) > 3.5) andon.push(at(sx * 4.5, 0.25, z));
  // paper lanterns set out for the lantern-offering night only
  const andonMesh = instances(new THREE.BoxGeometry(0.28, 0.5, 0.28), andonLit, andon, false);
  group.add(andonMesh);
  const lanternGlow = new THREE.PointLight(0xffb45a, 0, 18, 1.6);
  lanternGlow.position.set(LANTERN.x, 3.1, LANTERN.z);
  group.add(lanternGlow);

  // trees outside the cloister: Japanese red pines and tall cedars; Nara's hills beyond
  const trunks: THREE.Matrix4[] = [], cedars: THREE.Matrix4[] = [], pads: THREE.Matrix4[] = [];
  const plant = (x: number, z: number) => {
    const h = 9 + rng() * 9;
    trunks.push(new THREE.Matrix4().compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)));
    if (rng() < 0.55) {
      cedars.push(new THREE.Matrix4().compose(new THREE.Vector3(x, h * 0.62, z), new THREE.Quaternion(), new THREE.Vector3(h * 0.22, h * 0.85, h * 0.22)));
    } else {
      for (let k = 0; k < 4; k++) {
        const r = 2 + rng() * 2.5;
        pads.push(new THREE.Matrix4().compose(
          new THREE.Vector3(x + (rng() - 0.5) * 3.5, h * (0.55 + k * 0.13), z + (rng() - 0.5) * 3.5),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rng() * 3, 0)), new THREE.Vector3(r, r * 0.38, r * 0.8)));
      }
    }
  };
  for (let i = 0; i < 150; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const zone = rng();
    let x: number, z: number;
    if (zone < 0.45) { x = side * (cw + 8 + rng() * 45); z = -50 + rng() * 160; }
    else if (zone < 0.75) { x = (rng() - 0.5) * 220; z = -45 - rng() * 50; }
    else { x = (rng() - 0.5) * 220; z = gateZ + 12 + rng() * 50; if (Math.abs(x) < 9) x += side * 12; }
    plant(x, z);
  }
  const bark = std(0x4a3426, 0.95);
  group.add(instances(new THREE.CylinderGeometry(0.22, 0.32, 1, 7), bark, trunks, true));
  group.add(instances(new THREE.ConeGeometry(1, 1, 9), std(0x2f4a2a, 0.95), cedars, true));
  group.add(instances(new THREE.SphereGeometry(1, 10, 7), std(0x37542e, 0.95), pads, true));
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x4f6b3a, roughness: 1, flatShading: true });
  const hills = new Batch(false);
  // Wakakusa (a smooth grass hill) and the forested Kasuga hills to the east, low ridges north and west
  hills.add(new THREE.SphereGeometry(1, 18, 10), hillMat, 330, -40, -60, 0, 0, 0, 160, 95, 120);
  hills.add(new THREE.SphereGeometry(1, 18, 10), hillMat, 300, -50, -230, 0.5, 0, 0, 200, 140, 140);
  hills.add(new THREE.SphereGeometry(1, 18, 10), hillMat, 60, -60, -380, 0, 0, 0, 280, 110, 120);
  hills.add(new THREE.SphereGeometry(1, 18, 10), hillMat, -320, -60, -200, 0, 0, 0, 220, 100, 160);
  hills.build(group, false);

  // the deer
  const coat = std(0x7a5a3a, 0.95), pale = std(0xe8dccb, 0.95), dark = std(0x221a14, 0.8);
  const herd = Array.from({ length: 7 }, (_, i) => {
    const { deer, head } = makeDeer(coat, pale, dark);
    const lawn = LAWNS[i % 2];
    deer.position.set(lawn.x0 + 2 + rng() * (lawn.x1 - lawn.x0 - 4), 0, lawn.z0 + 2 + rng() * (lawn.z1 - lawn.z0 - 4));
    deer.rotation.y = rng() * Math.PI * 2;
    deer.scale.setScalar(0.9 + rng() * 0.2);
    group.add(deer);
    return { deer, head, lawn, target: deer.position.clone(), wait: rng() * 8, graze: 0 };
  });

  b.build(group);

  return {
    group,
    floor,
    colliders,
    cameraSolids,
    burner,
    update(dt: number, night: number, elapsed: number) {
      lit.emissiveIntensity = 0.15 + night * 2.2;
      andonLit.emissiveIntensity = night * 1.2;
      andonMesh.visible = night > 0.35;
      lanternGlow.intensity = night * 40;
      for (const d of herd) {
        const p = d.deer.position;
        if (d.wait > 0) {
          d.wait -= dt;
          d.graze = Math.min(1, d.graze + dt * 0.8);
          if (d.wait <= 0) {
            const l = d.lawn;
            d.target.set(l.x0 + 2 + rng() * (l.x1 - l.x0 - 4), 0, l.z0 + 2 + rng() * (l.z1 - l.z0 - 4));
          }
        } else {
          d.graze = Math.max(0, d.graze - dt * 1.5);
          const dx = d.target.x - p.x, dz = d.target.z - p.z, dist = Math.hypot(dx, dz);
          const want = Math.atan2(dx, dz);
          let turn = want - d.deer.rotation.y;
          turn = Math.atan2(Math.sin(turn), Math.cos(turn));
          d.deer.rotation.y += turn * Math.min(1, dt * 2);
          if (dist < 0.3) d.wait = 4 + rng() * 10;
          else {
            const step = Math.min(dist, dt * 0.55);
            p.x += Math.sin(d.deer.rotation.y) * step;
            p.z += Math.cos(d.deer.rotation.y) * step;
            p.y = Math.abs(Math.sin(elapsed * 6 + p.x)) * 0.03;
          }
        }
        d.head.rotation.x = d.graze * 1.15 + Math.sin(elapsed * 1.3 + p.z) * 0.04;
      }
    },
  };
}
