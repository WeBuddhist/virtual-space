import * as THREE from 'three';
import { PEEPAL_MAX, PEEPAL_MIN, PEEPAL_OUTLINE } from './peepal-leaf';

// Leafy canopies: thousands of real leaf shapes in one InstancedMesh that sways in
// the wind (vertex shader), plus fluted, buttressed trunks and drifting fallen leaves.

export type LeafKind = 'peepal' | 'mango';

/** the photograph the Bodhi leaf outline was traced from, mapped onto it (see peepal-leaf.ts) */
let peepalMap: THREE.Texture | undefined;
export function peepalTexture() {
  if (!peepalMap) {
    peepalMap = new THREE.TextureLoader().load('/textures/bodhgaya/bodhi-leaf.jpg');
    peepalMap.colorSpace = THREE.SRGBColorSpace;
    peepalMap.anisotropy = 4;
  }
  return peepalMap;
}

/**
 * A leaf blade lying in its local XY plane, stem at the origin, 0.42 × size long.
 * `points` thins the traced Bodhi outline for leaves seen only from afar (canopies).
 */
export function leafGeometry(kind: LeafKind, size = 1, points = Infinity) {
  const s = new THREE.Shape();
  if (kind === 'peepal') {
    // the real outline of a Ficus religiosa leaf: cordate base, wavy shoulders, long drip tip
    const all: [number, number][] = [];
    for (let i = 0; i < PEEPAL_OUTLINE.length; i += 2) all.push([PEEPAL_OUTLINE[i], PEEPAL_OUTLINE[i + 1]]);
    const tip = all.reduce((t, p, i) => (p[1] > all[t][1] ? i : t), 0);
    const step = Math.max(1, Math.round(all.length / Math.min(points, all.length)));
    const kept = all.filter((_, i) => i === 0 || i === tip || i % step === 0);
    kept.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    const g = new THREE.ShapeGeometry(s);
    // uv over the outline's bounding box, where the photo was warped to
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) - PEEPAL_MIN[0]) / (PEEPAL_MAX[0] - PEEPAL_MIN[0]), (pos.getY(i) - PEEPAL_MIN[1]) / (PEEPAL_MAX[1] - PEEPAL_MIN[1]));
    }
    g.scale(size, size, size);
    return g;
  } else {
    // long, narrow, pointed mango leaf
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.07, 0.15, 0.03, 0.42);
    s.lineTo(0, 0.48);
    s.lineTo(-0.03, 0.42);
    s.quadraticCurveTo(-0.07, 0.15, 0, 0);
  }
  const g = new THREE.ShapeGeometry(s, 3);
  g.scale(size, size, size);
  return g;
}

/** a cluster of leaves to scatter around a point */
export interface Cluster { center: THREE.Vector3; radius: number; count: number }

/**
 * One instanced canopy for many clusters. Leaves face outward-ish, get a sun/shade
 * colour from their height, and sway in the wind via `uTime`.
 */
export function canopy(clusters: Cluster[], kind: LeafKind, rng: () => number, opts: { size?: number; sun?: number; shade?: number; flatten?: number } = {}) {
  const total = clusters.reduce((n, c) => n + c.count, 0);
  // Bodhi leaves carry the photographed leaf (veins and all); sun/shade then tint it
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide, map: kind === 'peepal' ? peepalTexture() : null });
  const mesh = new THREE.InstancedMesh(leafGeometry(kind, opts.size ?? 1.5, 14), mat, total);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const sun = new THREE.Color(opts.sun ?? 0x5a8a32), shade = new THREE.Color(opts.shade ?? 0x2c4a1c);
  let minY = Infinity, maxY = -Infinity;
  for (const c of clusters) { minY = Math.min(minY, c.center.y - c.radius); maxY = Math.max(maxY, c.center.y + c.radius); }
  let n = 0;
  for (const c of clusters) {
    for (let i = 0; i < c.count; i++) {
      const dir = new THREE.Vector3().randomDirection();
      dir.y *= opts.flatten ?? 0.65;
      // denser toward the outside of the cluster, like real foliage
      p.copy(c.center).addScaledVector(dir, c.radius * Math.sqrt(0.25 + rng() * 0.75));
      e.set(rng() * Math.PI, Math.atan2(dir.x, dir.z) + (rng() - 0.5) * 1.2, rng() * Math.PI);
      q.setFromEuler(e);
      sc.setScalar(0.7 + rng() * 0.55);
      m.compose(p, q, sc);
      mesh.setMatrixAt(n, m);
      const k = Math.min(1, Math.max(0, (p.y - minY) / (maxY - minY + 0.01) * 0.8 + rng() * 0.35));
      mesh.setColorAt(n, shade.clone().lerp(sun, k));
      n++;
    }
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const uTime = { value: 0 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 1.3 + instanceMatrix[3].y;
      float gust = 0.6 + 0.4 * sin(uTime * 0.7 + instanceMatrix[3].x * 0.05);
      transformed.z += sin(uTime * 3.1 + ph) * 0.18 * position.y * gust;
      transformed.x += cos(uTime * 2.3 + ph) * 0.09 * position.y * gust;`);
  };
  return { mesh, uTime };
}

/**
 * A trunk as a lathe whose radius flares into buttress roots at the base and is
 * fluted along its length, as old fig and mango trees are.
 */
export function trunk(height: number, radius: number, mat: THREE.Material, flutes = 7, buttress = 0.6) {
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const flare = 1 + buttress * Math.pow(1 - Math.min(1, t * 4), 2);
    profile.push(new THREE.Vector2(radius * flare * (1 - t * 0.35), t * height));
  }
  const geo = new THREE.LatheGeometry(profile, 40);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a = Math.atan2(v.z, v.x);
    const t = v.y / height;
    const ridge = 1 + (0.12 + buttress * 0.25 * Math.pow(1 - Math.min(1, t * 3), 2)) * Math.max(0, Math.sin(flutes * a + t * 2.2));
    pos.setXYZ(i, v.x * ridge, v.y, v.z * ridge);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/**
 * A curved, tapering bough from a to b: it rises and sags along a bend of `bend` × its
 * length (positive arches up, negative droops), as heavy old limbs do.
 */
export function bough(a: THREE.Vector3, b: THREE.Vector3, ra: number, rb: number, mat: THREE.Material, bend = 0.12, twist = 0) {
  const len = a.distanceTo(b);
  const dir = b.clone().sub(a).normalize();
  // bend sideways as well as up/down so limbs don't read as straight poles
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const ctrl = a.clone().lerp(b, 0.5)
    .add(new THREE.Vector3(0, bend * len, 0))
    .addScaledVector(side, twist * len);
  const curve = new THREE.QuadraticBezierCurve3(a, ctrl, b);
  const segs = 12, radial = 9;
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.attributes.position;
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, c);
    const r = ra + (rb - ra) * t;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

/** a limb as a tapered cylinder between two points */
export function limb(a: THREE.Vector3, b: THREE.Vector3, ra: number, rb: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, a.distanceTo(b), 9, 1), mat);
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true;
  return m;
}

/**
 * Leaves drifting down from a canopy and fading out on the ground. Bodhi leaves fall at
 * their true size (`size` 0.43: about 18 cm with the tip), some green, some yellowing.
 */
export function fallingLeaves(kind: LeafKind, area: { center: THREE.Vector3; radius: number; top: number }, count: number, rng: () => number, size = 1.2) {
  const map = kind === 'peepal' ? peepalTexture() : null;
  const mats = map
    ? [0xffffff, 0xf2e3a0, 0xe8c870].map((color) => new THREE.MeshStandardMaterial({ color, map, roughness: 0.75, side: THREE.DoubleSide }))
    : [new THREE.MeshStandardMaterial({ color: 0x8a9a3c, roughness: 0.8, side: THREE.DoubleSide })];
  const geo = leafGeometry(kind, size);
  const leaves = Array.from({ length: count }, (_, i) => {
    const m = new THREE.Mesh(geo, mats[i % mats.length]);
    m.userData = { t: rng(), sx: rng() * 10, x: (rng() - 0.5) * 2 * area.radius, z: (rng() - 0.5) * 2 * area.radius, life: 7 + rng() * 6 };
    return m;
  });
  const group = new THREE.Group();
  group.add(...leaves);
  return {
    group,
    update(dt: number, elapsed: number) {
      for (const l of leaves) {
        const u = l.userData;
        u.t += dt / u.life;
        if (u.t > 1) {
          u.t = 0;
          u.x = (rng() - 0.5) * 2 * area.radius;
          u.z = (rng() - 0.5) * 2 * area.radius;
        }
        const y = area.top * (1 - u.t);
        l.position.set(area.center.x + u.x + Math.sin(elapsed * 1.3 + u.sx) * 0.6, Math.max(0.02, y), area.center.z + u.z + Math.cos(elapsed * 1.1 + u.sx) * 0.4);
        l.rotation.set(Math.sin(elapsed * 2 + u.sx) * 1.2, elapsed * 0.8 + u.sx, Math.cos(elapsed * 1.7 + u.sx) * 0.9);
      }
    },
  };
}
