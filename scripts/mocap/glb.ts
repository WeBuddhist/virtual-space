// Minimal GLB reader for skeleton nodes and animation channels (no textures needed).
import { readFileSync } from 'node:fs';

export interface GltfNode { name: string; children?: number[]; rotation?: number[]; translation?: number[]; scale?: number[] }
export interface Channel { node: number; path: 'rotation' | 'translation' | 'scale'; times: Float32Array; values: Float32Array; interpolation: string }
export interface Glb { nodes: GltfNode[]; animations: { name: string; channels: Channel[] }[] }

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export function readGlb(path: string): Glb {
  const buf = readFileSync(path);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error(`${path} is not a GLB`);
  let at = 12;
  let json: any = null;
  let bin: Uint8Array | null = null;
  while (at < dv.byteLength) {
    const len = dv.getUint32(at, true), type = dv.getUint32(at + 4, true);
    const chunk = new Uint8Array(buf.buffer, buf.byteOffset + at + 8, len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
    else if (type === 0x004e4942) bin = chunk;
    at += 8 + len;
  }
  const accessor = (i: number): Float32Array => {
    const a = json.accessors[i];
    const view = json.bufferViews[a.bufferView];
    const n = a.count * COMPONENTS[a.type];
    if (a.componentType !== 5126) throw new Error('only float accessors are supported');
    const offset = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const out = new Float32Array(n);
    const src = new DataView(bin!.buffer, bin!.byteOffset + offset);
    const stride = view.byteStride ?? COMPONENTS[a.type] * 4;
    for (let k = 0; k < a.count; k++) for (let c = 0; c < COMPONENTS[a.type]; c++) out[k * COMPONENTS[a.type] + c] = src.getFloat32(k * stride + c * 4, true);
    return out;
  };
  const animations = (json.animations ?? []).map((anim: any) => ({
    name: anim.name,
    channels: anim.channels.map((ch: any) => {
      const s = anim.samplers[ch.sampler];
      return { node: ch.target.node, path: ch.target.path, times: accessor(s.input), values: accessor(s.output), interpolation: s.interpolation ?? 'LINEAR' };
    }),
  }));
  return { nodes: json.nodes, animations };
}
