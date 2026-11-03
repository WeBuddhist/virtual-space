// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, stupas round 4); regenerate rather than hand-edit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './kit';
import type { MatName } from './kit';

export const TYPES = 4;

type Bag = Map<MatName, THREE.BufferGeometry[]>;
type Profile = ReadonlyArray<readonly [number, number]>;
type V3 = readonly [number, number, number];

const TAU = Math.PI * 2;

function emit(
  bag: Bag,
  name: MatName,
  geometry: THREE.BufferGeometry,
  matrix?: THREE.Matrix4,
): void {
  if (matrix) geometry.applyMatrix4(matrix);
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  let list = bag.get(name);
  if (!list) {
    list = [];
    bag.set(name, list);
  }
  list.push(g);
}

function box(
  bag: Bag,
  name: MatName,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  matrix?: THREE.Matrix4,
): void {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  emit(bag, name, g, matrix);
}

function plane(
  bag: Bag,
  name: MatName,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  matrix?: THREE.Matrix4,
): void {
  const g = new THREE.PlaneGeometry(w, h);
  g.translate(x, y, z);
  emit(bag, name, g, matrix);
}

function cylinder(
  bag: Bag,
  name: MatName,
  top: number,
  bottom: number,
  h: number,
  segments: number,
  x: number,
  y: number,
  z: number,
  matrix?: THREE.Matrix4,
  openEnded = false,
): void {
  const g = new THREE.CylinderGeometry(top, bottom, h, segments, 1, openEnded);
  g.translate(x, y, z);
  emit(bag, name, g, matrix);
}

function ellipsoid(
  bag: Bag,
  name: MatName,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  matrix?: THREE.Matrix4,
  segments = 6,
  rings = 3,
): void {
  const g = new THREE.SphereGeometry(1, segments, rings);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  emit(bag, name, g, matrix);
}

function octahedron(
  bag: Bag,
  name: MatName,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  matrix?: THREE.Matrix4,
): void {
  const g = new THREE.OctahedronGeometry(1, 0);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  emit(bag, name, g, matrix);
}

function tetrahedron(
  bag: Bag,
  name: MatName,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  matrix?: THREE.Matrix4,
): void {
  const g = new THREE.TetrahedronGeometry(1, 0);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  emit(bag, name, g, matrix);
}

function limb(
  bag: Bag,
  name: MatName,
  a: V3,
  b: V3,
  radius: number,
  matrix: THREE.Matrix4,
): void {
  const av = new THREE.Vector3(...a);
  const bv = new THREE.Vector3(...b);
  const direction = bv.clone().sub(av);
  const length = direction.length();
  const g = new THREE.CylinderGeometry(radius * 0.9, radius, length, 4, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  const local = new THREE.Matrix4().compose(
    av.add(bv).multiplyScalar(0.5),
    q,
    new THREE.Vector3(1, 1, 1),
  );
  g.applyMatrix4(local);
  emit(bag, name, g, matrix);
}

/** Square mouldings; each profile pair is [height, width]. */
function squareProfile(bag: Bag, name: MatName, levels: Profile): void {
  const rings: V3[][] = levels.map(([y, w]) => {
    const r = w * 0.5;
    return [
      [-r, y, r],
      [r, y, r],
      [r, y, -r],
      [-r, y, -r],
    ];
  });

  const positions: number[] = [];
  const uvs: number[] = [];

  const vertex = (p: V3, u: number, v: number): void => {
    positions.push(p[0], p[1], p[2]);
    uvs.push(u, v);
  };

  const quad = (a: V3, b: V3, c: V3, d: V3): void => {
    vertex(a, 0, a[1]);
    vertex(b, 1, b[1]);
    vertex(c, 1, c[1]);
    vertex(a, 0, a[1]);
    vertex(c, 1, c[1]);
    vertex(d, 0, d[1]);
  };

  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < 4; i++) {
      const n = (i + 1) % 4;
      quad(rings[j][i], rings[j][n], rings[j + 1][n], rings[j + 1][i]);
    }
  }

  const bottom = rings[0];
  vertex(bottom[0], 0, 0);
  vertex(bottom[2], 1, 1);
  vertex(bottom[1], 1, 0);
  vertex(bottom[0], 0, 0);
  vertex(bottom[3], 0, 1);
  vertex(bottom[2], 1, 1);

  const top = rings[rings.length - 1];
  vertex(top[0], 0, 0);
  vertex(top[1], 1, 0);
  vertex(top[2], 1, 1);
  vertex(top[0], 0, 0);
  vertex(top[2], 1, 1);
  vertex(top[3], 0, 1);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  emit(bag, name, g);
}

/** Lathe profiles use [radius, height]. */
function revolve(
  bag: Bag,
  name: MatName,
  profile: Profile,
  segments: number,
): void {
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(points, segments);
  emit(bag, name, g);
}

function roundedBand(
  bag: Bag,
  name: MatName,
  radius: number,
  y: number,
  height: number,
  segments: number,
): void {
  revolve(bag, name, [
    [radius - 0.012, y - height * 0.5],
    [radius, y - height * 0.27],
    [radius, y + height * 0.27],
    [radius - 0.012, y + height * 0.5],
  ], segments);
}

function petal(
  bag: Bag,
  name: MatName,
  w: number,
  h: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  matrix?: THREE.Matrix4,
): void {
  const b: V3 = [0, 0, 0];
  const l: V3 = [-w * 0.5, h * 0.43, 0];
  const t: V3 = [0, h, 0];
  const r: V3 = [w * 0.5, h * 0.43, 0];
  const c: V3 = [0, h * 0.45, depth];
  const triangles: V3[][] = [
    [b, c, l],
    [l, c, t],
    [t, c, r],
    [r, c, b],
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  for (const triangle of triangles) {
    for (const p of triangle) {
      positions.push(p[0] + x, p[1] + y, p[2] + z);
      uvs.push(p[0] / w + 0.5, p[1] / h);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  emit(bag, name, g, matrix);
}

function faceMatrix(angle: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4()
    .makeRotationY(angle)
    .multiply(new THREE.Matrix4().makeTranslation(0, y, z));
}

function lotusRing(
  bag: Bag,
  name: MatName,
  radius: number,
  y: number,
  count: number,
  width: number,
  height: number,
): void {
  for (let i = 0; i < count; i++) {
    const m = faceMatrix((i / count) * TAU, y, radius);
    petal(bag, name, width, height, height * 0.14, 0, 0, 0, m);
  }
}

function rosette(
  bag: Bag,
  name: MatName,
  x: number,
  y: number,
  z: number,
  radius: number,
  petals: number,
  matrix: THREE.Matrix4,
): void {
  for (let i = 0; i < petals; i++) {
    const m = matrix.clone()
      .multiply(new THREE.Matrix4().makeTranslation(x, y, z))
      .multiply(new THREE.Matrix4().makeRotationZ((i / petals) * TAU))
      .multiply(new THREE.Matrix4().makeTranslation(0, radius * 0.18, 0));
    petal(
      bag,
      name,
      radius * 0.65,
      radius * 0.82,
      radius * 0.12,
      0,
      0,
      0,
      m,
    );
  }
  octahedron(
    bag,
    name,
    x,
    y,
    z + radius * 0.10,
    radius * 0.24,
    radius * 0.24,
    radius * 0.13,
    matrix,
  );
}

function dharmaWheel(
  bag: Bag,
  name: MatName,
  x: number,
  y: number,
  z: number,
  radius: number,
  matrix: THREE.Matrix4,
): void {
  const rim = new THREE.TorusGeometry(radius, radius * 0.12, 4, 12);
  rim.translate(x, y, z);
  emit(bag, name, rim, matrix);

  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.BoxGeometry(radius * 1.65, radius * 0.10, 0.012);
    spoke.rotateZ((i / 6) * Math.PI);
    spoke.translate(x, y, z);
    emit(bag, name, spoke, matrix);
  }

  octahedron(
    bag,
    name,
    x,
    y,
    z + 0.006,
    radius * 0.20,
    radius * 0.20,
    radius * 0.14,
    matrix,
  );
}

function filledArch(
  w: number,
  bottom: number,
  top: number,
  rounded = false,
): THREE.Shape {
  const s = new THREE.Shape();
  const h = top - bottom;
  const spring = bottom + h * 0.58;
  s.moveTo(-w * 0.5, bottom);
  s.lineTo(w * 0.5, bottom);
  s.lineTo(w * 0.5, spring);

  if (rounded) {
    s.quadraticCurveTo(w * 0.5, top, 0, top);
    s.quadraticCurveTo(-w * 0.5, top, -w * 0.5, spring);
  } else {
    s.quadraticCurveTo(w * 0.48, bottom + h * 0.83, 0, top);
    s.quadraticCurveTo(-w * 0.48, bottom + h * 0.83, -w * 0.5, spring);
  }

  s.closePath();
  return s;
}

function archPoints(
  w: number,
  bottom: number,
  top: number,
  rounded = false,
): THREE.Vector2[] {
  const h = top - bottom;
  const spring = bottom + h * 0.58;
  const points: THREE.Vector2[] = [
    new THREE.Vector2(-w * 0.5, bottom),
    new THREE.Vector2(w * 0.5, bottom),
    new THREE.Vector2(w * 0.5, spring),
  ];

  for (let i = 1; i <= 3; i++) {
    const t = i / 3;
    const u = 1 - t;
    if (rounded) {
      points.push(new THREE.Vector2(
        u * u * w * 0.5 + 2 * u * t * w * 0.5,
        u * u * spring + (1 - u * u) * top,
      ));
    } else {
      points.push(new THREE.Vector2(
        u * u * w * 0.5 + 2 * u * t * w * 0.48,
        u * u * spring + 2 * u * t * (bottom + h * 0.83) + t * t * top,
      ));
    }
  }

  for (let i = 1; i <= 3; i++) {
    const t = i / 3;
    const u = 1 - t;
    if (rounded) {
      points.push(new THREE.Vector2(
        2 * u * t * (-w * 0.5) + t * t * (-w * 0.5),
        (1 - t * t) * top + t * t * spring,
      ));
    } else {
      points.push(new THREE.Vector2(
        2 * u * t * (-w * 0.48) + t * t * (-w * 0.5),
        t * t * spring + 2 * u * t * (bottom + h * 0.83) + u * u * top,
      ));
    }
  }
  return points;
}

/**
 * An open-backed stone frame. Its deep outer reveal is buried in the drum,
 * avoiding the appearance of a thin arch glued onto the curved surface.
 */
function archFrame(
  bag: Bag,
  name: MatName,
  w: number,
  h: number,
  innerW: number,
  innerBottom: number,
  innerTop: number,
  depth: number,
  matrix: THREE.Matrix4,
  rounded = false,
): void {
  const outer = archPoints(w, 0, h, rounded);
  const inner = archPoints(innerW, innerBottom, innerTop, rounded);
  const positions: number[] = [];
  const uvs: number[] = [];
  const back = -w * 0.22;
  const front = depth + 0.004;

  const vertex = (p: THREE.Vector2, z: number): void => {
    positions.push(p.x, p.y, z);
    uvs.push(p.x / w + 0.5, p.y / h);
  };

  const tri = (
    a: THREE.Vector2,
    az: number,
    b: THREE.Vector2,
    bz: number,
    c: THREE.Vector2,
    cz: number,
  ): void => {
    vertex(a, az);
    vertex(b, bz);
    vertex(c, cz);
  };

  for (let i = 0; i < outer.length; i++) {
    const n = (i + 1) % outer.length;
    const oi = outer[i];
    const on = outer[n];
    const ii = inner[i];
    const inn = inner[n];

    tri(oi, front, on, front, inn, front);
    tri(oi, front, inn, front, ii, front);
    tri(oi, back, on, back, on, front);
    tri(oi, back, on, front, oi, front);
    tri(ii, back, ii, front, inn, front);
    tri(ii, back, inn, front, inn, back);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  emit(bag, name, g, matrix);
}

/** Seated Buddha with a lotus pedestal, crossed legs and separately bent arms. */
function buddha(
  bag: Bag,
  name: MatName,
  matrix: THREE.Matrix4,
  earthMudra: boolean,
  detailed: boolean,
): void {
  box(bag, name, 0.82, 0.06, 0.14, 0, 0.03, 0.045, matrix);

  if (detailed) {
    box(bag, name, 0.70, 0.06, 0.12, 0, 0.09, 0.05, matrix);

    ellipsoid(
      bag, name,
      -0.15, 0.18, 0.05,
      0.21, 0.09, 0.05,
      matrix, 8, 4,
    );
    ellipsoid(
      bag, name,
      0.15, 0.18, 0.052,
      0.21, 0.09, 0.05,
      matrix, 8, 4,
    );

    // Narrow waist and separate rounded shoulders, rather than one oval body.
    ellipsoid(
      bag, name,
      0, 0.39, 0.03,
      0.125, 0.17, 0.043,
      matrix, 8, 5,
    );
    ellipsoid(
      bag, name,
      0, 0.515, 0.03,
      0.165, 0.075, 0.045,
      matrix, 8, 4,
    );
    cylinder(
      bag, name,
      0.034, 0.038, 0.055, 6,
      0, 0.595, 0.03,
      matrix,
    );
    ellipsoid(
      bag, name,
      0, 0.715, 0.03,
      0.096, 0.105, 0.047,
      matrix, 8, 5,
    );
    ellipsoid(
      bag, name,
      0, 0.825, 0.03,
      0.043, 0.040, 0.038,
      matrix, 6, 3,
    );

    box(bag, name, 0.022, 0.065, 0.024, -0.098, 0.69, 0.03, matrix);
    box(bag, name, 0.022, 0.065, 0.024, 0.098, 0.69, 0.03, matrix);
    tetrahedron(bag, name, 0, 0.70, 0.079, 0.016, 0.023, 0.016, matrix);
  } else {
    ellipsoid(bag, name, 0, 0.18, 0.05, 0.34, 0.09, 0.05, matrix);
    ellipsoid(bag, name, 0, 0.41, 0.03, 0.15, 0.18, 0.045, matrix, 6, 4);
    ellipsoid(bag, name, 0, 0.71, 0.03, 0.095, 0.10, 0.045, matrix, 6, 4);
    tetrahedron(bag, name, 0, 0.825, 0.03, 0.04, 0.045, 0.036, matrix);
  }

  const leftElbow: V3 = [-0.20, 0.34, 0.055];
  const rightElbow: V3 = [0.20, 0.35, 0.055];
  const leftHand: V3 = earthMudra
    ? [-0.20, 0.18, 0.085]
    : [-0.045, 0.26, 0.09];
  const rightHand: V3 = [0.045, 0.26, 0.095];

  limb(bag, name, [-0.15, 0.53, 0.035], leftElbow, 0.030, matrix);
  limb(bag, name, leftElbow, leftHand, 0.026, matrix);
  limb(bag, name, [0.15, 0.53, 0.035], rightElbow, 0.030, matrix);
  limb(bag, name, rightElbow, rightHand, 0.026, matrix);

  tetrahedron(
    bag, name,
    leftHand[0], leftHand[1], leftHand[2],
    0.038, 0.025, 0.024,
    matrix,
  );
  tetrahedron(
    bag, name,
    rightHand[0], rightHand[1], rightHand[2],
    0.038, 0.025, 0.024,
    matrix,
  );

  if (detailed) {
    for (let i = 0; i < 5; i++) {
      petal(
        bag, name,
        0.10, 0.065, 0.014,
        (i - 2) * 0.112, 0.055, 0.108,
        matrix,
      );
    }
  }
}

function niche(
  bag: Bag,
  stone: MatName,
  figure: MatName,
  w: number,
  h: number,
  y: number,
  z: number,
  angle: number,
  detailed: boolean,
  earthMudra: boolean,
  panel = false,
): void {
  const m = faceMatrix(angle, y, z);
  const depth = w * 0.08;
  const innerW = w * 0.72;
  const innerBottom = h * 0.075;
  const innerTop = h * 0.88;

  if (panel) {
    // Deep backing reaches well into the round drum.
    box(
      bag, stone,
      w * 1.24, h * 0.90, 0.18,
      0, h * 0.45, -0.092,
      m,
    );

    for (const side of [-1, 1]) {
      box(
        bag, stone,
        w * 0.10, h * 0.86, 0.025,
        side * w * 0.56, h * 0.45, 0.006,
        m,
      );
    }

    box(bag, stone, w * 1.22, h * 0.065, 0.025, 0, h * 0.86, 0.006, m);
    box(bag, stone, w * 1.26, h * 0.05, 0.03, 0, h * 0.025, 0.008, m);
  }

  const back = new THREE.ShapeGeometry(
    filledArch(innerW, innerBottom, innerTop, panel),
    3,
  );
  back.translate(0, 0, 0.003);
  emit(bag, 'dark', back, m);

  archFrame(
    bag,
    stone,
    w,
    h,
    innerW,
    innerBottom,
    innerTop,
    depth,
    m,
    panel,
  );

  box(
    bag, stone,
    w * 1.12, h * 0.05, depth * 1.1,
    0, h * 0.025, depth * 0.45,
    m,
  );

  if (detailed) {
    const innerM = m.clone()
      .multiply(new THREE.Matrix4().makeTranslation(0, h * 0.02, depth * 0.65));

    archFrame(
      bag,
      stone,
      w * 0.86,
      h * 0.90,
      innerW * 0.92,
      innerBottom,
      h * 0.855,
      0.012,
      innerM,
      panel,
    );

    for (const side of [-1, 1]) {
      const x = side * w * 0.42;
      cylinder(
        bag, stone,
        w * 0.022, w * 0.027, h * 0.49, 6,
        x, h * 0.315, depth * 0.75,
        m, true,
      );
      box(
        bag, stone,
        w * 0.085, h * 0.03, 0.025,
        x, h * 0.07, depth * 0.75,
        m,
      );
      box(
        bag, stone,
        w * 0.085, h * 0.03, 0.025,
        x, h * 0.56, depth * 0.75,
        m,
      );
    }

    const disc = new THREE.CylinderGeometry(w * 0.055, w * 0.055, 0.014, 8);
    disc.rotateX(Math.PI * 0.5);
    disc.translate(0, h * 0.955, depth + 0.012);
    emit(bag, stone, disc, m);
  } else {
    octahedron(
      bag, stone,
      0, h * 0.955, depth + 0.012,
      w * 0.06, w * 0.06, 0.012,
      m,
    );
  }

  if (panel && detailed) {
    rosette(bag, stone, -w * 0.47, h * 0.79, 0.026, w * 0.065, 6, m);
    rosette(bag, stone, w * 0.47, h * 0.79, 0.026, w * 0.065, 6, m);
    dharmaWheel(
      bag,
      stone,
      0,
      h * 1.04,
      depth + 0.028,
      w * 0.095,
      m,
    );
  } else {
    petal(
      bag, stone,
      w * 0.15, h * 0.14, 0.012,
      0, h * 0.995, depth + 0.008,
      m,
    );
  }

  if (detailed && !panel) {
    for (const side of [-1, 1]) {
      for (const t of [0.32, 0.68]) {
        const u = 1 - t;
        const x = side * w * 0.435 * (u * u + 2 * u * t);
        const yy = h * (
          0.59 * u * u +
          2 * 0.80 * u * t +
          0.955 * t * t
        );
        tetrahedron(
          bag, stone,
          x, yy, depth + 0.014,
          w * 0.022, w * 0.026, w * 0.016,
          m,
        );
      }
    }
  }

  const figureHeight = Math.min(h * 0.80, w * 1.02);
  const figureMatrix = m.clone()
    .multiply(new THREE.Matrix4().makeTranslation(0, h * 0.10, 0.006))
    .multiply(new THREE.Matrix4().makeScale(
      figureHeight,
      figureHeight,
      figureHeight,
    ));

  buddha(bag, figure, figureMatrix, earthMudra, detailed);
}

/** Small relief figure used in the densely populated friezes. */
function miniIcon(bag: Bag, name: MatName, matrix: THREE.Matrix4): void {
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  const tri = (a: V3, b: V3, c: V3): void => {
    for (const p of [a, b, c]) {
      positions.push(p[0], p[1], p[2]);
      uvs.push(p[0] + 0.5, p[1]);
      normals.push(0, 0, 1);
    }
  };

  tri([-0.48, 0, 0], [0.48, 0, 0], [0.34, 0.24, 0]);
  tri([-0.48, 0, 0], [0.34, 0.24, 0], [-0.34, 0.24, 0]);
  tri([-0.16, 0.20, 0], [0.16, 0.20, 0], [0.12, 0.58, 0]);
  tri([-0.16, 0.20, 0], [0.12, 0.58, 0], [-0.12, 0.58, 0]);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  emit(bag, name, g, matrix);

  octahedron(bag, name, 0, 0.72, 0.018, 0.11, 0.13, 0.028, matrix);
}

function frieze(
  bag: Bag,
  name: MatName,
  angle: number,
  y: number,
  z: number,
  count: number,
  iconHeight: number,
): void {
  const m = faceMatrix(angle, y, z);
  const spacing = iconHeight * 1.25;
  const width = count * spacing;
  const panelHeight = iconHeight * 1.05;

  plane(bag, 'dark', width, panelHeight, 0, iconHeight * 0.47, 0, m);
  plane(bag, name, width, 0.007, 0, -0.005, 0.006, m);
  plane(bag, name, width, 0.007, 0, iconHeight * 0.99, 0.006, m);

  for (let i = 0; i <= count; i++) {
    const x = (i - count * 0.5) * spacing;
    plane(bag, name, 0.006, panelHeight, x, iconHeight * 0.47, 0.006, m);
  }

  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) * 0.5) * spacing;
    const im = m.clone()
      .multiply(new THREE.Matrix4().makeTranslation(x, 0, 0.004))
      .multiply(new THREE.Matrix4().makeScale(
        iconHeight,
        iconHeight,
        iconHeight,
      ));
    miniIcon(bag, name, im);
  }
}

/** Ringed stone colonnette between the principal niches. */
function drumPilaster(
  bag: Bag,
  name: MatName,
  angle: number,
  radius: number,
  bottom: number,
  height: number,
  width: number,
): void {
  const m = faceMatrix(angle, 0, radius);

  box(
    bag, name,
    width, height, 0.065,
    0, bottom + height * 0.5, -0.022,
    m,
  );
  cylinder(
    bag, name,
    width * 0.19, width * 0.23,
    height * 0.82, 6,
    0, bottom + height * 0.50, 0.018,
    m, true,
  );
  box(
    bag, name,
    width * 1.35, 0.035, 0.075,
    0, bottom + 0.018, 0.005,
    m,
  );
  box(
    bag, name,
    width * 1.35, 0.035, 0.075,
    0, bottom + height - 0.018, 0.005,
    m,
  );

  for (const t of [0.28, 0.72]) {
    box(
      bag, name,
      width * 1.08, 0.022, 0.068,
      0, bottom + height * t, 0.012,
      m,
    );
  }
}

function weather(geometry: THREE.BufferGeometry, amount: number): void {
  if (amount <= 0) return;
  const p = geometry.attributes.position;

  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const angle = Math.atan2(x, z);
    const f = 1 + amount * (
      Math.sin(angle * 5 + y * 13) +
      0.4 * Math.sin(angle * 9 - y * 17)
    );
    p.setXYZ(i, x * f, y, z * f);
  }

  p.needsUpdate = true;
  geometry.computeVertexNormals();
}

function dome(
  bag: Bag,
  name: MatName,
  radius: number,
  bottom: number,
  spring: number,
  top: number,
  segments: number,
  capRings: number,
  weathering: number,
): void {
  const drum = new THREE.CylinderGeometry(
    radius,
    radius * 0.95,
    spring - bottom,
    segments,
    1,
    true,
  );
  drum.translate(0, (bottom + spring) * 0.5, 0);
  weather(drum, weathering);
  emit(bag, name, drum);

  const cap = new THREE.SphereGeometry(
    radius,
    segments,
    capRings,
    0,
    TAU,
    0,
    Math.PI * 0.5,
  );
  cap.scale(1, (top - spring) / radius, 1);
  cap.translate(0, spring, 0);
  weather(cap, weathering);
  emit(bag, name, cap);

  cylinder(
    bag, name,
    radius * 1.015, radius * 1.015,
    0.04, segments,
    0, spring - 0.015, 0,
    undefined, true,
  );
}

function harmika(
  bag: Bag,
  name: MatName,
  bottom: number,
  width: number,
  height: number,
): void {
  box(bag, name, width, height, width, 0, bottom + height * 0.5, 0);
  box(
    bag, name,
    width * 1.18, 0.025, width * 1.18,
    0, bottom + height - 0.0125, 0,
  );
}

/** Rounded, mostly upright umbrella rims with flat upper surfaces. */
function umbrellaSpire(
  bag: Bag,
  stone: MatName,
  finial: MatName,
  bottom: number,
  tip: number,
  radius: number,
  tiers: number,
  segments: number,
): void {
  const total = tip - bottom;
  const finialHeight = total * 0.06;
  const umbrellaHeight = total - finialHeight;
  const step = umbrellaHeight / tiers;
  const discHeight = step * 0.82;
  const lastTop = bottom + (tiers - 1) * step + discHeight;

  cylinder(
    bag, stone,
    radius * 0.055, radius * 0.075,
    lastTop - bottom, 6,
    0, bottom + (lastTop - bottom) * 0.5, 0,
    undefined, true,
  );

  for (let i = 0; i < tiers; i++) {
    const f = tiers === 1 ? 0 : i / (tiers - 1);
    const r = radius * (1 - 0.72 * f);
    const y = bottom + i * step;
    const h = discHeight;

    revolve(bag, stone, [
      [0, y],
      [r * 0.86, y],
      [r, y + h * 0.16],
      [r, y + h * 0.58],
      [r * 0.88, y + h * 0.90],
      [r * 0.70, y + h],
      [0, y + h],
    ], segments);
  }

  const coneBase = lastTop - 0.005;
  const cone = new THREE.ConeGeometry(
    radius * 0.14,
    tip - coneBase,
    radius >= 0.2 ? 8 : 6,
    1,
    false,
  );
  cone.translate(0, coneBase + (tip - coneBase) * 0.5, 0);
  emit(bag, finial, cone);
}

function smallBasalt(bag: Bag): void {
  squareProfile(bag, 'basalt', [
    [0, 0.74],
    [0.035, 0.74],
    [0.035, 0.68],
    [0.07, 0.68],
    [0.07, 0.72],
    [0.10, 0.72],
    [0.10, 0.64],
    [0.135, 0.64],
    [0.135, 0.68],
    [0.16, 0.68],
    [0.18, 0.64],
    [0.20, 0.64],
  ]);

  dome(bag, 'basalt', 0.315, 0.18, 0.51, 0.835, 32, 7, 0.002);
  roundedBand(bag, 'basalt', 0.307, 0.24, 0.025, 24);
  roundedBand(bag, 'basalt', 0.313, 0.30, 0.022, 24);
  lotusRing(bag, 'basalt', 0.316, 0.475, 16, 0.064, 0.055);

  niche(
    bag, 'basalt', 'gold',
    0.275, 0.32, 0.205, 0.318,
    0, true, true,
  );

  harmika(bag, 'basalt', 0.83, 0.19, 0.075);
  umbrellaSpire(bag, 'basalt', 'gold', 0.905, 1.20, 0.15, 5, 10);
}

function mediumPala(bag: Bag): void {
  squareProfile(bag, 'basalt', [
    [0, 1.04],
    [0.05, 1.04],
    [0.05, 0.98],
    [0.11, 0.98],
    [0.11, 1.00],
    [0.15, 1.00],
    [0.15, 0.88],
    [0.22, 0.88],
    [0.22, 0.86],
    [0.35, 0.86],
    [0.35, 0.92],
    [0.40, 0.92],
    [0.40, 0.86],
    [0.44, 0.86],
    [0.48, 0.80],
  ]);

  dome(bag, 'basalt', 0.40, 0.48, 1.18, 1.51, 32, 7, 0.002);
  roundedBand(bag, 'basalt', 0.399, 0.60, 0.026, 24);
  roundedBand(bag, 'basalt', 0.402, 0.76, 0.018, 24);
  roundedBand(bag, 'basalt', 0.402, 0.91, 0.018, 24);
  roundedBand(bag, 'basalt', 0.403, 1.13, 0.028, 24);

  for (let side = 0; side < 4; side++) {
    const angle = side * Math.PI * 0.5;

    frieze(bag, 'basalt', angle, 0.24, 0.432, 7, 0.085);

    niche(
      bag,
      'basalt',
      side === 0 ? 'gold' : 'basalt',
      0.38,
      0.50,
      0.62,
      0.402,
      angle,
      side === 0,
      true,
    );

    // Miniature figures occupy the diagonal fields between the shrines.
    for (const yy of [0.70, 0.86, 1.02]) {
      frieze(
        bag,
        'basalt',
        angle + Math.PI * 0.25,
        yy,
        0.398,
        2,
        0.08,
      );
    }

    for (const offset of [-0.55, 0.55]) {
      drumPilaster(
        bag,
        'basalt',
        angle + offset,
        0.403,
        0.62,
        0.49,
        0.045,
      );
    }
  }

  lotusRing(bag, 'basalt', 0.402, 1.135, 16, 0.073, 0.06);
  harmika(bag, 'basalt', 1.505, 0.24, 0.09);
  umbrellaSpire(bag, 'basalt', 'gold', 1.595, 2.00, 0.205, 7, 12);
}

function largeStucco(bag: Bag): void {
  squareProfile(bag, 'stucco', [
    [0, 1.48],
    [0.07, 1.48],
    [0.07, 1.38],
    [0.15, 1.38],
    [0.15, 1.25],
    [0.23, 1.25],
    [0.23, 1.22],
    [0.46, 1.22],
    [0.46, 1.29],
    [0.51, 1.29],
    [0.51, 1.14],
    [0.58, 1.14],
    [0.74, 1.00],
    [0.74, 1.08],
    [0.80, 1.08],
    [0.80, 1.04],
    [0.88, 1.04],
  ]);

  dome(bag, 'stucco', 0.515, 0.87, 1.60, 2.05, 40, 8, 0.001);

  for (let side = 0; side < 4; side++) {
    const angle = side * Math.PI * 0.5;

    // Two denser rows of small figures, rather than one row of large icons.
    frieze(bag, 'sandstone', angle, 0.245, 0.612, 7, 0.085);
    frieze(bag, 'sandstone', angle, 0.350, 0.612, 7, 0.085);

    niche(
      bag,
      'granite',
      side === 0 ? 'gold' : 'stucco',
      0.46,
      0.62,
      1.05,
      0.518,
      angle,
      side === 0,
      false,
      true,
    );

    for (const offset of [-0.61, 0.61]) {
      drumPilaster(
        bag,
        'sandstone',
        angle + offset,
        0.518,
        1.05,
        0.51,
        0.055,
      );
    }
  }

  lotusRing(bag, 'sandstone', 0.517, 1.555, 24, 0.075, 0.065);
  harmika(bag, 'sandstone', 2.045, 0.34, 0.105);
  umbrellaSpire(bag, 'sandstone', 'gold', 2.15, 3.20, 0.30, 11, 12);
}

function squatWeathered(bag: Bag): void {
  squareProfile(bag, 'basalt', [
    [0, 1.00],
    [0.04, 1.00],
    [0.04, 0.94],
    [0.09, 0.94],
    [0.09, 0.98],
    [0.13, 0.98],
    [0.13, 0.86],
    [0.17, 0.86],
    [0.20, 0.82],
  ]);

  // Nearly as high as it is wide below the harmika, with a broad dome.
  dome(bag, 'basalt', 0.50, 0.18, 0.55, 1.00, 32, 7, 0.016);
  roundedBand(bag, 'basalt', 0.475, 0.245, 0.026, 24);
  roundedBand(bag, 'basalt', 0.50, 0.525, 0.028, 24);

  niche(
    bag, 'basalt', 'basalt',
    0.34, 0.36, 0.21, 0.503,
    0, true, true,
  );

  harmika(bag, 'basalt', 0.995, 0.25, 0.07);
  umbrellaSpire(bag, 'basalt', 'gold', 1.065, 1.50, 0.20, 4, 10);
}

export function build(type: number): THREE.Group {
  const which = Math.max(
    0,
    Math.min(TYPES - 1, Math.trunc(Number.isFinite(type) ? type : 0)),
  );
  const bag: Bag = new Map();

  if (which === 0) smallBasalt(bag);
  else if (which === 1) mediumPala(bag);
  else if (which === 2) largeStucco(bag);
  else squatWeathered(bag);

  const group = new THREE.Group();
  group.name = `Votive stupa ${which}`;
  group.userData.votiveType = which;

  for (const [name, geometries] of bag) {
    if (geometries.length === 0) continue;
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) continue;

    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, mat(name));
    mesh.name = `stupa-${which}-${name}`;
    mesh.castShadow = name !== 'dark';
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}
