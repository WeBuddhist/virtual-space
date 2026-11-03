// Retarget CC0 Mesh2Motion clips onto the avatar's own 19-bone skeleton and write
// public/animations/mocap.json (three.js AnimationClip JSON).
//   node --experimental-strip-types scripts/mocap/build.ts <folder with the downloaded .glb files>
//
// Source: https://github.com/Mesh2Motion/mesh2motion-app (static/assets/human), CC0 1.0.
// Method: for every bone we take the source bone's world-space rotation change from its
// rest pose, align it to our bone's own rest direction, and convert back to our local
// space. Twist is kept (head turns, wrist roll); the hips' bounce is scaled to our legs.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { RIG, TIP, type BoneName } from '../../src/avatar.ts';
import { decodeGlb } from './decode.ts';
import { readGlb, type Glb } from './glb.ts';

const SRC_OF: Record<BoneName, string> = {
  hips: 'pelvis', spine: 'spine_01', chest: 'spine_03', neck: 'neck_01', head: 'head',
  shoulderL: 'clavicle_l', upperArmL: 'upperarm_l', foreArmL: 'lowerarm_l', handL: 'hand_l',
  shoulderR: 'clavicle_r', upperArmR: 'upperarm_r', foreArmR: 'lowerarm_r', handR: 'hand_r',
  thighL: 'thigh_l', shinL: 'calf_l', footL: 'foot_l', thighR: 'thigh_r', shinR: 'calf_r', footR: 'foot_r',
};
/** the point each source bone aims at, for its rest direction */
const SRC_AIM: Partial<Record<BoneName, string>> = {
  hips: 'spine_01', spine: 'spine_02', chest: 'neck_01', neck: 'head', head: 'head_leaf',
  shoulderL: 'upperarm_l', upperArmL: 'lowerarm_l', foreArmL: 'hand_l', handL: 'middle_01_l',
  shoulderR: 'upperarm_r', upperArmR: 'lowerarm_r', foreArmR: 'hand_r', handR: 'middle_01_r',
  thighL: 'calf_l', shinL: 'foot_l', footL: 'ball_l', thighR: 'calf_r', shinR: 'foot_r', footR: 'ball_r',
};

/** which downloaded clip becomes which avatar clip */
const CLIPS: Record<string, string> = {
  idle: 'idle-a', idleSubtle: 'idle-subtle', walk: 'walk', walkFormal: 'walk-formal',
  meditate: 'meditate', sitGround: 'sit-ground-idle', nod: 'head-nod', greet: 'greeting',
};

const OUR_HIPS_Y = 0.46;
const FPS = 30;

// ---- our skeleton in bind pose (rest rotations are identity) ----
const ourWorldPos = new Map<BoneName, THREE.Vector3>();
for (const [name, parent, off] of RIG) {
  ourWorldPos.set(name, (parent ? ourWorldPos.get(parent)!.clone() : new THREE.Vector3()).add(new THREE.Vector3(...off)));
}
/** the direction a bone points in bind pose: toward its child, or its tip for leaf bones */
const ourDir = (b: BoneName) => {
  if (b === 'chest') return ourWorldPos.get('neck')!.clone().sub(ourWorldPos.get('chest')!).normalize();
  if (TIP[b]) return new THREE.Vector3(...TIP[b]!).normalize();
  const child = RIG.find(([, p]) => p === b);
  return child ? new THREE.Vector3(...child[2]).normalize() : new THREE.Vector3(0, 1, 0);
};

// ---- source skeleton evaluation ----
interface SrcPose { rot: THREE.Quaternion[]; pos: THREE.Vector3[] }
function restLocals(g: Glb) {
  return g.nodes.map((n) => ({
    t: new THREE.Vector3(...(n.translation ?? [0, 0, 0])),
    r: new THREE.Quaternion(...(n.rotation ?? [0, 0, 0, 1])),
  }));
}
function parents(g: Glb) {
  const p = new Array<number>(g.nodes.length).fill(-1);
  g.nodes.forEach((n, i) => n.children?.forEach((c) => { p[c] = i; }));
  return p;
}
function worldPose(g: Glb, locals: { t: THREE.Vector3; r: THREE.Quaternion }[], par: number[]): SrcPose {
  const rot: THREE.Quaternion[] = [], pos: THREE.Vector3[] = [];
  const done = new Array(g.nodes.length).fill(false);
  const solve = (i: number) => {
    if (done[i]) return;
    const p = par[i];
    if (p < 0) { rot[i] = locals[i].r.clone(); pos[i] = locals[i].t.clone(); }
    else {
      solve(p);
      rot[i] = rot[p].clone().multiply(locals[i].r);
      pos[i] = locals[i].t.clone().applyQuaternion(rot[p]).add(pos[p]);
    }
    done[i] = true;
  };
  g.nodes.forEach((_, i) => solve(i));
  return { rot, pos };
}

function sample(times: Float32Array, values: Float32Array, size: number, t: number, quat: boolean): number[] {
  if (t <= times[0]) return [...values.slice(0, size)];
  const last = times.length - 1;
  if (t >= times[last]) return [...values.slice(last * size, last * size + size)];
  let i = 0;
  while (times[i + 1] < t) i++;
  const k = (t - times[i]) / (times[i + 1] - times[i]);
  const a = values.slice(i * size, i * size + size), b = values.slice((i + 1) * size, (i + 1) * size + size);
  if (quat) {
    const q = new THREE.Quaternion(...(a as unknown as [number, number, number, number])).slerp(new THREE.Quaternion(...(b as unknown as [number, number, number, number])), k);
    return [q.x, q.y, q.z, q.w];
  }
  return [...a].map((v, j) => v + (b[j] - v) * k);
}

function retarget(skeleton: Glb, clipFile: Glb, name: string) {
  const index = (n: string) => clipFile.nodes.findIndex((x) => x.name === n);
  const par = parents(clipFile);
  const rest = restLocals(skeleton.nodes.length === clipFile.nodes.length ? skeleton : clipFile);
  const restWorld = worldPose(clipFile, rest, par);
  const anim = clipFile.animations[0];
  const end = Math.max(...anim.channels.map((c) => c.times[c.times.length - 1]));
  const frames = Math.max(2, Math.round(end * FPS) + 1);
  const bones = RIG.map(([n]) => n);

  // rest alignment per bone: C rotates our rest direction onto the source rest direction
  const align = new Map<BoneName, THREE.Quaternion>();
  for (const b of bones) {
    const si = index(SRC_OF[b]), ai = index(SRC_AIM[b]!);
    const srcDir = restWorld.pos[ai].clone().sub(restWorld.pos[si]).normalize();
    align.set(b, new THREE.Quaternion().setFromUnitVectors(ourDir(b), srcDir));
  }
  const pelvis = index('pelvis');
  const restHipsY = restWorld.pos[pelvis].y;
  const scale = OUR_HIPS_Y / restHipsY;

  const times: number[] = [];
  const quats: Record<string, number[]> = Object.fromEntries(bones.map((b) => [b, []]));
  const hips: number[] = [];
  const hipSamples: THREE.Vector3[] = [];
  for (let f = 0; f < frames; f++) {
    const t = Math.min(end, f / FPS);
    times.push(t);
    const locals = rest.map((l) => ({ t: l.t.clone(), r: l.r.clone() }));
    for (const ch of anim.channels) {
      if (ch.path === 'rotation') locals[ch.node].r.fromArray(sample(ch.times, ch.values, 4, t, true));
      else if (ch.path === 'translation' && clipFile.nodes[ch.node].name === 'pelvis') locals[ch.node].t.fromArray(sample(ch.times, ch.values, 3, t, false));
    }
    const world = worldPose(clipFile, locals, par);
    const ourWorld = new Map<BoneName, THREE.Quaternion>();
    for (const b of bones) {
      const si = index(SRC_OF[b]);
      const delta = world.rot[si].clone().multiply(restWorld.rot[si].clone().invert());
      ourWorld.set(b, delta.multiply(align.get(b)!));
    }
    for (const [b, parent] of RIG) {
      const local = parent ? ourWorld.get(parent)!.clone().invert().multiply(ourWorld.get(b)!) : ourWorld.get(b)!.clone();
      quats[b].push(local.x, local.y, local.z, local.w);
    }
    hipSamples.push(world.pos[pelvis].clone());
  }
  // keep the clip in place: remove the average horizontal offset, scale everything to our size
  const mean = hipSamples.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(hipSamples.length);
  for (const p of hipSamples) hips.push((p.x - mean.x) * scale, p.y * scale, (p.z - mean.z) * scale);

  const tracks: THREE.KeyframeTrack[] = bones.map((b) => new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, times, quats[b]));
  tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, hips));
  const clip = new THREE.AnimationClip(name, end, tracks);
  clip.optimize();
  return clip;
}

const dir = process.argv[2];
if (!dir) throw new Error('usage: build.ts <folder with Mesh2Motion .glb files>');
const plain = join(dir, 'plain');
mkdirSync(plain, { recursive: true });
for (const f of ['skeleton', ...Object.values(CLIPS)]) {
  if (!existsSync(join(plain, `${f}.glb`))) await decodeGlb(join(dir, `${f}.glb`), join(plain, `${f}.glb`));
}
const skeleton = readGlb(join(plain, 'skeleton.glb'));
const out = Object.entries(CLIPS).map(([name, file]) => THREE.AnimationClip.toJSON(retarget(skeleton, readGlb(join(plain, `${file}.glb`)), name)));
mkdirSync('public/animations', { recursive: true });
const json = JSON.stringify({
  source: 'Mesh2Motion human animations (https://github.com/Mesh2Motion/mesh2motion-app), CC0 1.0, retargeted by scripts/mocap/build.ts',
  clips: out,
}, (_k, v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v));
writeFileSync('public/animations/mocap.json', json);
console.log(`wrote ${out.length} clips, ${(json.length / 1024).toFixed(0)} KB`);
