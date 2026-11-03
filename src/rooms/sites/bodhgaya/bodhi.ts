import * as THREE from 'three';
import { makePrayerFlags } from '../../../kit/props';
import { photo } from '../../../kit/textures';
import { GOLD_TOP, TEMPLE } from './tower';

// The Bodhi tree west of the temple and the Vajrasana between them, after the
// reference: a broad peepal on a raised, railed platform hung with prayer flags and
// khatas; the diamond throne under a gilded canopy behind a brass rail.

export const TREE = new THREE.Vector3(-25, 0, 0);
export const VAJRASANA = new THREE.Vector3(TEMPLE.x0 - 2.2, 0, 0);

const bark = photo(new THREE.MeshStandardMaterial({ color: 0x6d6151, roughness: 0.95 }), '/textures/bodhgaya/bark.jpg', { repeat: [2, 3], mirror: true, bump: 3 });

/** a limb as a tapered cylinder between two points */
function limb(a: THREE.Vector3, b: THREE.Vector3, ra: number, rb: number) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, len, 10, 1), bark);
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true;
  return m;
}

/** heart-shaped peepal leaf with its long drip tip */
function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.12, 0.02, 0.16, 0.16, 0.06, 0.26);
  s.quadraticCurveTo(0.02, 0.3, 0, 0.42);
  s.quadraticCurveTo(-0.02, 0.3, -0.06, 0.26);
  s.bezierCurveTo(-0.16, 0.16, -0.12, 0.02, 0, 0);
  const g = new THREE.ShapeGeometry(s, 3);
  g.scale(1.6, 1.6, 1.6);
  return g;
}

export function buildBodhi(rng: () => number) {
  const group = new THREE.Group();
  const T = TREE;

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

  // trunk and limbs: a short massive trunk splitting into leaning limbs
  const tips: THREE.Vector3[] = [];
  group.add(limb(T.clone(), T.clone().add(new THREE.Vector3(0, 4.2, 0)), 1.0, 0.75));
  const fork = T.clone().add(new THREE.Vector3(0, 4, 0));
  const nLimbs = 6;
  for (let i = 0; i < nLimbs; i++) {
    const a = (i / nLimbs) * Math.PI * 2 + rng() * 0.4;
    const mid = fork.clone().add(new THREE.Vector3(Math.cos(a) * (3 + rng() * 1.5), 3.5 + rng() * 2, Math.sin(a) * (3 + rng() * 1.5)));
    group.add(limb(fork, mid, 0.55, 0.32));
    for (let k = 0; k < 3; k++) {
      const b = a + (k - 1) * 0.55 + (rng() - 0.5) * 0.3;
      const end = mid.clone().add(new THREE.Vector3(Math.cos(b) * (3 + rng() * 3), 2.5 + rng() * 3.5, Math.sin(b) * (3 + rng() * 3)));
      group.add(limb(mid, end, 0.3, 0.1));
      tips.push(end);
    }
  }
  // two iron props under the longest limbs, as at the real tree
  for (const k of [0, 3]) {
    const tip = tips[k * 3 + 1];
    const prop = limb(new THREE.Vector3(tip.x * 0.6 + T.x * 0.4, 0, tip.z * 0.6 + T.z * 0.4), new THREE.Vector3(tip.x * 0.6 + T.x * 0.4, 6.5, tip.z * 0.6 + T.z * 0.4), 0.1, 0.1);
    prop.material = new THREE.MeshStandardMaterial({ color: 0x3e3a35, metalness: 0.6, roughness: 0.6 });
    group.add(prop);
  }

  // leaves: clusters around each branch tip, swaying in the wind
  const perTip = 330;
  const leaves = new THREE.InstancedMesh(leafGeometry(), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, side: THREE.DoubleSide }), tips.length * perTip);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const sun = new THREE.Color(0x4e7a2c), shade = new THREE.Color(0x2f4d1c);
  let n = 0;
  for (const tip of tips) {
    for (let i = 0; i < perTip; i++) {
      const dir = new THREE.Vector3().randomDirection();
      dir.y = dir.y * 0.6;
      p.copy(tip).addScaledVector(dir, 0.6 + rng() * 2.8);
      e.set(rng() * Math.PI, rng() * Math.PI * 2, rng() * Math.PI);
      q.setFromEuler(e);
      s.setScalar(0.75 + rng() * 0.5);
      m.compose(p, q, s);
      leaves.setMatrixAt(n, m);
      leaves.setColorAt(n, shade.clone().lerp(sun, Math.min(1, (p.y - 6) / 12 + rng() * 0.3)));
      n++;
    }
  }
  leaves.castShadow = true;
  const uTime = { value: 0 };
  (leaves.material as THREE.Material).onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 1.3 + instanceMatrix[3].y;
      transformed.z += sin(uTime * 3.1 + ph) * 0.06 * position.y * 3.0;
      transformed.x += cos(uTime * 2.3 + ph) * 0.03 * position.y * 3.0;`);
  };
  group.add(leaves);

  // prayer flags strung from the tree to the railing, and white khatas on the rail
  const flagLines = [
    makePrayerFlags(new THREE.Vector3(T.x, 0, T.z), new THREE.Vector3(T.x + 9, 0, T.z - 9)),
    makePrayerFlags(new THREE.Vector3(T.x, 0, T.z), new THREE.Vector3(T.x + 9, 0, T.z + 9)),
    makePrayerFlags(new THREE.Vector3(T.x, 0, T.z), new THREE.Vector3(T.x - 9, 0, T.z + 6)),
  ];
  flagLines.forEach((f) => { f.children.slice(0, 1).forEach((c) => c.removeFromParent()); group.add(f); });
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
  const vRail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 3.4), brass);
  vRail.position.set(V.x, 0.95, V.z);
  group.add(vRail);

  return {
    group,
    colliders: [
      { x0: T.x - 5.2, x1: T.x + 5.2, z0: T.z - 5.2, z1: T.z + 5.2 },
      { x0: V.x - 1.25, x1: V.x + 1.25, z0: V.z - 1.75, z1: V.z + 1.75 },
    ],
    flags: flagLines,
    update(elapsed: number) { uTime.value = elapsed; },
  };
}
