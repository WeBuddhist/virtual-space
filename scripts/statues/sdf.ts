// Tiny signed-distance-field sculpting kit for statues. Shapes are functions
// p -> distance; smooth unions blend them like clay. Each shape also carries a
// material id so the mesher can split the result into gilt, cloth, hair, etc.

export type V3 = [number, number, number];
export interface Shape {
  d(p: V3): number;
  /** material at p (only asked near the surface) */
  m(p: V3): number;
  /** loose bounds used to skip far-away evaluation */
  min: V3;
  max: V3;
}

const len = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function boundsDist(s: Shape, p: V3) {
  const dx = Math.max(s.min[0] - p[0], 0, p[0] - s.max[0]);
  const dy = Math.max(s.min[1] - p[1], 0, p[1] - s.max[1]);
  const dz = Math.max(s.min[2] - p[2], 0, p[2] - s.max[2]);
  return len(dx, dy, dz);
}

/** wrap a raw distance function with bounds that are padded by `pad` */
function shape(d: (p: V3) => number, min: V3, max: V3, mat: number, pad = 0.02): Shape {
  const lo: V3 = [min[0] - pad, min[1] - pad, min[2] - pad];
  const hi: V3 = [max[0] + pad, max[1] + pad, max[2] + pad];
  const s: Shape = {
    min: lo, max: hi, m: () => mat,
    d(p) {
      const b = boundsDist(s, p);
      return b > 0.08 ? b : d(p);
    },
  };
  return s;
}

// ---- primitives -----------------------------------------------------------------

export function sphere(c: V3, r: number, mat = 0): Shape {
  return shape((p) => len(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r,
    [c[0] - r, c[1] - r, c[2] - r], [c[0] + r, c[1] + r, c[2] + r], mat);
}

/** approximate ellipsoid distance (good enough near the surface) */
export function ellipsoid(c: V3, r: V3, mat = 0): Shape {
  return shape((p) => {
    const x = (p[0] - c[0]) / r[0], y = (p[1] - c[1]) / r[1], z = (p[2] - c[2]) / r[2];
    const k0 = len(x, y, z);
    const k1 = len(x / r[0], y / r[1], z / r[2]);
    return k1 === 0 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1;
  }, [c[0] - r[0], c[1] - r[1], c[2] - r[2]], [c[0] + r[0], c[1] + r[1], c[2] + r[2]], mat);
}

/** capsule from a to b, radius tapering from ra to rb */
export function cone(a: V3, b: V3, ra: number, rb: number, mat = 0): Shape {
  const ba: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l2 = ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2];
  const rr = Math.max(ra, rb);
  return shape((p) => {
    const pa: V3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const h = clamp((pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / l2, 0, 1);
    return len(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - mix(ra, rb, h);
  }, [Math.min(a[0], b[0]) - rr, Math.min(a[1], b[1]) - rr, Math.min(a[2], b[2]) - rr],
     [Math.max(a[0], b[0]) + rr, Math.max(a[1], b[1]) + rr, Math.max(a[2], b[2]) + rr], mat);
}
export const capsule = (a: V3, b: V3, r: number, mat = 0) => cone(a, b, r, r, mat);

export function roundBox(c: V3, half: V3, r: number, mat = 0): Shape {
  return shape((p) => {
    const qx = Math.abs(p[0] - c[0]) - half[0] + r;
    const qy = Math.abs(p[1] - c[1]) - half[1] + r;
    const qz = Math.abs(p[2] - c[2]) - half[2] + r;
    return len(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  }, [c[0] - half[0], c[1] - half[1], c[2] - half[2]], [c[0] + half[0], c[1] + half[1], c[2] + half[2]], mat);
}

/** vertical cylinder (y axis) with rounded edges */
export function cylinder(c: V3, r: number, h: number, round = 0.01, mat = 0): Shape {
  return shape((p) => {
    const dx = len(p[0] - c[0], 0, p[2] - c[2]) - r + round;
    const dy = Math.abs(p[1] - c[1]) - h / 2 + round;
    return Math.min(Math.max(dx, dy), 0) + len(Math.max(dx, 0), Math.max(dy, 0), 0) - round;
  }, [c[0] - r, c[1] - h / 2, c[2] - r], [c[0] + r, c[1] + h / 2, c[2] + r], mat);
}

/** torus around the y axis */
export function torus(c: V3, R: number, r: number, mat = 0): Shape {
  return shape((p) => {
    const q = len(p[0] - c[0], 0, p[2] - c[2]) - R;
    return len(q, p[1] - c[1], 0) - r;
  }, [c[0] - R - r, c[1] - r, c[2] - R - r], [c[0] + R + r, c[1] + r, c[2] + R + r], mat);
}

// ---- operations -------------------------------------------------------------------

function joinBounds(list: Shape[]): [V3, V3] {
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const s of list) for (let i = 0; i < 3; i++) {
    min[i] = Math.min(min[i], s.min[i]);
    max[i] = Math.max(max[i], s.max[i]);
  }
  return [min, max];
}

/** smooth union: k is the blend radius in metres */
export function blend(k: number, ...list: Shape[]): Shape {
  const [min, max] = joinBounds(list);
  const s: Shape = {
    min: [min[0] - k, min[1] - k, min[2] - k], max: [max[0] + k, max[1] + k, max[2] + k],
    d(p) {
      let d = Infinity;
      for (const c of list) {
        const b = boundsDist(c, p);
        if (b > d + k) continue;
        const e = c.d(p);
        if (k <= 0) { d = Math.min(d, e); continue; }
        const h = clamp(0.5 + (0.5 * (e - d)) / k, 0, 1);
        d = d === Infinity ? e : mix(e, d, h) - k * h * (1 - h);
      }
      return d;
    },
    m(p) {
      // material of the closest member
      let best = Infinity, mat = 0;
      for (const c of list) {
        if (boundsDist(c, p) > best) continue;
        const e = c.d(p);
        if (e < best) { best = e; mat = c.m(p); }
      }
      return mat;
    },
  };
  return s;
}
export const union = (...list: Shape[]) => blend(0, ...list);

/** carve b out of a, with a soft edge of radius k */
export function carve(a: Shape, b: Shape, k = 0): Shape {
  return {
    min: a.min, max: a.max, m: a.m,
    d(p) {
      const da = a.d(p);
      if (boundsDist(b, p) > Math.max(0.02, k)) return da;
      const db = -b.d(p);
      if (k <= 0) return Math.max(da, db);
      // smooth max(da, db): h = 1 picks da, h = 0 picks db
      const h = clamp(0.5 - (0.5 * (db - da)) / k, 0, 1);
      return mix(db, da, h) + k * h * (1 - h);
    },
  };
}

/** mirror across the x = 0 plane (build one side, get both) */
export function mirrorX(s: Shape): Shape {
  const ax = Math.max(Math.abs(s.min[0]), Math.abs(s.max[0]));
  return {
    min: [-ax, s.min[1], s.min[2]], max: [ax, s.max[1], s.max[2]],
    d: (p) => s.d([Math.abs(p[0]), p[1], p[2]]),
    m: (p) => s.m([Math.abs(p[0]), p[1], p[2]]),
  };
}

/** displace the surface, e.g. cloth folds; amp is in metres */
export function displace(s: Shape, amp: number, fn: (p: V3) => number): Shape {
  return {
    min: [s.min[0] - amp, s.min[1] - amp, s.min[2] - amp], max: [s.max[0] + amp, s.max[1] + amp, s.max[2] + amp],
    d: (p) => s.d(p) + amp * fn(p),
    m: s.m,
  };
}

/** paint a different material inside a region without changing the shape */
export function paint(s: Shape, region: (p: V3) => boolean, mat: number): Shape {
  return { ...s, m: (p) => (region(p) ? mat : s.m(p)) };
}

/** rotate a shape about the y axis by `a` radians around point c */
export function rotateY(s: Shape, a: number, c: V3 = [0, 0, 0]): Shape {
  const cs = Math.cos(a), sn = Math.sin(a);
  const inv = (p: V3): V3 => {
    const x = p[0] - c[0], z = p[2] - c[2];
    return [c[0] + cs * x - sn * z, p[1], c[2] + sn * x + cs * z];
  };
  const r = Math.max(s.max[0] - c[0], c[0] - s.min[0], s.max[2] - c[2], c[2] - s.min[2]);
  return { min: [c[0] - r, s.min[1], c[2] - r], max: [c[0] + r, s.max[1], c[2] + r], d: (p) => s.d(inv(p)), m: (p) => s.m(inv(p)) };
}
