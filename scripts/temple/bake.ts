// Build one Kimi-written element module, check it, and render it.
//   node --experimental-strip-types scripts/temple/bake.ts <element-id> <module.ts> <outdir>
// Writes <outdir>/{front,three-quarter,side,high,detail}.png and stats.json (bounds,
// triangles, keep-clear violations). Module code is model-written: run it under Node's
// permission model (see kimi.ts).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import type { MaterialDef, Part } from '../statues/mesh.ts';
import { render, type View } from '../statues/render.ts';
import { ELEMENTS, type Box } from './elements.ts';

const [id, modPath, outDir] = process.argv.slice(2);
const el = ELEMENTS.find((e) => e.id === id);
if (!el) throw new Error(`unknown element ${id}`);
mkdirSync(outDir, { recursive: true });

const mod = (await import(pathToFileURL(resolve(modPath)).href)) as { build: (...a: unknown[]) => THREE.Object3D; TYPES?: number };
const t0 = performance.now();
const root = new THREE.Group();
// several types (stupas) are laid out side by side, left to right
const types = typeof mod.TYPES === 'number' ? Math.max(1, Math.min(8, mod.TYPES)) : 0;
const args: unknown[] = el.args ? [new Function(`return (${el.args})`)()] : [];
if (types) {
  const built = Array.from({ length: types }, (_, i) => mod.build(i));
  const widths = built.map((b) => new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3()).x);
  const gap = 0.6;
  let x = -(widths.reduce((a, b) => a + b, 0) + gap * (types - 1)) / 2;
  built.forEach((b, i) => { b.position.x += x + widths[i] / 2; root.add(b); x += widths[i] + gap; });
} else {
  root.add(mod.build(...args));
}
root.updateMatrixWorld(true);
const buildMs = performance.now() - t0;

// ---- triangles out of every mesh (instances expanded), grouped by material ----
const mats: MaterialDef[] = [];
const matIndex = new Map<THREE.Material, number>();
const parts = new Map<number, { p: number[]; n: number[] }>();
let triangles = 0;
const clearHits = new Map<string, number>();
const tri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
const nrm = new THREE.Matrix3();
const inBox = (p: THREE.Vector3, b: Box) => p.x > b.x[0] && p.x < b.x[1] && p.y > b.y[0] && p.y < b.y[1] && p.z > b.z[0] && p.z < b.z[1];

function materialOf(m: THREE.Material | THREE.Material[]) {
  const mm = (Array.isArray(m) ? m[0] : m) as THREE.MeshStandardMaterial;
  let i = matIndex.get(mm);
  if (i === undefined) {
    const c = mm.color ?? new THREE.Color(0xcccccc);
    i = mats.length;
    mats.push({ name: mm.name || `m${i}`, color: [c.r, c.g, c.b], metallic: mm.metalness ?? 0, roughness: mm.roughness ?? 0.8 });
    matIndex.set(mm, i);
  }
  return i;
}

function addGeometry(geo: THREE.BufferGeometry, world: THREE.Matrix4, material: number) {
  const pos = geo.getAttribute('position');
  if (!pos) return;
  const index = geo.getIndex();
  const count = index ? index.count : pos.count;
  nrm.getNormalMatrix(world);
  let part = parts.get(material);
  if (!part) parts.set(material, (part = { p: [], n: [] }));
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i + 2 < count; i += 3) {
    for (let k = 0; k < 3; k++) tri[k].fromBufferAttribute(pos, index ? index.getX(i + k) : i + k).applyMatrix4(world);
    // flat face normals: robust whatever normals the module did or didn't compute
    n.crossVectors(e1.subVectors(tri[1], tri[0]), e2.subVectors(tri[2], tri[0]));
    if (n.lengthSq() < 1e-14) continue;
    n.normalize();
    for (const v of tri) part.p.push(v.x, v.y, v.z), part.n.push(n.x, n.y, n.z);
    triangles++;
    // a wall triangle can span a doorway with its corners outside it: sample across it
    const edge = Math.max(tri[0].distanceTo(tri[1]), tri[1].distanceTo(tri[2]), tri[2].distanceTo(tri[0]));
    const steps = Math.min(40, Math.max(1, Math.ceil(edge / 0.2)));
    for (const k of el!.keepClear ?? []) {
      let hit = false;
      for (let a = 0; a <= steps && !hit; a++) for (let b = 0; a + b <= steps && !hit; b++) {
        const u = a / steps, v = b / steps;
        c.copy(tri[0]).multiplyScalar(1 - u - v).addScaledVector(tri[1], u).addScaledVector(tri[2], v);
        hit = inBox(c, k.box);
      }
      if (hit) clearHits.set(k.name, (clearHits.get(k.name) ?? 0) + 1);
    }
  }
}

const inst = new THREE.Matrix4(), world = new THREE.Matrix4();
let meshes = 0;
root.traverse((o) => {
  const mesh = o as THREE.Mesh;
  if (!mesh.isMesh || !mesh.geometry || !mesh.visible) return;
  meshes++;
  const m = materialOf(mesh.material);
  const im = o as THREE.InstancedMesh;
  if (im.isInstancedMesh) {
    for (let i = 0; i < im.count; i++) {
      im.getMatrixAt(i, inst);
      addGeometry(mesh.geometry, world.multiplyMatrices(mesh.matrixWorld, inst), m);
    }
  } else {
    addGeometry(mesh.geometry, mesh.matrixWorld, m);
  }
});

const out: Part[] = [...parts].map(([material, q]) => ({
  material, positions: new Float32Array(q.p), normals: new Float32Array(q.n),
  indices: Uint32Array.from({ length: q.p.length / 3 }, (_, i) => i),
}));
const box = new THREE.Box3();
for (const p of out) for (let i = 0; i < p.positions.length; i += 3) box.expandByPoint(tri[0].set(p.positions[i], p.positions[i + 1], p.positions[i + 2]));
const size = box.getSize(new THREE.Vector3());

// ---- views framed on the bounding box ----
const tall = size.y > Math.max(size.x, size.z);
const [W, H] = tall ? [640, 860] : [1000, 560];
const radius = Math.max(...[[box.min.x, box.min.z], [box.min.x, box.max.z], [box.max.x, box.min.z], [box.max.x, box.max.z]].map(([x, z]) => Math.hypot(x, z)));
const half = Math.max(size.y / 2, (radius * H) / W) * 1.08;
const cy = (box.min.y + box.max.y) / 2;
const views: View[] = [
  { name: 'front', yaw: 0, pitch: 0.04, centre: [0, cy], half, width: W, height: H },
  { name: 'three-quarter', yaw: -0.7, pitch: 0.18, centre: [0, cy], half, width: W, height: H },
  { name: 'side', yaw: -Math.PI / 2, pitch: 0.04, centre: [0, cy], half, width: W, height: H },
  { name: 'high', yaw: 0.6, pitch: 0.65, centre: [0, cy], half: half * 1.05, width: W, height: H },
  // a closer look at the lower front, where detail is judged
  { name: 'detail', yaw: 0.25, pitch: 0.08, centre: [0, box.min.y + size.y * (tall ? 0.22 : 0.5)], half: tall ? half * 0.3 : half * 0.55, width: W, height: H },
];
for (const v of views) writeFileSync(join(outDir, `${v.name}.png`), render(out, mats, v));

const stats = {
  buildSeconds: +(buildMs / 1000).toFixed(2),
  triangles, meshes, budget: el.budget, overBudget: triangles > el.budget,
  bounds: { min: box.min.toArray().map((v) => +v.toFixed(2)), max: box.max.toArray().map((v) => +v.toFixed(2)) },
  materials: mats.map((m) => m.name),
  keepClearViolations: Object.fromEntries(clearHits),
};
writeFileSync(join(outDir, 'stats.json'), JSON.stringify(stats, null, 2));
console.log(JSON.stringify(stats));
