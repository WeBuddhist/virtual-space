import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// A temple is built from hundreds of small meshes, and every one is a draw call in the main
// pass and again in each shadow pass. Once the site is built, the meshes that never move
// are baked into world space and merged, one mesh per material per patch of ground, so the
// CPU issues a few hundred draws instead of thousands.
//
// What counts as static is found by watching, not guessed: the site's update() is stepped
// through day and night, and any mesh whose transform, visibility or material changed (or
// sits under something that did) is left alone. Things that change only later, or only on
// a timer, opt out with `userData.noMerge` on themselves or an ancestor: statue stand-ins
// that give way to a splat, wandering deer.
//
// The originals stay where they are, moved to MERGED_LAYER: not drawn, but still found by
// the raycasters that use them (floors to walk on, buildings that hide name tags), which
// enable that layer.

/** the layer merged-away originals move to: the camera skips it, raycasters include it */
export const MERGED_LAYER = 30;

/**
 * Side of the square patches merged meshes are grouped by, so they still frustum-cull.
 * Pieces wider than half a patch are already one draw each and stay as they are: merged
 * with small ones they would drag the small ones' triangles into every view.
 */
const CELL = 16;

export interface MergeOptions {
  /** steps the scene through its animations (day, night, time passing) */
  animate(): void;
  /** extra subtrees to leave alone */
  skip?(o: THREE.Object3D): boolean;
}

const defaultBeforeRender = THREE.Object3D.prototype.onBeforeRender;
const defaultAfterRender = THREE.Object3D.prototype.onAfterRender;

function mergeable(m: THREE.Mesh) {
  if (m.constructor !== THREE.Mesh) return false; // instanced, skinned, splats, reflectors…
  const mat = m.material;
  if (Array.isArray(mat) || !mat || mat.transparent) return false; // transparent sorts per object
  const g = m.geometry;
  if (!g?.attributes.position || Object.keys(g.morphAttributes).length) return false;
  if (Object.values(g.attributes).some((a) => (a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute)) return false;
  if (!m.frustumCulled || m.renderOrder !== 0 || m.layers.mask !== 1) return false;
  if (m.customDepthMaterial || m.customDistanceMaterial) return false;
  return m.onBeforeRender === defaultBeforeRender && m.onAfterRender === defaultAfterRender;
}

function signature(g: THREE.BufferGeometry) {
  const attrs = Object.entries(g.attributes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([n, a]) => `${n}${a.itemSize}${a.normalized ? 'n' : ''}${(a.array as ArrayLike<number>).constructor.name}`);
  return `${g.index ? 'i' : 'n'}:${attrs.join(',')}`;
}

/** a mirrored transform turns triangles inside out: swap two corners of each */
function flipWinding(g: THREE.BufferGeometry) {
  if (g.index) {
    const a = g.index.array;
    for (let i = 0; i + 2 < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
    return;
  }
  for (const attr of Object.values(g.attributes)) {
    const a = attr.array, s = attr.itemSize;
    for (let v = 0; v + 2 < attr.count; v += 3) {
      for (let k = 0; k < s; k++) {
        const i1 = (v + 1) * s + k, i2 = (v + 2) * s + k;
        const t = a[i1]; a[i1] = a[i2]; a[i2] = t;
      }
    }
  }
}

/**
 * Merge the static meshes under `roots` into `into` (the scene). Returns the number of
 * meshes before and after, for the load log.
 */
export function mergeStatic(roots: THREE.Object3D[], into: THREE.Object3D, opts: MergeOptions) {
  for (const r of roots) r.updateMatrixWorld(true);

  // candidates, pruning whole subtrees that opt out or are hidden (they may be shown later)
  const candidates: THREE.Mesh[] = [];
  const all: THREE.Object3D[] = [];
  const walk = (o: THREE.Object3D) => {
    all.push(o);
    if (o.userData.noMerge || opts.skip?.(o) || !o.visible) return;
    if ((o as THREE.Mesh).isMesh && mergeable(o as THREE.Mesh)) candidates.push(o as THREE.Mesh);
    for (const c of o.children) walk(c);
  };
  for (const r of roots) walk(r);

  // watch: record, step the animations, compare, then put everything back as it was
  const local = all.map((o) => ({ o, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), v: o.visible }));
  const before = candidates.map((m) => ({ w: m.matrixWorld.clone(), mat: m.material, geo: m.geometry }));
  opts.animate();
  for (const r of roots) r.updateMatrixWorld(true);
  const shown = (o: THREE.Object3D | null): boolean => !o || (o.visible && shown(o.parent));
  const moved = new Set<THREE.Object3D>();
  candidates.forEach((m, i) => {
    const b = before[i];
    const same = m.matrixWorld.elements.every((e, k) => Math.abs(e - b.w.elements[k]) < 1e-6);
    if (!same || m.material !== b.mat || m.geometry !== b.geo || !shown(m)) moved.add(m);
  });
  for (const l of local) { l.o.position.copy(l.p); l.o.quaternion.copy(l.q); l.o.scale.copy(l.s); l.o.visible = l.v; }
  for (const r of roots) r.updateMatrixWorld(true);

  // group what stayed put by material, shadow flags, vertex layout, handedness and patch
  const groups = new Map<string, THREE.Mesh[]>();
  const centre = new THREE.Vector3();
  for (const m of candidates) {
    if (moved.has(m)) continue;
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    if (g.boundingSphere!.radius * m.matrixWorld.getMaxScaleOnAxis() > CELL / 2) continue;
    centre.copy(g.boundingSphere!.center).applyMatrix4(m.matrixWorld);
    const cell = `${Math.floor(centre.x / CELL)},${Math.floor(centre.z / CELL)}`;
    const mirrored = m.matrixWorld.determinant() < 0;
    const key = `${(m.material as THREE.Material).uuid}|${+m.castShadow}${+m.receiveShadow}|${signature(g)}|${+mirrored}|${cell}`;
    let list = groups.get(key);
    if (!list) groups.set(key, (list = []));
    list.push(m);
  }

  let merged = 0, replaced = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const parts = list.map((m) => {
      const g = m.geometry.clone();
      g.clearGroups();
      g.applyMatrix4(m.matrixWorld);
      if (m.matrixWorld.determinant() < 0) flipWinding(g);
      return g;
    });
    const geo = mergeGeometries(parts, false);
    for (const p of parts) p.dispose();
    if (!geo) continue;
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const first = list[0];
    const mesh = new THREE.Mesh(geo, first.material);
    mesh.name = `merged ${(first.material as THREE.Material).name || (first.material as THREE.Material).type} ×${list.length}`;
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    mesh.matrixAutoUpdate = false;
    mesh.userData.noMerge = true;
    // the originals answer raycasts; this copy is only for drawing
    mesh.raycast = () => {};
    into.add(mesh);
    for (const m of list) m.layers.set(MERGED_LAYER);
    merged++;
    replaced += list.length;
  }
  return { candidates: candidates.length, animated: moved.size, replaced, merged };
}
