// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, portico round 4); regenerate rather than hand-edit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './kit';
import type { MatName } from './kit';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const SPHERE = new THREE.SphereGeometry(1, 8, 5);
const SPHERE_FINE = new THREE.SphereGeometry(1, 10, 7);
const SPHERE_LOW = new THREE.SphereGeometry(1, 5, 3);
const CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 10, 1, false);

const SEATED_HEIGHT = 0.88;
const STANDING_HEIGHT = 1.55;
const STUPA_HEIGHT = 0.88;

const COLUMN_SHAFT = new THREE.LatheGeometry([
  new THREE.Vector2(1.10, 0),
  new THREE.Vector2(1.10, 0.035),
  new THREE.Vector2(0.88, 0.075),
  new THREE.Vector2(0.80, 0.14),
  new THREE.Vector2(0.78, 0.67),
  new THREE.Vector2(0.98, 0.71),
  new THREE.Vector2(0.98, 0.76),
  new THREE.Vector2(0.80, 0.80),
  new THREE.Vector2(0.82, 0.88),
  new THREE.Vector2(1.08, 0.93),
  new THREE.Vector2(1.08, 1),
], 10);

function pose(
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = sx,
  sz = sx,
): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    q,
    new THREE.Vector3(sx, sy, sz),
  );
}

function flatClone(g: THREE.BufferGeometry): THREE.BufferGeometry {
  return g.index ? g.toNonIndexed() : g.clone();
}

function transformed(g: THREE.BufferGeometry, m: THREE.Matrix4): THREE.BufferGeometry {
  const c = flatClone(g);
  c.applyMatrix4(m);
  return c;
}

function part(
  g: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = sx,
  sz = sx,
): THREE.BufferGeometry {
  return transformed(g, pose(x, y, z, rx, ry, rz, sx, sy, sz));
}

function boxPart(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): THREE.BufferGeometry {
  return part(BOX, x, y, z, 0, 0, 0, w, h, d);
}

function fused(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometries = parts.map((g) => flatClone(g));
  const merged = mergeGeometries(geometries, false);
  if (!merged) throw new Error('Could not merge porch geometry');
  return merged;
}

function limb(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  radius: number,
): THREE.BufferGeometry {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const direction = b.clone().sub(a);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.92, length, 7, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  const m = new THREE.Matrix4().compose(
    a.clone().add(b).multiplyScalar(0.5),
    q,
    new THREE.Vector3(1, 1, 1),
  );
  return transformed(geometry, m);
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function tracePointedArch(
  path: THREE.Path,
  w: number,
  h: number,
  base: number,
  reverse: boolean,
): void {
  const half = w / 2;
  const top = base + h;
  const spring = top - w * 0.58;
  const shoulder = top - w * 0.16;

  if (!reverse) {
    path.moveTo(-half, base);
    path.lineTo(half, base);
    path.lineTo(half, spring);
    path.quadraticCurveTo(half, shoulder, 0, top);
    path.quadraticCurveTo(-half, shoulder, -half, spring);
    path.lineTo(-half, base);
  } else {
    path.moveTo(-half, base);
    path.lineTo(-half, spring);
    path.quadraticCurveTo(-half, shoulder, 0, top);
    path.quadraticCurveTo(half, shoulder, half, spring);
    path.lineTo(half, base);
    path.lineTo(-half, base);
  }
  path.closePath();
}

function traceRoundArch(
  path: THREE.Path,
  w: number,
  h: number,
  base: number,
  reverse: boolean,
): void {
  const half = w / 2;
  const spring = base + h - half;

  if (!reverse) {
    path.moveTo(-half, base);
    path.lineTo(half, base);
    path.lineTo(half, spring);
    path.absarc(0, spring, half, 0, Math.PI, false);
    path.lineTo(-half, base);
  } else {
    path.moveTo(-half, base);
    path.lineTo(-half, spring);
    path.absarc(0, spring, half, Math.PI, 0, true);
    path.lineTo(half, base);
    path.lineTo(-half, base);
  }
  path.closePath();
}

function traceArch(
  path: THREE.Path,
  w: number,
  h: number,
  base: number,
  reverse: boolean,
  pointed: boolean,
): void {
  if (pointed) tracePointedArch(path, w, h, base, reverse);
  else traceRoundArch(path, w, h, base, reverse);
}

function archShape(w: number, h: number, base = 0, pointed = true): THREE.Shape {
  const shape = new THREE.Shape();
  traceArch(shape, w, h, base, false, pointed);
  return shape;
}

function extrude(shape: THREE.Shape, depth: number, curveSegments = 6): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: false,
    curveSegments,
  });
}

function archBackGeometry(w: number, h: number, pointed = true): THREE.ShapeGeometry {
  return new THREE.ShapeGeometry(archShape(w, h, 0, pointed), 8);
}

function archFrameGeometry(
  outerW: number,
  outerH: number,
  innerW: number,
  innerH: number,
  depth: number,
  innerBase = 0.08,
  pointed = true,
): THREE.ExtrudeGeometry {
  const shape = archShape(outerW, outerH, 0, pointed);
  const hole = new THREE.Path();
  traceArch(hole, innerW, innerH, innerBase, true, pointed);
  shape.holes.push(hole);
  return extrude(shape, depth, 8);
}

function rectWithArchHole(
  w: number,
  h: number,
  openingW: number,
  openingH: number,
  openingBase: number,
  depth: number,
  pointed = true,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h);
  shape.lineTo(-w / 2, h);
  shape.closePath();

  const hole = new THREE.Path();
  traceArch(hole, openingW, openingH, openingBase, true, pointed);
  shape.holes.push(hole);
  return extrude(shape, depth, 8);
}

function rectWithCircleHole(
  w: number,
  h: number,
  radius: number,
  centreY: number,
  depth: number,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h);
  shape.lineTo(-w / 2, h);
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, centreY, radius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return extrude(shape, depth, 10);
}

function rectFrameGeometry(
  outerW: number,
  outerH: number,
  innerW: number,
  innerH: number,
  depth: number,
  innerBase = 0.025,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-outerW / 2, 0);
  shape.lineTo(outerW / 2, 0);
  shape.lineTo(outerW / 2, outerH);
  shape.lineTo(-outerW / 2, outerH);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-innerW / 2, innerBase);
  hole.lineTo(-innerW / 2, innerBase + innerH);
  hole.lineTo(innerW / 2, innerBase + innerH);
  hole.lineTo(innerW / 2, innerBase);
  hole.closePath();
  shape.holes.push(hole);
  return extrude(shape, depth, 1);
}

/** The pointed outer order begins above the rectangular walkable opening. */
function porchArchRingGeometry(): THREE.ExtrudeGeometry {
  const half = 1.32;
  const spring = 3.42;
  const shoulder = 3.80;
  const apex = 4.02;

  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(half, spring);
  shape.quadraticCurveTo(half, shoulder, 0, apex);
  shape.quadraticCurveTo(-half, shoulder, -half, spring);
  shape.lineTo(-half, 0);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-0.93, 0.025);
  hole.lineTo(-0.93, 3.38);
  hole.lineTo(0.93, 3.38);
  hole.lineTo(0.93, 0.025);
  hole.closePath();
  shape.holes.push(hole);

  return extrude(shape, 0.12, 10);
}

function archLineGeometry(
  w: number,
  h: number,
  base: number,
  radius: number,
  pointed = true,
): THREE.TubeGeometry {
  const half = w / 2;

  if (pointed) {
    const top = base + h;
    const spring = top - w * 0.58;
    const shoulder = top - w * 0.16;
    const path = new THREE.CurvePath<THREE.Vector3>();

    path.add(new THREE.LineCurve3(
      new THREE.Vector3(-half, base, 0),
      new THREE.Vector3(-half, spring, 0),
    ));
    path.add(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-half, spring, 0),
      new THREE.Vector3(-half, shoulder, 0),
      new THREE.Vector3(0, top, 0),
    ));
    path.add(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, top, 0),
      new THREE.Vector3(half, shoulder, 0),
      new THREE.Vector3(half, spring, 0),
    ));
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(half, spring, 0),
      new THREE.Vector3(half, base, 0),
    ));

    return new THREE.TubeGeometry(path, 44, radius, 5, false);
  }

  const spring = base + h - half;
  const points: THREE.Vector3[] = [
    new THREE.Vector3(-half, base, 0),
    new THREE.Vector3(-half, spring, 0),
  ];

  for (let i = 1; i <= 24; i++) {
    const a = Math.PI - i * Math.PI / 24;
    points.push(new THREE.Vector3(
      Math.cos(a) * half,
      spring + Math.sin(a) * half,
      0,
    ));
  }
  points.push(new THREE.Vector3(half, base, 0));

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  return new THREE.TubeGeometry(curve, 52, radius, 5, false);
}

function archBeadGeometry(
  w: number,
  h: number,
  base: number,
  radius: number,
  pointed: boolean,
): THREE.BufferGeometry {
  const points: Array<[number, number]> = [];
  const half = w / 2;

  if (pointed) {
    const top = base + h;
    const spring = top - w * 0.58;
    const shoulder = top - w * 0.16;

    for (const side of [-1, 1]) {
      for (let i = 1; i <= 4; i++) {
        points.push([
          side * half,
          base + (spring - base) * i / 5,
        ]);
      }
    }

    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      const u = 1 - t;
      points.push([
        -half * u * u,
        u * u * spring + 2 * u * t * shoulder + t * t * top,
      ]);
    }
    for (let i = 9; i >= 0; i--) {
      const t = i / 9;
      const u = 1 - t;
      points.push([
        half * u * u,
        u * u * spring + 2 * u * t * shoulder + t * t * top,
      ]);
    }
  } else {
    const spring = base + h - half;

    for (const side of [-1, 1]) {
      for (let i = 1; i <= 4; i++) {
        points.push([
          side * half,
          base + (spring - base) * i / 5,
        ]);
      }
    }

    for (let i = 0; i <= 14; i++) {
      const a = Math.PI - i * Math.PI / 14;
      points.push([
        Math.cos(a) * half,
        spring + Math.sin(a) * half,
      ]);
    }
  }

  const pieces: THREE.BufferGeometry[] = [];
  for (const point of points) {
    pieces.push(part(
      SPHERE_LOW,
      point[0],
      point[1],
      0,
      0,
      0,
      0,
      radius,
      radius,
      radius * 0.75,
    ));
  }
  return fused(pieces);
}

/** A concave circular stone niche, with its rim towards +z. */
function dishGeometry(
  radius: number,
  depth: number,
  rings: number,
  segments: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const rr = radius * t;
    const z = depth * t * t;

    for (let i = 0; i <= segments; i++) {
      const a = i * Math.PI * 2 / segments;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      positions.push(x, y, z);
      uvs.push(x / (radius * 2) + 0.5, y / (radius * 2) + 0.5);
    }
  }

  for (let r = 0; r < rings; r++) {
    for (let i = 0; i < segments; i++) {
      const a = r * (segments + 1) + i;
      const b = (r + 1) * (segments + 1) + i;
      const c = b + 1;
      const d = a + 1;
      indices.push(a, b, c, a, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function makeSeatedBuddha(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];

  p.push(boxPart(0.62, 0.065, 0.34, 0, 0.0325, 0));
  p.push(part(new THREE.CylinderGeometry(0.27, 0.30, 0.055, 12), 0, 0.095, 0));
  p.push(part(SPHERE, -0.13, 0.205, 0.035, 0, 0, -0.10, 0.235, 0.080, 0.125));
  p.push(part(SPHERE, 0.13, 0.205, 0.035, 0, 0, 0.10, 0.235, 0.080, 0.125));
  p.push(part(SPHERE, 0, 0.415, -0.005, 0, 0, 0, 0.145, 0.225, 0.10));
  p.push(part(SPHERE, 0, 0.525, 0, 0, 0, 0, 0.192, 0.070, 0.095));

  p.push(limb(-0.155, 0.52, 0.015, -0.205, 0.345, 0.085, 0.036));
  p.push(limb(-0.205, 0.345, 0.085, -0.19, 0.215, 0.155, 0.032));
  p.push(limb(0.155, 0.52, 0.015, 0.19, 0.335, 0.08, 0.036));
  p.push(limb(0.19, 0.335, 0.08, 0.025, 0.235, 0.16, 0.032));
  p.push(part(SPHERE_LOW, -0.19, 0.205, 0.16, 0, 0, 0, 0.037, 0.052, 0.026));
  p.push(part(SPHERE_LOW, 0.02, 0.232, 0.165, 0, 0, 0, 0.064, 0.027, 0.03));

  p.push(part(CYLINDER, 0, 0.59, 0, 0, 0, 0, 0.041, 0.065, 0.041));
  p.push(part(SPHERE_FINE, 0, 0.69, 0.012, 0, 0, 0, 0.088, 0.113, 0.083));
  p.push(part(SPHERE_LOW, -0.089, 0.685, 0.012, 0, 0, 0, 0.020, 0.047, 0.020));
  p.push(part(SPHERE_LOW, 0.089, 0.685, 0.012, 0, 0, 0, 0.020, 0.047, 0.020));
  p.push(part(SPHERE_LOW, 0, 0.687, 0.091, 0, 0, 0, 0.014, 0.025, 0.020));
  p.push(part(SPHERE_LOW, 0, 0.805, 0.005, 0, 0, 0, 0.041, 0.043, 0.038));

  const sash = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-0.12, 0.555, 0.085),
    new THREE.Vector3(-0.055, 0.47, 0.108),
    new THREE.Vector3(0.045, 0.38, 0.108),
    new THREE.Vector3(0.105, 0.31, 0.09),
  );
  p.push(new THREE.TubeGeometry(sash, 12, 0.010, 4, false));

  return fused(p);
}

/** The same silhouette at a much lower cost for sub-pixel votive images. */
function makeSmallSeatedBuddha(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  p.push(boxPart(0.58, 0.07, 0.30, 0, 0.035, 0));
  p.push(part(SPHERE_LOW, -0.12, 0.20, 0.035, 0, 0, -0.10, 0.22, 0.08, 0.12));
  p.push(part(SPHERE_LOW, 0.12, 0.20, 0.035, 0, 0, 0.10, 0.22, 0.08, 0.12));
  p.push(part(SPHERE_LOW, 0, 0.42, 0, 0, 0, 0, 0.15, 0.22, 0.10));
  p.push(part(SPHERE_LOW, 0, 0.53, 0, 0, 0, 0, 0.19, 0.065, 0.09));
  p.push(part(SPHERE_LOW, -0.18, 0.40, 0.055, 0, 0, -0.22, 0.035, 0.14, 0.035));
  p.push(part(SPHERE_LOW, 0.18, 0.40, 0.055, 0, 0, 0.22, 0.035, 0.14, 0.035));
  p.push(part(SPHERE_LOW, -0.10, 0.25, 0.13, 0, 0, -0.25, 0.10, 0.03, 0.03));
  p.push(part(SPHERE_LOW, 0.10, 0.25, 0.13, 0, 0, 0.25, 0.10, 0.03, 0.03));
  p.push(boxPart(0.065, 0.07, 0.065, 0, 0.59, 0));
  p.push(part(SPHERE_LOW, 0, 0.70, 0.012, 0, 0, 0, 0.09, 0.115, 0.085));
  p.push(part(SPHERE_LOW, 0, 0.815, 0.005, 0, 0, 0, 0.04, 0.045, 0.038));
  return fused(p);
}

function makeStandingBuddha(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];

  p.push(boxPart(0.43, 0.07, 0.28, 0, 0.035, 0));
  p.push(boxPart(0.12, 0.055, 0.21, -0.085, 0.102, 0.035));
  p.push(boxPart(0.12, 0.055, 0.21, 0.085, 0.102, 0.035));

  const robe = new THREE.LatheGeometry([
    new THREE.Vector2(0.165, 0.13),
    new THREE.Vector2(0.175, 0.19),
    new THREE.Vector2(0.155, 0.42),
    new THREE.Vector2(0.135, 0.70),
    new THREE.Vector2(0.12, 0.89),
    new THREE.Vector2(0.145, 1.03),
  ], 12);
  p.push(robe);

  p.push(part(SPHERE, 0, 1.035, 0, 0, 0, 0, 0.135, 0.19, 0.09));
  p.push(part(SPHERE, 0, 1.145, 0, 0, 0, 0, 0.18, 0.065, 0.09));
  p.push(limb(-0.15, 1.14, 0.01, -0.195, 0.93, 0.055, 0.034));
  p.push(limb(-0.195, 0.93, 0.055, -0.165, 0.72, 0.105, 0.030));
  p.push(limb(0.15, 1.14, 0.01, 0.205, 0.99, 0.07, 0.034));
  p.push(limb(0.205, 0.99, 0.07, 0.095, 1.055, 0.145, 0.030));
  p.push(part(SPHERE_LOW, -0.165, 0.70, 0.11, 0, 0, 0, 0.034, 0.052, 0.026));
  p.push(part(SPHERE_LOW, 0.09, 1.055, 0.15, 0, 0, 0, 0.04, 0.032, 0.025));

  p.push(part(CYLINDER, 0, 1.235, 0, 0, 0, 0, 0.038, 0.065, 0.038));
  p.push(part(SPHERE_FINE, 0, 1.355, 0.012, 0, 0, 0, 0.086, 0.108, 0.080));
  p.push(part(SPHERE_LOW, -0.087, 1.35, 0.012, 0, 0, 0, 0.019, 0.044, 0.019));
  p.push(part(SPHERE_LOW, 0.087, 1.35, 0.012, 0, 0, 0, 0.019, 0.044, 0.019));
  p.push(part(SPHERE_LOW, 0, 1.35, 0.088, 0, 0, 0, 0.013, 0.023, 0.018));
  p.push(part(SPHERE_LOW, 0, 1.468, 0.005, 0, 0, 0, 0.039, 0.043, 0.036));

  for (const x of [-0.085, -0.03, 0.03, 0.085]) {
    const fold = new THREE.CubicBezierCurve3(
      new THREE.Vector3(x * 0.55, 0.95, 0.115),
      new THREE.Vector3(x * 0.75, 0.70, 0.14),
      new THREE.Vector3(x, 0.40, 0.155),
      new THREE.Vector3(x * 1.15, 0.19, 0.16),
    );
    p.push(new THREE.TubeGeometry(fold, 12, 0.007, 4, false));
  }

  const sash = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-0.115, 1.17, 0.075),
    new THREE.Vector3(-0.025, 1.06, 0.105),
    new THREE.Vector3(0.055, 0.94, 0.12),
    new THREE.Vector3(0.105, 0.82, 0.125),
  );
  p.push(new THREE.TubeGeometry(sash, 12, 0.014, 4, false));

  return fused(p);
}

function makeSmallStandingBuddha(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  p.push(boxPart(0.40, 0.08, 0.26, 0, 0.04, 0));
  p.push(boxPart(0.11, 0.06, 0.20, -0.08, 0.11, 0.03));
  p.push(boxPart(0.11, 0.06, 0.20, 0.08, 0.11, 0.03));
  p.push(part(new THREE.CylinderGeometry(0.12, 0.17, 0.86, 8), 0, 0.56, 0));
  p.push(part(SPHERE_LOW, 0, 1.04, 0, 0, 0, 0, 0.135, 0.19, 0.09));
  p.push(part(SPHERE_LOW, 0, 1.15, 0, 0, 0, 0, 0.18, 0.065, 0.09));
  p.push(part(SPHERE_LOW, -0.18, 0.96, 0.04, 0, 0, -0.15, 0.035, 0.22, 0.035));
  p.push(part(SPHERE_LOW, 0.18, 1.05, 0.06, 0, 0, 0.40, 0.035, 0.18, 0.035));
  p.push(part(SPHERE_LOW, -0.17, 0.75, 0.09, 0, 0, 0, 0.035, 0.10, 0.03));
  p.push(part(SPHERE_LOW, 0.10, 1.04, 0.13, 0, 0, 1.0, 0.10, 0.03, 0.03));
  p.push(boxPart(0.06, 0.07, 0.06, 0, 1.235, 0));
  p.push(part(SPHERE_LOW, 0, 1.355, 0.012, 0, 0, 0, 0.086, 0.108, 0.08));
  p.push(part(SPHERE_LOW, 0, 1.468, 0.005, 0, 0, 0, 0.039, 0.043, 0.036));
  return fused(p);
}

function makeRosette(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];

  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    p.push(part(
      SPHERE_LOW,
      Math.cos(a) * 0.057,
      Math.sin(a) * 0.057,
      0,
      0,
      0,
      a - Math.PI / 2,
      0.027,
      0.064,
      0.018,
    ));
  }
  p.push(part(SPHERE_LOW, 0, 0, 0.008, 0, 0, 0, 0.034, 0.034, 0.022));
  return fused(p);
}

function makePetal(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.10, 0.045, 0.065, 0.125);
  s.quadraticCurveTo(0.03, 0.19, 0, 0.225);
  s.quadraticCurveTo(-0.03, 0.19, -0.065, 0.125);
  s.quadraticCurveTo(-0.10, 0.045, 0, 0);
  s.closePath();
  return extrude(s, 0.032, 3);
}

function makeStupa(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];

  p.push(boxPart(0.36, 0.07, 0.36, 0, 0.035, 0));
  p.push(boxPart(0.30, 0.06, 0.30, 0, 0.10, 0));
  p.push(boxPart(0.26, 0.05, 0.26, 0, 0.155, 0));
  p.push(part(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 10), 0, 0.24, 0));
  p.push(part(SPHERE, 0, 0.375, 0, 0, 0, 0, 0.14, 0.12, 0.14));
  p.push(part(new THREE.TorusGeometry(0.11, 0.018, 4, 12), 0, 0.465, 0, Math.PI / 2));
  p.push(boxPart(0.10, 0.06, 0.10, 0, 0.50, 0));

  for (let i = 0; i < 4; i++) {
    p.push(part(
      new THREE.CylinderGeometry(0.072 - i * 0.011, 0.078 - i * 0.011, 0.026, 8),
      0,
      0.555 + i * 0.058,
      0,
    ));
  }
  p.push(part(new THREE.ConeGeometry(0.035, 0.12, 8), 0, 0.82, 0));
  return fused(p);
}

function makeMask(): { stone: THREE.BufferGeometry; dark: THREE.BufferGeometry } {
  const stone: THREE.BufferGeometry[] = [];
  const dark: THREE.BufferGeometry[] = [];

  stone.push(part(SPHERE, 0, 0, 0, 0, 0, 0, 0.18, 0.14, 0.065));
  stone.push(part(SPHERE_LOW, -0.068, 0.022, 0.062, 0, 0, 0, 0.044, 0.033, 0.027));
  stone.push(part(SPHERE_LOW, 0.068, 0.022, 0.062, 0, 0, 0, 0.044, 0.033, 0.027));
  stone.push(part(new THREE.TorusGeometry(0.062, 0.012, 4, 8, Math.PI), -0.067, 0.061, 0.058));
  stone.push(part(new THREE.TorusGeometry(0.062, 0.012, 4, 8, Math.PI), 0.067, 0.061, 0.058));
  stone.push(part(new THREE.ConeGeometry(0.030, 0.09, 6), 0, -0.006, 0.10, Math.PI / 2));
  stone.push(part(new THREE.TorusGeometry(0.068, 0.016, 4, 9), -0.17, 0.005, 0));
  stone.push(part(new THREE.TorusGeometry(0.068, 0.016, 4, 9), 0.17, 0.005, 0));

  for (let i = 0; i < 4; i++) {
    stone.push(boxPart(0.027, 0.038, 0.022, -0.047 + i * 0.032, -0.083, 0.071));
  }

  stone.push(part(new THREE.ConeGeometry(0.012, 0.048, 5), -0.062, -0.10, 0.083, 0, 0, Math.PI));
  stone.push(part(new THREE.ConeGeometry(0.012, 0.048, 5), 0.062, -0.10, 0.083, 0, 0, Math.PI));
  stone.push(part(PETAL, 0, 0.075, 0.005, 0, 0, 0, 0.50));
  stone.push(part(PETAL, -0.075, 0.065, 0, 0, 0, 0.35, 0.40));
  stone.push(part(PETAL, 0.075, 0.065, 0, 0, 0, -0.35, 0.40));

  dark.push(boxPart(0.036, 0.009, 0.010, -0.068, 0.022, 0.089));
  dark.push(boxPart(0.036, 0.009, 0.010, 0.068, 0.022, 0.089));
  dark.push(boxPart(0.125, 0.018, 0.012, 0, -0.063, 0.068));

  return { stone: fused(stone), dark: fused(dark) };
}

const SEATED = makeSeatedBuddha();
const SMALL_SEATED = makeSmallSeatedBuddha();
const STANDING = makeStandingBuddha();
const SMALL_STANDING = makeSmallStandingBuddha();
const ROSETTE = makeRosette();
const PETAL = makePetal();
const STUPA = makeStupa();
const MASK = makeMask();
const SCROLL = new THREE.TorusGeometry(0.058, 0.011, 4, 10, Math.PI * 1.65);
const STUPA_NICHE = new THREE.PlaneGeometry(0.072, 0.105);

export function build(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Mahabodhi east entrance porch';

  const buckets = new Map<MatName, THREE.BufferGeometry[]>();
  const rnd = seeded(731942);

  function put(g: THREE.BufferGeometry, name: MatName, m: THREE.Matrix4): void {
    let list = buckets.get(name);
    if (!list) {
      list = [];
      buckets.set(name, list);
    }
    list.push(transformed(g, m));
  }

  function putBox(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    name: MatName = 'stucco',
  ): void {
    put(BOX, name, pose(x, y, z, 0, 0, 0, w, h, d));
  }

  function horizontalRoll(
    length: number,
    x: number,
    y: number,
    z: number,
    radius: number,
    name: MatName = 'sandstone',
  ): void {
    put(CYLINDER, name, pose(x, y, z, 0, 0, Math.PI / 2, radius, length, radius));
  }

  function seated(
    x: number,
    baseY: number,
    z: number,
    height: number,
    name: MatName,
    ry = 0,
  ): void {
    const s = height / SEATED_HEIGHT;
    const geometry = height < 0.68 ? SMALL_SEATED : SEATED;
    put(geometry, name, pose(x, baseY, z, 0, ry, 0, s));
  }

  function standing(
    x: number,
    baseY: number,
    z: number,
    height: number,
    name: MatName,
    ry = 0,
  ): void {
    const s = height / STANDING_HEIGHT;
    const geometry = height < 0.90 ? SMALL_STANDING : STANDING;
    const width = height > 1.30 ? 1.10 : 1;
    put(geometry, name, pose(x, baseY, z, 0, ry, 0, s * width, s, s));
  }

  function stupa(x: number, baseY: number, z: number, height: number): void {
    const s = height / STUPA_HEIGHT;
    put(STUPA, 'sandstone', pose(x, baseY, z, 0, 0, 0, s));

    if (height >= 0.38) {
      put(
        STUPA_NICHE,
        'dark',
        pose(x, baseY + 0.36 * s, z + 0.142 * s, 0, 0, 0, s),
      );
      put(
        SPHERE_LOW,
        'gold',
        pose(x, baseY + 0.35 * s, z + 0.148 * s, 0, 0, 0, 0.025 * s, 0.035 * s, 0.015 * s),
      );
    }
  }

  function frontPilaster(
    x: number,
    baseY: number,
    height: number,
    z: number,
    scale: number,
  ): void {
    const r = 0.09 * scale;

    putBox(0.30 * scale, 0.11 * scale, 0.26 * scale, x, baseY + 0.055 * scale, z, 'sandstone');
    putBox(0.24 * scale, 0.09 * scale, 0.22 * scale, x, baseY + 0.15 * scale, z, 'sandstone');

    const shaftBase = baseY + 0.19 * scale;
    const shaftHeight = height - 0.40 * scale;
    put(COLUMN_SHAFT, 'sandstone', pose(x, shaftBase, z, 0, 0, 0, r, shaftHeight, r));

    for (let i = 0; i < 3; i++) {
      const yy = shaftBase + shaftHeight * (0.23 + i * 0.22);
      put(
        new THREE.TorusGeometry(r * 0.93, 0.016 * scale, 4, 10),
        'sandstone',
        pose(x, yy, z, Math.PI / 2),
      );
    }

    put(
      SPHERE,
      'sandstone',
      pose(x, baseY + height - 0.18 * scale, z, 0, 0, 0, 0.145 * scale, 0.085 * scale, 0.115 * scale),
    );
    putBox(0.30 * scale, 0.10 * scale, 0.26 * scale, x, baseY + height - 0.05 * scale, z, 'sandstone');
  }

  // Low threshold and side plinths stay outside the walking volume.
  putBox(6.40, 0.04, 4.20, 0, 0.02, 2.10, 'granite');
  for (const side of [-1, 1]) {
    putBox(2.00, 0.16, 0.34, side * 2.20, 0.12, 4.01, 'sandstone');
    putBox(0.20, 0.18, 4.20, side * 3.10, 0.13, 2.10, 'sandstone');
    putBox(0.16, 0.08, 4.10, side * 3.08, 0.26, 2.05, 'stucco');

    for (let i = 0; i < 11; i++) {
      put(
        PETAL,
        'sandstone',
        pose(side * (1.38 + i * 0.155), 0.28, 4.14, 0, 0, Math.PI, 0.43),
      );
    }
  }

  // Deep lower porch and shaded vestibule.
  for (const side of [-1, 1]) {
    putBox(1.82, 3.40, 3.60, side * 2.17, 1.90, 1.80, 'stucco');
    putBox(0.10, 3.37, 3.58, side * 1.20, 1.725, 1.80, 'dark');
  }
  putBox(2.50, 0.20, 3.70, 0, 3.53, 1.85, 'stucco');
  putBox(2.36, 0.04, 3.58, 0, 3.42, 1.80, 'dark');
  put(new THREE.PlaneGeometry(2.34, 3.58), 'dark', pose(0, 1.79, -0.22));

  // Large rounded lower niches with carved stelae, halos and standing images.
  const lowerWall = rectWithArchHole(1.82, 3.36, 1.10, 2.55, 0.38, 0.28, false);
  const lowerFrame = archFrameGeometry(1.46, 2.86, 1.10, 2.55, 0.14, 0.10, false);
  const lowerBack = archBackGeometry(1.10, 2.55, false);
  const lowerStele = archBackGeometry(0.66, 2.02, false);
  const lowerArchLine = archLineGeometry(1.16, 2.61, 0, 0.017, false);
  const lowerOuterFrame = archFrameGeometry(1.62, 3.00, 1.45, 2.84, 0.055, 0.07, false);
  const lowerBeads = archBeadGeometry(1.18, 2.63, 0, 0.015, false);
  const lowerHalo = new THREE.TorusGeometry(0.17, 0.018, 4, 20);

  for (const side of [-1, 1]) {
    const x = side * 2.17;

    put(lowerWall, 'stucco', pose(x, 0.20, 3.69));
    put(lowerBack, 'stucco', pose(x, 0.58, 3.615));
    put(lowerStele, 'granite', pose(x, 0.60, 3.665));
    put(lowerFrame, 'sandstone', pose(x, 0.48, 3.94));
    put(lowerArchLine, 'sandstone', pose(x, 0.56, 4.105));
    put(lowerOuterFrame, 'stucco', pose(x, 0.41, 4.055));
    put(lowerBeads, 'sandstone', pose(x, 0.55, 4.125));

    standing(x, 0.62, 3.74, 2.04, 'granite');
    put(lowerHalo, 'sandstone', pose(x, 2.42, 3.69));
    putBox(0.54, 0.08, 0.24, x, 0.60, 3.77, 'sandstone');

    for (const dx of [-0.60, 0.60]) {
      put(ROSETTE, 'sandstone', pose(x + dx, 3.18, 4.135, 0, 0, 0, 0.58));
    }
  }

  // Nested stone portal, deep intermediate reveal and gilded inner frame.
  put(porchArchRingGeometry(), 'sandstone', pose(0, 0, 3.79));
  put(rectFrameGeometry(2.70, 3.62, 1.86, 3.365, 0.20, 0.02), 'granite', pose(0, 0, 3.95));
  put(rectFrameGeometry(2.94, 3.72, 2.10, 3.49, 0.05, 0.02), 'sandstone', pose(0, 0, 4.14));
  put(rectFrameGeometry(2.20, 3.58, 1.76, 3.33, 0.12, 0.025), 'granite', pose(0, 0, 2.20));

  put(rectFrameGeometry(2.46, 3.58, 2.08, 3.39, 0.14, 0.025), 'granite', pose(0, 0, 0.035));
  put(rectFrameGeometry(2.16, 3.52, 1.82, 3.34, 0.065, 0.025), 'gold', pose(0, 0, 0.18));
  put(rectFrameGeometry(1.94, 3.43, 1.82, 3.34, 0.025, 0.025), 'gold', pose(0, 0, 0.25));

  for (const side of [-1, 1]) {
    putBox(0.14, 3.35, 0.15, side * 1.075, 1.70, 4.10, 'granite');
    putBox(0.08, 3.34, 0.07, side * 1.03, 1.69, 4.19, 'granite');

    // Long vertical jamb fillets and masonry joints, as on the real stone portal.
    putBox(0.23, 3.34, 0.045, side * 1.25, 1.69, 4.175, 'stucco');
    putBox(0.035, 3.30, 0.035, side * 1.25 - 0.070, 1.69, 4.21, 'sandstone');
    putBox(0.035, 3.30, 0.035, side * 1.25 + 0.070, 1.69, 4.21, 'sandstone');

    for (let i = 0; i < 7; i++) {
      putBox(0.23, 0.012, 0.012, side * 1.25, 0.40 + i * 0.44, 4.205, 'granite');
    }
    put(ROSETTE, 'sandstone', pose(side * 1.25, 3.30, 4.225, 0, 0, 0, 0.62));
  }

  putBox(2.28, 0.16, 0.12, 0, 3.54, 4.09, 'sandstone');
  for (let i = 0; i < 7; i++) {
    put(ROSETTE, 'stucco', pose(-0.72 + i * 0.24, 3.60, 4.17, 0, 0, 0, 0.58));
  }

  for (const x of [-3.02, -1.43, 1.43, 3.02]) {
    frontPilaster(x, 0.26, 3.16, 4.035, 0.75);
  }

  // Deep continuous lower entablature with roll mouldings and mask brackets.
  putBox(6.26, 0.54, 0.38, 0, 3.90, 3.78, 'stucco');
  putBox(6.34, 0.12, 0.34, 0, 3.58, 3.98, 'sandstone');
  putBox(6.24, 0.08, 0.25, 0, 3.69, 3.96, 'stucco');
  horizontalRoll(6.28, 0, 3.575, 4.17, 0.040);

  for (let i = 0; i <= 42; i++) {
    const x = -3.02 + i * 6.04 / 42;
    const r = 0.027 + rnd() * 0.005;
    put(SPHERE_LOW, 'sandstone', pose(x, 3.72, 4.155, 0, 0, 0, r, r, r * 0.75));
  }

  for (let i = 0; i < 7; i++) {
    const x = -2.70 + i * 0.90;
    putBox(0.43, 0.40, 0.25, x, 3.88, 4.015, 'stucco');
    put(MASK.stone, 'sandstone', pose(x, 3.88, 4.105, 0, 0, 0, 0.94));
    put(MASK.dark, 'dark', pose(x, 3.88, 4.105, 0, 0, 0, 0.94));
  }

  for (let i = 0; i < 31; i++) {
    putBox(0.105, 0.105, 0.14, -2.94 + i * 0.196, 4.025, 4.055, 'stucco');
  }
  for (let i = 0; i < 46; i++) {
    const x = -3.02 + i * 6.04 / 45;
    put(PETAL, 'sandstone', pose(x, 4.17, 4.15, 0, 0, Math.PI + (rnd() - 0.5) * 0.035, 0.52));
  }

  putBox(6.40, 0.11, 0.40, 0, 4.225, 3.98, 'sandstone');
  putBox(6.24, 0.07, 0.30, 0, 4.315, 3.93, 'stucco');
  horizontalRoll(6.30, 0, 4.235, 4.20, 0.042);

  for (const side of [-1, 1]) {
    putBox(0.20, 0.12, 4.10, side * 3.10, 3.58, 2.05, 'sandstone');
    putBox(0.20, 0.48, 3.75, side * 3.09, 3.92, 1.90, 'stucco');
    putBox(0.20, 0.12, 4.10, side * 3.10, 4.225, 2.05, 'sandstone');
  }

  // First upper storey and the projecting central medallion slab.
  putBox(6.18, 2.43, 2.72, 0, 5.515, 1.36, 'stucco');
  putBox(6.12, 2.34, 0.90, 0, 5.50, 3.13, 'stucco');

  const medallionPanel = rectWithCircleHole(2.34, 2.30, 0.80, 1.15, 0.42);
  put(medallionPanel, 'sandstone', pose(0, 4.37, 3.66));

  const rightShoulder = new THREE.Shape();
  rightShoulder.moveTo(1.15, 4.37);
  rightShoulder.lineTo(1.57, 4.37);
  rightShoulder.lineTo(1.38, 6.64);
  rightShoulder.lineTo(1.15, 6.64);
  rightShoulder.closePath();
  put(extrude(rightShoulder, 0.20, 1), 'sandstone', pose(0, 0, 3.90));

  const leftShoulder = new THREE.Shape();
  leftShoulder.moveTo(-1.15, 4.37);
  leftShoulder.lineTo(-1.15, 6.64);
  leftShoulder.lineTo(-1.38, 6.64);
  leftShoulder.lineTo(-1.57, 4.37);
  leftShoulder.closePath();
  put(extrude(leftShoulder, 0.20, 1), 'sandstone', pose(0, 0, 3.90));

  put(dishGeometry(0.805, 0.28, 6, 40), 'stucco', pose(0, 5.52, 3.76));
  put(new THREE.TorusGeometry(0.825, 0.034, 6, 40), 'sandstone', pose(0, 5.52, 4.055));
  put(new THREE.TorusGeometry(0.878, 0.017, 5, 40), 'stucco', pose(0, 5.52, 4.065));
  seated(0, 4.72, 3.87, 1.18, 'granite');

  putBox(2.42, 0.09, 0.20, 0, 4.39, 4.02, 'sandstone');
  putBox(2.46, 0.08, 0.20, 0, 6.66, 4.00, 'sandstone');

  for (let i = 0; i < 12; i++) {
    const x = -0.99 + i * 0.18;
    put(SCROLL, 'sandstone', pose(x, 4.49, 4.115, 0, 0, i % 2 ? Math.PI : 0));
  }

  // Small gilded images at the feet of the sloping medallion shoulders.
  for (const side of [-1, 1]) {
    const x = side * 1.40;
    put(dishGeometry(0.19, 0.06, 3, 20), 'stucco', pose(x, 4.99, 4.105));
    put(new THREE.TorusGeometry(0.198, 0.021, 4, 20), 'sandstone', pose(x, 4.99, 4.17));
    seated(x, 4.76, 4.15, 0.38, 'gold');
  }

  // Flanking chaitya arches with two image levels and beaded mouldings.
  const firstSideFrame = archFrameGeometry(1.34, 1.95, 0.92, 1.62, 0.15, 0.10, true);
  const firstSideBack = archBackGeometry(0.92, 1.62, true);
  const firstSideLine = archLineGeometry(1.00, 1.70, 0, 0.016, true);
  const firstSideBeads = archBeadGeometry(1.02, 1.72, 0, 0.012, true);

  for (const side of [-1, 1]) {
    const x = side * 2.20;

    put(firstSideBack, 'sandstone', pose(x, 4.53, 3.60));
    put(firstSideFrame, 'sandstone', pose(x, 4.43, 3.66));
    put(firstSideLine, 'stucco', pose(x, 4.51, 3.83));
    put(firstSideBeads, 'sandstone', pose(x, 4.50, 3.845));

    for (const dx of [-0.62, 0.62]) {
      putBox(0.22, 0.12, 0.17, x + dx, 5.79, 3.79, 'sandstone');
      put(ROSETTE, 'stucco', pose(x + dx, 5.88, 3.87, 0, 0, 0, 0.66));
    }
    put(PETAL, 'stucco', pose(x, 6.18, 3.83, 0, 0, 0, 0.70));

    seated(x, 4.60, 3.69, 0.56, 'gold');
    standing(x, 5.32, 3.70, 0.76, 'stucco');
    put(ROSETTE, 'stucco', pose(x, 6.23, 3.84, 0, 0, 0, 0.62));
  }

  for (const x of [-3.00, 3.00]) {
    frontPilaster(x, 4.38, 2.24, 3.82, 0.80);
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      put(
        SCROLL,
        'sandstone',
        pose(side * (1.62 + i * 0.16), 4.42, 3.80, 0, 0, i % 2 ? Math.PI : 0, 0.85),
      );
    }
  }

  // Backed upper cornice with a downward lotus course and heavy rounded edges.
  putBox(6.22, 0.43, 0.40, 0, 6.94, 3.68, 'stucco');
  putBox(6.30, 0.11, 0.42, 0, 6.72, 3.77, 'sandstone');
  horizontalRoll(6.28, 0, 6.72, 4.005, 0.040);

  for (let i = 0; i < 40; i++) {
    const x = -2.98 + i * 5.96 / 39;
    put(PETAL, 'sandstone', pose(x, 6.91, 3.955, 0, 0, Math.PI, 0.50));
  }
  for (let i = 0; i < 31; i++) {
    putBox(0.11, 0.12, 0.16, -2.94 + i * 0.196, 7.005, 3.94, 'stucco');
  }
  putBox(6.36, 0.10, 0.50, 0, 7.13, 3.78, 'sandstone');
  horizontalRoll(6.30, 0, 7.14, 4.045, 0.040);

  const stupaXs = [-2.75, -2.05, -1.35, -0.65, 0, 0.65, 1.35, 2.05, 2.75];
  const stupaHeights = [0.55, 0.61, 0.64, 0.49, 0.79, 0.49, 0.64, 0.61, 0.55];

  for (let i = 0; i < stupaXs.length; i++) {
    const variation = i === 4 ? 1 : 0.97 + rnd() * 0.05;
    stupa(stupaXs[i], 7.18, 3.82, stupaHeights[i] * variation);
  }
  for (const side of [-1, 1]) {
    stupa(side * 2.80, 6.80, 2.95, 0.43);
    stupa(side * 2.80, 6.80, 2.30, 0.39);
  }

  // Solid stepped plinth closes the former gap between upper storeys.
  putBox(5.50, 0.52, 3.30, 0, 6.99, 1.65, 'stucco');

  // Shallow rear core, projecting side wings and central aedicule.
  putBox(5.50, 1.90, 1.80, 0, 8.20, 0.90, 'stucco');
  for (const side of [-1, 1]) {
    putBox(1.38, 1.86, 1.52, side * 2.05, 8.19, 2.54, 'stucco');
  }
  putBox(1.84, 2.36, 1.74, 0, 8.42, 2.63, 'stucco');

  const upperSideWall = rectWithArchHole(1.22, 1.55, 0.66, 1.10, 0.12, 0.16, false);
  const upperSideFrame = archFrameGeometry(0.94, 1.38, 0.66, 1.10, 0.11, 0.08, false);
  const upperSideBack = archBackGeometry(0.66, 1.10, false);

  for (const side of [-1, 1]) {
    const x = side * 2.05;

    put(upperSideWall, 'stucco', pose(x, 7.26, 3.31));
    put(upperSideBack, 'stucco', pose(x, 7.38, 3.32));
    put(upperSideFrame, 'sandstone', pose(x, 7.30, 3.45));

    putBox(0.72, 0.07, 0.22, x, 7.40, 3.40, 'sandstone');
    seated(x - 0.19, 7.43, 3.38, 0.24, 'stucco');
    seated(x, 7.43, 3.39, 0.30, 'gold');
    seated(x + 0.19, 7.43, 3.38, 0.24, 'stucco');

    put(dishGeometry(0.225, 0.12, 4, 24), 'stucco', pose(x, 8.88, 3.31));
    put(new THREE.TorusGeometry(0.235, 0.027, 5, 24), 'sandstone', pose(x, 8.88, 3.435));
    seated(x, 8.66, 3.38, 0.38, 'gold');

    putBox(1.34, 0.08, 0.20, x, 7.29, 3.45, 'sandstone');
    putBox(1.34, 0.08, 0.20, x, 8.65, 3.43, 'sandstone');
  }

  for (const x of [-2.83, -1.24, 1.24, 2.83]) {
    frontPilaster(x, 7.26, 1.78, 3.44, 0.70);
  }

  // Small upper doorway with a wooden recessed field and gilded inner order.
  putBox(0.76, 0.74, 0.018, 0, 7.735, 3.51, 'wood');
  put(rectFrameGeometry(1.04, 0.88, 0.76, 0.74, 0.12, 0.025), 'sandstone', pose(0, 7.30, 3.53));
  put(rectFrameGeometry(0.85, 0.79, 0.72, 0.70, 0.025, 0.025), 'gold', pose(0, 7.335, 3.655));
  putBox(1.76, 0.10, 0.28, 0, 8.20, 3.57, 'sandstone');

  for (let i = 0; i < 11; i++) {
    putBox(0.075, 0.11, 0.12, -0.75 + i * 0.15, 8.115, 3.68, 'stucco');
  }

  const littleFrame = archFrameGeometry(0.50, 0.66, 0.34, 0.52, 0.11, 0.06, false);
  const littleBack = archBackGeometry(0.34, 0.52, false);

  for (const x of [-0.54, 0, 0.54]) {
    put(littleBack, 'sandstone', pose(x, 8.25, 3.505));
    put(littleFrame, 'sandstone', pose(x, 8.20, 3.52));
    if (x === 0) standing(x, 8.25, 3.55, 0.50, 'gold');
    else seated(x, 8.25, 3.55, 0.38, 'stucco');
  }

  for (const x of [-0.81, -0.27, 0.27, 0.81]) {
    frontPilaster(x, 8.18, 0.68, 3.61, 0.34);
  }
  putBox(1.82, 0.075, 0.23, 0, 8.895, 3.57, 'sandstone');

  // Raised crown niche and clustered pinnacles.
  const crownPanel = rectWithCircleHole(1.50, 0.69, 0.31, 0.34, 0.15);
  put(crownPanel, 'sandstone', pose(0, 8.91, 3.51));
  put(dishGeometry(0.315, 0.13, 4, 28), 'stucco', pose(0, 9.25, 3.515));
  put(new THREE.TorusGeometry(0.325, 0.025, 5, 28), 'sandstone', pose(0, 9.25, 3.65));
  seated(0, 8.95, 3.55, 0.36, 'granite');
  stupa(0, 9.60, 3.38, 0.34);

  for (const side of [-1, 1]) {
    putBox(2.10, 0.11, 0.34, side * 1.98, 9.15, 3.43, 'sandstone');
    putBox(2.16, 0.08, 0.40, side * 1.95, 9.25, 3.43, 'stucco');
    putBox(1.95, 0.16, 0.25, side * 2.00, 9.055, 3.39, 'stucco');
  }

  for (let i = 0; i < 27; i++) {
    const x = -2.80 + i * 0.215;
    if (Math.abs(x) > 0.86) {
      putBox(0.10, 0.10, 0.13, x, 9.055, 3.54, 'sandstone');
    }
  }

  for (const x of [-2.65, -1.42, 1.42, 2.65]) {
    stupa(x, 9.29, 3.30, Math.abs(x) > 2 ? 0.46 : 0.38);
  }
  stupa(-0.94, 9.29, 3.39, 0.34);
  stupa(0.94, 9.29, 3.39, 0.34);

  // Rear roof rim and small pinnacles articulate the high view.
  putBox(5.54, 0.08, 1.86, 0, 9.18, 0.90, 'sandstone');
  for (const side of [-1, 1]) {
    putBox(0.14, 0.18, 1.70, side * 2.70, 9.23, 0.90, 'stucco');
    stupa(side * 2.20, 9.22, 0.45, 0.34);
    stupa(side * 2.20, 9.22, 1.25, 0.30);
  }

  // Carved returns on both sides, including the rear core.
  const sideLowerFrame = archFrameGeometry(0.90, 2.12, 0.62, 1.78, 0.10, 0.08, false);
  const sideLowerBack = archBackGeometry(0.62, 1.78, false);
  const sideUpperFrame = archFrameGeometry(0.78, 1.48, 0.52, 1.18, 0.09, 0.07, false);
  const sideUpperBack = archBackGeometry(0.52, 1.18, false);
  const sideTopFrame = archFrameGeometry(0.68, 1.24, 0.44, 0.98, 0.08, 0.06, false);
  const sideTopBack = archBackGeometry(0.44, 0.98, false);

  for (const side of [-1, 1]) {
    const ry = side * Math.PI / 2;

    put(sideLowerBack, 'stucco', pose(side * 3.081, 0.56, 1.10, 0, ry));
    put(sideLowerFrame, 'sandstone', pose(side * 3.083, 0.48, 1.10, 0, ry));
    standing(side * 3.09, 0.63, 1.10, 1.42, 'granite', ry);

    put(sideLowerBack, 'stucco', pose(side * 3.081, 0.56, 2.55, 0, ry));
    put(sideLowerFrame, 'sandstone', pose(side * 3.083, 0.48, 2.55, 0, ry));
    seated(side * 3.09, 0.66, 2.55, 1.04, 'stucco', ry);

    put(sideUpperBack, 'sandstone', pose(side * 3.091, 4.70, 1.10, 0, ry));
    put(sideUpperFrame, 'sandstone', pose(side * 3.093, 4.63, 1.10, 0, ry));
    seated(side * 3.10, 4.72, 1.10, 0.78, 'stucco', ry);

    put(
      dishGeometry(0.34, 0.10, 4, 24),
      'stucco',
      pose(side * 3.091, 5.43, 2.12, 0, ry),
    );
    put(
      new THREE.TorusGeometry(0.35, 0.025, 5, 24),
      'sandstone',
      pose(side * 3.20, 5.43, 2.12, 0, ry),
    );

    for (const z of [0.55, 1.28]) {
      put(sideTopBack, 'sandstone', pose(side * 2.751, 7.45, z, 0, ry));
      put(sideTopFrame, 'sandstone', pose(side * 2.753, 7.38, z, 0, ry));
      stupa(side * 2.82, 7.43, z, 0.48);
    }

    put(sideTopBack, 'stucco', pose(side * 2.751, 7.45, 2.50, 0, ry));
    put(sideTopFrame, 'sandstone', pose(side * 2.753, 7.38, 2.50, 0, ry));
    seated(side * 2.80, 7.46, 2.50, 0.62, 'stucco', ry);

    for (const z of [0.15, 3.45]) {
      putBox(0.16, 3.18, 0.20, side * 3.10, 1.88, z, 'sandstone');
    }
    for (const z of [0.15, 2.58]) {
      putBox(0.14, 2.22, 0.18, side * 3.10, 5.52, z, 'sandstone');
    }

    putBox(0.20, 0.11, 3.45, side * 3.08, 4.38, 1.74, 'sandstone');
    putBox(0.20, 0.11, 3.45, side * 3.08, 6.72, 1.74, 'sandstone');
    putBox(0.18, 0.10, 1.75, side * 2.76, 7.27, 0.90, 'sandstone');
    putBox(0.18, 0.10, 1.75, side * 2.76, 9.15, 0.90, 'sandstone');
    putBox(0.16, 0.09, 1.50, side * 2.76, 8.65, 2.54, 'sandstone');
  }

  for (const [name, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) throw new Error('Could not assemble porch material ' + name);

    merged.computeBoundingBox();
    merged.computeBoundingSphere();

    const mesh = new THREE.Mesh(merged, mat(name));
    mesh.name = 'porch-' + name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}
