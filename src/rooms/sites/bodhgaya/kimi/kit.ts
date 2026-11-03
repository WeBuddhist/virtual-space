import * as THREE from 'three';

// Named materials for the Kimi-written Bodh Gaya architecture (scripts/temple). Pure
// three.js so the same modules run in Node for baking and in the browser, where the
// stone materials get photo textures (see ./index.ts).

export type MatName =
  | 'sandstone' | 'stucco' | 'brick' | 'granite' | 'basalt' | 'marble' | 'whitewash'
  | 'pink-sandstone' | 'gold' | 'brass' | 'wood' | 'dark' | 'red-cloth' | 'saffron-cloth';

const SPEC: Record<MatName, { color: number; roughness: number; metalness?: number }> = {
  /** the buff, weathered sandstone and plaster of the tower and railing */
  sandstone: { color: 0xc9a77a, roughness: 0.92 },
  /** lime plaster over the brick core, slightly lighter and smoother */
  stucco: { color: 0xd8c3a0, roughness: 0.88 },
  /** exposed old brick (Animesh Lochana, ruined bases) */
  brick: { color: 0x9a5b3e, roughness: 0.95 },
  /** grey granite of the Sunga railing and the jewel walk */
  granite: { color: 0x8f877d, roughness: 0.85 },
  /** dark grey-black basalt of the Pala votive stupas */
  basalt: { color: 0x3f3c39, roughness: 0.7 },
  marble: { color: 0xeee8dd, roughness: 0.45 },
  whitewash: { color: 0xf1ede4, roughness: 0.9 },
  /** the pink sandstone of the modern gateways and compound walls */
  'pink-sandstone': { color: 0xc98f86, roughness: 0.85 },
  gold: { color: 0xd9a93c, roughness: 0.28, metalness: 1 },
  brass: { color: 0xb88a3a, roughness: 0.35, metalness: 0.9 },
  wood: { color: 0x6b4a2e, roughness: 0.8 },
  /** recesses, door openings, the shadowed backs of niches */
  dark: { color: 0x2a221c, roughness: 1 },
  'red-cloth': { color: 0x9a2a1e, roughness: 0.9 },
  'saffron-cloth': { color: 0xe08a1e, roughness: 0.85 },
};

const cache = new Map<MatName, THREE.MeshStandardMaterial>();

/** the shared material for `name`; meshes using the same name share one material */
export function mat(name: MatName): THREE.MeshStandardMaterial {
  let m = cache.get(name);
  if (!m) {
    const s = SPEC[name] ?? SPEC.sandstone;
    m = new THREE.MeshStandardMaterial({ color: s.color, roughness: s.roughness, metalness: s.metalness ?? 0 });
    m.name = name;
    cache.set(name, m);
  }
  return m;
}

export const MAT_NAMES = Object.keys(SPEC) as MatName[];
