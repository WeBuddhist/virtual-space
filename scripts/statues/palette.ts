// Statue materials: the default gilt palette, overridable per statue.
import { MAT } from './buddha.ts';
import type { MaterialDef } from './mesh.ts';

export type MatName = keyof typeof MAT;
export interface Finish { color: number; metallic: number; roughness: number }
export type Palette = Partial<Record<MatName, Finish>>;

type Rgb = [number, number, number];
/** sRGB hex to linear rgb */
export const hex = (h: number): Rgb => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map((c) => c ** 2.2) as Rgb;

export const GOLD: Finish = { color: 0xe3b04b, metallic: 1, roughness: 0.28 };

export function materials(palette: Palette): MaterialDef[] {
  const base: Record<MatName, Finish> = {
    gilt: GOLD, robe: GOLD, hair: GOLD,
    face: GOLD,
    crystal: { color: 0xf4f6ff, metallic: 0.1, roughness: 0.05 },
    lips: { color: 0xb5463a, metallic: 0.2, roughness: 0.4 },
    cloth: { color: 0xe08a1e, metallic: 0, roughness: 0.85 },
    seat: { color: 0xd8a640, metallic: 1, roughness: 0.35 },
    jewel: { color: 0xc0283a, metallic: 0.2, roughness: 0.15 },
    white: { color: 0xf3efe6, metallic: 0, roughness: 0.4 },
    ...palette,
  };
  return (Object.keys(MAT) as MatName[])
    .sort((a, b) => MAT[a] - MAT[b])
    .map((k) => ({ name: k, color: hex(base[k].color), metallic: base[k].metallic, roughness: base[k].roughness }));
}
