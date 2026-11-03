// Mesh and render one sculpt module (as written by a model in the sculpt-off).
//   node --experimental-strip-types scripts/statues/bake.ts <module.ts> <outdir> [--cell=0.008] [--glb]
// The module exports `sculpt(): { body: Shape; head: Shape }` and `palette`.
// Writes <outdir>/{front,three-quarter,side,face}.png, stats.json and, with --glb,
// statue.glb. Run it under Node's permission model (see sculptoff.ts): module code
// is model-written.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MAT, faceUV, seatUV } from './buddha.ts';
import { meshShape, toGLB } from './mesh.ts';
import { materials, type Palette } from './palette.ts';
import { VIEWS, render } from './render.ts';
import type { Shape } from './sdf.ts';

const [modPath, outDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const cell = Number(process.argv.find((a) => a.startsWith('--cell='))?.slice(7) ?? 0.008);
const mod = (await import(pathToFileURL(resolve(modPath)).href)) as { sculpt: () => { body: Shape; head: Shape }; palette?: Palette };
mkdirSync(outDir, { recursive: true });

const t0 = performance.now();
const { body, head } = mod.sculpt();
const parts = [...meshShape(body, cell, [{ material: MAT.seat, fn: seatUV }]), ...meshShape(head, cell * 0.45, [{ material: MAT.face, fn: faceUV }])];
const mats = materials(mod.palette ?? {});
const tMesh = performance.now() - t0;

for (const v of VIEWS) writeFileSync(join(outDir, `${v.name}.png`), render(parts, mats, v));
const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (const p of parts) for (let i = 0; i < p.positions.length; i++) {
  box.min[i % 3] = Math.min(box.min[i % 3], p.positions[i]);
  box.max[i % 3] = Math.max(box.max[i % 3], p.positions[i]);
}
const stats = {
  seconds: +(tMesh / 1000).toFixed(1),
  triangles: parts.reduce((n, p) => n + p.indices.length / 3, 0),
  bounds: { min: box.min.map((x) => +x.toFixed(3)), max: box.max.map((x) => +x.toFixed(3)) },
  materials: parts.map((p) => Object.keys(MAT).find((k) => MAT[k as keyof typeof MAT] === p.material)),
};
writeFileSync(join(outDir, 'stats.json'), JSON.stringify(stats, null, 2));
if (process.argv.includes('--glb')) writeFileSync(join(outDir, 'statue.glb'), toGLB(parts, mats, 'statue'));
console.log(JSON.stringify(stats));
