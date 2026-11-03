import * as THREE from 'three';
import { bough, canopy, fallingLeaves, limb, trunk } from '../../../kit/foliage';
import { photo } from '../../../kit/textures';
import { GOLD_TOP, TEMPLE } from './tower';

// The Bodhi tree west of the temple and the Vajrasana between them, after the
// reference: a broad peepal on a raised, railed platform hung with prayer flags and
// khatas; the diamond throne under a gilded canopy behind a brass rail.

export const TREE = new THREE.Vector3(-25, 0, 0);
export const VAJRASANA = new THREE.Vector3(TEMPLE.x0 - 2.2, 0, 0);

const bark = photo(new THREE.MeshStandardMaterial({ color: 0x6d6151, roughness: 0.95 }), '/textures/bodhgaya/bark.jpg', { repeat: [2, 3], mirror: true, bump: 3 });

export function buildBodhi(rng: () => number) {
  const group = new THREE.Group();
  const T = TREE;
  /** tag what was added since `from` as part of the enclosure the Kimi build can replace */
  const mark = (from: number) => group.children.slice(from).forEach((o) => { o.userData.kimi ??= 'vajrasana'; });

  // raised platform with a stone railing and an inner brass rail
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.5, 40), photo(new THREE.MeshStandardMaterial({ color: 0xbfae92, roughness: 0.9 }), '/textures/bodhgaya/flagstones.jpg', { repeat: [3, 3], mirror: true }));
  platform.position.set(T.x, 0.25, T.z);
  platform.receiveShadow = true;
  group.add(platform);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.9, roughness: 0.35 });
  const rail = new THREE.Mesh(new THREE.TorusGeometry(5.0, 0.03, 6, 80), brass);
  rail.rotation.x = Math.PI / 2;
  rail.position.set(T.x, 1.45, T.z);
  group.add(rail);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), brass);
    post.position.set(T.x + Math.cos(a) * 5, 0.95, T.z + Math.sin(a) * 5);
    group.add(post);
  }

  mark(0);

  // the trunk: massive, buttressed and fluted, forking low into six or seven huge limbs
  // that spread out at low angles, so the crown is some 28 m across and reaches over the
  // temple's west wall, as in the photographs
  const base = trunk(3.4, 1.15, bark, 9, 1.0);
  base.position.copy(T);
  group.add(base);
  const fork = T.clone().add(new THREE.Vector3(0, 3.0, 0));
  const tips: THREE.Vector3[] = [];
  const mids: THREE.Vector3[] = [];
  const ends: THREE.Vector3[] = [];
  const nLimbs = 7;
  for (let i = 0; i < nLimbs; i++) {
    const a = (i / nLimbs) * Math.PI * 2 + rng() * 0.35;
    const out = 5 + rng() * 2.2;
    const mid = fork.clone().add(new THREE.Vector3(Math.cos(a) * out, 2.6 + rng() * 2.2, Math.sin(a) * out));
    // the great limbs arch up out of the fork and twist a little
    group.add(bough(fork, mid, 0.72, 0.42, bark, 0.16, (rng() - 0.5) * 0.3));
    mids.push(mid);
    for (let k = 0; k < 3; k++) {
      const b = a + (k - 1) * 0.5 + (rng() - 0.5) * 0.3;
      const reach = 3.8 + rng() * 3;
      const end2 = mid.clone().add(new THREE.Vector3(Math.cos(b) * reach, 1.8 + rng() * 2.6, Math.sin(b) * reach));
      // the long outer boughs droop under their weight
      group.add(bough(mid, end2, 0.38, 0.16, bark, -0.08 + rng() * 0.1, (rng() - 0.5) * 0.35));
      ends.push(end2);
      for (let m = 0; m < 2; m++) {
        const c = b + (m - 0.5) * 0.8;
        const twig = end2.clone().add(new THREE.Vector3(Math.cos(c) * (1.2 + rng() * 1.2), 0.8 + rng() * 1.6, Math.sin(c) * (1.2 + rng() * 1.2)));
        group.add(bough(end2, twig, 0.15, 0.05, bark, 0.12, (rng() - 0.5) * 0.4));
        tips.push(twig);
      }
    }
  }
  // two iron props under the longest limbs, as at the real tree
  for (const k of [0, 18]) {
    const tip = tips[k];
    const foot = new THREE.Vector3(tip.x * 0.55 + T.x * 0.45, 0, tip.z * 0.55 + T.z * 0.45);
    const prop = limb(foot, foot.clone().setY(6.2), 0.1, 0.1, new THREE.MeshStandardMaterial({ color: 0x3e3a35, metalness: 0.6, roughness: 0.6 }));
    group.add(prop);
  }

  // a dense canopy of heart-shaped leaves with drip tips, trembling in the wind
  const leafCanopy = canopy([
    ...tips.map((t) => ({ center: t, radius: 2.3 + rng() * 0.9, count: 420 })),
    // clusters along the boughs and over the inner limbs close the crown, as at the real tree
    ...ends.map((e) => ({ center: e.clone().add(new THREE.Vector3(0, 0.8, 0)), radius: 2.6, count: 480 })),
    ...mids.map((m) => ({ center: m.clone().add(new THREE.Vector3(0, 1.5, 0)), radius: 3, count: 1000 })),
    // leaves at 1.5x life size (0.27 m): life size would need ~14x as many leaves
  ], 'peepal', rng, { size: 0.65, sun: 0xffffff, shade: 0x7d8c72, flatten: 0.55 });
  const leaves = leafCanopy.mesh;
  const uTime = leafCanopy.uTime;
  // leaves drifting down; pilgrims wait under the tree to catch one
  const falling = fallingLeaves('peepal', { center: T, radius: 11, top: 14 }, 24, rng, 0.43);
  group.add(falling.group);
  group.add(leaves);

  // white khatas tied on the rail (no prayer-flag lines: there are none at the real tree)
  const khatas = group.children.length;
  const khata = new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: 0.8, side: THREE.DoubleSide });
  const saffron = new THREE.MeshStandardMaterial({ color: 0xe8901c, roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2;
    const k = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.6), i % 4 ? khata : saffron);
    k.position.set(T.x + Math.cos(a) * 5.02, 1.15, T.z + Math.sin(a) * 5.02);
    k.lookAt(T.x, 1.15, T.z);
    group.add(k);
  }

  // the Vajrasana: a stone slab on a plinth under a gilded canopy, behind a brass rail
  const V = VAJRASANA;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 2.9), new THREE.MeshStandardMaterial({ color: 0x9c6650, roughness: 0.8 }));
  plinth.position.set(V.x, 0.25, V.z);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 2.39), new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.8, roughness: 0.35 }));
  slab.position.set(V.x, 0.575, V.z);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.02, 1.2), new THREE.MeshStandardMaterial({ color: 0xe46f12, roughness: 0.85 }));
  cloth.position.set(V.x, 0.66, V.z);
  group.add(plinth, slab, cloth);
  for (const [dx, dz] of [[-0.85, -1.35], [0.85, -1.35], [-0.85, 1.35], [0.85, 1.35]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.4, 10), GOLD_TOP);
    post.position.set(V.x + dx, 1.2, V.z + dz);
    group.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.85, 1.1, 4), GOLD_TOP);
  roof.position.set(V.x, 2.95, V.z);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(0.75, 1, 1.15);
  const eave = new THREE.Mesh(new THREE.BoxGeometry(2, 0.18, 3), GOLD_TOP);
  eave.position.set(V.x, 2.45, V.z);
  group.add(roof, eave);
  // an open brass rail round the throne, so offerings on it stay in view
  for (const [w, d, dx, dz] of [[2.4, 0.05, 0, -1.7], [2.4, 0.05, 0, 1.7], [0.05, 3.4, -1.2, 0], [0.05, 3.4, 1.2, 0]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), brass);
    bar.position.set(V.x + dx, 0.95, V.z + dz);
    group.add(bar);
  }

  // the khatas on the rail and the whole Vajrasana
  mark(khatas);

  return {
    group,
    colliders: [
      { x0: T.x - 5.2, x1: T.x + 5.2, z0: T.z - 5.2, z1: T.z + 5.2 },
      { x0: V.x - 1.25, x1: V.x + 1.25, z0: V.z - 1.75, z1: V.z + 1.75 },
    ],
    update(elapsed: number, dt = 1 / 60) { uTime.value = elapsed; falling.update(dt, elapsed); },
  };
}
