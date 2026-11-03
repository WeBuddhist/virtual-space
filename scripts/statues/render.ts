// CPU renderer for statue meshes: rasterizes the meshed parts with a z-buffer and
// simple gilt shading, so a sculpting loop can look at its result without a GPU.
import { deflateSync } from 'node:zlib';
import type { MaterialDef, Part } from './mesh.ts';

export interface View { name: string; yaw: number; pitch?: number; /** world-space framing box centre and half-height */ centre: [number, number]; half: number; width: number; height: number }

/** the statue faces +z; yaw turns the camera around it (positive = toward the statue's left) */
export const VIEWS: View[] = [
  { name: 'front', yaw: 0, centre: [0, 0.5], half: 0.68, width: 640, height: 720 },
  { name: 'three-quarter', yaw: -0.65, centre: [0, 0.5], half: 0.68, width: 640, height: 720 },
  { name: 'side', yaw: -Math.PI / 2, centre: [0, 0.5], half: 0.68, width: 640, height: 720 },
  { name: 'face', yaw: 0, pitch: 0.05, centre: [0, 0.97], half: 0.2, width: 512, height: 512 },
];

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Uint8Array) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

export function png(width: number, height: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) rgb.subarray(y * width * 3, (y + 1) * width * 3).forEach((v, i) => (raw[y * (width * 3 + 1) + 1 + i] = v));
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const norm = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const KEY = norm([-0.5, 0.7, 0.8]);
const FILL = norm([0.7, 0.2, 0.5]);
const RIM = norm([0.2, 0.5, -0.9]);

export function render(parts: Part[], mats: MaterialDef[], v: View): Buffer {
  const { width: W, height: H } = v;
  const ss = 2; // supersample
  const w = W * ss, h = H * ss;
  const depth = new Float32Array(w * h).fill(-Infinity);
  const col = new Float32Array(w * h * 3);
  const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cp = Math.cos(v.pitch ?? 0), sp = Math.sin(v.pitch ?? 0);
  const scale = h / (2 * v.half);
  // world -> camera: rotate about y by -yaw, then tilt by pitch
  const toCam = (x: number, y: number, z: number): [number, number, number] => {
    const x1 = cy * x + sy * z, z1 = -sy * x + cy * z;
    const y1 = y - v.centre[1];
    return [x1, cp * y1 - sp * z1, sp * y1 + cp * z1];
  };
  const shade = (n: number[], m: MaterialDef): [number, number, number] => {
    const [r, g, b] = m.color;
    const d = 0.18 + 0.85 * Math.max(0, n[0] * KEY[0] + n[1] * KEY[1] + n[2] * KEY[2]) + 0.3 * Math.max(0, n[0] * FILL[0] + n[1] * FILL[1] + n[2] * FILL[2]);
    const rim = 0.35 * Math.max(0, n[0] * RIM[0] + n[1] * RIM[1] + n[2] * RIM[2]);
    const hv = norm([KEY[0], KEY[1], KEY[2] + 1]);
    const spec = Math.pow(Math.max(0, n[0] * hv[0] + n[1] * hv[1] + n[2] * hv[2]), 8 + (1 - m.roughness) * 80) * (0.25 + m.metallic * 0.9) * (1 - m.roughness * 0.6);
    const diffuse = d * (1 - m.metallic * 0.35);
    return [r * diffuse + spec * (m.metallic ? r : 1) + rim * r, g * diffuse + spec * (m.metallic ? g : 1) + rim * g, b * diffuse + spec * (m.metallic ? b : 1) + rim * b];
  };

  for (const part of parts) {
    const m = mats[part.material] ?? mats[0];
    const P = part.positions, N = part.normals, I = part.indices;
    const sx = new Float32Array(P.length / 3), syy = new Float32Array(P.length / 3), sz = new Float32Array(P.length / 3);
    const nc = new Float32Array(P.length);
    for (let i = 0; i < P.length / 3; i++) {
      const c = toCam(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      sx[i] = w / 2 + (c[0] - v.centre[0]) * scale;
      syy[i] = h / 2 - c[1] * scale;
      sz[i] = c[2];
      const n = toCam(N[i * 3], N[i * 3 + 1] + v.centre[1], N[i * 3 + 2]);
      nc.set(n, i * 3);
    }
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2];
      const x0 = sx[a], y0 = syy[a], x1 = sx[b], y1 = syy[b], x2 = sx[c], y2 = syy[c];
      const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      if (area === 0) continue;
      const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1, x2)));
      const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(h - 1, Math.ceil(Math.max(y0, y1, y2)));
      for (let py = minY; py <= maxY; py++) for (let px = minX; px <= maxX; px++) {
        const qx = px + 0.5, qy = py + 0.5;
        const w0 = ((x1 - qx) * (y2 - qy) - (x2 - qx) * (y1 - qy)) / area;
        const w1 = ((x2 - qx) * (y0 - qy) - (x0 - qx) * (y2 - qy)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * sz[a] + w1 * sz[b] + w2 * sz[c];
        const k = py * w + px;
        if (z <= depth[k]) continue;
        depth[k] = z;
        let n = [w0 * nc[a * 3] + w1 * nc[b * 3] + w2 * nc[c * 3], w0 * nc[a * 3 + 1] + w1 * nc[b * 3 + 1] + w2 * nc[c * 3 + 1], w0 * nc[a * 3 + 2] + w1 * nc[b * 3 + 2] + w2 * nc[c * 3 + 2]];
        n = norm(n);
        if (n[2] < 0) n = n.map((x) => -x); // back-facing interpolation noise
        const s = shade(n, m);
        col[k * 3] = s[0]; col[k * 3 + 1] = s[1]; col[k * 3 + 2] = s[2];
      }
    }
  }

  // downsample, tone map, background
  const out = new Uint8Array(W * H * 3);
  const bg = [0.62, 0.66, 0.72];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const acc = [0, 0, 0];
    for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) {
      const k = (y * ss + j) * w + x * ss + i;
      const hit = depth[k] !== -Infinity;
      for (let c = 0; c < 3; c++) acc[c] += hit ? col[k * 3 + c] : bg[c] ** 2.2 * (1 - 0.25 * (y / H));
    }
    for (let c = 0; c < 3; c++) {
      const lin = acc[c] / (ss * ss);
      const mapped = lin / (1 + lin * 0.35);
      out[(y * W + x) * 3 + c] = Math.min(255, Math.round(Math.pow(Math.max(0, mapped), 1 / 2.2) * 255));
    }
  }
  return png(W, H, out);
}
