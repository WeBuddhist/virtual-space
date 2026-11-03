import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { photo } from '../../../../kit/textures';
import { RAIL } from '../grounds';
import { TEMPLE } from '../tower';
import { mat } from './kit';

// The Kimi-written Bodh Gaya (scripts/temple/kimi.ts), shown with ?site=kimi: each
// element's module builds it in its own frame (front +z, origin at the base centre);
// here it is placed into the site, merged per material, textured, and the hand-made
// pieces it replaces (tagged userData.kimi) are hidden. Colliders, seats, offerings and
// the sanctum stay the hand-made site's.

type Module = { build: (...a: unknown[]) => THREE.Object3D; TYPES?: number };
const modules = import.meta.glob<Module>(['./*.ts', '!./kit.ts', '!./index.ts']);

export const kimiRequested = () => new URLSearchParams(location.search).get('site') === 'kimi';

const TEX = '/textures/bodhgaya/';
let textured = false;
/** the stone materials get the same photo textures as the hand-made site */
function texture() {
  if (textured) return;
  textured = true;
  photo(mat('sandstone'), TEX + 'stucco.jpg', { repeat: [0.5, 0.5], mirror: true, bump: 1.5 });
  photo(mat('stucco'), TEX + 'stucco.jpg', { repeat: [0.4, 0.4], mirror: true, bump: 1.2 });
  photo(mat('granite'), TEX + 'railing.jpg', { repeat: [0.6, 0.6], mirror: true, bump: 2 });
  photo(mat('marble'), TEX + 'marble.jpg', { repeat: [0.5, 0.5], mirror: true });
}

/**
 * Bake transforms and merge every plain mesh per material, to keep draw calls low.
 * Instanced meshes stay instanced, unless `expand` bakes each instance in too.
 */
function merged(root: THREE.Object3D, expand = false) {
  root.updateMatrixWorld(true);
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const keep: THREE.Object3D[] = [];
  const bake = (geo: THREE.BufferGeometry, world: THREE.Matrix4, material: THREE.Material) => {
    let g = geo.clone().applyMatrix4(world);
    g = g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const list = byMat.get(material) ?? [];
    list.push(g);
    byMat.set(material, list);
  };
  const inst = new THREE.Matrix4();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh) {
      if (!expand) return void keep.push(o);
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, inst);
        bake(m.geometry, inst.premultiply(m.matrixWorld), m.material);
      }
      return;
    }
    bake(m.geometry, m.matrixWorld, m.material);
  });
  const out = new THREE.Group();
  for (const [material, geos] of byMat) {
    const g = mergeGeometries(geos);
    if (!g) continue;
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = mesh.receiveShadow = true;
    out.add(mesh);
  }
  // instanced pieces keep their own matrices; re-parent them with their world transform
  for (const o of keep) {
    const world = o.matrixWorld.clone();
    o.removeFromParent();
    world.decompose(o.position, o.quaternion, o.scale);
    o.castShadow = o.receiveShadow = true;
    out.add(o);
  }
  return out;
}

/** place a built element: its local +z turned to face `yaw` (site), its base at `at` */
function place(obj: THREE.Object3D, at: THREE.Vector3, yaw: number) {
  const holder = new THREE.Group();
  holder.add(obj);
  const m = merged(holder);
  m.position.copy(at);
  m.rotation.y = yaw;
  return m;
}

const EAST = Math.PI / 2;

/** build each available element into `parents` (by part) and hide what it replaces */
export async function loadKimi(parents: Record<string, THREE.Object3D>, stupaSpots: [number, number, number][]) {
  texture();
  const hide = (part: string) => Object.values(parents).forEach((p) => p.traverse((o) => { if (o.userData.kimi === part) o.visible = false; }));
  const loaded: string[] = [];
  for (const [path, load] of Object.entries(modules)) {
    const id = path.slice(2, -3);
    let mod: Module;
    try { mod = await load(); } catch (e) { console.warn(`kimi ${id}:`, e); continue; }
    try {
      if (id === 'tower') parents.tower.add(place(mod.build(), new THREE.Vector3((TEMPLE.x0 + TEMPLE.x1) / 2, 0, 0), EAST));
      else if (id === 'portico') parents.tower.add(place(mod.build(), new THREE.Vector3(TEMPLE.x1, 0, 0), EAST));
      else if (id === 'torana') parents.grounds.add(place(mod.build(), new THREE.Vector3(16, 0, 0), EAST));
      else if (id === 'animesh') parents.grounds.add(place(mod.build(), new THREE.Vector3(26, 0, -10), 0));
      else if (id === 'jewelwalk') parents.grounds.add(place(mod.build(), new THREE.Vector3(TEMPLE.x0 + 8, 0, -10.5), 0));
      else if (id === 'railing') {
        // the same runs as the hand-made railing: round the temple and tree, open at the east gate
        const runs: [number, number, number, number][] = [
          [RAIL.x0, RAIL.z0, RAIL.x1, RAIL.z0], [RAIL.x0, RAIL.z1, RAIL.x1, RAIL.z1], [RAIL.x0, RAIL.z0, RAIL.x0, RAIL.z1],
          [RAIL.x1, RAIL.z0, RAIL.x1, -RAIL.gate], [RAIL.x1, RAIL.gate, RAIL.x1, RAIL.z1],
        ];
        for (const [x0, z0, x1, z1] of runs) {
          const len = Math.hypot(x1 - x0, z1 - z0);
          // local +x runs along the side: turn by atan2(-dz, dx)
          const run = place(mod.build({ length: len }), new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2), 0);
          run.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
          parents.grounds.add(run);
        }
      } else if (id === 'stupas') {
        // one instanced mesh per type and material; each spot takes the type nearest its size
        const types = Math.max(1, mod.TYPES ?? 1);
        const built = Array.from({ length: types }, (_, i) => merged(new THREE.Group().add(mod.build(i)), true));
        const heights = built.map((b) => new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3()).y || 1);
        const spots = built.map(() => [] as THREE.Matrix4[]);
        for (const [x, z, s] of stupaSpots) {
          const want = s * 1.6;
          let t = 0;
          heights.forEach((h, i) => { if (Math.abs(h - want) < Math.abs(heights[t] - want)) t = i; });
          const k = want / heights[t];
          const yaw = Math.round(((x * 7.3 + z * 3.1) % 4)) * (Math.PI / 2);
          spots[t].push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(k, k, k)));
        }
        built.forEach((b, t) => {
          if (!spots[t].length) return;
          for (const child of b.children) {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) continue;
            const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material as THREE.Material, spots[t].length);
            spots[t].forEach((m, i) => inst.setMatrixAt(i, m.clone().multiply(mesh.matrix)));
            inst.castShadow = inst.receiveShadow = true;
            parents.grounds.add(inst);
          }
        });
      } else continue;
      hide(id);
      loaded.push(id);
    } catch (e) {
      console.warn(`kimi ${id}: build failed`, e);
    }
  }
  return loaded;
}

