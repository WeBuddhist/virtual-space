import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BowStyle } from './rooms/types';

// A skinned child-monk avatar built in code: one smooth body on a 17-bone skeleton,
// animated by eased keyframe clips (an AnimationMixer with crossfades) plus a small
// procedural layer (breathing, head turn). Faces +z; its own left is +x.

export type Pose = 'idle' | 'walk' | 'kneel' | 'beads' | 'palms' | 'bow';

/** appearance knobs; the avatar picker edits these */
export interface Look { robe: number; shirt: number; skin: number }
export const DEFAULT_LOOK: Look = { robe: 0x7a1f22, shirt: 0xd9a12b, skin: 0xd8a47c };

export type BoneName =
  | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'shoulderL' | 'upperArmL' | 'foreArmL' | 'handL'
  | 'shoulderR' | 'upperArmR' | 'foreArmR' | 'handR'
  | 'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR';

// bind pose: offsets from the parent bone, metres
export const RIG: [BoneName, BoneName | null, [number, number, number]][] = [
  ['hips', null, [0, 0.46, 0]],
  ['spine', 'hips', [0, 0.06, 0]],
  ['chest', 'spine', [0, 0.13, 0]],
  ['neck', 'chest', [0, 0.14, 0]],
  ['head', 'neck', [0, 0.06, 0]],
  ['shoulderL', 'chest', [0.12, 0.11, 0]],
  ['upperArmL', 'shoulderL', [0.035, 0, 0]],
  ['foreArmL', 'upperArmL', [0, -0.19, 0]],
  ['handL', 'foreArmL', [0, -0.17, 0]],
  ['shoulderR', 'chest', [-0.12, 0.11, 0]],
  ['upperArmR', 'shoulderR', [-0.035, 0, 0]],
  ['foreArmR', 'upperArmR', [0, -0.19, 0]],
  ['handR', 'foreArmR', [0, -0.17, 0]],
  ['thighL', 'hips', [0.075, -0.02, 0]],
  ['shinL', 'thighL', [0, -0.21, 0]],
  ['footL', 'shinL', [0, -0.2, 0]],
  ['thighR', 'hips', [-0.075, -0.02, 0]],
  ['shinR', 'thighR', [0, -0.21, 0]],
  ['footR', 'shinR', [0, -0.2, 0]],
];
export const TIP: Partial<Record<BoneName, [number, number, number]>> = {
  head: [0, 0.3, 0], handL: [0, -0.09, 0], handR: [0, -0.09, 0], footL: [0, -0.02, 0.1], footR: [0, -0.02, 0.1],
};

// ---- poses ------------------------------------------------------------------------
// Euler angles in degrees, local to each bone. +x on the spine bends forward; -x on an
// arm or thigh swings it forward; -x on a forearm bends the elbow; +x on a shin bends the knee.

type PoseDef = Partial<Record<BoneName, [number, number, number]>> & { hipsY?: number; hipsZ?: number };

const REST: PoseDef = { upperArmL: [0, 0, 7], upperArmR: [0, 0, -7], foreArmL: [-8, 0, 0], foreArmR: [-8, 0, 0], hipsY: 0.46, hipsZ: 0 };
const mirrorArms = (a: [number, number, number], f: [number, number, number], h: [number, number, number] = [0, 0, 0]): PoseDef => ({
  upperArmL: a, upperArmR: [a[0], -a[1], -a[2]], foreArmL: f, foreArmR: [f[0], -f[1], -f[2]], handL: h, handR: [h[0], -h[1], -h[2]],
});
/** palms together at the heart */
const GASSHO: PoseDef = mirrorArms([-28, 0, -24], [-98, -38, 0], [0, 0, 18]);
const CROWN: PoseDef = { ...mirrorArms([-150, 0, -22], [-70, -20, 0], [0, 0, 10]), head: [8, 0, 0] };
const THROAT: PoseDef = mirrorArms([-55, 0, -26], [-112, -32, 0], [0, 0, 15]);
const KNEEL_HANDS_DOWN: PoseDef = {
  hipsY: 0.24, hipsZ: 0.05, spine: [38, 0, 0], chest: [22, 0, 0], neck: [-12, 0, 0],
  thighL: [-78, 0, 4], thighR: [-78, 0, -4], shinL: [88, 0, 0], shinR: [88, 0, 0], footL: [40, 0, 0], footR: [40, 0, 0],
  ...mirrorArms([-58, 0, -6], [-14, 0, 0]),
};
const LYING: PoseDef = {
  hipsY: 0.1, hipsZ: 0.32, hips: [88, 0, 0], spine: [4, 0, 0], neck: [-28, 0, 0], head: [-8, 0, 0],
  thighL: [2, 0, 3], thighR: [2, 0, -3], shinL: [4, 0, 0], shinR: [4, 0, 0], footL: [70, 0, 0], footR: [70, 0, 0],
  ...mirrorArms([-172, 0, -10], [-6, 0, 0]),
};
const LYING_JOINED: PoseDef = { ...LYING, ...mirrorArms([-174, 0, -2], [-10, -10, 0], [0, 0, 8]) };
/** sitting back on the heels (Thai and East Asian bows) */
const SEIZA: PoseDef = {
  hipsY: 0.17, hipsZ: -0.02, thighL: [-88, 0, 5], thighR: [-88, 0, -5], shinL: [172, 0, 0], shinR: [172, 0, 0], footL: [80, 0, 0], footR: [80, 0, 0],
};
const LOTUS_LEGS: PoseDef = {
  hipsY: 0.13, thighL: [-84, -20, 38], thighR: [-84, 20, -38], shinL: [148, 0, 0], shinR: [148, 0, 0], footL: [10, 0, 0], footR: [10, 0, 0],
};
const DHYANA: PoseDef = mirrorArms([-22, 0, -4], [-62, -28, 0], [0, 0, 22]);

type Key = [number, PoseDef];

/** each named clip: keyframes (seconds) and whether it loops */
const CLIPS: Record<string, { keys: Key[]; loop: boolean }> = {
  idle: {
    loop: true,
    keys: [
      [0, { chest: [0, 0, 0], head: [0, 0, 0] }],
      [2, { chest: [-1.5, 0, 0], spine: [0, 0, 1], head: [-2, 6, 0], hipsY: 0.462 }],
      [4, { chest: [0, 0, 0], head: [0, 0, 0] }],
    ],
  },
  walk: {
    loop: true,
    keys: [
      [0, { thighL: [-26, 0, 0], shinL: [6, 0, 0], footL: [-10, 0, 0], thighR: [18, 0, 0], shinR: [22, 0, 0], footR: [14, 0, 0], ...mirrorArms([0, 0, 7], [-14, 0, 0]), upperArmL: [16, 0, 7], upperArmR: [-20, 0, -7], spine: [4, 6, 0], head: [-3, -5, 0], hipsY: 0.455 }],
      [0.25, { thighL: [-4, 0, 0], shinL: [6, 0, 0], thighR: [-12, 0, 0], shinR: [58, 0, 0], footR: [-10, 0, 0], upperArmL: [0, 0, 7], upperArmR: [0, 0, -7], spine: [4, 0, 0], hipsY: 0.475 }],
      [0.5, { thighR: [-26, 0, 0], shinR: [6, 0, 0], footR: [-10, 0, 0], thighL: [18, 0, 0], shinL: [22, 0, 0], footL: [14, 0, 0], upperArmR: [16, 0, -7], upperArmL: [-20, 0, 7], foreArmL: [-14, 0, 0], foreArmR: [-14, 0, 0], spine: [4, -6, 0], head: [-3, 5, 0], hipsY: 0.455 }],
      [0.75, { thighR: [-4, 0, 0], shinR: [6, 0, 0], thighL: [-12, 0, 0], shinL: [58, 0, 0], footL: [-10, 0, 0], upperArmL: [0, 0, 7], upperArmR: [0, 0, -7], spine: [4, 0, 0], hipsY: 0.475 }],
      [1, { thighL: [-26, 0, 0], shinL: [6, 0, 0], footL: [-10, 0, 0], thighR: [18, 0, 0], shinR: [22, 0, 0], footR: [14, 0, 0], upperArmL: [16, 0, 7], upperArmR: [-20, 0, -7], foreArmL: [-14, 0, 0], foreArmR: [-14, 0, 0], spine: [4, 6, 0], head: [-3, -5, 0], hipsY: 0.455 }],
    ],
  },
  kneel: {
    loop: true,
    keys: [
      [0, { ...LOTUS_LEGS, ...DHYANA, spine: [2, 0, 0], head: [6, 0, 0] }],
      [2.5, { ...LOTUS_LEGS, ...DHYANA, spine: [3, 0, 0], chest: [-1.5, 0, 0], head: [7, 0, 0], hipsY: 0.132 }],
      [5, { ...LOTUS_LEGS, ...DHYANA, spine: [2, 0, 0], head: [6, 0, 0] }],
    ],
  },
  beads: {
    loop: true,
    keys: [
      [0, { ...LOTUS_LEGS, upperArmL: [-22, 0, -4], foreArmL: [-62, -28, 0], upperArmR: [-34, 0, 16], foreArmR: [-112, 30, 0], handR: [10, 0, 0], head: [10, 0, 0] }],
      [0.6, { ...LOTUS_LEGS, upperArmL: [-22, 0, -4], foreArmL: [-62, -28, 0], upperArmR: [-34, 0, 16], foreArmR: [-108, 30, 0], handR: [-14, 0, 0], head: [10, 0, 0] }],
      [1.2, { ...LOTUS_LEGS, upperArmL: [-22, 0, -4], foreArmL: [-62, -28, 0], upperArmR: [-34, 0, 16], foreArmR: [-112, 30, 0], handR: [10, 0, 0], head: [10, 0, 0] }],
    ],
  },
  palms: {
    loop: false,
    keys: [
      [0, {}],
      [0.5, { ...GASSHO }],
      [1.0, { ...GASSHO, spine: [14, 0, 0], neck: [8, 0, 0], head: [10, 0, 0] }],
      [1.6, { ...GASSHO }],
      [2.2, {}],
    ],
  },
  // Tibetan full prostration: palms at crown, throat and heart, kneel, slide flat, rise
  'tibetan-prostration': {
    loop: true,
    keys: [
      [0, { ...GASSHO }],
      [0.6, { ...CROWN }],
      [1.0, { ...THROAT }],
      [1.4, { ...GASSHO }],
      [2.2, { ...KNEEL_HANDS_DOWN }],
      [3.0, { ...LYING }],
      [3.4, { ...LYING_JOINED }],
      [3.9, { ...LYING_JOINED }],
      [4.6, { ...KNEEL_HANDS_DOWN }],
      [5.5, { ...GASSHO }],
      [6.0, { ...GASSHO }],
    ],
  },
  // Thai five-point bow, three times, kneeling on the heels
  'five-point': {
    loop: true,
    keys: (() => {
      const k: Key[] = [[0, { ...SEIZA, ...GASSHO }]];
      for (let i = 0; i < 3; i++) {
        const t = i * 2;
        k.push([t + 0.5, { ...SEIZA, ...mirrorArms([-72, 0, -20], [-128, -30, 0], [0, 0, 14]), head: [6, 0, 0] }]);
        k.push([t + 1.1, { ...SEIZA, hipsY: 0.2, hipsZ: 0.04, spine: [52, 0, 0], chest: [28, 0, 0], neck: [10, 0, 0], ...mirrorArms([-38, 0, -16], [-58, -10, 0], [-10, 0, 0]) }]);
        k.push([t + 1.5, { ...SEIZA, hipsY: 0.2, hipsZ: 0.04, spine: [52, 0, 0], chest: [28, 0, 0], neck: [10, 0, 0], ...mirrorArms([-38, 0, -16], [-58, -10, 0], [-10, 0, 0]) }]);
        k.push([t + 2, { ...SEIZA, ...GASSHO }]);
      }
      return k;
    })(),
  },
  // East Asian kneeling bow: kneel, forehead to the floor, palms lifted beside the head
  'east-asian-bow': {
    loop: true,
    keys: [
      [0, { ...GASSHO }],
      [0.9, { ...KNEEL_HANDS_DOWN }],
      [1.6, { ...SEIZA, hipsY: 0.2, hipsZ: 0.05, spine: [58, 0, 0], chest: [26, 0, 0], neck: [12, 0, 0], ...mirrorArms([-40, 0, -14], [-46, 0, 0]) }],
      [2.2, { ...SEIZA, hipsY: 0.2, hipsZ: 0.05, spine: [58, 0, 0], chest: [26, 0, 0], neck: [12, 0, 0], ...mirrorArms([-62, 0, -18], [-96, 0, 0], [40, 0, 0]) }],
      [2.8, { ...SEIZA, hipsY: 0.2, hipsZ: 0.05, spine: [58, 0, 0], chest: [26, 0, 0], neck: [12, 0, 0], ...mirrorArms([-40, 0, -14], [-46, 0, 0]) }],
      [3.6, { ...KNEEL_HANDS_DOWN }],
      [4.5, { ...GASSHO }],
      [5, { ...GASSHO }],
    ],
  },
  'standing-bow': {
    loop: true,
    keys: [
      [0, { ...GASSHO }],
      [0.9, { ...GASSHO, spine: [32, 0, 0], chest: [10, 0, 0], neck: [6, 0, 0] }],
      [1.6, { ...GASSHO, spine: [32, 0, 0], chest: [10, 0, 0], neck: [6, 0, 0] }],
      [2.5, { ...GASSHO }],
      [3, { ...GASSHO }],
    ],
  },
};

export const PALMS_SECONDS = 2.2;
export const BOW_SECONDS: Record<BowStyle, number> = {
  'tibetan-prostration': 6, 'five-point': 6, 'east-asian-bow': 5, 'standing-bow': 3,
};

// ---- clip baking -------------------------------------------------------------------

const D2R = Math.PI / 180;
const BONES = RIG.map(([n]) => n);
const ease = (x: number) => x * x * (3 - 2 * x);

function fullPose(p: PoseDef) {
  return { ...REST, ...p };
}

/** sample eased keyframes at 30 fps into quaternion and hip-position tracks */
function bakeClip(name: string, keys: Key[]) {
  const fps = 30;
  const end = keys[keys.length - 1][0];
  const frames = Math.max(2, Math.round(end * fps) + 1);
  const times = new Float32Array(frames);
  const quats: Record<string, number[]> = {};
  const hips: number[] = [];
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), e = new THREE.Euler();
  for (const b of BONES) quats[b] = [];
  for (let f = 0; f < frames; f++) {
    const t = Math.min(end, f / fps);
    times[f] = t;
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1][0] <= t) i++;
    const [t0, p0] = keys[i], [t1, p1] = keys[Math.min(i + 1, keys.length - 1)];
    const k = t1 > t0 ? ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))) : 0;
    const a = fullPose(p0), b = fullPose(p1);
    for (const bone of BONES) {
      const ra = (a[bone] as [number, number, number] | undefined) ?? [0, 0, 0];
      const rb = (b[bone] as [number, number, number] | undefined) ?? [0, 0, 0];
      qa.setFromEuler(e.set(ra[0] * D2R, ra[1] * D2R, ra[2] * D2R));
      qb.setFromEuler(e.set(rb[0] * D2R, rb[1] * D2R, rb[2] * D2R));
      qa.slerp(qb, k);
      quats[bone].push(qa.x, qa.y, qa.z, qa.w);
    }
    hips.push(0, (a.hipsY ?? 0.46) + ((b.hipsY ?? 0.46) - (a.hipsY ?? 0.46)) * k, (a.hipsZ ?? 0) + ((b.hipsZ ?? 0) - (a.hipsZ ?? 0)) * k);
  }
  const tracks: THREE.KeyframeTrack[] = BONES.map((b) => new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, times, quats[b]));
  tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, hips));
  return new THREE.AnimationClip(name, end, tracks);
}

let clipCache: Map<string, THREE.AnimationClip> | null = null;
const clips = () => (clipCache ??= new Map(Object.entries(CLIPS).map(([n, c]) => [n, bakeClip(n, c.keys)])));

// ---- the body ------------------------------------------------------------------------

interface Piece { geo: THREE.BufferGeometry; mat: 'skin' | 'robe' | 'shirt' | 'dark'; bones: BoneName[] }

function buildSkeleton() {
  const bones = new Map<BoneName, THREE.Bone>();
  for (const [name, parent, off] of RIG) {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(...off);
    bones.set(name, b);
    if (parent) bones.get(parent)!.add(b);
  }
  return bones;
}

/** bone segments in bind space, for distance-based skin weights */
function segments(bones: Map<BoneName, THREE.Bone>) {
  bones.get('hips')!.updateMatrixWorld(true);
  const seg = new Map<BoneName, [THREE.Vector3, THREE.Vector3]>();
  for (const [name] of RIG) {
    const a = bones.get(name)!.getWorldPosition(new THREE.Vector3());
    const child = RIG.find(([, p]) => p === name);
    const b = child ? bones.get(child[0])!.getWorldPosition(new THREE.Vector3()) : a.clone().add(new THREE.Vector3(...(TIP[name] ?? [0, 0.05, 0])));
    seg.set(name, [a, b]);
  }
  // the chest segment runs up the middle to the neck, not out to a shoulder
  seg.set('chest', [bones.get('chest')!.getWorldPosition(new THREE.Vector3()), bones.get('neck')!.getWorldPosition(new THREE.Vector3())]);
  return seg;
}

function distToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
  const ab = b.clone().sub(a);
  const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}

/** skin weights from the nearest allowed bones, falling off with distance */
function skin(piece: Piece, seg: Map<BoneName, [THREE.Vector3, THREE.Vector3]>) {
  const g = piece.geo;
  const pos = g.attributes.position;
  const idx = new Uint16Array(pos.count * 4), w = new Float32Array(pos.count * 4);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const ranked = piece.bones
      .map((b) => ({ i: BONES.indexOf(b), d: distToSegment(p, ...seg.get(b)!) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 4)
      .map((r) => ({ i: r.i, w: 1 / (Math.pow(r.d + 0.004, 5)) }));
    const sum = ranked.reduce((s, r) => s + r.w, 0);
    ranked.forEach((r, k) => { idx[i * 4 + k] = r.i; w[i * 4 + k] = r.w / sum; });
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(w, 4));
  return g;
}

/** place a y-aligned geometry so it runs from a to b */
function along(geo: THREE.BufferGeometry, a: THREE.Vector3, b: THREE.Vector3) {
  const dir = b.clone().sub(a);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  geo.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return geo;
}

const clean = (g: THREE.BufferGeometry) => {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (k !== 'position' && k !== 'normal') out.deleteAttribute(k);
  return out;
};

function bodyPieces(seg: Map<BoneName, [THREE.Vector3, THREE.Vector3]>): Piece[] {
  const P: Piece[] = [];
  const add = (geo: THREE.BufferGeometry, mat: Piece['mat'], bones: BoneName[]) => P.push({ geo: clean(geo), mat, bones });
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  // head: big and round, shaved, with ears, eyes and brows
  const head = new THREE.SphereGeometry(0.2, 36, 26);
  head.scale(1, 0.97, 0.95);
  head.translate(0, 0.99, 0.0);
  add(head, 'skin', ['head']);
  for (const s of [-1, 1]) {
    const ear = new THREE.SphereGeometry(0.045, 14, 10);
    ear.scale(0.45, 1, 0.75);
    ear.translate(s * 0.197, 0.975, 0);
    add(ear, 'skin', ['head']);
    const eye = new THREE.SphereGeometry(0.02, 12, 8);
    eye.scale(0.9, 1.15, 0.5);
    eye.translate(s * 0.068, 0.995, 0.183);
    add(eye, 'dark', ['head']);
    const brow = new THREE.CapsuleGeometry(0.006, 0.035, 3, 6);
    brow.rotateZ(Math.PI / 2 + s * 0.12);
    brow.translate(s * 0.07, 1.045, 0.178);
    add(brow, 'dark', ['head']);
  }
  const nose = new THREE.SphereGeometry(0.016, 10, 8);
  nose.translate(0, 0.965, 0.193);
  add(nose, 'skin', ['head']);
  const neck = new THREE.CylinderGeometry(0.052, 0.058, 0.12, 16, 3, true);
  neck.translate(0, 0.83, 0.005);
  add(neck, 'skin', ['chest', 'neck', 'head']);

  // torso: the saffron dhonka (sleeveless shirt)
  const torsoProfile = [V(0.05, 0.815, 0), V(0.115, 0.8, 0), V(0.15, 0.76, 0), V(0.152, 0.68, 0), V(0.142, 0.58, 0), V(0.14, 0.5, 0), V(0.15, 0.44, 0)]
    .map((v) => new THREE.Vector2(v.x, v.y));
  const torso = new THREE.LatheGeometry(torsoProfile, 32);
  torso.scale(1, 1, 0.78);
  add(torso, 'shirt', ['hips', 'spine', 'chest', 'upperArmL', 'upperArmR']);

  // the maroon zen: a shawl wrapped over the left shoulder and around the torso
  const shawlProfile = torsoProfile.map((v) => new THREE.Vector2(v.x + 0.012, v.y));
  const shawl = new THREE.LatheGeometry(shawlProfile, 40);
  shawl.scale(1, 1, 0.8);
  const keep: number[] = [];
  const nonIdx = shawl.toNonIndexed();
  const np = nonIdx.attributes.position;
  for (let t = 0; t < np.count; t += 3) {
    let cx = 0, cy = 0;
    for (let k = 0; k < 3; k++) { cx += np.getX(t + k) / 3; cy += np.getY(t + k) / 3; }
    // keep the band below a diagonal rising from the right hip to the left shoulder
    if (cy < 0.47 + (cx + 0.16) * 1.1 && cy > 0.44) keep.push(t, t + 1, t + 2);
  }
  const shawlPos = new Float32Array(keep.length * 3);
  keep.forEach((v, i) => { shawlPos[i * 3] = np.getX(v); shawlPos[i * 3 + 1] = np.getY(v); shawlPos[i * 3 + 2] = np.getZ(v); });
  const shawlGeo = new THREE.BufferGeometry();
  shawlGeo.setAttribute('position', new THREE.BufferAttribute(shawlPos, 3));
  shawlGeo.computeVertexNormals();
  P.push({ geo: shawlGeo, mat: 'robe', bones: ['hips', 'spine', 'chest', 'upperArmL'] });

  // the maroon shamthab skirt, from the waist to the ankles, following the legs
  const skirtProfile = [new THREE.Vector2(0.153, 0.5), new THREE.Vector2(0.158, 0.42), new THREE.Vector2(0.17, 0.3), new THREE.Vector2(0.185, 0.15), new THREE.Vector2(0.2, 0.05), new THREE.Vector2(0.196, 0.035)];
  const skirt = new THREE.LatheGeometry(skirtProfile, 36);
  skirt.scale(1, 1, 0.85);
  add(skirt, 'robe', ['hips', 'thighL', 'thighR', 'shinL', 'shinR']);

  // arms: the left upper arm under the shawl, the rest bare
  for (const [side, s] of [['L', 1], ['R', -1]] as const) {
    const [sa, sb] = seg.get(`upperArm${side}`)!;
    const [fa, fb] = seg.get(`foreArm${side}`)!;
    const upper = along(new THREE.CapsuleGeometry(0.044, sa.distanceTo(sb), 6, 14), sa, sb);
    add(upper, side === 'L' ? 'robe' : 'skin', ['chest', `shoulder${side}`, `upperArm${side}`, `foreArm${side}`]);
    const fore = along(new THREE.CapsuleGeometry(0.037, fa.distanceTo(fb), 6, 14), fa, fb);
    add(fore, 'skin', [`upperArm${side}`, `foreArm${side}`, `hand${side}`]);
    const hand = new THREE.SphereGeometry(0.042, 14, 10);
    hand.scale(0.75, 1.35, 0.55);
    hand.translate(fb.x + s * 0.002, fb.y - 0.045, fb.z);
    add(hand, 'skin', [`foreArm${side}`, `hand${side}`]);
    // legs (seen when kneeling) and feet
    const [ta, tb] = seg.get(`thigh${side}`)!;
    const [ka, kb] = seg.get(`shin${side}`)!;
    add(along(new THREE.CapsuleGeometry(0.058, ta.distanceTo(tb), 6, 14), ta, tb), 'robe', ['hips', `thigh${side}`, `shin${side}`]);
    add(along(new THREE.CapsuleGeometry(0.05, ka.distanceTo(kb), 6, 14), ka, kb), 'robe', [`thigh${side}`, `shin${side}`, `foot${side}`]);
    const foot = new THREE.SphereGeometry(0.045, 14, 10);
    foot.scale(0.85, 0.55, 1.6);
    foot.translate(kb.x, kb.y - 0.005, kb.z + 0.035);
    add(foot, 'dark', [`shin${side}`, `foot${side}`]);
  }
  return P;
}

// ---- the avatar ------------------------------------------------------------------------

let geometryCache: Map<string, THREE.BufferGeometry> | null = null;

// Motion-captured clips (CC0, Mesh2Motion) retargeted to this rig by scripts/mocap/build.ts.
// They replace the hand-made idle, walk and sitting clips once loaded; the bows stay ours.
const MOCAP_FOR: Partial<Record<string, string>> = { idle: 'idle', walk: 'walkFormal', kneel: 'meditate' };
let mocap: Promise<Map<string, THREE.AnimationClip>> | null = null;
function loadMocap() {
  return (mocap ??= fetch('/animations/mocap.json')
    .then((r) => (r.ok ? r.json() : { clips: [] }))
    .then((j: { clips: THREE.AnimationClipJSON[] }) => new Map(j.clips.map((c) => {
      const clip = THREE.AnimationClip.parse(c);
      return [clip.name, clip] as [string, THREE.AnimationClip];
    })))
    .catch(() => new Map()));
}

export class Avatar {
  readonly root = new THREE.Group();
  private bones: Map<BoneName, THREE.Bone>;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current?: THREE.AnimationAction;
  private pose: Pose = 'idle';
  private bowStyle: BowStyle = 'tibetan-prostration';
  private time = 0;
  private meshes: THREE.SkinnedMesh[] = [];
  /** 0..1 walking speed, scales the gait */
  speed = 0;
  /** world-space point the head turns toward when idle (optional) */
  lookAt: THREE.Vector3 | null = null;

  constructor(look: Look = DEFAULT_LOOK) {
    this.bones = buildSkeleton();
    const hips = this.bones.get('hips')!;
    this.root.add(hips);
    // world matrices must be current before the skeleton computes its bind inverses
    const seg = segments(this.bones);
    const skeleton = new THREE.Skeleton(BONES.map((b) => this.bones.get(b)!));
    const mats = {
      skin: new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.65 }),
      robe: new THREE.MeshStandardMaterial({ color: look.robe, roughness: 0.92, side: THREE.DoubleSide }),
      shirt: new THREE.MeshStandardMaterial({ color: look.shirt, roughness: 0.85 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x241a16, roughness: 0.45 }),
    };
    // every avatar shares one body geometry per material; only materials differ
    geometryCache ??= new Map((Object.keys(mats) as (keyof typeof mats)[]).map((key) => {
      const geos = bodyPieces(seg).filter((p) => p.mat === key).map((p) => skin(p, seg));
      return [key, mergeGeometries(geos)!];
    }));
    for (const key of Object.keys(mats) as (keyof typeof mats)[]) {
      const geo = geometryCache.get(key)!;
      const mesh = new THREE.SkinnedMesh(geo, mats[key]);
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      mesh.bind(skeleton, new THREE.Matrix4());
      this.root.add(mesh);
      this.meshes.push(mesh);
    }
    this.mixer = new THREE.AnimationMixer(this.root);
    for (const [name, clip] of clips()) {
      const a = this.mixer.clipAction(clip);
      if (!CLIPS[name].loop) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.actions.set(name, a);
    }
    this.play('idle', 0);
    loadMocap().then((found) => this.useMocap(found));
  }

  /** swap in motion-captured clips for the poses that have them */
  private useMocap(found: Map<string, THREE.AnimationClip>) {
    for (const [pose, name] of Object.entries(MOCAP_FOR)) {
      const clip = found.get(name!);
      if (!clip) continue;
      const old = this.actions.get(pose)!;
      const next = this.mixer.clipAction(clip);
      this.actions.set(pose, next);
      // if the old clip is playing, hand over to the captured one smoothly
      if (this.current === old) {
        next.reset().play();
        next.crossFadeFrom(old, 0.4, false);
        this.current = next;
      }
    }
  }

  get currentPose() { return this.pose; }

  setBowStyle(style: BowStyle) {
    if (style === this.bowStyle) return;
    this.bowStyle = style;
    if (this.pose === 'bow') this.play(style, 0.4);
  }

  /** world position between the eyes, for the first-person view */
  eyes(out = new THREE.Vector3()) {
    return this.bones.get('head')!.localToWorld(out.set(0, 0.13, 0.1));
  }

  setPose(pose: Pose) {
    if (pose === this.pose) return;
    this.pose = pose;
    const clip = pose === 'bow' ? this.bowStyle : pose;
    // sitting down and getting up deserve a slower blend than stepping off
    const slow = pose === 'kneel' || pose === 'beads' || pose === 'bow';
    this.play(clip, slow ? 0.6 : 0.25);
  }

  private play(name: string, fade: number) {
    const next = this.actions.get(name);
    if (!next || next === this.current) return;
    next.reset();
    next.setEffectiveWeight(1);
    next.play();
    if (this.current && fade > 0) next.crossFadeFrom(this.current, fade, false);
    else this.current?.stop();
    this.current = next;
  }

  update(dt: number) {
    this.time += dt;
    const walk = this.actions.get('walk')!;
    walk.timeScale = 1.8 * Math.max(0.5, this.speed);
    this.mixer.update(dt);
    // procedural layer on top of the clip: breathing, and an idle glance toward a point
    const chest = this.bones.get('chest')!;
    chest.scale.setScalar(1 + Math.sin(this.time * 1.6) * 0.008);
    if (this.lookAt && this.pose === 'idle') {
      const head = this.bones.get('head')!;
      const local = this.root.worldToLocal(this.lookAt.clone());
      const yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(local.x, local.z)));
      head.rotation.y += yaw * 0.6;
    }
  }

  /** world position just above the head, for name tags */
  headTop(out: THREE.Vector3) {
    return this.bones.get('head')!.getWorldPosition(out).add(new THREE.Vector3(0, 0.42, 0));
  }

  dispose() {
    this.mixer.stopAllAction();
    for (const m of this.meshes) {
      (m.material as THREE.Material).dispose();
    }
  }
}
