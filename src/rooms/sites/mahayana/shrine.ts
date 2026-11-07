import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { loadStatue } from '../../../kit/statue';
import { photo } from '../../../kit/textures';
import type { Box2 } from '../../types';
import { HALL_Y } from './hall';
import { relief } from './relief';
import { Batch, canvasTex, cutout, std, TEX } from './util';

// The Great Buddha (Rushana-butsu, Vairocana) of Tōdai-ji and its setting:
// a dark bronze figure about 15 m tall seated in full lotus, right hand raised in
// semui-in, left hand open on the knee, on a two-tier bronze lotus throne whose
// petals carry incised drawings, all on an octagonal stone platform. Behind it the
// huge gilded wooden halo with sixteen small Buddhas; to either side the gold
// bodhisattvas Nyoirin Kannon (west) and Kokūzō (east); in the back corners the
// guardian kings; in front the altar, the gilt lotus vases and the offering box.

/** centre of the statue's lap on the hall's axis */
export const BUDDHA = new THREE.Vector3(0, 0, -3);
/** octagonal stone platform: apothem and top */
const PLAT_R = 13, PLAT_TOP = HALL_Y + 2.2;
/** top of the bronze lotus, where the figure sits */
const SEAT_Y = PLAT_TOP + 2.7;
/** seated figure height (lotus top to the crown of the head) */
const FIGURE_H = 15.6;
/** splat units to metres (the splat is 1.08 units from the front of the lap to the crown) */
const SPLAT_K = FIGURE_H / 1.081;
/** how far below y = 0 the splat's lap reaches, in splat units */
const SPLAT_BASE = 0.065;
/** where seated visitors and the camera look: the face */
export const FACE = new THREE.Vector3(0, SEAT_Y + FIGURE_H - 3.0, BUDDHA.z);
/** the altar in front of the platform: its top is the offering ledge */
export const ALTAR = { x0: -4.6, x1: 4.6, z0: 10.8, z1: 12.3, y: HALL_Y + 1.15 };
export const OFFER_BOX_Z = 14.4;

const bronze = photo(std(0x4a4030, 0.5, 0.6), TEX + 'bronze.jpg', { repeat: [3, 1], mirror: true, keepColor: true });
const goldLeaf = new THREE.MeshStandardMaterial({ color: 0xdcb04a, metalness: 0.95, roughness: 0.32 });
const platStone = photo(std(0x8f897d, 0.92), TEX + 'courtyard-paving.jpg', { repeat: [1, 1], mirror: true, keepColor: true });
const railStone = std(0x857f73, 0.92);
const lacquer = std(0x231611, 0.45, 0.05);

/**
 * The figure. A TRELLIS image-to-3D reconstruction from one real photograph (Wikimedia Commons,
 * "20190121 Tōdai-ji Great Buddha-2.jpg", CC0) gave the shape; because that photo was shot from
 * far below, the splat (mahayana.spz) was then warped onto, and recoloured from, a second, more
 * level photograph that shows the whole figure down to the knees ("Great Buddha at Todaiji,
 * Nara.jpg", CC BY-SA 4.0) by reference/mahayana/retex/retex.py. The TRELLIS mesh
 * (mahayana-trellis.glb) stands in until the splat decodes. ?statue=mesh keeps the mesh.
 */
function buildFigure(slot: THREE.Group, mode: string) {
  const fit = (o: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(o);
    const size = box.getSize(new THREE.Vector3());
    const s = FIGURE_H / size.y;
    o.scale.multiplyScalar(s);
    const c = box.getCenter(new THREE.Vector3());
    o.position.set(-c.x * s, -box.min.y * s, -c.z * s);
  };
  let mesh: THREE.Object3D | null = null;
  let splatIn = false;
  loadStatue('mahayana-trellis', 'gilt').then((g) => {
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const old = m.material as THREE.MeshStandardMaterial;
      m.geometry = toCreasedNormals(m.geometry, 0.9);
      // the photo's bronze, relit: dark, waxy, faintly metallic
      m.material = new THREE.MeshStandardMaterial({ map: old.map, color: 0xd6cbb8, metalness: 0.45, roughness: 0.48 });
      m.castShadow = m.receiveShadow = true;
    });
    fit(g);
    // the raw reconstruction leans back and is squat: sit it upright and give the lap depth
    const wrap = new THREE.Group();
    wrap.rotation.x = 0.16;
    wrap.scale.set(0.94, 1, 1.25);
    wrap.position.y = -0.3;
    wrap.add(g);
    mesh = wrap;
    if (!splatIn) slot.add(wrap);
  }).catch((e) => console.warn('mahayana statue mesh', e));
  if (mode === 'mesh') return;
  const splat = new SplatMesh({ url: '/models/statues/mahayana.spz' });
  // the warped splat stands 1 unit from the front of the lap (y = -SPLAT_BASE) to the crown
  splat.scale.set(SPLAT_K, SPLAT_K, SPLAT_K * 1.15);
  splat.position.y = SPLAT_BASE * SPLAT_K;
  splat.rotation.x = 0.06;
  splat.initialized.then(() => {
    splatIn = true;
    console.info('mahayana: statue splat ready');
    if (mesh) slot.remove(mesh);
    slot.add(splat);
  }).catch(() => {});
}

/** the lotus throne: a bronze drum ringed by upturned petals above and reflexed ones below */
function lotus(b: Batch, group: THREE.Group) {
  const cy = BUDDHA.z;
  b.add(new THREE.CylinderGeometry(9.4, 10.2, SEAT_Y - PLAT_TOP, 40, 1), bronze, 0, (SEAT_Y + PLAT_TOP) / 2, cy);
  b.add(new THREE.CylinderGeometry(9.8, 9.4, 0.5, 40), bronze, 0, SEAT_Y - 0.1, cy);
  const petalMat = cutout(TEX + 'lotus-petal.jpg', { alphaTest: 0.006, color: 0x6a6252, metalness: 0.45, roughness: 0.66 });
  const big = new THREE.PlaneGeometry(2.9, 2.75).translate(0, 1.375, 0);
  const small = new THREE.PlaneGeometry(2.2, 2.2).translate(0, 1.1, 0);
  const petals: THREE.Mesh[] = [];
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const large = i % 2 === 0;
    const r = large ? 10.2 : 10.5;
    const p = new THREE.Mesh(large ? big : small, petalMat);
    p.position.set(Math.sin(a) * r, PLAT_TOP + (large ? 0.15 : 0.1), cy + Math.cos(a) * r);
    p.rotation.set(0, a, 0, 'YXZ');
    p.rotateX(0.32); // lean out from the drum
    p.castShadow = true;
    petals.push(p);
  }
  // the lower, reflexed tier reads as a heavy ring of bronze under the petals
  b.add(new THREE.TorusGeometry(10.4, 0.55, 8, 48).rotateX(Math.PI / 2), bronze, 0, PLAT_TOP + 0.3, cy);
  group.add(...petals);
}

/** the octagonal stone platform with its low balustrade (open at the front for the altar) */
function platform(b: Batch) {
  const R = PLAT_R / Math.cos(Math.PI / 8);
  const h = PLAT_TOP - HALL_Y;
  b.add(new THREE.CylinderGeometry(R, R + 0.4, h, 8).rotateY(Math.PI / 8), platStone, 0, HALL_Y + h / 2, BUDDHA.z);
  b.add(new THREE.CylinderGeometry(R + 0.25, R + 0.25, 0.25, 8).rotateY(Math.PI / 8), platStone, 0, PLAT_TOP - 0.1, BUDDHA.z);
  // rail posts and bars along each side, the front side left open where the altar stands
  const corners: THREE.Vector2[] = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
    corners.push(new THREE.Vector2(Math.sin(a) * (R - 0.4), BUDDHA.z + Math.cos(a) * (R - 0.4)));
  }
  for (let i = 0; i < 8; i++) {
    const p = corners[i], q = corners[(i + 1) % 8];
    const mid = p.clone().add(q).multiplyScalar(0.5);
    const front = mid.y > BUDDHA.z + PLAT_R - 1 && Math.abs(mid.x) < 1;
    const len = p.distanceTo(q), yaw = Math.atan2(q.x - p.x, q.y - p.y);
    if (!front) {
      for (const y of [0.45, 1.05]) b.add(new THREE.BoxGeometry(0.16, 0.14, len), railStone, mid.x, PLAT_TOP + y, mid.y, yaw);
      const n = Math.round(len / 1.8);
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        b.box(railStone, 0.24, 1.25, 0.24, p.x + (q.x - p.x) * t, PLAT_TOP + 0.62, p.y + (q.y - p.y) * t);
        b.box(railStone, 0.3, 0.2, 0.3, p.x + (q.x - p.x) * t, PLAT_TOP + 1.3, p.y + (q.y - p.y) * t);
      }
    }
  }
}

/** a tall metal lotus arrangement in a gilt bronze vase (the kebyō before the Buddha) */
function lotusVase(b: Batch, x: number, y: number, z: number, rng: () => number) {
  const vase = new THREE.LatheGeometry([
    new THREE.Vector2(0.55, 0), new THREE.Vector2(0.7, 0.15), new THREE.Vector2(0.75, 0.6), new THREE.Vector2(0.45, 1.2),
    new THREE.Vector2(0.38, 1.55), new THREE.Vector2(0.6, 1.9), new THREE.Vector2(0.62, 1.95),
  ], 20);
  b.add(vase, goldLeaf, x, y, z);
  // painted metal, as on the real kebyō: green stems and leaves, pale pink and cream flowers
  const stem = std(0x4a6a42, 0.6, 0.3), leaf = std(0x3f6a4a, 0.6, 0.3), white = std(0xeec9ad, 0.55, 0.1), pink = std(0xe9d7b8, 0.55, 0.1);
  const leafGeo = new THREE.CylinderGeometry(0.9, 0.7, 0.06, 14);
  const bud = new THREE.SphereGeometry(0.32, 10, 8).scale(1, 1.35, 1);
  const flower = new THREE.ConeGeometry(0.55, 0.6, 10, 1, true).rotateX(Math.PI);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng();
    const lean = 0.12 + rng() * 0.22;
    const len = 3.2 + rng() * 3.4;
    const tipX = x + Math.cos(a) * Math.sin(lean) * len, tipZ = z + Math.sin(a) * Math.sin(lean) * len, tipY = y + 1.9 + Math.cos(lean) * len;
    const mid = new THREE.Vector3((x + tipX) / 2, (y + 1.9 + tipY) / 2, (z + tipZ) / 2);
    const g = new THREE.CylinderGeometry(0.05, 0.07, len, 6);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(tipX - x, tipY - y - 1.9, tipZ - z).normalize());
    g.applyQuaternion(q);
    b.add(g, stem, mid.x, mid.y, mid.z);
    if (i % 3 === 0) b.add(leafGeo, leaf, tipX, tipY, tipZ, rng() * 3, 0.3 * (rng() - 0.5), 0.3 * (rng() - 0.5));
    else if (i % 3 === 1) b.add(bud, i % 2 ? white : pink, tipX, tipY + 0.3, tipZ);
    else b.add(flower, white, tipX, tipY + 0.25, tipZ);
  }
}

/** the altar's hanging: orange brocade with gold karakusa scrolls and white chrysanthemum roundels */
function altarCloth() {
  return canvasTex(1024, 256, (g) => {
    g.fillStyle = '#d8701e';
    g.fillRect(0, 0, 1024, 256);
    g.strokeStyle = '#f2c860';
    g.lineWidth = 5;
    for (let y = 18; y < 256; y += 44) for (let x = (y / 44) % 2 ? 0 : 22; x < 1060; x += 44) {
      g.beginPath();
      g.arc(x, y, 12, 0.2, Math.PI * 1.6);
      g.stroke();
      g.beginPath();
      g.arc(x + 13, y - 7, 6, Math.PI * 0.6, Math.PI * 2.2);
      g.stroke();
    }
    // chrysanthemum roundels
    for (const [cx, cy] of [[90, 170], [300, 120], [512, 175], [724, 120], [934, 170]]) {
      g.fillStyle = '#efe7d8';
      g.beginPath();
      g.arc(cx, cy, 52, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#c9b89a';
      g.lineWidth = 2;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
        g.lineTo(cx + Math.cos(a) * 50, cy + Math.sin(a) * 50);
        g.stroke();
      }
      g.fillStyle = '#d9c9a8';
      g.beginPath();
      g.arc(cx, cy, 11, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** the dais front: white boards between dark posts under a dark edge beam */
function daisFront() {
  return canvasTex(512, 64, (g) => {
    g.fillStyle = '#e6e0d2';
    g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#23262e';
    for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 12, 64);
    g.fillRect(0, 0, 512, 14);
    g.fillStyle = '#7a2a24';
    g.fillRect(0, 14, 512, 3);
  });
}

/** slatted wooden offering box (saisen-bako) */
function boxTexture() {
  return canvasTex(256, 128, (g) => {
    g.fillStyle = '#8a5a34';
    g.fillRect(0, 0, 256, 128);
    for (let x = 0; x < 256; x += 16) {
      g.fillStyle = x % 32 ? '#9c6a40' : '#7b4e2c';
      g.fillRect(x, 0, 12, 128);
    }
    g.fillStyle = '#5a3820';
    g.fillRect(0, 0, 256, 10);
    g.fillRect(0, 118, 256, 10);
  });
}

/**
 * A guardian king on his rock, from a real photograph as a relief (see relief.ts): Kōmokuten
 * with brush and scroll, Tamonten with the pagoda raised and the halberd. Painted wood, about
 * 5.5 m, trampling a demon.
 */
function guardian(name: string, x: number, z: number, yaw: number, w: number, h: number) {
  const g = new THREE.Group();
  const rock = new Batch();
  rock.add(new THREE.DodecahedronGeometry(1.6, 0).scale(1.35, 0.55, 1), std(0x3a3430, 0.95), 0, 0.55, 0);
  rock.build(g);
  const r = relief(name, { w, h, depth: 1.1, glow: 0.08, metalness: 0.05, roughness: 0.8 });
  r.position.set(0, 0.85, -0.4);
  g.add(r);
  g.position.set(x, HALL_Y, z);
  g.rotation.y = yaw;
  return g;
}

export function buildShrine(rng: () => number, mode: string) {
  const group = new THREE.Group();
  const b = new Batch();
  const colliders: Box2[] = [];

  platform(b);
  lotus(b, group);
  colliders.push({ x0: -PLAT_R - 0.2, x1: PLAT_R + 0.2, z0: BUDDHA.z - PLAT_R - 0.2, z1: BUDDHA.z + PLAT_R + 0.2 });

  // the Buddha
  const slot = new THREE.Group();
  slot.position.set(BUDDHA.x, SEAT_Y, BUDDHA.z);
  group.add(slot);
  buildFigure(slot, mode);

  // the great gilded halo, its photograph cut out on black; it glows faintly in the gloom
  // sized so its upper ring centres on the head and the lower on the chest, as in photographs
  const haloH = 31, haloW = haloH * (1147 / 1536);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(haloW, haloH), cutout(TEX + 'halo.jpg', { alphaTest: 0.1, color: 0xd8b070, metalness: 0.5, roughness: 0.5, emissive: 0.045 }));
  halo.position.set(0, FACE.y + 0.33 * haloH - haloH / 2 + 2.4, BUDDHA.z - 4.6);
  group.add(halo);
  // its timber back frame, seen walking behind
  b.add(new THREE.CylinderGeometry(haloW * 0.43, haloW * 0.43, 0.3, 28).rotateX(Math.PI / 2), std(0x3a2a1c, 0.9), 0, halo.position.y - 2, BUDDHA.z - 5.2);

  // attendants, from real photographs as reliefs (see relief.ts): Nyoirin Kannon to the west
  // (viewer's left), right hand raised, and Kokūzō Bosatsu to the east, left hand raised; gilt
  // wood, about 7 m seated, under flaming rayed halos, on lotus thrones hung with drapery
  for (const [sx, name, w, h] of [[-1, 'nyoirin', 8.45, 7.98], [1, 'kokuzo', 8.2, 7.94]] as const) {
    const a = new THREE.Group();
    a.position.set(sx * 21.5, HALL_Y, -2.5);
    group.add(a);
    const pb = new Batch();
    pb.add(new THREE.CylinderGeometry(3.4, 3.8, 1.6, 8).rotateY(Math.PI / 8), lacquer, 0, 0.8, 0);
    pb.build(a);
    const r = relief(name, { w, h, depth: 1.7, glow: 0.15, metalness: 0.45, roughness: 0.45 });
    r.position.set(0, 1.45, 0.2);
    a.add(r);
    colliders.push({ x0: sx * 21.5 - 3.9, x1: sx * 21.5 + 3.9, z0: -6.2, z1: 1.4 });
  }

  // guardian kings in the back corners, turned toward the Buddha: Kōmokuten north-west, Tamonten north-east
  group.add(guardian('komokuten', -25, -22.3, 1.0, 4.35, 5.8), guardian('tamonten', 25, -22.3, -1.0, 3.46, 5.73));
  colliders.push({ x0: -27.4, x1: -22.6, z0: -24.6, z1: -20.0 }, { x0: 22.6, x1: 27.4, z0: -24.6, z1: -20.0 });

  // the altar before the platform, as at Tōdai-ji: a dark table hung all round with orange
  // brocade, two tall gilt candlesticks and the incense burner on it; before it a low dais
  // with white-boarded front, red rails at its ends and gilt lanterns on black poles; the
  // offering box on the floor; the painted lotus arrangements on the platform behind
  const cloth = new THREE.MeshStandardMaterial({ map: altarCloth(), roughness: 0.75 });
  const aw = ALTAR.x1 - ALTAR.x0, ad = ALTAR.z1 - ALTAR.z0, az = (ALTAR.z0 + ALTAR.z1) / 2, ah = ALTAR.y - HALL_Y;
  b.box(lacquer, aw + 0.3, 0.12, ad + 0.3, 0, ALTAR.y - 0.06, az);
  b.box(lacquer, aw, ah - 0.12, ad, 0, (ALTAR.y + HALL_Y - 0.12) / 2, az);
  const hang = new THREE.Mesh(new THREE.PlaneGeometry(aw + 0.2, ah - 0.15), cloth);
  hang.position.set(0, HALL_Y + (ah - 0.15) / 2, ALTAR.z1 + 0.17);
  group.add(hang);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(ad + 0.3, ah - 0.15), cloth);
    side.position.set(sx * (aw / 2 + 0.17), HALL_Y + (ah - 0.15) / 2, az);
    side.rotation.y = sx * Math.PI / 2;
    group.add(side);
  }
  // the dais before the altar
  const DZ0 = ALTAR.z1 + 0.2, DZ1 = DZ0 + 0.85, DH = 0.45;
  const daisMat = new THREE.MeshStandardMaterial({ map: daisFront(), roughness: 0.8 });
  b.box(lacquer, aw + 1.2, DH, DZ1 - DZ0, 0, HALL_Y + DH / 2, (DZ0 + DZ1) / 2);
  const dfront = new THREE.Mesh(new THREE.PlaneGeometry(aw + 1.2, DH), daisMat);
  dfront.position.set(0, HALL_Y + DH / 2, DZ1 + 0.01);
  group.add(dfront);
  const red = std(0x9a3a32, 0.7);
  for (const sx of [-1, 1]) {
    const xi = sx * 2.9, xo = sx * (aw / 2 + 0.55);
    b.box(red, Math.abs(xo - xi), 0.1, 0.12, (xi + xo) / 2, HALL_Y + DH + 0.75, DZ1 - 0.1);
    b.box(red, Math.abs(xo - xi), 0.08, 0.1, (xi + xo) / 2, HALL_Y + DH + 0.42, DZ1 - 0.1);
    for (const x of [xi, xo]) b.box(red, 0.14, 0.95, 0.14, x, HALL_Y + DH + 0.47, DZ1 - 0.1);
    // a gilt lantern on a black pole
    const lx = sx * 2.3, lz = DZ0 + 0.35;
    b.cyl(lacquer, 0.05, 0.05, lx, lz, HALL_Y + DH, HALL_Y + DH + 1.7, 8);
    b.add(new THREE.SphereGeometry(0.3, 12, 10).scale(1, 1.15, 1), goldLeaf, lx, HALL_Y + DH + 1.95, lz);
    b.add(new THREE.ConeGeometry(0.34, 0.2, 6), goldLeaf, lx, HALL_Y + DH + 2.35, lz);
    // tall gilt candlesticks on the altar
    b.cyl(goldLeaf, 0.24, 0.06, sx * 1.5, az, ALTAR.y, ALTAR.y + 0.25, 10);
    b.cyl(goldLeaf, 0.05, 0.04, sx * 1.5, az, ALTAR.y + 0.25, ALTAR.y + 1.75, 8);
    b.cyl(goldLeaf, 0.08, 0.14, sx * 1.5, az, ALTAR.y + 1.75, ALTAR.y + 1.85, 10);
    b.cyl(std(0xf4efe4, 0.6), 0.04, 0.04, sx * 1.5, az, ALTAR.y + 1.85, ALTAR.y + 2.1, 8);
    lotusVase(b, sx * 7.4, PLAT_TOP, BUDDHA.z + PLAT_R - 3.6, rng);
  }
  // the black lacquer table on the dais, with the incense burner
  for (const [x, z] of [[-0.75, DZ0 + 0.15], [0.75, DZ0 + 0.15], [-0.75, DZ1 - 0.15], [0.75, DZ1 - 0.15]]) b.box(lacquer, 0.09, 0.8, 0.09, x, HALL_Y + DH + 0.4, z);
  b.box(lacquer, 1.8, 0.07, DZ1 - DZ0 + 0.1, 0, HALL_Y + DH + 0.82, (DZ0 + DZ1) / 2);
  b.add(new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI), bronze, 0, HALL_Y + DH + 1.15, (DZ0 + DZ1) / 2);
  b.add(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), bronze, 0, HALL_Y + DH + 1.15, (DZ0 + DZ1) / 2);
  const flames: THREE.Mesh[] = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc46a });
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), flameMat);
    f.position.set(sx * 1.5, ALTAR.y + 2.2, az);
    group.add(f);
    flames.push(f);
  }
  const boxMat = new THREE.MeshStandardMaterial({ map: boxTexture(), roughness: 0.7 });
  b.box(boxMat, 3.4, 0.8, 1.1, 0, HALL_Y + 0.4, OFFER_BOX_Z);
  colliders.push({ x0: ALTAR.x0 - 0.9, x1: ALTAR.x1 + 0.9, z0: BUDDHA.z + PLAT_R, z1: DZ1 + 0.1 }, { x0: -1.9, x1: 1.9, z0: OFFER_BOX_Z - 0.75, z1: OFFER_BOX_Z + 0.75 });

  // the full-size replica of a throne petal, on a stand by the entrance
  const replica = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), cutout(TEX + 'lotus-petal.jpg', { alphaTest: 0.006, color: 0xc8bba0, metalness: 0.5, roughness: 0.45 }));
  replica.position.set(-11, HALL_Y + 0.6 + 1.6, 18.5);
  replica.rotation.y = Math.PI / 5;
  group.add(replica);
  b.box(lacquer, 2.8, 0.6, 1.0, -11, HALL_Y + 0.3, 18.5, Math.PI / 5);
  colliders.push({ x0: -12.6, x1: -9.4, z0: 17.6, z1: 19.4 });

  b.build(group);

  // ---- lighting: daylight from the doors, a warm key on the face and halo, fills on the gold ----
  const key = new THREE.SpotLight(0xffd7a6, 0, 46, 0.36, 0.7, 1.15);
  key.position.set(0, 14, 16);
  key.target.position.set(0, FACE.y - 2.5, BUDDHA.z - 2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  group.add(key, key.target);
  const haloWash = new THREE.SpotLight(0xffc98a, 0, 50, 0.5, 0.8, 1.2);
  haloWash.position.set(0, 27, 8);
  haloWash.target.position.set(0, 18, BUDDHA.z - 5);
  group.add(haloWash, haloWash.target);
  const fills = [-1, 1].map((sx) => {
    const p = new THREE.PointLight(0xffd29a, 0, 16, 1.4);
    p.position.set(sx * 18, 9, 3);
    group.add(p);
    return p;
  });
  // lamps in the back corners, so the guardian kings read from the circuit
  const corner = [-1, 1].map((sx) => {
    const p = new THREE.PointLight(0xffd6a8, 0, 14, 1.5);
    p.position.set(sx * 21.8, 7.5, -17.5);
    group.add(p);
    return p;
  });
  const candle = new THREE.PointLight(0xffa64d, 0, 8, 1.8);
  candle.position.set(0, ALTAR.y + 2.0, az + 0.9);
  group.add(candle);

  return {
    group,
    colliders,
    update(night: number, elapsed: number) {
      key.intensity = 340 + night * 120;
      haloWash.intensity = 70 + night * 50;
      for (const f of fills) f.intensity = 60 + night * 30;
      for (const p of corner) p.intensity = 55 + night * 25;
      candle.intensity = 6 + Math.sin(elapsed * 13) * 0.8 + Math.sin(elapsed * 7.3) * 0.6;
      for (const [i, f] of flames.entries()) f.scale.y = 1 + Math.sin(elapsed * 11 + i * 2) * 0.12;
    },
  };
}
