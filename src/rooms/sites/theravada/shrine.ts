import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import { loadStatue } from '../../../kit/statue';
import type { Box2 } from '../../types';
import { FLOOR, HALL, IMAGE, IMAGE_FACE, PEDESTAL, RAIL_X, TABLE } from './plan';
import { boxAt, canvasTex, cutout, merged, panel, seatedBuddhaGeometry, tex } from './util';

// The east end of the nave: the Phra Buddha Chinnarat on its gilded chukchi pedestal,
// framed by the flame-edged naga aureole against a black lacquer wall sown with gold
// flowers, two flying gold celestials, a carved gilt valance across the top; the two
// small guardians at the knees, standing disciples in anjali either side, rows of
// smaller gilded images in the aisles, the two pulpits, the offering table, and the
// low railing that keeps devotees a few metres back. Faces west (−x).

const gold = new THREE.MeshStandardMaterial({ color: 0xd9a83a, metalness: 1, roughness: 0.26 });
const deepGold = new THREE.MeshStandardMaterial({ color: 0xb8862c, metalness: 1, roughness: 0.34 });
const bronze = new THREE.MeshStandardMaterial({ color: 0x4a3a28, metalness: 0.8, roughness: 0.45 });
const red = new THREE.MeshStandardMaterial({ color: 0x6e1712, roughness: 0.5 });
const darkWood = new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.5 });

const BACK_X = HALL.x1 - 0.12;
/** whether public/models/statues/theravada.spz exists yet */
const SPLAT = false;
/** the relief's back plane (its aureole), a little in front of the lacquer wall */
const RELIEF_BACK_X = HALL.x1 - 1.0;
/** the relief is built 4.3 m tall (lap 3.1 m); a touch larger reads better down the long nave */
const RELIEF_SCALE = 1.2;

/** a standing disciple in anjali, gilded, on a vase-shaped stand */
function disciple() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.LatheGeometry([
    new THREE.Vector2(0.3, 0), new THREE.Vector2(0.34, 0.1), new THREE.Vector2(0.22, 0.5), new THREE.Vector2(0.3, 0.95), new THREE.Vector2(0.4, 1.05), new THREE.Vector2(0.38, 1.12),
  ], 16));
  parts.push(new THREE.CylinderGeometry(0.2, 0.26, 1.3, 14).translate(0, 1.12 + 0.65, 0)); // robed body
  parts.push(new THREE.CylinderGeometry(0.21, 0.19, 0.4, 14).translate(0, 2.55, 0)); // chest
  parts.push(new THREE.SphereGeometry(0.13, 14, 10).scale(1, 1.15, 1).translate(0, 2.95, 0));
  parts.push(new THREE.BoxGeometry(0.08, 0.26, 0.05).translate(0, 2.55, 0.24)); // joined palms
  const g = merged(parts, gold).geometry;
  return g;
}

/** a small bronze guardian figure (Thao Wessuwan or Alavaka) about 0.8 m tall, holding a club */
function guardian() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.CylinderGeometry(0.1, 0.16, 0.42, 10).translate(0, 0.21, 0));
  parts.push(new THREE.CylinderGeometry(0.15, 0.11, 0.24, 10).translate(0, 0.54, 0));
  parts.push(new THREE.SphereGeometry(0.085, 10, 8).translate(0, 0.73, 0));
  parts.push(new THREE.ConeGeometry(0.07, 0.24, 8).translate(0, 0.9, 0)); // tiered crown
  parts.push(new THREE.CylinderGeometry(0.025, 0.035, 0.7, 6).translate(0.0, 0.35, -0.2));
  return parts;
}

/** a thammat: a gilded and red pulpit with a tiered spire */
function pulpit(scale: number) {
  const g: THREE.BufferGeometry[] = [];
  const r: THREE.BufferGeometry[] = [];
  r.push(boxAt(1.5, 1.4, 1.5, 0, 0.7, 0));
  g.push(boxAt(1.6, 0.12, 1.6, 0, 1.44, 0), boxAt(1.6, 0.12, 1.6, 0, 0.06, 0));
  for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) g.push(boxAt(0.1, 1.3, 0.1, x, 2.15, z));
  g.push(boxAt(1.7, 0.18, 1.7, 0, 2.85, 0));
  for (let i = 0; i < 4; i++) g.push(new THREE.CylinderGeometry(0.7 - i * 0.16, 0.8 - i * 0.16, 0.32, 4, 1).rotateY(Math.PI / 4).translate(0, 3.1 + i * 0.34, 0));
  g.push(new THREE.ConeGeometry(0.12, 1.1, 8).translate(0, 4.9, 0));
  const out = new THREE.Group();
  out.add(merged(g, gold), merged(r, red));
  out.scale.setScalar(scale);
  return out;
}

export function buildShrine(rng: () => number) {
  const group = new THREE.Group();
  const colliders: Box2[] = [];
  const hw = HALL.halfW, cz = HALL.colZ;

  // ---- the black lacquer wall behind the image ---------------------------------
  const wallH = HALL.naveTop - FLOOR;
  const backdrop = tex('backdrop', { roughness: 0.45, metalness: 0.2, color: 0xb8b0a0 }, [1.3, 1.8]);
  const wall = new THREE.Mesh(panel(2 * cz + 0.6, wallH, 'x-'), backdrop);
  wall.position.set(BACK_X, FLOOR + wallH / 2, 0);
  wall.receiveShadow = true;
  group.add(wall);
  // the aisle ends behind the side images: the same lacquer, darker
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(panel(hw - cz, HALL.wallTop - FLOOR, 'x-'), backdrop);
    w.position.set(BACK_X, (HALL.wallTop + FLOOR) / 2, s * (cz + hw) / 2);
    group.add(w);
  }
  // two flying gold celestials (thephanom) in the upper corners, and a carved valance
  const deva = canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = '#d9a83a';
    g.strokeStyle = '#8c6516';
    g.lineWidth = 3;
    // trailing scarves, kneeling body, joined hands, pointed crown
    g.beginPath(); g.moveTo(40, 200); g.bezierCurveTo(70, 150, 120, 170, 150, 140); g.bezierCurveTo(120, 190, 80, 200, 40, 200); g.fill();
    g.beginPath(); g.ellipse(150, 150, 34, 26, -0.4, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(160, 100, 20, 34, 0.15, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.arc(166, 56, 15, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(158, 44); g.lineTo(168, 6); g.lineTo(176, 44); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(178, 92); g.lineTo(196, 62); g.lineTo(186, 96); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(140, 175); g.bezierCurveTo(190, 200, 220, 170, 236, 196); g.bezierCurveTo(200, 210, 170, 205, 140, 175); g.fill();
  });
  deva.wrapS = deva.wrapT = THREE.ClampToEdgeWrapping;
  const devaMat = new THREE.MeshStandardMaterial({ map: deva, transparent: true, alphaTest: 0.4, metalness: 0.8, roughness: 0.35 });
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(panel(1.3, 1.3, 'x-'), devaMat);
    d.position.set(BACK_X - 0.02, FLOOR + 7.7, s * 2.3);
    if (s > 0) d.scale.x = -1;
    group.add(d);
  }
  const valanceMat = cutout('gable', { metalness: 0.85, roughness: 0.3 }, 0.08, 0.16);
  const cutoutPilaster = tex('column', { metalness: 0.6, roughness: 0.35, color: 0xffd98a }, [0.5, 3]);
  const valGeos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const v = panel(2.0, 1.25, 'x-');
    v.translate(BACK_X - 0.2, HALL.naveTop - 1.0, -2.85 + i * 1.9);
    valGeos.push(v);
  }
  group.add(merged(valGeos, valanceMat, false));
  // gilded pilasters framing the black panel close about the image, as in the hall
  const pil: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    pil.push(boxAt(0.35, HALL.naveTop - FLOOR - 1.6, 0.55, BACK_X - 0.2, (HALL.naveTop + FLOOR - 1.6) / 2, s * 2.95));
    pil.push(new THREE.CylinderGeometry(0.32, 0.36, 0.5, 4).rotateY(Math.PI / 4).translate(BACK_X - 0.2, HALL.naveTop - 1.55, s * 2.95));
  }
  group.add(merged(pil, cutoutPilaster));
  group.add(merged([boxAt(0.3, 0.35, 2 * cz + 0.6, BACK_X - 0.15, HALL.naveTop - 0.25, 0)], gold, false));

  // ---- the pedestal (chukchi) -----------------------------------------------------
  const P = PEDESTAL;
  const pedMat = tex('pedestal', { metalness: 0.85, roughness: 0.3 }, [2, 1]);
  const pedSide = tex('pedestal', { metalness: 0.85, roughness: 0.3 }, [1.5, 1]);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(P.x1 - P.x0 + 0.8, 0.45, 2 * P.halfW + 0.9), [deepGold, red, deepGold, red, red, red]);
  plinth.position.set((P.x0 + P.x1) / 2 + 0.4, FLOOR + 0.225, 0);
  const body = new THREE.Mesh(new THREE.BoxGeometry(P.x1 - P.x0, P.top - FLOOR - 0.45, 2 * P.halfW), [deepGold, pedMat, gold, gold, pedSide, pedSide]);
  body.position.set((P.x0 + P.x1) / 2, (P.top + FLOOR + 0.45) / 2, 0);
  body.castShadow = body.receiveShadow = plinth.receiveShadow = true;
  group.add(plinth, body);

  // ---- the image ----------------------------------------------------------------
  // The Hugging Face image-to-3D route (photo → TRELLIS → Gaussian splat, as for Bodh
  // Gaya) is wired below but waits on a splat file. Until then the image is a photo
  // relief: a frontal Commons photograph of the Chinnarat (CC BY-SA 3.0), cut out and
  // draped over hand-placed body volumes (head, torso, arms, crossed legs) with the
  // aureole nearly flat behind (reference/theravada/scripts/relief.py, a working copy
  // kept with the gitignored photos).
  // Kneeling devotees see it from the front, as in the hall, so the real face, hands,
  // sash and the flame-edged naga aureole all read. The baked sculpt with a photo
  // aureole is the fallback if the relief fails to load.
  const slot = new THREE.Group();
  slot.position.set(RELIEF_BACK_X, IMAGE.base - 0.05, 0);
  slot.rotation.y = -Math.PI / 2; // the model faces +z; the image faces west (−x)
  group.add(slot);
  const aureole = new THREE.Mesh(panel(3.9, 4.95, 'x-'), cutout('aureole', { metalness: 0.95, roughness: 0.28 }));
  aureole.position.set(IMAGE.x + 0.55, IMAGE.base + 2.3, 0);
  aureole.visible = false;
  group.add(aureole);
  let current: THREE.Object3D | null = null;
  let splatReady = false;
  const sculptFallback = () => loadStatue('theravada', 'gilt').then((s) => {
    if (splatReady) return;
    // fit the sculpt: 3.6 m from the base of the legs to the tip of the flame finial
    const box = new THREE.Box3().setFromObject(s);
    const k = 3.6 / (box.max.y - box.min.y);
    s.scale.setScalar(k);
    s.position.set(0, -box.min.y * k, RELIEF_BACK_X - IMAGE.x);
    aureole.visible = true;
    slot.add((current = s));
  });
  loadStatue('theravada-relief', 'gilt').then((r) => {
    if (splatReady) return;
    r.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const old = mesh.material as THREE.MeshStandardMaterial;
      // the photograph carries its own gilt sheen; let it glow a little in the dim hall
      mesh.material = new THREE.MeshStandardMaterial({
        map: old.map, color: 0x6b6b6b, emissive: 0xffffff, emissiveMap: old.map, emissiveIntensity: 0.62,
        metalness: 0.1, roughness: 0.55, side: THREE.DoubleSide, envMapIntensity: 0.3,
      });
      mesh.castShadow = false;
    });
    r.scale.setScalar(RELIEF_SCALE);
    slot.add((current = r));
  }).catch(() => sculptFallback().catch(() => {}));
  // the Gaussian splat of the real image (photo → TRELLIS → splat_clean.py → spz.ts), with
  // its own aureole, replaces the relief once it has decoded
  if (SPLAT) {
    const splat = new SplatMesh({ url: '/models/statues/theravada.spz' });
    splat.initialized.then(() => {
      splatReady = true;
      if (current) slot.remove(current);
      slot.add(splat);
      aureole.visible = false;
    }).catch(() => {});
  }

  // guardians at the knees on the front step: Thao Wessuwan (image's left, north),
  // the yaksha Alavaka (image's right, south)
  const gGeos: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) for (const g of guardian()) gGeos.push(g.translate(P.x0 - 0.15, FLOOR + 0.45, s * 1.95));
  group.add(merged(gGeos, bronze));
  // standing disciples in anjali either side of the pedestal
  const dg = disciple();
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(dg, gold);
    d.position.set(P.x1 - 0.4, FLOOR, s * 3.05);
    d.rotation.y = -Math.PI / 2;
    d.castShadow = true;
    group.add(d);
  }

  // rows of smaller gilded images in the aisles, on stepped red-and-gold stands
  const sb = seatedBuddhaGeometry().rotateY(-Math.PI / 2);
  const rows: [number, number, number][] = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) rows.push([35.2, FLOOR + 1.2, s * (4.0 + i * 0.85)]);
    for (let i = 0; i < 3; i++) rows.push([34.2, FLOOR + 0.6, s * (4.4 + i * 0.95)]);
  }
  const small = new THREE.InstancedMesh(sb, gold, rows.length);
  const m = new THREE.Matrix4();
  rows.forEach(([x, y, z], i) => small.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(0.85, 0.85, 0.85))));
  group.add(small);
  const standGeos: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    standGeos.push(boxAt(1.0, 1.2, hw - cz - 0.3, 35.3, FLOOR + 0.6, s * (cz + hw + 0.3) / 2));
    standGeos.push(boxAt(1.0, 0.6, hw - cz - 0.3, 34.3, FLOOR + 0.3, s * (cz + hw + 0.3) / 2));
    colliders.push({ x0: 33.6, x1: HALL.x1, z0: s < 0 ? -hw : cz, z1: s < 0 ? -cz : hw });
  }
  group.add(merged(standGeos, red));

  // the two Ayutthaya pulpits, the larger on the image's right (south)
  for (const [s, k] of [[1, 1], [-1, 0.82]] as const) {
    const p = pulpit(k);
    p.position.set(29.6, FLOOR, s * 5.3);
    group.add(p);
    colliders.push({ x0: 29.6 - 0.85 * k, x1: 29.6 + 0.85 * k, z0: s * 5.3 - 0.85 * k, z1: s * 5.3 + 0.85 * k });
  }

  // ---- offering table, candles, lotus, railing ---------------------------------
  const T = TABLE;
  group.add(merged([
    boxAt(T.x1 - T.x0, 0.08, 2 * T.halfW, (T.x0 + T.x1) / 2, T.top - 0.04, 0),
    boxAt(T.x1 - T.x0 - 0.1, T.top - FLOOR - 0.08, 2 * T.halfW - 0.1, (T.x0 + T.x1) / 2, (T.top + FLOOR - 0.08) / 2, 0),
  ], darkWood));
  // a higher stepped altar behind it with brass candle stands
  group.add(merged([boxAt(1.2, 1.15, 3.6, 30.2, FLOOR + 0.575, 0)], red), merged([boxAt(1.25, 0.06, 3.65, 30.2, FLOOR + 1.18, 0)], gold, false));
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8892c, metalness: 0.9, roughness: 0.3 });
  const wax = new THREE.MeshStandardMaterial({ color: 0xf2d36b, roughness: 0.6 });
  const flame = new THREE.MeshBasicMaterial({ color: 0xffc46a });
  const brassGeos: THREE.BufferGeometry[] = [], waxGeos: THREE.BufferGeometry[] = [], flameGeos: THREE.BufferGeometry[] = [];
  for (const z of [-1.2, 1.2, -0.5, 0.5]) {
    const x = Math.abs(z) > 1 ? T.x0 + 0.45 : 30.0;
    const y = Math.abs(z) > 1 ? T.top : FLOOR + 1.21;
    brassGeos.push(new THREE.CylinderGeometry(0.08, 0.12, 0.05, 10).translate(x, y + 0.025, z));
    brassGeos.push(new THREE.CylinderGeometry(0.02, 0.03, 0.45, 8).translate(x, y + 0.25, z));
    waxGeos.push(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8).translate(x, y + 0.63, z));
    flameGeos.push(new THREE.SphereGeometry(0.03, 8, 6).scale(1, 2, 1).translate(x, y + 0.84, z));
  }
  // lotus vases: brass vases holding white lotus buds
  const lotusMat = new THREE.MeshStandardMaterial({ color: 0xf1eee2, roughness: 0.6 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f7a2c, roughness: 0.8 });
  const budGeos: THREE.BufferGeometry[] = [], stemGeos: THREE.BufferGeometry[] = [];
  for (const [x, y, z] of [[T.x0 + 0.45, T.top, -0.55], [T.x0 + 0.45, T.top, 0.55], [30.3, FLOOR + 1.21, -1.4], [30.3, FLOOR + 1.21, 1.4]]) {
    brassGeos.push(new THREE.LatheGeometry([new THREE.Vector2(0.06, 0), new THREE.Vector2(0.11, 0.1), new THREE.Vector2(0.06, 0.28), new THREE.Vector2(0.09, 0.36)], 10).translate(x, y, z));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, r = i ? 0.09 : 0;
      const tip = new THREE.Vector3(x + Math.cos(a) * r, y + 0.62 + rng() * 0.12, z + Math.sin(a) * r);
      budGeos.push(new THREE.SphereGeometry(0.045, 8, 6).scale(1, 1.7, 1).translate(tip.x, tip.y, tip.z));
      stemGeos.push(new THREE.CylinderGeometry(0.006, 0.006, tip.y - y - 0.3, 4).translate((tip.x + x) / 2, (tip.y + y + 0.3) / 2, (tip.z + z) / 2));
    }
  }
  group.add(merged(brassGeos, brass, false), merged(waxGeos, wax, false), merged(flameGeos, flame, false), merged(budGeos, lotusMat, false), merged(stemGeos, leafMat, false));
  // the low railing: brass posts and a red-lacquered rail
  const railGeos: THREE.BufferGeometry[] = [];
  for (let z = -3.0; z <= 3.01; z += 1.0) railGeos.push(new THREE.CylinderGeometry(0.035, 0.045, 0.62, 8).translate(RAIL_X, FLOOR + 0.31, z));
  group.add(merged(railGeos, brass, false), merged([boxAt(0.08, 0.06, 6.1, RAIL_X, FLOOR + 0.62, 0)], red, false));
  colliders.push({ x0: RAIL_X - 0.05, x1: HALL.x1, z0: -cz + 0.4, z1: cz - 0.4 });

  // ---- light ---------------------------------------------------------------------
  // a warm key from high in the nave on the image, a side key for modelling, a fill
  const key = new THREE.SpotLight(0xffd9a0, 150, 30, 0.17, 0.6, 1.2);
  key.position.set(22, FLOOR + 9.6, 0);
  key.target.position.set(IMAGE.x, IMAGE.base + 1.9, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  group.add(key, key.target);
  const side = new THREE.SpotLight(0xffe2b8, 90, 18, 0.32, 0.6, 1.3);
  side.position.set(27, FLOOR + 6.5, -3.2);
  side.target.position.copy(IMAGE_FACE);
  group.add(side, side.target);
  const fill = new THREE.PointLight(0xffb870, 6, 9, 1.6);
  fill.position.set(29.5, FLOOR + 3.4, 0);
  group.add(fill);
  const candle = new THREE.PointLight(0xffa64d, 1.6, 4, 2);
  candle.position.set(T.x0 + 0.4, T.top + 0.9, 0);
  group.add(candle);

  return {
    group,
    colliders,
    update(elapsed: number, night: number) {
      candle.intensity = 1.5 + Math.sin(elapsed * 13) * 0.2 + Math.sin(elapsed * 7.3) * 0.12;
      key.intensity = 140 + night * 40;
    },
  };
}
