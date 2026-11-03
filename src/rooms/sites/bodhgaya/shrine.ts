import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import { loadStatue } from '../../../kit/statue';
import { SANCTUM } from './tower';

// The Mahabodhi image in its shrine, after photographs: a dark carved-wood case with
// turned columns, gold Bodhi leaves on the canopy, a royal-blue backdrop, a glittering
// scalloped halo, ceremonial fans, crystal lotus lamps, a gold relief plinth (lions,
// elephants, the Earth Goddess), a glass front and banks of flowers. Faces +x.

const BACK = SANCTUM.x0 + 0.12; // the backdrop panel
const FRONT = SANCTUM.x0 + 2.05; // the glass
/** top of the offering table in front of the glass */
export const LEDGE_TOP = 0.42;
/** the offering table's footprint, where flower offerings come to rest */
export const LEDGE = { x0: FRONT + 0.025, x1: FRONT + 0.575, z0: -2.75, z1: 2.75, y: LEDGE_TOP };
const PLINTH_TOP = 1.05;
/** where seated visitors look: the image's chest, so its face and whole figure frame together */
export const IMAGE_FACE = new THREE.Vector3(BACK + 0.95, PLINTH_TOP + 1.0, 0);
/** the statue's seated height (about 1.9 m) over our 1.15 m sculpt */
const STATUE_SCALE = 1.65;

const wood = new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.55, metalness: 0.05 });
const gold = new THREE.MeshStandardMaterial({ color: 0xe0b04a, metalness: 0.95, roughness: 0.28 });

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** the scalloped halo: 18 rounded lobes of glitter, gold near the centre */
function halo() {
  const R = 0.95, lobes = 18;
  const shape = new THREE.Shape();
  for (let i = 0; i <= lobes * 8; i++) {
    const a = (i / (lobes * 8)) * Math.PI * 2;
    const r = R * (0.93 + 0.07 * Math.abs(Math.cos((a * lobes) / 2)));
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const map = canvasTex(512, 512, (g) => {
    const grd = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    grd.addColorStop(0, '#e7b54a');
    grd.addColorStop(0.32, '#d9b878');
    grd.addColorStop(0.45, '#c9ccd4');
    grd.addColorStop(1, '#d7dae1');
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 512);
    // radiating ribs between the lobes
    g.strokeStyle = 'rgba(160,165,180,.55)';
    g.lineWidth = 2;
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 + Math.PI / lobes;
      g.beginPath(); g.moveTo(256 + Math.cos(a) * 110, 256 + Math.sin(a) * 110); g.lineTo(256 + Math.cos(a) * 250, 256 + Math.sin(a) * 250); g.stroke();
    }
    // glitter
    for (let i = 0; i < 9000; i++) {
      const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 196;
      g.fillStyle = Math.random() > 0.85 ? `hsl(${Math.random() * 360},80%,75%)` : 'rgba(255,255,255,.95)';
      g.fillRect(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 1.5, 1.5);
    }
  });
  const geo = new THREE.ShapeGeometry(shape, 4);
  // planar UVs from the shape's extent
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / (2 * R) + 0.5; uv[i * 2 + 1] = pos.getY(i) / (2 * R) + 0.5; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mat = new THREE.MeshStandardMaterial({ map, metalness: 0.55, roughness: 0.35, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.04 });
  return new THREE.Mesh(geo, mat);
}

/** tall jewelled ceremonial fan: a teardrop of concentric gold and silver on a pole */
function fan() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.62);
  shape.bezierCurveTo(0.42, -0.2, 0.36, 0.38, 0, 0.62);
  shape.bezierCurveTo(-0.36, 0.38, -0.42, -0.2, 0, -0.62);
  const map = canvasTex(256, 384, (c) => {
    c.fillStyle = '#c99a3a';
    c.fillRect(0, 0, 256, 384);
    const rings = ['#f4f1ea', '#e2b04c', '#f4f1ea', '#c9893a', '#e2b04c', '#f4f1ea', '#b5462e'];
    rings.forEach((col, i) => {
      const k = 1 - i * 0.13;
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(128, 200, 118 * k, 175 * k, 0, 0, Math.PI * 2);
      c.fill();
    });
    for (let i = 0; i < 2500; i++) {
      c.fillStyle = 'rgba(255,255,255,.7)';
      c.fillRect(Math.random() * 256, Math.random() * 384, 1.2, 1.2);
    }
  });
  const geo = new THREE.ShapeGeometry(shape, 16);
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / 0.84 + 0.5; uv[i * 2 + 1] = pos.getY(i) / 1.24 + 0.5; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const leaf = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }));
  leaf.position.y = 2.35;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.2, 8), gold);
  pole.position.y = 1.1;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 8), gold);
  tip.position.y = 3.2;
  g.add(leaf, pole, tip);
  return g;
}

/** a crystal lotus lamp on a stand */
function lotusLamp() {
  const g = new THREE.Group();
  const crystal = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.8, roughness: 0.05, thickness: 0.02, iridescence: 0.5, clearcoat: 1 });
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), crystal);
      p.scale.set(0.5, 1.2, 0.3);
      const a = (i / 8) * Math.PI * 2 + row * 0.4;
      p.position.set(Math.cos(a) * (0.09 - row * 0.03), 0.06 + row * 0.04, Math.sin(a) * (0.09 - row * 0.03));
      p.lookAt(0, -0.2, 0);
      g.add(p);
    }
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.5, 8), gold);
  stem.position.y = -0.25;
  g.add(stem);
  return g;
}

/** gold relief panels of the plinth: lion, elephant, Earth Goddess, elephant, lion */
function plinthTexture() {
  const draw = (bump: boolean) => (g: CanvasRenderingContext2D) => {
    g.fillStyle = bump ? '#606060' : '#d6a744';
    g.fillRect(0, 0, 1024, 256);
    const hi = bump ? '#f0f0f0' : '#f3d27a';
    const lo = bump ? '#202020' : '#8a6420';
    for (let i = 0; i < 6; i++) {
      // pilasters between the niches
      g.fillStyle = hi;
      g.fillRect(i * 196 + 18, 20, 22, 216);
      g.fillStyle = lo;
      g.fillRect(i * 196 + 40, 20, 3, 216);
    }
    const figures = ['lion', 'elephant', 'goddess', 'elephant', 'lion'];
    figures.forEach((f, i) => {
      const cx = 18 + 22 + i * 196 + 98, cy = 150;
      g.fillStyle = hi;
      g.strokeStyle = lo;
      g.lineWidth = 4;
      g.beginPath();
      if (f === 'lion') {
        g.ellipse(cx, cy + 20, 52, 34, 0, 0, Math.PI * 2);
        g.moveTo(cx + 60, cy - 10);
        g.arc(cx + 40, cy - 10, 30, 0, Math.PI * 2);
      } else if (f === 'elephant') {
        g.ellipse(cx - 6, cy + 10, 60, 42, 0, 0, Math.PI * 2);
        g.moveTo(cx + 74, cy - 6);
        g.arc(cx + 50, cy - 6, 26, 0, Math.PI * 2);
        g.moveTo(cx + 70, cy + 10);
        g.quadraticCurveTo(cx + 84, cy + 50, cx + 70, cy + 70);
      } else {
        g.ellipse(cx, cy + 34, 38, 46, 0, 0, Math.PI * 2);
        g.moveTo(cx + 22, cy - 40);
        g.arc(cx, cy - 40, 22, 0, Math.PI * 2);
      }
      g.fill();
      g.stroke();
    });
  };
  return { map: canvasTex(1024, 256, draw(false)), bump: canvasTex(1024, 256, draw(true), false) };
}

/** a heap of offered flowers: marigolds, pink and white lotuses, tuberose sprays */
function flowers(rng: () => number, count: number, spread: THREE.Vector3) {
  const g = new THREE.Group();
  const marigold = new THREE.MeshStandardMaterial({ color: 0xf28c12, roughness: 0.9 });
  const lotus = new THREE.MeshStandardMaterial({ color: 0xf0a3b8, roughness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.7 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4f7a2c, roughness: 0.9 });
  const ball = new THREE.SphereGeometry(0.03, 8, 6);
  const marigolds = new THREE.InstancedMesh(ball, marigold, count);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    m.makeTranslation((rng() - 0.5) * spread.x, rng() * spread.y, (rng() - 0.5) * spread.z);
    marigolds.setMatrixAt(i, m);
  }
  g.add(marigolds);
  for (let i = 0; i < count / 8; i++) {
    const bud = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 7), i % 3 ? lotus : white);
    bud.position.set((rng() - 0.5) * spread.x, spread.y + 0.08 + rng() * 0.25, (rng() - 0.5) * spread.z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.4, 4), leaf);
    stem.position.copy(bud.position).add(new THREE.Vector3(0, -0.22, 0));
    g.add(bud, stem);
  }
  return g;
}

export function buildShrine(rng: () => number) {
  const group = new THREE.Group();
  const S = SANCTUM;
  const z0 = -2.45, z1 = 2.45, top = 4.7;

  // royal-blue backdrop
  const blue = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, top - 0.3), new THREE.MeshStandardMaterial({ color: 0x1d4fa8, roughness: 0.6, metalness: 0.1 }));
  blue.position.set(BACK, (top - 0.3) / 2 + 0.3, 0);
  blue.rotation.y = Math.PI / 2;
  group.add(blue);

  // carved wood case: turned columns, cornice, canopy
  for (const z of [z0 + 0.1, z1 - 0.1, z0 + 0.45, z1 - 0.45]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, top, 12), wood);
    col.position.set(FRONT - 0.15, top / 2, z);
    group.add(col);
    for (let k = 0; k < 6; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 16), wood);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(FRONT - 0.15, 0.6 + k * 0.75, z);
      group.add(ring);
    }
  }
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(FRONT - BACK + 0.4, 0.55, z1 - z0 + 0.4), wood);
  cornice.position.set((FRONT + BACK) / 2, top + 0.27, 0);
  group.add(cornice);
  const carving = canvasTex(512, 64, (g) => {
    g.fillStyle = '#3a2214';
    g.fillRect(0, 0, 512, 64);
    g.strokeStyle = '#6b4426';
    g.lineWidth = 6;
    for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 50); g.lineTo(x + 16, 14); g.lineTo(x + 32, 50); g.stroke(); }
  });
  const frieze = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0 + 0.4, 0.5), new THREE.MeshStandardMaterial({ map: carving, roughness: 0.6 }));
  frieze.position.set(FRONT + 0.06, top + 0.27, 0);
  frieze.rotation.y = Math.PI / 2;
  group.add(frieze);
  // canopy underside with gold Bodhi leaves and a gold disc
  const canopy = new THREE.Mesh(new THREE.PlaneGeometry(FRONT - BACK, z1 - z0), new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.7 }));
  canopy.position.set((FRONT + BACK) / 2, top - 0.01, 0);
  canopy.rotation.x = Math.PI / 2;
  group.add(canopy);
  const bodhiLeaf = new THREE.Shape();
  bodhiLeaf.moveTo(0, -0.4);
  bodhiLeaf.bezierCurveTo(0.32, -0.1, 0.3, 0.25, 0, 0.34);
  bodhiLeaf.bezierCurveTo(-0.3, 0.25, -0.32, -0.1, 0, -0.4);
  for (const z of [-1.2, 1.2]) {
    const l = new THREE.Mesh(new THREE.ShapeGeometry(bodhiLeaf, 12), gold);
    l.position.set((FRONT + BACK) / 2 + 0.2, top - 0.03, z);
    l.rotation.set(Math.PI / 2, 0, z > 0 ? -Math.PI / 2 : Math.PI / 2);
    l.scale.setScalar(1.3);
    group.add(l);
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), gold);
  disc.position.set((FRONT + BACK) / 2 + 0.2, top - 0.03, 0);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  // gold relief plinth
  const tex = plinthTexture();
  const plinthMats = [new THREE.MeshStandardMaterial({ map: tex.map, bumpMap: tex.bump, bumpScale: 4, metalness: 0.85, roughness: 0.32 })];
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z; the relief goes on the +x face
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.5, PLINTH_TOP, 3.4), [plinthMats[0], gold, gold, gold, gold, gold]);
  plinth.position.set(BACK + 1.0, PLINTH_TOP / 2, 0);
  plinth.receiveShadow = true;
  group.add(plinth);

  // halo behind the head
  const h = halo();
  h.position.set(BACK + 0.05, PLINTH_TOP + 0.12 + 0.93 * STATUE_SCALE, 0);
  h.rotation.y = Math.PI / 2;
  group.add(h);

  // gold celestial figures on the blue, upper left and right
  const deva = canvasTex(128, 160, (g) => {
    g.fillStyle = '#e7b84e';
    g.beginPath(); g.arc(64, 30, 16, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(64, 10); g.lineTo(56, 26); g.lineTo(72, 26); g.fill();
    g.beginPath(); g.ellipse(64, 80, 30, 34, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(64, 126, 52, 22, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(64, 148, 60, 10, 0, 0, Math.PI * 2); g.fill();
  });
  for (const z of [-1.55, 1.55]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshStandardMaterial({ map: deva, transparent: true, alphaTest: 0.5, metalness: 0.9, roughness: 0.3 }));
    d.position.set(BACK + 0.03, 3.85, z);
    d.rotation.y = Math.PI / 2;
    group.add(d);
  }

  // ceremonial fans and crystal lotus lamps either side of the image
  for (const z of [-1.62, 1.62]) {
    const f = fan();
    f.position.set(BACK + 0.6, PLINTH_TOP - 0.05, z);
    f.rotation.y = Math.PI / 2;
    group.add(f);
    const lamp = lotusLamp();
    lamp.position.set(FRONT - 0.5, PLINTH_TOP + 0.55, z * 1.08);
    group.add(lamp);
  }

  // the image
  const statueSlot = new THREE.Group();
  statueSlot.position.set(BACK + 0.95, PLINTH_TOP + 0.12 * STATUE_SCALE, 0);
  statueSlot.rotation.y = Math.PI / 2; // the sculpt faces +z; the shrine faces +x
  statueSlot.scale.setScalar(STATUE_SCALE);
  group.add(statueSlot);
  // a Gaussian splat of the real image, made by an image-to-3D model from sanctum photos
  // (scripts/statues/splat_clean.py, spz.ts). The sculpted statue and drawn halo stand in
  // while it streams and decodes (several seconds), then give way; the splat carries
  // its own glitter halo.
  let sculpt: THREE.Object3D | null = null;
  let splatReady = false;
  loadStatue('bodhgaya', 'tibetan-painted').then((s) => { if (!splatReady) statueSlot.add((sculpt = s)); }).catch(() => {});
  const splat = new SplatMesh({ url: '/models/statues/bodhgaya.spz' });
  // the splat's base sits where the sculpt's does, nudged forward so the back of its
  // halo clears the blue backdrop; a little larger so it fills the case as in photos
  splat.position.set(0, -0.12, 0.16);
  splat.scale.setScalar(1.15);
  splat.initialized.then(() => {
    splatReady = true;
    if (sculpt) statueSlot.remove(sculpt);
    statueSlot.add(splat);
    h.visible = false;
  }).catch(() => {});

  // glass front and the offering ledge with flowers. Plain alpha glass, not transmission:
  // transmission samples an opaque-only pass, which would hide the splat image behind it
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0 - 0.2, top - LEDGE_TOP), new THREE.MeshPhysicalMaterial({
    color: 0xdfe8ff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.035, depthWrite: false,
  }));
  glass.position.set(FRONT, (top - LEDGE_TOP) / 2 + LEDGE_TOP, 0);
  glass.rotation.y = Math.PI / 2;
  group.add(glass);
  // a low offering table, so pilgrims kneeling on the cushions see the whole image over it
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.55, LEDGE_TOP, z1 - z0 + 0.6), new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.4 }));
  ledge.position.set(FRONT + 0.3, LEDGE_TOP / 2, 0);
  group.add(ledge);
  const f1 = flowers(rng, 420, new THREE.Vector3(0.45, 0.08, z1 - z0 + 0.4));
  f1.position.set(FRONT + 0.3, LEDGE_TOP + 0.03, 0);
  group.add(f1);
  for (const z of [-2.7, 2.7]) {
    const vase = flowers(rng, 90, new THREE.Vector3(0.4, 0.9, 0.4));
    vase.position.set(FRONT + 0.25, LEDGE_TOP + 0.05, z);
    group.add(vase);
  }

  // light: warm spots from the ceiling corners on the face, a fill, candle flicker at the ledge
  const spots: THREE.SpotLight[] = [];
  for (const z of [-2.2, 2.2]) {
    const s = new THREE.SpotLight(0xffd29a, 38, 9, 0.42, 0.55, 1.2);
    s.position.set(S.x1 - 0.4, S.ceiling - 0.4, z);
    s.target.position.set(BACK + 0.9, PLINTH_TOP + 1.4, 0);
    s.castShadow = true;
    s.shadow.mapSize.set(1024, 1024);
    s.shadow.bias = -0.0005;
    group.add(s, s.target);
    spots.push(s);
  }
  // the case's strip light along the top of the glass
  const strip = new THREE.PointLight(0xfff1dc, 3, 4, 1.5);
  strip.position.set(FRONT - 0.4, top - 0.2, 0);
  group.add(strip);
  const candle = new THREE.PointLight(0xffa64d, 1.2, 4, 2);
  candle.position.set(FRONT + 0.35, 1.05, 0);
  group.add(candle);

  return {
    group,
    collider: { x0: S.x0, x1: FRONT + 0.6, z0: -S.halfW, z1: S.halfW },
    update(elapsed: number) {
      candle.intensity = 1.1 + Math.sin(elapsed * 13) * 0.15 + Math.sin(elapsed * 7.3) * 0.1;
    },
  };
}
