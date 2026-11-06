import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { loadStatue } from '../../../kit/statue';
import { photo } from '../../../kit/textures';
import type { Box2 } from '../../types';
import { HALL_Y } from './hall';
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
const FIGURE_H = 15.4;
/** where seated visitors and the camera look: the face */
export const FACE = new THREE.Vector3(0, SEAT_Y + FIGURE_H - 3.0, BUDDHA.z);
/** the altar in front of the platform: its top is the offering ledge */
export const ALTAR = { x0: -4.6, x1: 4.6, z0: 10.8, z1: 12.3, y: HALL_Y + 1.15 };
export const OFFER_BOX_Z = 13.9;

const bronze = photo(std(0x4a4030, 0.5, 0.6), TEX + 'bronze.jpg', { repeat: [3, 1], mirror: true, keepColor: true });
const goldLeaf = new THREE.MeshStandardMaterial({ color: 0xdcb04a, metalness: 0.95, roughness: 0.32 });
const platStone = photo(std(0x8f897d, 0.92), TEX + 'courtyard-paving.jpg', { repeat: [1, 1], mirror: true, keepColor: true });
const railStone = std(0x857f73, 0.92);
const lacquer = std(0x231611, 0.45, 0.05);

/**
 * The figure, made from one real photograph (Wikimedia Commons, "20190121 Tōdai-ji Great
 * Buddha-2.jpg", CC0), masked to the bronze and run through TRELLIS image-to-3D: its mesh
 * (mahayana-trellis.glb, loaded behind the veil) stands in until the Gaussian splat
 * (mahayana.spz) decodes, then gives way to it. ?statue=mesh keeps the mesh.
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
    mesh = g;
    if (!splatIn) slot.add(g);
  }).catch((e) => console.warn('mahayana statue mesh', e));
  if (mode === 'mesh') return;
  const splat = new SplatMesh({ url: '/models/statues/mahayana.spz' });
  splat.scale.setScalar(FIGURE_H);
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
  const big = new THREE.PlaneGeometry(2.9, 3.4).translate(0, 1.7, 0);
  const small = new THREE.PlaneGeometry(2.2, 2.6).translate(0, 1.3, 0);
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
  const stem = std(0x8a7a3a, 0.4, 0.8), leaf = std(0x3f7a5c, 0.55, 0.4), white = std(0xd9b45a, 0.35, 0.85), pink = std(0xe8d6b8, 0.5, 0.2);
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

/** the altar front: red and gold cloud scrolls on white, as on the Daibutsu's altar */
function altarCloth() {
  return canvasTex(1024, 128, (g) => {
    g.fillStyle = '#f1ebe0';
    g.fillRect(0, 0, 1024, 128);
    g.lineWidth = 9;
    for (let i = 0; i < 18; i++) {
      const x = 30 + i * 58, y = 64 + (i % 2 ? 18 : -18);
      g.strokeStyle = i % 3 ? '#c4462e' : '#c9a24a';
      g.beginPath();
      g.arc(x, y, 20, 0.3, Math.PI * 1.7);
      g.stroke();
      g.beginPath();
      g.arc(x + 22, y + 6, 11, Math.PI, Math.PI * 2.6);
      g.stroke();
    }
    g.fillStyle = '#7a1f17';
    g.fillRect(0, 0, 1024, 12);
    g.fillRect(0, 116, 1024, 12);
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

/** a guardian king (Kōmokuten, Tamonten): armoured, glaring, on a rock, about 5 m */
function guardian(x: number, z: number, yaw: number, robe: number, weaponUp: boolean) {
  const g = new Batch();
  const armour = std(robe, 0.6, 0.15), skin = std(0x5a3b2c, 0.6), trim = std(0xc9a24a, 0.35, 0.8), rock = std(0x3a3430, 0.95);
  g.add(new THREE.DodecahedronGeometry(1.5, 0).scale(1.2, 0.5, 1), rock, 0, 0.6, 0);
  for (const sx of [-1, 1]) g.add(new THREE.CylinderGeometry(0.28, 0.24, 1.9, 8), armour, sx * 0.4, 2.0, 0, 0, 0, sx * 0.12);
  g.add(new THREE.CylinderGeometry(0.55, 0.95, 1.4, 10), armour, 0, 2.7, 0);
  g.add(new THREE.CylinderGeometry(0.62, 0.55, 1.4, 10), armour, 0, 3.7, 0);
  g.add(new THREE.TorusGeometry(0.62, 0.08, 6, 16).rotateX(Math.PI / 2), trim, 0, 3.15, 0);
  for (const sx of [-1, 1]) g.add(new THREE.SphereGeometry(0.42, 10, 8).scale(1, 0.7, 1), armour, sx * 0.8, 4.35, 0);
  g.add(new THREE.SphereGeometry(0.38, 12, 10), skin, 0, 4.85, 0.05);
  g.add(new THREE.ConeGeometry(0.42, 0.7, 10), trim, 0, 5.35, 0);
  // one arm on the hip, the other raised with a halberd or holding a stupa aloft
  g.add(new THREE.CylinderGeometry(0.17, 0.15, 1.3, 8), armour, -0.95, 3.7, 0.15, 0, 0, -0.5);
  g.add(new THREE.CylinderGeometry(0.17, 0.15, 1.3, 8), armour, 1.0, 4.6, 0.1, 0, 0, weaponUp ? 0.25 : -0.9);
  if (weaponUp) g.add(new THREE.CylinderGeometry(0.05, 0.05, 5.2, 6), trim, 1.25, 4.2, 0.15);
  else g.add(new THREE.ConeGeometry(0.3, 0.8, 8), trim, 1.7, 5.4, 0.1);
  const m = new THREE.Group();
  g.build(m);
  m.position.set(x, HALL_Y, z);
  m.rotation.y = yaw;
  return m;
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
  slot.position.set(BUDDHA.x, SEAT_Y - 0.3, BUDDHA.z);
  // the photo was taken from far below, so the reconstruction leans back: sit it upright,
  // and give the lap the depth the single view could not see
  slot.rotation.x = 0.16;
  slot.scale.set(1.08, 1, 1.25);
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

  // attendants: gold seated bodhisattvas with crowns and their own halos
  const attendants: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(sx * 21.5, HALL_Y, -2.5);
    group.add(a);
    attendants.push(a);
    const pb = new Batch();
    pb.add(new THREE.CylinderGeometry(2.3, 2.6, 1.4, 8).rotateY(Math.PI / 8), lacquer, 0, 0.7, 0);
    pb.add(new THREE.CylinderGeometry(2.0, 2.2, 0.9, 16), goldLeaf, 0, 1.85, 0);
    const halo2 = new THREE.Shape();
    halo2.moveTo(0, 0);
    halo2.bezierCurveTo(2.6, 0.3, 2.9, 4.2, 0, 7.6);
    halo2.bezierCurveTo(-2.9, 4.2, -2.6, 0.3, 0, 0);
    pb.add(new THREE.ShapeGeometry(halo2, 16), goldLeaf, 0, 2.2, -1.2);
    pb.add(new THREE.TorusGeometry(1.05, 0.12, 8, 28), goldLeaf, 0, 6.6, -1.05);
    pb.build(a);
    colliders.push({ x0: sx * 21.5 - 2.7, x1: sx * 21.5 + 2.7, z0: -5.2, z1: 0.2 });
  }
  loadStatue('mahayana', 'gilt').then((s) => {
    for (const [i, a] of attendants.entries()) {
      const fig = i === 0 ? s : s.clone(true);
      fig.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = goldLeaf; });
      const box = new THREE.Box3().setFromObject(fig);
      const k = 5.0 / (box.max.y - box.min.y);
      fig.scale.setScalar(k);
      fig.position.set(0, 2.25 - box.min.y * k, -0.1);
      if (i === 0) fig.scale.x *= -1; // mirrored hands, as the pair reverse their gestures
      a.add(fig);
      // the bodhisattva's crown
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.75, 10, 1, true), goldLeaf);
      crown.position.set(0, 2.25 + 5.0 * 0.93, 0);
      a.add(crown);
    }
  }).catch(() => {});

  // guardian kings in the back corners: Kōmokuten north-west, Tamonten north-east
  group.add(guardian(-23.5, -21.2, 0.84, 0x2f5a46, true), guardian(23.5, -21.2, -0.84, 0x7a2a22, false));
  colliders.push({ x0: -25.6, x1: -21.4, z0: -23.2, z1: -19.2 }, { x0: 21.4, x1: 25.6, z0: -23.2, z1: -19.2 });

  // the altar before the platform, the offering box, and the lotus vases on the platform
  const clothTex = altarCloth();
  const cloth = new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.7 });
  const aw = ALTAR.x1 - ALTAR.x0, ad = ALTAR.z1 - ALTAR.z0, az = (ALTAR.z0 + ALTAR.z1) / 2;
  b.box(lacquer, aw + 0.3, 0.12, ad + 0.3, 0, ALTAR.y - 0.06, az);
  b.box(lacquer, aw, ALTAR.y - HALL_Y - 0.12, ad, 0, (ALTAR.y + HALL_Y - 0.12) / 2, az);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(aw - 0.2, ALTAR.y - HALL_Y - 0.3), cloth);
  front.position.set(0, (ALTAR.y + HALL_Y) / 2 - 0.08, ALTAR.z1 + 0.01);
  group.add(front);
  // incense burner, candlesticks and gilt lanterns on the altar
  b.add(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI), bronze, 0, ALTAR.y + 0.45, az);
  for (const sx of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), bronze, sx * 0.3, ALTAR.y + 0.2, az);
    b.cyl(goldLeaf, 0.2, 0.06, sx * 1.6, az, ALTAR.y, ALTAR.y + 1.1, 10);
    b.cyl(std(0xf4efe4, 0.6), 0.05, 0.05, sx * 1.6, az, ALTAR.y + 1.1, ALTAR.y + 1.45, 8);
    b.add(new THREE.SphereGeometry(0.34, 12, 10), goldLeaf, sx * 3.6, ALTAR.y + 0.65, az);
    b.cyl(goldLeaf, 0.08, 0.08, sx * 3.6, az, ALTAR.y, ALTAR.y + 0.35, 8);
    lotusVase(b, sx * 7.4, PLAT_TOP, BUDDHA.z + PLAT_R - 3.6, rng);
  }
  const flames: THREE.Mesh[] = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc46a });
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), flameMat);
    f.position.set(sx * 1.6, ALTAR.y + 1.55, az);
    group.add(f);
    flames.push(f);
  }
  const boxMat = new THREE.MeshStandardMaterial({ map: boxTexture(), roughness: 0.7 });
  b.box(boxMat, 3.4, 0.8, 1.1, 0, HALL_Y + 0.4, OFFER_BOX_Z);
  colliders.push({ x0: ALTAR.x0 - 0.3, x1: ALTAR.x1 + 0.3, z0: BUDDHA.z + PLAT_R, z1: ALTAR.z1 + 0.3 }, { x0: -1.9, x1: 1.9, z0: OFFER_BOX_Z - 0.75, z1: OFFER_BOX_Z + 0.75 });

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
  const candle = new THREE.PointLight(0xffa64d, 0, 8, 1.8);
  candle.position.set(0, ALTAR.y + 1.6, az + 0.6);
  group.add(candle);

  return {
    group,
    colliders,
    update(night: number, elapsed: number) {
      key.intensity = 260 + night * 120;
      haloWash.intensity = 70 + night * 50;
      for (const f of fills) f.intensity = 60 + night * 30;
      candle.intensity = 6 + Math.sin(elapsed * 13) * 0.8 + Math.sin(elapsed * 7.3) * 0.6;
      for (const [i, f] of flames.entries()) f.scale.y = 1 + Math.sin(elapsed * 11 + i * 2) * 0.12;
    },
  };
}
