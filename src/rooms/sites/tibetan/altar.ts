import * as THREE from 'three';
import { loadStatue } from '../../../kit/statue';
import type { Box2 } from '../../types';
import {
  ALTAR, AMITAYUS, BUDDHA, BUDDHA_H, FY, GURU, HALL, RAIL_Z, TABLE, THRONE, THRONE_H, TOP,
} from './layout';
import type { Mats } from './mats';
import { Batch, canvasTex, tiledPlane } from './util';

// The altar wall of the Golden Temple: three colossal gilded images on a long platform
// (dark-blue band with gold medallions over lit glass cases of small gold Buddhas),
// Shakyamuni in the centre inside a pointed torana with a turquoise head disc and a
// deep-blue niche, Guru Rinpoche (viewer's left) and Amitayus (viewer's right) inside
// round jewelled halos; red pillars with coiling gold dragons between them and rainbow
// brocade pillars at the ends; crystal chandeliers; a lama's throne and the offering table
// on the axis below.

/**
 * The Shakyamuni: a textured mesh made by TRELLIS (trellis-community/TRELLIS on Hugging Face)
 * from a single photograph of the statue, masked to the figure and its lotus: "Statue in 2011
 * detail, Namrodoling Monastery (Golden Temple) Bylakuppe 6746 (cropped).JPG" by Rameshng,
 * Wikimedia Commons, CC BY-SA 3.0. Welded, WebP-textured and meshopt-compressed with
 * gltf-transform (about 17k triangles, 220 KB).
 */
const SHAKYAMUNI = 'tibetan-shakyamuni';
/** the mesh's lotus base is 13% of its height; the seated figure above it is BUDDHA_H */
const BUDDHA_SCALE = BUDDHA_H / 0.87;
/** the flanking figures are baked sculpts about 1.15 m tall (seat included) */
const FLANK_SCALE = 3.15;
const FLANK_PLINTH = 1.0;

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

/** a soft gold "reflection" painted on the floor: the polished stone mirroring the images */
function reflectionTexture() {
  return canvasTex(512, 256, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, 512, 256);
    const blob = (x: number, w: number, a: number) => {
      const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, `rgba(255,200,90,${a})`);
      grd.addColorStop(0.55, `rgba(220,150,50,${a * 0.35})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.filter = 'blur(10px)';
      g.beginPath();
      g.ellipse(x, 0, w, 240, 0, 0, Math.PI * 2);
      g.fill();
    };
    blob(256, 60, 0.75);
    blob(78, 52, 0.55);
    blob(434, 52, 0.55);
    g.filter = 'blur(6px)';
    g.fillStyle = 'rgba(70,110,200,0.25)';
    g.fillRect(0, 0, 512, 18);
  });
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
  for (const x of [-6.3, -4.1, -0.8, 0.9, 3.6, 6.8]) b.add(new THREE.PlaneGeometry(0.16, 0.5), khata, x, FY + 0.42, RAIL_Z - 0.05, Math.PI);

  // ---- Shakyamuni's throne and torana ----
  const tw = 4.6, td = 3.2;
  b.add(new THREE.BoxGeometry(tw, THRONE_H, td), m.gold, BUDDHA.x, TOP + THRONE_H / 2, BUDDHA.z, 0, 0, 0, true);
  b.add(tiledPlane(tw, THRONE_H * 0.6, 3, 1), m.altarBand, BUDDHA.x, TOP + THRONE_H * 0.45, BUDDHA.z - td / 2 - 0.01, Math.PI);
  b.add(new THREE.BoxGeometry(tw + 0.2, 0.12, td + 0.2), m.gold, BUDDHA.x, TOP + THRONE_H, BUDDHA.z);
  // a gilded lotus cushion that takes the image's base (and hides the scan's ragged underside)
  const pad = lathe([[0, 0], [1, 0], [1.04, 0.1], [1.0, 0.2], [0.92, 0.26], [0, 0.26]], 40);
  pad.scale(2.25, 1, 1.5);
  b.add(pad, m.gold, BUDDHA.x, TOP + THRONE_H, BUDDHA.z - 0.1, 0, 0, 0, true);
  const petal = new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  petal.scale(1, 1.6, 0.5);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    b.add(petal, m.gold, BUDDHA.x + Math.sin(a) * 2.3, TOP + THRONE_H + 0.02, BUDDHA.z - 0.1 + Math.cos(a) * 1.55, a, -0.35);
  }
  // the torana's turquoise disc (60% up the texture) sits behind the Buddha's head
  const torH = (THRONE_H + (0.81 * BUDDHA_H) / 0.87) / 0.6, torW = torH * (703 / 908);
  const torZ = A.z1 - 0.25;
  b.add(new THREE.PlaneGeometry(torW, torH), m.torana, BUDDHA.x, TOP + torH / 2, torZ, Math.PI);
  // a dark backing so the torana reads as a solid relief against the sky mural
  b.add(new THREE.ShapeGeometry(archShape(torW * 0.42, torH * 0.62), 12), m.deepBlue, BUDDHA.x, TOP + 0.1, torZ + 0.03, Math.PI);

  // ---- the flanking thrones, niches and halos ----
  const lotus = lathe([[0, 0], [1.9, 0], [1.95, 0.15], [1.8, 0.3], [1.95, 0.45], [2.05, 0.65], [1.9, 0.85], [1.75, FLANK_PLINTH], [0, FLANK_PLINTH]], 40);
  for (const f of [GURU, AMITAYUS]) {
    b.add(lotus, m.gold, f.x, TOP, f.z, 0, 0, 0, true);
    const headY = TOP + FLANK_PLINTH + 0.93 * FLANK_SCALE;
    // the arched body niche, gold rim round deep blue
    b.add(new THREE.ShapeGeometry(archShape(4.3, headY - TOP + 1.4), 16), m.gold, f.x, TOP + 0.2, A.z1 - 0.2, Math.PI);
    b.add(new THREE.ShapeGeometry(archShape(3.7, headY - TOP + 1.1), 16), m.deepBlue, f.x, TOP + 0.2, A.z1 - 0.23, Math.PI);
    // the round jewelled halo behind the head
    b.add(new THREE.PlaneGeometry(3.5, 3.5), m.halo, f.x, headY + 0.25, A.z1 - 0.3, Math.PI);
  }

  // ---- pillars: red with coiling gold dragons between the images, brocade at the ends ----
  const pillarH = FY + HALL.h - TOP;
  for (const s of [-1, 1]) {
    const x = s * 3.5, z = A.z1 - 0.9;
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
    const x = s * 8.35, z = A.z0 - 0.45;
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
  const chandeliers: [number, number, number][] = [[0, FY + 10.3, A.z0 - 1.3], [GURU.x, FY + 9.9, A.z0 - 1.1], [AMITAYUS.x, FY + 9.9, A.z0 - 1.1], [-2.6, FY + 10.6, A.z0 - 0.8], [2.6, FY + 10.6, A.z0 - 0.8]];
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
  for (const x of [-7.6, -4.1, -1.9, 1.9, 4.1, 7.6]) vaseSpots.push([x, TOP, A.z0 + 0.35]);
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

  // ---- the polished floor mirroring the gold ----
  const refl = new THREE.Mesh(new THREE.PlaneGeometry(17, 9), new THREE.MeshBasicMaterial({
    map: reflectionTexture(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  refl.rotation.x = -Math.PI / 2;
  refl.position.set(0, FY + 0.012, A.z0 - 4.6);
  refl.renderOrder = 1;
  group.add(refl);

  b.build(group);

  // ---- the images ----
  const statues = new THREE.Group();
  group.add(statues);
  // Shakyamuni: earth-touching right hand, dark alms bowl, blue curls (TRELLIS mesh)
  const buddhaSlot = new THREE.Group();
  buddhaSlot.position.set(BUDDHA.x, TOP + THRONE_H, BUDDHA.z - 0.1);
  statues.add(buddhaSlot);
  loadStatue(SHAKYAMUNI, 'gilt').then((s) => {
    s.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.computeVertexNormals();
      const mat = mesh.material as THREE.MeshStandardMaterial;
      // the photo's own light is baked into the texture; a little metal gives it the
      // polished-gilt sheen under the floodlights
      mat.flatShading = false;
      mat.color.setHex(0xffe2a0);
      mat.metalness = 0.15;
      mat.roughness = 0.4;
      mat.envMapIntensity = 1.1;
      // the scan keeps the curls' lapis only faintly: push bluish texels back to the
      // painted cobalt of the real hair (gold texels have red over blue and are untouched)
      mat.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          { vec3 c = diffuseColor.rgb; float blu = smoothstep(-0.01, 0.06, c.b - c.r * 0.8);
            diffuseColor.rgb = mix(c, vec3(0.09, 0.17, 0.55) * (0.6 + 1.6 * dot(c, vec3(0.333))), blu * 0.9); }`);
      };
      mat.customProgramCacheKey = () => 'tibetan-shakyamuni';
      mat.needsUpdate = true;
    });
    // TRELLIS meshes are centred on the origin and face +z: turn to face the door
    s.scale.setScalar(BUDDHA_SCALE);
    s.position.y = 0.5 * BUDDHA_SCALE + 0.12;
    s.rotation.y = Math.PI;
    buddhaSlot.add(s);
  }).catch(() => {
    loadStatue('tibetan', 'tibetan-painted').then((s) => {
      s.scale.setScalar(BUDDHA_H / 1.0);
      s.rotation.y = Math.PI;
      buddhaSlot.add(s);
    }).catch(() => {});
  });

  // the flanking images: baked sculpts finished with their attributes
  const guruSlot = new THREE.Group();
  guruSlot.position.set(GURU.x, TOP + FLANK_PLINTH, GURU.z);
  guruSlot.rotation.y = Math.PI;
  guruSlot.scale.setScalar(FLANK_SCALE);
  statues.add(guruSlot);
  guruSlot.add(guruAttributes(m));
  loadStatue('tibetan-guru', 'tibetan-painted').then((s) => guruSlot.add(s)).catch(() => {});
  const amiSlot = new THREE.Group();
  amiSlot.position.set(AMITAYUS.x, TOP + FLANK_PLINTH, AMITAYUS.z);
  amiSlot.rotation.y = Math.PI;
  amiSlot.scale.setScalar(FLANK_SCALE);
  statues.add(amiSlot);
  amiSlot.add(amitayusAttributes(m));
  loadStatue('tibetan-amitayus', 'tibetan-painted').then((s) => amiSlot.add(s)).catch(() => {});

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

/**
 * Guru Rinpoche's attributes in sculpt space (the sculpt faces +z, head at y 0.93, its left
 * hand on +x): the lotus hat with vulture feather, the khatvanga in the crook of the left
 * arm, the skull cup with a long-life vase in the lap, a moustache, earrings and necklace.
 */
function guruAttributes(m: Mats) {
  const g = new THREE.Group();
  const b = new Batch();
  const red = new THREE.MeshStandardMaterial({ color: 0x9c2420, roughness: 0.5 });
  const jewelBlue = new THREE.MeshStandardMaterial({ color: 0x2a6fc0, roughness: 0.2, metalness: 0.3 });
  const jewelRed = new THREE.MeshStandardMaterial({ color: 0xc0283a, roughness: 0.2, metalness: 0.3 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xf0e8d6, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.6 });
  const H = 0.93;
  // the lotus hat: a red rim, a gold dome, upturned side flaps, a half-vajra and a feather
  b.add(lathe([[0.0, 0], [0.165, 0], [0.175, 0.035], [0.165, 0.06], [0.0, 0.06]], 28), red, 0, H + 0.035, -0.005);
  b.add(lathe([[0.0, 0], [0.15, 0], [0.145, 0.06], [0.125, 0.12], [0.095, 0.18], [0.06, 0.23], [0.03, 0.26], [0.0, 0.27]], 28), m.gold, 0, H + 0.09, -0.005, 0, 0, 0, true);
  b.add(lathe([[0.0, 0], [0.152, 0], [0.152, 0.025], [0.0, 0.025]], 28), red, 0, H + 0.13, -0.005);
  // the upturned front and side flaps, jewelled
  b.add(new THREE.BoxGeometry(0.13, 0.1, 0.016), m.gold, 0, H + 0.14, 0.145, 0, -0.3);
  b.add(new THREE.SphereGeometry(0.022, 8, 6), jewelBlue, 0, H + 0.145, 0.16);
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.06, 0.16, 0.016), m.gold, s * 0.16, H + 0.1, 0.06, s * 0.6, 0, -s * 0.45);
    b.add(new THREE.BoxGeometry(0.05, 0.12, 0.014), red, s * 0.12, H + 0.06, -0.12, s * 2.4, 0, -s * 0.2);
  }
  // half-vajra finial and the vulture feather
  b.add(new THREE.SphereGeometry(0.022, 8, 6), m.gold, 0, H + 0.37, -0.005);
  for (const dx of [-0.02, 0, 0.02]) b.add(new THREE.ConeGeometry(0.01, 0.09, 6), m.gold, dx, H + 0.43, -0.005, 0, 0, -dx * 8);
  const feather = new THREE.SphereGeometry(0.03, 8, 6);
  feather.scale(0.55, 3.2, 0.35);
  b.add(feather, dark, 0.0, H + 0.5, -0.03, 0, -0.15, 0.08);
  // moustache, curled up at the ends, and a small goatee
  for (const s of [-1, 1]) {
    const pts = [new THREE.Vector3(0.004 * s, H - 0.072, 0.128), new THREE.Vector3(0.025 * s, H - 0.075, 0.122), new THREE.Vector3(0.04 * s, H - 0.065, 0.112)];
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.0045, 5), dark, 0, 0, 0);
  }
  b.add(new THREE.ConeGeometry(0.006, 0.022, 6), dark, 0, H - 0.13, 0.112, 0, Math.PI);
  // large round earrings and a jewelled necklace
  for (const s of [-1, 1]) {
    b.add(new THREE.TorusGeometry(0.025, 0.007, 6, 14), m.gold, s * 0.118, H - 0.1, 0.0, Math.PI / 2);
    b.add(new THREE.SphereGeometry(0.012, 8, 6), jewelBlue, s * 0.118, H - 0.1, 0.02);
  }
  const neck = new THREE.TorusGeometry(0.12, 0.012, 6, 28, Math.PI);
  b.add(neck, m.gold, 0, H - 0.2, 0.05, 0, Math.PI / 2 + 0.35, Math.PI);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.15 + (i / 6) * 0.7);
    b.add(new THREE.SphereGeometry(0.012, 8, 6), i % 2 ? jewelRed : jewelBlue, Math.cos(a) * 0.12, H - 0.2 - Math.sin(a) * 0.1, 0.09 + Math.sin(a) * 0.035);
  }
  // the skull cup with the long-life vase standing in it, on the hands in the lap
  b.add(new THREE.SphereGeometry(0.06, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bone, 0.0, 0.43, 0.24);
  b.add(lathe([[0, 0], [0.02, 0], [0.032, 0.03], [0.012, 0.07], [0.024, 0.085], [0.006, 0.12], [0, 0.13]], 12), m.gold, 0.0, 0.42, 0.24);
  // the khatvanga: a gold staff in the crook of the left arm, crowned by a double vajra,
  // three heads (fresh, decaying, skull) and a trident, with red and white ribbons
  const base = new THREE.Vector3(0.12, 0.3, 0.22), tip = new THREE.Vector3(0.25, 1.32, 0.06);
  const dir = tip.clone().sub(base);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const at = (t: number) => base.clone().addScaledVector(dir, t);
  const place = (geo: THREE.BufferGeometry, mat: THREE.Material, t: number, extra = new THREE.Vector3()) => {
    const p = at(t).add(extra);
    b.addM(geo, mat, new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
  };
  place(new THREE.CylinderGeometry(0.008, 0.008, len, 6), m.gold, 0.5);
  place(new THREE.SphereGeometry(0.018, 8, 6), m.gold, 0.7);
  place(new THREE.SphereGeometry(0.022, 8, 6), red, 0.77);
  place(new THREE.SphereGeometry(0.02, 8, 6), m.gold, 0.83);
  place(new THREE.SphereGeometry(0.018, 8, 6), bone, 0.89);
  for (const dx of [-0.028, 0, 0.028]) place(new THREE.ConeGeometry(0.006, 0.07, 5), m.gold, 0.96, new THREE.Vector3(dx, 0.01, 0));
  for (const s of [-1, 1]) {
    const rib = new THREE.PlaneGeometry(0.018, 0.22);
    const p = at(0.72).add(new THREE.Vector3(s * 0.03, -0.12, 0.01));
    b.add(rib, s > 0 ? red : bone, p.x, p.y, p.z, 0, 0, s * 0.15);
  }
  b.build(g);
  return g;
}

/** Amitayus's attributes: a tall five-leaf crown, disc earrings, necklaces, the vase */
function amitayusAttributes(m: Mats) {
  const g = new THREE.Group();
  const b = new Batch();
  const jewelBlue = new THREE.MeshStandardMaterial({ color: 0x2a5fb8, roughness: 0.2, metalness: 0.3 });
  const jewelRed = new THREE.MeshStandardMaterial({ color: 0xc0283a, roughness: 0.2, metalness: 0.3 });
  const H = 0.93;
  // five crown leaves, pointed, set on a band round the head
  const leafShape = new THREE.Shape();
  leafShape.moveTo(-0.045, 0);
  leafShape.quadraticCurveTo(-0.055, 0.07, 0, 0.13);
  leafShape.quadraticCurveTo(0.055, 0.07, 0.045, 0);
  leafShape.lineTo(-0.045, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.01, bevelEnabled: false });
  b.add(new THREE.TorusGeometry(0.122, 0.012, 6, 28), m.gold, 0, H + 0.07, -0.005, 0, Math.PI / 2);
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.48;
    const x = Math.sin(a) * 0.125, z = Math.cos(a) * 0.125 - 0.005;
    b.add(leafGeo, m.gold, x, H + 0.075, z, a, -0.12, 0, true);
    b.add(new THREE.SphereGeometry(0.016, 8, 6), i % 2 ? jewelRed : jewelBlue, x * 1.08, H + 0.12, z * 1.08 + 0.01);
  }
  // the blue topknot with a jewel finial
  b.add(new THREE.SphereGeometry(0.05, 12, 8), jewelBlue, 0, H + 0.2, -0.01);
  b.add(new THREE.ConeGeometry(0.03, 0.08, 10), m.gold, 0, H + 0.27, -0.01);
  // large disc earrings, blue with a red centre
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 16), jewelBlue, s * 0.13, H - 0.12, 0.0, 0, 0, Math.PI / 2);
    b.add(new THREE.SphereGeometry(0.012, 8, 6), jewelRed, s * 0.137, H - 0.12, 0.0);
  }
  // necklaces of gold with blue and red stones
  for (const [r, y] of [[0.11, H - 0.2], [0.15, H - 0.26]] as const) {
    b.add(new THREE.TorusGeometry(r, 0.01, 6, 28, Math.PI), m.gold, 0, y, 0.05, 0, Math.PI / 2 + 0.35, Math.PI);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.15 + (i / 6) * 0.7);
      b.add(new THREE.SphereGeometry(0.012, 8, 6), i % 2 ? jewelRed : jewelBlue, Math.cos(a) * r, y - Math.sin(a) * r * 0.8, 0.09 + Math.sin(a) * 0.04);
    }
  }
  // the long-life vase held in both hands in the lap
  b.add(lathe([[0, 0], [0.03, 0], [0.05, 0.04], [0.045, 0.07], [0.018, 0.09], [0.022, 0.11], [0.03, 0.13], [0.012, 0.15], [0, 0.17]], 14), m.gold, 0, 0.4, 0.24, 0, 0, 0, true);
  b.add(new THREE.TorusGeometry(0.048, 0.008, 6, 16), jewelBlue, 0, 0.44, 0.24, 0, Math.PI / 2);
  b.build(g);
  return g;
}
