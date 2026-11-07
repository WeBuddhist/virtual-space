import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import { loadStatue } from '../../../kit/statue';
import type { Box2 } from '../../types';
import {
  ALTAR, AMITAYUS, BUDDHA, BUDDHA_H, DRAGON_X, FY, GURU, HALL, NAVE_X, RAIL_Z, TABLE, THRONE, THRONE_H, TOP,
} from './layout';
import type { Mats } from './mats';
import { Batch, tiledPlane } from './util';

// The altar wall of the Golden Temple: three colossal gilded images on a long platform
// (dark-blue band with gold medallions over lit glass cases of small gold Buddhas),
// Shakyamuni in the centre inside a pointed torana with a turquoise head disc and a
// deep-blue niche, Guru Rinpoche (viewer's left) and Amitayus (viewer's right) inside
// round jewelled halos; red pillars with coiling gold dragons between them and rainbow
// brocade pillars at the ends; crystal chandeliers; a lama's throne and the offering table
// on the axis below.

/**
 * The three images are built from real photographs (Wikimedia Commons), not sculpted:
 *
 * Shakyamuni: a Gaussian splat (tibetan-shakyamuni.spz) from TRELLIS (trellis-community/TRELLIS
 * on Hugging Face), made from "Statue in 2011 detail, Namrodoling Monastery (Golden Temple)
 * Bylakuppe 6746 (cropped).JPG" (Rameshng, CC BY-SA 3.0), cut out by hand; cleaned and stood
 * upright by scripts/statues/splat_clean.py. It is whole from every side: face, lapis curls,
 * earth-touching hand and alms bowl. Behind the veil, and if the splat fails, the earlier
 * TRELLIS mesh stands in, re-textured by projecting that photograph onto its front.
 *
 * Guru Rinpoche and Amitayus: photo reliefs. Each figure is cut from "Close up of Three Statues -
 * Namdroling Monastry, Bylekuppe.jpg" (Bikashrd, CC BY-SA 4.0) with the high-resolution close-ups
 * "Padmasambhava image, Namdroling.jpg" (Christopher J. Fynn, CC BY-SA 4.0) and "Buddha Amiyatus,
 * Namdroling Monastry, Bylekuppe.jpg" (Bikashrd, CC BY-SA 4.0) painted into the head and body;
 * its depth comes from a monocular depth model (Depth Anything V2, run locally), rounded off at
 * the outline. They are exact from the hall and hold up to about 40 degrees off axis.
 */
const SHAKYAMUNI = 'tibetan-shakyamuni';

/** a relief's outline curls back steeply, where its photo is stretched: shade surfaces seen at a
 * grazing angle toward the niche's dark, as the real figures' sides fall into shadow */
function grazingShade(o: THREE.Object3D) {
  o.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float ndv = abs(dot(normalize(normal), normalize(vViewPosition)));
          float k = mix(0.28, 1.0, smoothstep(0.12, 0.5, ndv));
          diffuseColor.rgb *= k; totalEmissiveRadiance *= k * k; }`);
    };
    mat.customProgramCacheKey = () => 'tibetan-relief';
  });
  return o;
}
/** the mesh is 1 unit tall, its lotus the bottom 15%; the seated figure above it is BUDDHA_H */
const BUDDHA_SCALE = BUDDHA_H / 0.85;
/** the flanking reliefs are in metres, seat at y = 0, face axis at x = 0, back at z = 0 */
const FLANK_SEAT = 1.1;
/** height of the flanking figures' eyes above their seats (from the close-up photo) */
const FLANK_EYES = { guru: 3.44, amitayus: 3.57 };

/** photo-textured statue: the photo's own light is in the texture, so it carries some of its
 * colour as emission and takes the hall's floods as a soft polished-gilt sheen */
function photoGilt(o: THREE.Object3D, doubleSide = false) {
  o.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    // a warm tint keeps the gilt saturated under the white-ish floods
    mat.color.setHex(0xffe6b8);
    mat.metalness = 0.12;
    mat.roughness = 0.5;
    mat.envMapIntensity = 0.6;
    mat.emissive.setHex(0xffe0b0);
    mat.emissiveMap = mat.map;
    mat.emissiveIntensity = 0.22;
    if (doubleSide) mat.side = THREE.DoubleSide;
    mat.needsUpdate = true;
  });
  return o;
}

function lathe(points: [number, number][], segs = 24) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

/** a round arched niche (door shape): w wide, h tall, base at y = 0 */
function archShape(w: number, h: number) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(-r, h - r);
  s.absarc(0, h - r, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.lineTo(-r, 0);
  return s;
}

export function buildAltar(m: Mats) {
  const group = new THREE.Group();
  const b = new Batch();
  const colliders: Box2[] = [];
  const A = ALTAR;
  const aw = A.x1 - A.x0, ad = A.z1 - A.z0, acz = (A.z0 + A.z1) / 2;

  // ---- the platform ----
  b.add(new THREE.BoxGeometry(aw, A.h, ad), m.darkRed, 0, FY + A.h / 2, acz, 0, 0, 0, true);
  b.add(new THREE.PlaneGeometry(aw, 0.45), m.darkWood, 0, FY + 0.225, A.z0 - 0.01, Math.PI);
  b.add(tiledPlane(aw, 1.25, 6, 1), m.cases, 0, FY + 0.45 + 0.625, A.z0 - 0.01, Math.PI);
  b.add(tiledPlane(aw, 0.8, 9, 1), m.altarBand, 0, FY + 1.7 + 0.4, A.z0 - 0.01, Math.PI);
  b.add(new THREE.BoxGeometry(aw + 0.1, 0.1, 0.12), m.gold, 0, FY + 1.7, A.z0 - 0.04);
  b.add(new THREE.BoxGeometry(aw + 0.1, 0.12, 0.16), m.gold, 0, FY + A.h, A.z0 - 0.05);
  // the glass and steel rail at the foot
  const railLen = aw - 0.2;
  b.add(new THREE.BoxGeometry(railLen, 0.6, 0.02), m.glass, 0, FY + 0.35, RAIL_Z);
  b.add(new THREE.CylinderGeometry(0.03, 0.03, railLen, 8), m.steel, 0, FY + 0.68, RAIL_Z, 0, 0, Math.PI / 2);
  for (let x = A.x0 + 0.1; x <= A.x1 - 0.05; x += 1.2) b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.68, 6), m.steel, x, FY + 0.34, RAIL_Z);
  colliders.push({ x0: A.x0 - 0.1, x1: A.x1 + 0.1, z0: RAIL_Z - 0.12, z1: A.z1 });
  // khatas draped over the rail
  const khata = new THREE.MeshStandardMaterial({ color: 0xf7f4ea, roughness: 0.6, side: THREE.DoubleSide });
  for (const x of [-9.1, -6.3, -4.1, -0.8, 0.9, 3.6, 6.8, 9.4]) b.add(new THREE.PlaneGeometry(0.16, 0.5), khata, x, FY + 0.42, RAIL_Z - 0.05, Math.PI);

  // ---- Shakyamuni's throne and torana ----
  const tw = 5.2, td = 3.2;
  b.add(new THREE.BoxGeometry(tw, THRONE_H, td), m.gold, BUDDHA.x, TOP + THRONE_H / 2, BUDDHA.z, 0, 0, 0, true);
  b.add(tiledPlane(tw, THRONE_H * 0.6, 3, 1), m.altarBand, BUDDHA.x, TOP + THRONE_H * 0.45, BUDDHA.z - td / 2 - 0.01, Math.PI);
  b.add(new THREE.BoxGeometry(tw + 0.2, 0.12, td + 0.2), m.gold, BUDDHA.x, TOP + THRONE_H, BUDDHA.z);
  // the torana: a relief cut from the same photograph as the image (statue painted out to its
  // turquoise head disc and navy niche; depth from Depth Anything V2), loaded with the images.
  // It stands on a gilded plinth as wide as itself, its base level with the Buddha's seat.
  const seatY = TOP + THRONE_H + 0.06 + 0.15 * BUDDHA_SCALE;
  b.add(new THREE.BoxGeometry(7.5, seatY - TOP, 0.9), m.gold, BUDDHA.x, (seatY + TOP) / 2, A.z1 - 0.75, 0, 0, 0, true);

  // ---- the flanking lotus thrones, niches and halos ----
  // a wide gilded lotus of two rows of petals, oval so it sits within the platform
  const lotus = lathe([[0, 0], [2.3, 0], [2.36, 0.12], [2.2, 0.26], [2.36, 0.42], [2.5, 0.66], [2.42, 0.86], [2.3, FLANK_SEAT - 0.1], [2.34, FLANK_SEAT], [0, FLANK_SEAT]], 48);
  lotus.scale(1, 1, 0.72);
  const lotusPetal = new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  lotusPetal.scale(1, 1.5, 0.45);
  for (const [f, eyes] of [[GURU, FLANK_EYES.guru], [AMITAYUS, FLANK_EYES.amitayus]] as const) {
    b.add(lotus, m.gold, f.x, TOP, f.z, 0, 0, 0, true);
    for (const [row, y, r] of [[0, 0.2, 2.3], [1, 0.62, 2.45]] as const) {
      for (let i = 0; i < 30; i++) {
        const a = ((i + row * 0.5) / 30) * Math.PI * 2;
        const cz = Math.cos(a);
        if (cz > 0.55) continue; // hidden behind, against the wall
        b.add(lotusPetal, m.gold, f.x + Math.sin(a) * r, TOP + y, f.z + cz * r * 0.72, a, -0.25);
      }
    }
    const eyeY = TOP + FLANK_SEAT + eyes;
    // the arched body niche, gold rim round deep blue
    b.add(new THREE.ShapeGeometry(archShape(4.6, eyeY - TOP + 0.6), 16), m.gold, f.x, TOP + 0.2, A.z1 - 0.2, Math.PI);
    b.add(new THREE.ShapeGeometry(archShape(4.0, eyeY - TOP + 0.3), 16), m.deepBlue, f.x, TOP + 0.2, A.z1 - 0.23, Math.PI);
    // the round jewelled halo behind the head
    b.add(new THREE.PlaneGeometry(3.7, 3.7), m.halo, f.x, eyeY + 0.85, A.z1 - 0.3, Math.PI);
  }

  // ---- pillars: red with coiling gold dragons between the images, brocade at the ends ----
  const pillarH = FY + HALL.h - TOP;
  for (const s of [-1, 1]) {
    const x = s * DRAGON_X, z = A.z1 - 0.9;
    const shaft = new THREE.CylinderGeometry(0.3, 0.3, pillarH, 16, 1, true);
    const uv = shaft.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (pillarH / 1.9));
    b.add(shaft, m.dragon, x, TOP + pillarH / 2, z);
    // the dragon's body: a gold tube spiralling up, a green crest along it
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 90; i++) {
      const t = i / 90, a = t * Math.PI * 2 * 3.2 * s;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.4, 0.4 + t * (pillarH - 1.6), Math.sin(a) * 0.4));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    b.add(new THREE.TubeGeometry(curve, 180, 0.12, 7), m.gold, x, TOP, z, 0, 0, 0, true);
    b.add(new THREE.TubeGeometry(curve, 180, 0.05, 5), m.green, x, TOP + 0.13, z);
    // the head near the top, turned toward the Buddha
    const head = pts[pts.length - 1];
    b.add(new THREE.SphereGeometry(0.24, 10, 8), m.gold, x + head.x, TOP + head.y + 0.1, z + head.z);
    b.add(new THREE.ConeGeometry(0.14, 0.45, 8), m.gold, x + head.x - s * 0.3, TOP + head.y + 0.1, z + head.z - 0.1, 0, 0, s * Math.PI / 2);
    b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), m.gold, x, TOP + 0.15, z);
    b.add(new THREE.BoxGeometry(1.1, 0.4, 1.1), m.lintel, x, FY + HALL.h - 0.2, z);
  }
  for (const s of [-1, 1]) {
    const x = s * NAVE_X, z = A.z0 - 0.45;
    const h = HALL.h;
    const shaft = new THREE.CylinderGeometry(0.4, 0.4, h, 18, 1, true);
    const uv = shaft.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (h / 1.6));
    b.add(shaft, m.brocade, x, FY + h / 2, z, 0, 0, 0, true);
    colliders.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5 });
  }

  // ---- crystal chandeliers in front of the faces ----
  const crystal = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.05 });
  const drop = new THREE.OctahedronGeometry(0.07, 0);
  const chandeliers: [number, number, number][] = [[0, FY + 10.3, A.z0 - 1.3], [GURU.x, FY + 9.9, A.z0 - 1.1], [AMITAYUS.x, FY + 9.9, A.z0 - 1.1], [-3.3, FY + 10.6, A.z0 - 0.8], [3.3, FY + 10.6, A.z0 - 0.8]];
  const per = 5 * 18;
  const drops = new THREE.InstancedMesh(drop, crystal, chandeliers.length * per);
  const mtx = new THREE.Matrix4();
  let k = 0;
  for (const [cx, cy, cz] of chandeliers) {
    for (let tier = 0; tier < 5; tier++) {
      const r = 0.25 + tier * 0.11 - (tier > 2 ? (tier - 2) * 0.2 : 0);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + tier;
        mtx.makeScale(1, 1.8, 1).setPosition(cx + Math.cos(a) * r, cy - tier * 0.22, cz + Math.sin(a) * r);
        drops.setMatrixAt(k++, mtx);
      }
    }
    b.add(new THREE.CylinderGeometry(0.01, 0.01, FY + HALL.h - cy, 4), m.steel, cx, (FY + HALL.h + cy) / 2, cz);
    b.add(new THREE.TorusGeometry(0.45, 0.03, 6, 20), m.gold, cx, cy, cz, 0, Math.PI / 2);
    b.add(new THREE.SphereGeometry(0.12, 10, 8), m.lampGlow, cx, cy - 0.5, cz);
  }
  group.add(drops);

  // ---- the lama's throne with a thangka, two small portrait thrones, the offering table ----
  for (const [x, s] of [[0, 1], [-1.75, 0.7], [1.75, 0.7]] as const) {
    const w = 1.1 * s, h = 1.25 * s, d = 0.8 * s, z = THRONE.z;
    b.add(new THREE.BoxGeometry(w, h * 0.55, d), m.gold, x, FY + (h * 0.55) / 2, z, 0, 0, 0, true);
    b.add(new THREE.PlaneGeometry(w * 0.9, h * 0.35), m.brocade, x, FY + h * 0.3, z - d / 2 - 0.01, Math.PI);
    b.add(new THREE.BoxGeometry(w, h * 0.75, 0.12), m.gold, x, FY + h * 0.55 + (h * 0.75) / 2, z + d / 2 - 0.06);
    b.add(new THREE.PlaneGeometry(w * 0.62, h * 0.62), m.thangka, x, FY + h * 0.55 + (h * 0.75) / 2, z + d / 2 - 0.13, Math.PI);
    b.add(new THREE.PlaneGeometry(0.1, h * 0.5), khata, x - w * 0.36, FY + h * 0.75, z + d / 2 - 0.14, Math.PI);
  }
  colliders.push({ x0: -2.3, x1: 2.3, z0: THRONE.z - 0.45, z1: RAIL_Z });
  const T = TABLE;
  const tcx = (T.x0 + T.x1) / 2, tcz = (T.z0 + T.z1) / 2;
  b.add(new THREE.BoxGeometry(T.x1 - T.x0, T.h, T.z1 - T.z0), m.darkRed, tcx, FY + T.h / 2, tcz, 0, 0, 0, true);
  b.add(new THREE.PlaneGeometry(T.x1 - T.x0, T.h * 0.8), m.brocade, tcx, FY + T.h * 0.55, T.z0 - 0.01, Math.PI);
  colliders.push({ x0: T.x0 - 0.05, x1: T.x1 + 0.05, z0: T.z0 - 0.05, z1: T.z1 + 0.05 });
  // seven water bowls, butter lamps, two tormas, flowers
  const silver = new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 0.95, roughness: 0.2 });
  const water = new THREE.MeshStandardMaterial({ color: 0x9ec4d8, roughness: 0.05, metalness: 0.2 });
  for (let i = 0; i < 7; i++) {
    const x = T.x0 + 0.35 + i * ((T.x1 - T.x0 - 0.7) / 6);
    b.add(lathe([[0, 0], [0.05, 0], [0.09, 0.06], [0.085, 0.065], [0, 0.065]], 14), silver, x, FY + T.h, T.z0 + 0.17);
    b.add(new THREE.CircleGeometry(0.08, 12), water, x, FY + T.h + 0.058, T.z0 + 0.17, 0, -Math.PI / 2);
  }
  const lampCup = lathe([[0, 0], [0.04, 0], [0.025, 0.08], [0.03, 0.12], [0.08, 0.17], [0.07, 0.19], [0, 0.18]], 12);
  const flames: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const x = T.x0 + 0.5 + i * ((T.x1 - T.x0 - 1.0) / 4);
    b.add(lampCup, m.gold, x, FY + T.h, T.z0 + 0.42);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), m.flame);
    fl.scale.set(1, 2, 1);
    fl.position.set(x, FY + T.h + 0.24, T.z0 + 0.42);
    group.add(fl);
    flames.push(fl);
  }
  const tormaMat = new THREE.MeshStandardMaterial({ color: 0xc23a2a, roughness: 0.6 });
  for (const s of [-1, 1]) {
    b.add(lathe([[0, 0], [0.12, 0], [0.13, 0.05], [0.07, 0.25], [0.02, 0.42], [0, 0.44]], 12), tormaMat, s * 1.15, FY + T.h, tcz + 0.1);
    b.add(new THREE.SphereGeometry(0.035, 8, 6), m.white, s * 1.15, FY + T.h + 0.2, tcz + 0.02);
  }
  const marigold = new THREE.MeshStandardMaterial({ color: 0xf28c12, roughness: 0.9 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xe86a9a, roughness: 0.8 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3e7a34, roughness: 0.9 });
  const vase = lathe([[0, 0], [0.09, 0], [0.12, 0.12], [0.06, 0.3], [0.09, 0.38], [0, 0.38]], 14);
  const blossom = new THREE.IcosahedronGeometry(0.06, 0);
  const vaseSpots: [number, number, number][] = [[-1.32, FY + T.h, tcz], [1.32, FY + T.h, tcz]];
  // flower vases along the altar's top edge in front of each image
  for (const x of [-10.2, -5.3, -2.3, 2.3, 5.3, 10.2]) vaseSpots.push([x, TOP, A.z0 + 0.35]);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const [x, y, z] of vaseSpots) {
    b.add(vase, m.blue, x, y, z);
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2, r = rnd() * 0.16;
      b.add(blossom, i % 3 ? marigold : pink, x + Math.cos(a) * r, y + 0.42 + rnd() * 0.22, z + Math.sin(a) * r);
      if (i % 4 === 0) b.add(blossom, leaf, x + Math.cos(a + 1) * r, y + 0.36 + rnd() * 0.1, z + Math.sin(a + 1) * r);
    }
  }
  // a garland of flowers along the front of each throne
  for (let x = -2.1; x <= 2.1; x += 0.14) b.add(blossom, (Math.round(x * 7) % 2) ? marigold : pink, x, TOP + 0.08, BUDDHA.z - 1.18);

  b.build(group);

  // ---- the images ----
  const statues = new THREE.Group();
  group.add(statues);
  // Shakyamuni: earth-touching right hand, dark alms bowl, lapis curls
  const buddhaSlot = new THREE.Group();
  buddhaSlot.position.set(BUDDHA.x, TOP + THRONE_H + 0.06, BUDDHA.z + 0.15);
  // the mesh faces +z and the hall's door is at -z. Its photograph was taken from below, so the
  // model came out leaning back; lean it forward again so the face meets pilgrims' eyes
  buddhaSlot.rotation.set(0.13, Math.PI, 0, 'YXZ');
  statues.add(buddhaSlot);
  const toranaSlot = new THREE.Group();
  toranaSlot.position.set(BUDDHA.x, seatY, A.z1 - 0.55);
  toranaSlot.rotation.y = Math.PI;
  statues.add(toranaSlot);
  loadStatue('tibetan-torana', 'gilt').then((t) => {
    t.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.roughness = 0.55;
      mat.metalness = 0.1;
      mat.emissive.setHex(0xffffff);
      mat.emissiveMap = mat.map;
      mat.emissiveIntensity = 0.18;
    });
    toranaSlot.add(t);
  }).catch(() => {});
  // the Gaussian splat (TRELLIS, same photograph; splat_clean.py, spz.ts) replaces the mesh
  // once it has decoded; the mesh stands in behind the veil and if the splat fails
  let splatReady = false;
  let meshStandIn: THREE.Object3D | null = null;
  const splat = new SplatMesh({ url: `/models/statues/${SHAKYAMUNI}.spz` });
  splat.initialized.then(() => {
    splatReady = true;
    if (meshStandIn) buddhaSlot.remove(meshStandIn);
    buddhaSlot.add(splat);
  }).catch(() => {});
  loadStatue(SHAKYAMUNI, 'gilt').then((s) => {
    if (splatReady) return;
    meshStandIn = s;
    s.scale.setScalar(BUDDHA_SCALE);
    photoGilt(s).traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      // the photo's lapis curls are dark and greyed by the floods: push bluish texels back to
      // the painted cobalt of the real hair (gilt texels have red well over blue, untouched)
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          { vec3 c = diffuseColor.rgb; float blu = smoothstep(0.0, 0.05, c.b - c.r);
            diffuseColor.rgb = mix(c, vec3(0.05, 0.11, 0.42) * (0.7 + 2.0 * dot(c, vec3(0.333))), blu * 0.85); }`);
        sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          { vec3 e = texture2D(emissiveMap, vEmissiveMapUv).rgb; float blu = smoothstep(0.0, 0.05, e.b - e.r);
            totalEmissiveRadiance *= 1.0 - 0.7 * blu; }`);
      };
      mat.customProgramCacheKey = () => 'tibetan-shakyamuni';
    });
    buddhaSlot.add(s);
  }).catch(() => {
    if (splatReady) return;
    loadStatue('tibetan', 'tibetan-painted').then((s) => {
      s.scale.setScalar(BUDDHA_H / 1.0);
      buddhaSlot.add(s);
    }).catch(() => {});
  });

  // the flanking images: photo reliefs, back against the niche, facing the door
  const flank = (id: string, fallback: string, f: { x: number; z: number }) => {
    const slot = new THREE.Group();
    slot.position.set(f.x, TOP + FLANK_SEAT, A.z1 - 0.55);
    // a relief holds best near its photo's axis: turn each a little toward the aisle and lean
    // it forward toward pilgrims below, as the photographs were taken from the hall floor
    slot.rotation.set(0.1, Math.PI + Math.sign(f.x) * 0.36, 0, 'YXZ');
    statues.add(slot);
    loadStatue(id, 'gilt').then((s) => slot.add(grazingShade(photoGilt(s, true)))).catch(() => {
      loadStatue(fallback, 'tibetan-painted').then((s) => { s.scale.setScalar(3.15); slot.add(s); }).catch(() => {});
    });
  };
  flank('tibetan-guru-photo', 'tibetan-guru', GURU);
  flank('tibetan-amitayus-photo', 'tibetan-amitayus', AMITAYUS);

  // ---- light: warm floods on the gold, the chandeliers, the butter lamps ----
  const spot = new THREE.SpotLight(0xffd9a0, 260, 30, 0.36, 0.5, 1.4);
  spot.position.set(0, FY + 10.5, A.z0 - 9);
  spot.target.position.set(0, TOP + 2.8, BUDDHA.z);
  group.add(spot, spot.target);
  const flankSpots: THREE.SpotLight[] = [];
  for (const f of [GURU, AMITAYUS]) {
    const s = new THREE.SpotLight(0xffd29a, 150, 28, 0.3, 0.5, 1.4);
    flankSpots.push(s);
    s.position.set(f.x * 0.6, FY + 10, A.z0 - 8);
    s.target.position.set(f.x, TOP + 2.6, f.z);
    group.add(s, s.target);
  }
  const fill = new THREE.PointLight(0xffc27a, 20, 22, 1.2);
  fill.position.set(0, FY + 4.5, A.z0 - 3.2);
  group.add(fill);
  const lamps = new THREE.PointLight(0xffa64d, 2.5, 5, 2);
  lamps.position.set(0, FY + T.h + 0.5, T.z0 - 0.2);
  group.add(lamps);

  return {
    group, colliders,
    /** the offering table, where flowers come to rest */
    ledge: { x0: T.x0, x1: T.x1, z0: T.z0, z1: T.z1, y: FY + T.h },
    update(night: number, elapsed: number) {
      const f = 1 + Math.sin(elapsed * 13) * 0.08 + Math.sin(elapsed * 7.3) * 0.06;
      lamps.intensity = (2.0 + night * 3) * f;
      for (let i = 0; i < flames.length; i++) flames[i].scale.y = 2 + Math.sin(elapsed * 11 + i * 1.7) * 0.25;
      fill.intensity = 12 + night * 3;
      // at night the floods stand out more against the dark; ease them so the gold keeps its colour
      spot.intensity = 260 * (1 - night * 0.4);
      for (const s of flankSpots) s.intensity = 150 * (1 - night * 0.4);
      crystal.emissiveIntensity = 0.3 + night * 0.7;
      (m.cases as THREE.MeshStandardMaterial).emissiveIntensity = 0.06 + night * 0.3;
    },
  };
}
