// Bake the main statue of each temple to public/models/statues/<id>.glb.
//   node --experimental-strip-types scripts/statues/build.ts [id…] [--cell=0.006]
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { MAT, faceUV, seatUV, seatedBuddha, type BuddhaOptions } from './buddha.ts';
import { meshShape, toGLB, type MaterialDef } from './mesh.ts';

type Rgb = [number, number, number];
const hex = (h: number): Rgb => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map((c) => c ** 2.2) as Rgb;

interface Preset { options: BuddhaOptions; palette: Partial<Record<keyof typeof MAT, { color: number; metallic: number; roughness: number }>> }

const GOLD = { color: 0xe3b04b, metallic: 1, roughness: 0.28 };
const PRESETS: Record<string, Preset> = {
  // Mahabodhi: Pala-style gilt Buddha touching the earth, robed by devotees
  bodhgaya: {
    options: { mudra: 'bhumisparsha', robe: 'one-shoulder', hair: 'curls', ushnisha: 'bump', crown: false, offeredRobe: true, build: 1.06, seat: 'cushion', finial: true, almsBowl: 'crystal' },
    // matte gilt face and body, navy bead curls, glossy gold-yellow brocade robe
    palette: {
      gilt: { color: 0xdcb04c, metallic: 0.65, roughness: 0.42 }, robe: { color: 0xdcb04c, metallic: 0.65, roughness: 0.42 },
      hair: { color: 0x1c2a6b, metallic: 0.1, roughness: 0.55 }, cloth: { color: 0xe89400, metallic: 0.2, roughness: 0.3 },
      seat: { color: 0xe0b245, metallic: 0.85, roughness: 0.32 },
    },
  },
  tibetan: {
    options: { mudra: 'bhumisparsha', robe: 'one-shoulder', hair: 'curls', ushnisha: 'jewel', crown: false, offeredRobe: false, build: 1, seat: 'lotus', almsBowl: 'dark' },
    palette: { gilt: GOLD, hair: { color: 0x2a4f9e, metallic: 0.2, roughness: 0.5 } },
  },
  theravada: {
    options: { mudra: 'bhumisparsha', robe: 'one-shoulder', hair: 'curls', ushnisha: 'flame', crown: false, offeredRobe: false, build: 0.92, seat: 'none' },
    palette: { gilt: { color: 0xeab84a, metallic: 1, roughness: 0.22 }, hair: { color: 0xd9aa44, metallic: 1, roughness: 0.3 } },
  },
  mahayana: {
    options: { mudra: 'abhaya-varada', robe: 'both', hair: 'curls', ushnisha: 'bump', crown: false, offeredRobe: false, build: 1.1, seat: 'lotus' },
    palette: { gilt: { color: 0x9c7a45, metallic: 0.9, roughness: 0.45 }, robe: { color: 0x8e6d3c, metallic: 0.9, roughness: 0.5 }, hair: { color: 0x5f4a2c, metallic: 0.8, roughness: 0.5 } },
  },
};

function materials(p: Preset): MaterialDef[] {
  const base: Record<keyof typeof MAT, { color: number; metallic: number; roughness: number }> = {
    gilt: GOLD, robe: GOLD, hair: GOLD,
    face: GOLD,
    crystal: { color: 0xf4f6ff, metallic: 0.1, roughness: 0.05 },
    lips: { color: 0xb5463a, metallic: 0.2, roughness: 0.4 },
    cloth: { color: 0xe08a1e, metallic: 0, roughness: 0.85 },
    seat: { color: 0xd8a640, metallic: 1, roughness: 0.35 },
    jewel: { color: 0xc0283a, metallic: 0.2, roughness: 0.15 },
    white: { color: 0xf3efe6, metallic: 0, roughness: 0.4 },
    ...p.palette,
  };
  return (Object.keys(MAT) as (keyof typeof MAT)[])
    .sort((a, b) => MAT[a] - MAT[b])
    .map((k) => ({ name: k, color: hex(base[k].color), metallic: base[k].metallic, roughness: base[k].roughness }));
}

const args = process.argv.slice(2);
const cell = Number(args.find((a) => a.startsWith('--cell='))?.slice(7) ?? 0.006);
const ids = args.filter((a) => !a.startsWith('--'));
mkdirSync('public/models/statues', { recursive: true });
for (const id of ids.length ? ids : Object.keys(PRESETS)) {
  const preset = PRESETS[id];
  if (!preset) { console.error(`unknown statue ${id}`); continue; }
  const t0 = performance.now();
  // the head is meshed finer than the body; the face gets UVs for its painted texture
  const { body, head } = seatedBuddha(preset.options);
  const parts = [...meshShape(body, cell, [{ material: MAT.seat, fn: seatUV }]), ...meshShape(head, cell * 0.45, [{ material: MAT.face, fn: faceUV }])];
  const glb = toGLB(parts, materials(preset), `statue-${id}`);
  // quantize and meshopt-compress for the web (about 4.5x smaller)
  const raw = `public/models/statues/${id}.raw.glb`;
  writeFileSync(raw, glb);
  execFileSync('npx', ['gltf-transform', 'meshopt', raw, `public/models/statues/${id}.glb`, '--level', 'medium'], { stdio: 'ignore' });
  rmSync(raw);
  const verts = parts.reduce((n, p) => n + p.positions.length / 3, 0);
  console.log(`${id}: ${verts} vertices, ${(glb.length / 1e6).toFixed(1)} MB raw, ${((performance.now() - t0) / 1000).toFixed(1)}s`);
}
