// Surface-nets mesher + minimal GLB writer for SDF statues.
import type { Shape, V3 } from './sdf.ts';

export interface MaterialDef { name: string; color: [number, number, number]; metallic: number; roughness: number }
export interface Part { material: number; positions: Float32Array; normals: Float32Array; indices: Uint32Array; uvs?: Float32Array }

/**
 * Mesh a shape on a grid with cells of `cell` metres. A coarse pre-pass skips
 * blocks far from the surface so only the shell is evaluated at full resolution.
 */
export function meshShape(s: Shape, cell: number, uvs: { material: number; fn: (p: V3) => [number, number] }[] = []): Part[] {
  const pad = cell * 2;
  const o: V3 = [s.min[0] - pad, s.min[1] - pad, s.min[2] - pad];
  const n: V3 = [
    Math.ceil((s.max[0] - s.min[0] + pad * 2) / cell) + 1,
    Math.ceil((s.max[1] - s.min[1] + pad * 2) / cell) + 1,
    Math.ceil((s.max[2] - s.min[2] + pad * 2) / cell) + 1,
  ];
  const [nx, ny, nz] = n;
  const idx = (x: number, y: number, z: number) => x + nx * (y + ny * z);
  const field = new Float32Array(nx * ny * nz);
  const P = (x: number, y: number, z: number): V3 => [o[0] + x * cell, o[1] + y * cell, o[2] + z * cell];

  // coarse pass: blocks of B cells; far blocks get their centre distance everywhere
  const B = 4;
  const reach = cell * B * 0.9;
  for (let bz = 0; bz < nz; bz += B) for (let by = 0; by < ny; by += B) for (let bx = 0; bx < nx; bx += B) {
    const c = P(bx + B / 2, by + B / 2, bz + B / 2);
    const dc = s.d(c);
    // approximate fields can overestimate distance, so only skip blocks that are clearly far
    const far = Math.abs(dc) > reach * 2.5;
    for (let z = bz; z < Math.min(nz, bz + B + 1); z++) for (let y = by; y < Math.min(ny, by + B + 1); y++) for (let x = bx; x < Math.min(nx, bx + B + 1); x++) {
      field[idx(x, y, z)] = far ? dc : s.d(P(x, y, z));
    }
  }

  const grad = (p: V3): V3 => {
    const e = cell * 0.5;
    const gx = s.d([p[0] + e, p[1], p[2]]) - s.d([p[0] - e, p[1], p[2]]);
    const gy = s.d([p[0], p[1] + e, p[2]]) - s.d([p[0], p[1] - e, p[2]]);
    const gz = s.d([p[0], p[1], p[2] + e]) - s.d([p[0], p[1], p[2] - e]);
    const l = Math.hypot(gx, gy, gz) || 1;
    return [gx / l, gy / l, gz / l];
  };

  // one vertex per cell that straddles the surface
  const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cidx = (x: number, y: number, z: number) => x + (nx - 1) * (y + (ny - 1) * z);
  const pos: number[] = [], nor: number[] = [], mats: number[] = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let z = 0; z < nz - 1; z++) for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx - 1; x++) {
    let mask = 0;
    for (let i = 0; i < 8; i++) {
      v[i] = field[idx(x + corners[i][0], y + corners[i][1], z + corners[i][2])];
      if (v[i] < 0) mask |= 1 << i;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t;
      sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t;
      sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t;
      cnt++;
    }
    let p: V3 = P(x + sx / cnt, y + sy / cnt, z + sz / cnt);
    // pull the vertex onto the surface, but never out of its own cell: approximate
    // fields (ellipsoids, carves, folds) can otherwise fling it far away
    const lo = P(x, y, z), hi = P(x + 1, y + 1, z + 1);
    for (let k = 0; k < 2; k++) {
      const d = Math.max(-cell * 0.5, Math.min(cell * 0.5, s.d(p)));
      const g = grad(p);
      p = [
        Math.min(hi[0], Math.max(lo[0], p[0] - g[0] * d)),
        Math.min(hi[1], Math.max(lo[1], p[1] - g[1] * d)),
        Math.min(hi[2], Math.max(lo[2], p[2] - g[2] * d)),
      ];
    }
    const g = grad(p);
    cellVert[cidx(x, y, z)] = pos.length / 3;
    pos.push(...p);
    nor.push(...g);
    mats.push(s.m(p));
  }

  // quads across every grid edge that crosses the surface
  const tris: number[][] = [];
  // wind each triangle so its face normal agrees with the field's gradient
  const tri = (a: number, b: number, c: number) => {
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const gx = nor[a * 3] + nor[b * 3] + nor[c * 3], gy = nor[a * 3 + 1] + nor[b * 3 + 1] + nor[c * 3 + 1], gz = nor[a * 3 + 2] + nor[b * 3 + 2] + nor[c * 3 + 2];
    tris.push(fx * gx + fy * gy + fz * gz >= 0 ? [a, b, c] : [a, c, b]);
  };
  const quad = (a: number, b: number, c: number, d: number, _flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    tri(a, b, c);
    tri(a, c, d);
  };
  for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
    const f0 = field[idx(x, y, z)];
    const inside = f0 < 0;
    if (x < nx - 1 && inside !== (field[idx(x + 1, y, z)] < 0)) {
      quad(cellVert[cidx(x, y - 1, z - 1)], cellVert[cidx(x, y, z - 1)], cellVert[cidx(x, y, z)], cellVert[cidx(x, y - 1, z)], !inside);
    }
    if (y < ny - 1 && inside !== (field[idx(x, y + 1, z)] < 0)) {
      quad(cellVert[cidx(x - 1, y, z - 1)], cellVert[cidx(x - 1, y, z)], cellVert[cidx(x, y, z)], cellVert[cidx(x, y, z - 1)], !inside);
    }
    if (z < nz - 1 && inside !== (field[idx(x, y, z + 1)] < 0)) {
      quad(cellVert[cidx(x - 1, y - 1, z)], cellVert[cidx(x, y - 1, z)], cellVert[cidx(x, y, z)], cellVert[cidx(x - 1, y, z)], !inside);
    }
  }

  // split triangles by material, re-indexing vertices per part
  const parts = new Map<number, { map: Map<number, number>; p: number[]; n: number[]; i: number[]; u: number[] }>();
  for (const t of tris) {
    const m = mats[t[0]] === mats[t[1]] || mats[t[0]] === mats[t[2]] ? mats[t[0]] : mats[t[1]];
    let part = parts.get(m);
    if (!part) parts.set(m, (part = { map: new Map(), p: [], n: [], i: [], u: [] }));
    for (const vi of t) {
      let k = part.map.get(vi);
      if (k === undefined) {
        k = part.p.length / 3;
        part.map.set(vi, k);
        part.p.push(pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2]);
        part.n.push(nor[vi * 3], nor[vi * 3 + 1], nor[vi * 3 + 2]);
        const uv = uvs.find((u) => u.material === m);
        if (uv) part.u.push(...uv.fn([pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2]]));
      }
      part.i.push(k);
    }
  }
  return [...parts.entries()].map(([material, q]) => ({
    material, positions: new Float32Array(q.p), normals: new Float32Array(q.n), indices: new Uint32Array(q.i),
    uvs: q.u.length ? new Float32Array(q.u) : undefined,
  }));
}

/** write parts as a binary glTF with one primitive per material */
export function toGLB(parts: Part[], materials: MaterialDef[], name: string): Uint8Array {
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const views: object[] = [], accessors: object[] = [], primitives: object[] = [];
  const add = (arr: Float32Array | Uint32Array, target: number) => {
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    chunks.push(bytes);
    offset += bytes.length;
    const padLen = (4 - (offset % 4)) % 4;
    if (padLen) { chunks.push(new Uint8Array(padLen)); offset += padLen; }
    return views.length - 1;
  };
  for (const part of parts) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < part.positions.length; i += 3) for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], part.positions[i + k]);
      max[k] = Math.max(max[k], part.positions[i + k]);
    }
    const pv = add(part.positions, 34962);
    accessors.push({ bufferView: pv, componentType: 5126, count: part.positions.length / 3, type: 'VEC3', min, max });
    const nv = add(part.normals, 34962);
    accessors.push({ bufferView: nv, componentType: 5126, count: part.normals.length / 3, type: 'VEC3' });
    const attributes: Record<string, number> = { POSITION: accessors.length - 2, NORMAL: accessors.length - 1 };
    if (part.uvs) {
      const uvv = add(part.uvs, 34962);
      accessors.push({ bufferView: uvv, componentType: 5126, count: part.uvs.length / 2, type: 'VEC2' });
      attributes.TEXCOORD_0 = accessors.length - 1;
    }
    const iv = add(part.indices, 34963);
    accessors.push({ bufferView: iv, componentType: 5125, count: part.indices.length, type: 'SCALAR' });
    primitives.push({ attributes, indices: accessors.length - 1, material: part.material });
  }
  const json = {
    asset: { version: '2.0', generator: 'webuddhist-statue-sculptor' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives }],
    materials: materials.map((m) => ({
      name: m.name,
      pbrMetallicRoughness: { baseColorFactor: [...m.color, 1], metallicFactor: m.metallic, roughnessFactor: m.roughness },
    })),
    buffers: [{ byteLength: offset }], bufferViews: views, accessors,
  };
  let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jpad = (4 - (jsonBytes.length % 4)) % 4;
  if (jpad) jsonBytes = new Uint8Array([...jsonBytes, ...new Array(jpad).fill(0x20)]);
  const total = 12 + 8 + jsonBytes.length + 8 + offset;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jsonBytes.length, true); dv.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  let at = 20 + jsonBytes.length;
  dv.setUint32(at, offset, true); dv.setUint32(at + 4, 0x004e4942, true);
  at += 8;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}
