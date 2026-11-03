// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, stupas round 3); regenerate rather than hand-edit.
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
  const g = new THREE.CylinderGeometry(radius * 0.88, radius, length, 4, 1, true);
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

/** Square cyma, fillet and fascia mouldings. Each profile pair is [height, width]. */
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

function revolve(
  bag: Bag,
  name: MatName,
  profile: Profile,
  segments: number,
): void {
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
  emit(bag, name, new THREE.LatheGeometry(points, segments));
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
    [radius - 0.010, y - height * 0.5],
    [radius, y - height * 0.24],
    [radius, y + height * 0.24],
    [radius - 0.010, y + height * 0.5],
  ], segments);
}

/** Broad lotus petal with a flat root, pointed tip and raised central ridge. */
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
  const bl: V3 = [-w * 0.32, 0, 0];
  const br: V3 = [w * 0.32, 0, 0];
  const r: V3 = [w * 0.5, h * 0.45, 0];
  const t: V3 = [0, h, 0];
  const l: V3 = [-w * 0.5, h * 0.45, 0];
  const c: V3 = [0, h * 0.42, depth];

  const triangles: V3[][] = [
    [bl, br, c],
    [br, r, c],
    [r, t, c],
    [t, l, c],
    [l, bl, c],
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
    petal(bag, name, width, height, height * 0.20, 0, 0, 0, m);
  }
}

function rosette(
  bag: Bag,
  name: MatName,
  x: number,
  y: number,
  z: number,
  radius: number,
  matrix: THREE.Matrix4,
): void {
  for (let i = 0; i < 6; i++) {
    const m = matrix.clone()
      .multiply(new THREE.Matrix4().makeTranslation(x, y, z))
      .multiply(new THREE.Matrix4().makeRotationZ((i / 6) * TAU))
      .multiply(new THREE.Matrix4().makeTranslation(0, radius * 0.18, 0));
    petal(bag, name, radius * 0.65, radius * 0.82, radius * 0.16, 0, 0, 0, m);
  }
  octahedron(
    bag, name,
    x, y, z + radius * 0.10,
    radius * 0.24, radius * 0.24, radius * 0.15,
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
  const rim = new THREE.TorusGeometry(radius, radius * 0.13, 3, 8);
  rim.translate(x, y, z);
  emit(bag, name, rim, matrix);

  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.BoxGeometry(radius * 1.65, radius * 0.10, 0.010);
    spoke.rotateZ((i / 4) * Math.PI);
    spoke.translate(x, y, z);
    emit(bag, name, spoke, matrix);
  }

  octahedron(
    bag, name,
    x, y, z + 0.006,
    radius * 0.20, radius * 0.20, radius * 0.15,
    matrix,
  );
}

function filledArch(
  w: number,
  bottom: number,
  top: number,
  rounded: boolean,
): THREE.Shape {
  const s = new THREE.Shape();
  const h = top - bottom;
  const spring = bottom + h * (rounded ? 0.58 : 0.52);
  s.moveTo(-w * 0.5, bottom);
  s.lineTo(w * 0.5, bottom);
  s.lineTo(w * 0.5, spring);

  if (rounded) {
    s.quadraticCurveTo(w * 0.5, top, 0, top);
    s.quadraticCurveTo(-w * 0.5, top, -w * 0.5, spring);
  } else {
    s.quadraticCurveTo(w * 0.48, bottom + h * 0.84, 0, top);
    s.quadraticCurveTo(-w * 0.48, bottom + h * 0.84, -w * 0.5, spring);
  }

  s.closePath();
  return s;
}

function quadraticPoint(
  a: THREE.Vector2,
  b: THREE.Vector2,
  c: THREE.Vector2,
  t: number,
): THREE.Vector2 {
  const u = 1 - t;
  return new THREE.Vector2(
    u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    u * u * a.y + 2 * u * t * b.y + t * t * c.y,
  );
}

function archPoints(
  w: number,
  bottom: number,
  top: number,
  rounded: boolean,
): THREE.Vector2[] {
  const h = top - bottom;
  const spring = bottom + h * (rounded ? 0.58 : 0.52);
  const rightBase = new THREE.Vector2(w * 0.5, spring);
  const leftBase = new THREE.Vector2(-w * 0.5, spring);
  const apex = new THREE.Vector2(0, top);
  const rightControl = rounded
    ? new THREE.Vector2(w * 0.5, top)
    : new THREE.Vector2(w * 0.48, bottom + h * 0.84);
  const leftControl = new THREE.Vector2(-rightControl.x, rightControl.y);

  const points: THREE.Vector2[] = [
    new THREE.Vector2(-w * 0.5, bottom),
    new THREE.Vector2(w * 0.5, bottom),
    rightBase.clone(),
  ];

  for (let i = 1; i <= 4; i++) {
    points.push(quadraticPoint(rightBase, rightControl, apex, i / 4));
  }
  for (let i = 1; i <= 4; i++) {
    points.push(quadraticPoint(apex, leftControl, leftBase, i / 4));
  }
  return points;
}

/** An open-centred arch with deep jambs, a front moulding and reveal walls. */
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
  rounded: boolean,
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

/** Seated Buddha: lotus throne, crossed legs, robe, ushnisha and bent arms. */
function buddha(
  bag: Bag,
  name: MatName,
  matrix: THREE.Matrix4,
  earthMudra: boolean,
  detailed: boolean,
): void {
  box(bag, name, 0.80, 0.06, 0.15, 0, 0.03, 0.045, matrix);

  if (detailed) {
    box(bag, name, 0.69, 0.055, 0.125, 0, 0.087, 0.05, matrix);

    ellipsoid(bag, name, -0.14, 0.175, 0.052, 0.21, 0.085, 0.060, matrix, 8, 4);
    ellipsoid(bag, name, 0.14, 0.175, 0.055, 0.21, 0.085, 0.060, matrix, 8, 4);

    ellipsoid(bag, name, 0, 0.385, 0.032, 0.125, 0.17, 0.050, matrix, 8, 5);
    ellipsoid(bag, name, 0, 0.510, 0.032, 0.165, 0.073, 0.052, matrix, 8, 4);
    cylinder(bag, name, 0.034, 0.038, 0.055, 6, 0, 0.590, 0.032, matrix, true);
    ellipsoid(bag, name, 0, 0.710, 0.032, 0.094, 0.108, 0.058, matrix, 8, 5);
    ellipsoid(bag, name, 0, 0.820, 0.032, 0.044, 0.042, 0.041, matrix, 6, 3);

    box(bag, name, 0.021, 0.065, 0.025, -0.097, 0.685, 0.032, matrix);
    box(bag, name, 0.021, 0.065, 0.025, 0.097, 0.685, 0.032, matrix);
    tetrahedron(bag, name, 0, 0.697, 0.088, 0.015, 0.023, 0.016, matrix);
    limb(bag, name, [-0.105, 0.535, 0.079], [0.080, 0.335, 0.079], 0.008, matrix);
  } else {
    ellipsoid(bag, name, 0, 0.175, 0.052, 0.33, 0.085, 0.058, matrix);
    ellipsoid(bag, name, 0, 0.405, 0.032, 0.145, 0.180, 0.052, matrix, 6, 3);
    ellipsoid(bag, name, 0, 0.510, 0.032, 0.160, 0.065, 0.052, matrix);
    ellipsoid(bag, name, 0, 0.710, 0.032, 0.092, 0.105, 0.056, matrix, 6, 3);
    tetrahedron(bag, name, 0, 0.820, 0.032, 0.041, 0.046, 0.038, matrix);
  }

  const leftElbow: V3 = [-0.195, 0.345, 0.055];
  const rightElbow: V3 = [0.195, 0.350, 0.055];
  const leftHand: V3 = earthMudra
    ? [-0.195, 0.185, 0.087]
    : [-0.045, 0.255, 0.092];
  const rightHand: V3 = [0.045, 0.255, 0.096];

  limb(bag, name, [-0.145, 0.525, 0.035], leftElbow, 0.030, matrix);
  limb(bag, name, leftElbow, leftHand, 0.025, matrix);
  limb(bag, name, [0.145, 0.525, 0.035], rightElbow, 0.030, matrix);
  limb(bag, name, rightElbow, rightHand, 0.025, matrix);

  tetrahedron(
    bag, name,
    leftHand[0], leftHand[1], leftHand[2],
    0.037, 0.025, 0.024,
    matrix,
  );
  tetrahedron(
    bag, name,
    rightHand[0], rightHand[1], rightHand[2],
    0.037, 0.025, 0.024,
    matrix,
  );

  if (detailed) {
    for (let i = 0; i < 5; i++) {
      petal(
        bag, name,
        0.10, 0.065, 0.016,
        (i - 2) * 0.111, 0.052, 0.111,
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
  rounded = false,
  panel = false,
): void {
  const m = faceMatrix(angle, y, z);
  const depth = w * 0.10;
  const innerW = w * 0.70;
  const innerBottom = h * 0.070;
  const innerTop = h * 0.885;

  if (panel) {
    plane(bag, stone, w * 1.22, h * 0.90, 0, h * 0.45, 0.001, m);

    for (const side of [-1, 1]) {
      box(
        bag, stone,
        w * 0.065, h * 0.84, 0.050,
        side * w * 0.555, h * 0.43, 0.015,
        m,
      );
    }

    box(bag, stone, w * 1.18, h * 0.045, 0.050, 0, h * 0.88, 0.015, m);
    box(bag, stone, w * 1.24, h * 0.050, 0.065, 0, h * 0.025, 0.018, m);
  }

  const back = new THREE.ShapeGeometry(
    filledArch(innerW, innerBottom, innerTop, rounded),
    4,
  );
  back.translate(0, 0, 0.004);
  emit(bag, 'dark', back, m);

  archFrame(
    bag, stone,
    w, h,
    innerW, innerBottom, innerTop,
    depth, m, rounded,
  );

  if (!panel) {
    box(
      bag, stone,
      w * 1.13, h * 0.050, depth * 1.25,
      0, h * 0.025, depth * 0.47,
      m,
    );
  }

  if (detailed) {
    const innerM = m.clone()
      .multiply(new THREE.Matrix4().makeTranslation(0, h * 0.025, depth * 0.58));
    archFrame(
      bag, stone,
      w * 0.85, h * 0.91,
      innerW * 0.92, innerBottom, h * 0.86,
      depth * 0.42, innerM, rounded,
    );
  }

  if (detailed || w >= 0.32) {
    for (const side of [-1, 1]) {
      const x = side * w * 0.42;
      cylinder(
        bag, stone,
        w * 0.022, w * 0.027, h * 0.48, 6,
        x, h * 0.315, depth * 0.77,
        m, true,
      );
      for (const yy of [h * 0.075, h * 0.555]) {
        box(
          bag, stone,
          w * 0.090, h * 0.030, depth * 0.90,
          x, yy, depth * 0.77,
          m,
        );
      }
      if (detailed) {
        for (const yy of [h * 0.25, h * 0.41]) {
          box(
            bag, stone,
            w * 0.066, h * 0.018, depth * 0.82,
            x, yy, depth * 0.77,
            m,
          );
        }
      }
    }
  }

  if (panel && detailed) {
    dharmaWheel(
      bag, stone,
      0, h * 1.035, depth + 0.030,
      w * 0.085, m,
    );
  } else {
    const disc = new THREE.CylinderGeometry(w * 0.052, w * 0.052, 0.014, 8);
    disc.rotateX(Math.PI * 0.5);
    disc.translate(0, h * 0.955, depth + 0.013);
    emit(bag, stone, disc, m);
  }

  petal(
    bag, stone,
    w * 0.16, h * 0.145, 0.014,
    0, h * 0.970, depth + 0.008,
    m,
  );

  if (detailed) {
    for (const side of [-1, 1]) {
      const crestM = m.clone()
        .multiply(new THREE.Matrix4().makeTranslation(
          side * w * 0.058,
          h * 0.955,
          depth + 0.009,
        ))
        .multiply(new THREE.Matrix4().makeRotationZ(side * -0.48));
      petal(bag, stone, w * 0.10, h * 0.105, 0.012, 0, 0, 0, crestM);

      if (!panel) {
        rosette(
          bag, stone,
          side * w * 0.435, h * 0.675, depth + 0.014,
          w * 0.050, m,
        );
      }
    }
  }

  if (panel) {
    for (const side of [-1, 1]) {
      if (detailed) {
        rosette(
          bag, stone,
          side * w * 0.47, h * 0.79, 0.044,
          w * 0.045, m,
        );
      } else {
        octahedron(
          bag, stone,
          side * w * 0.47, h * 0.79, 0.044,
          w * 0.035, w * 0.035, 0.012,
          m,
        );
      }
    }
  }

  const figureScale = Math.min(h * 0.92, w * 0.98);
  const figureMatrix = m.clone()
    .multiply(new THREE.Matrix4().makeTranslation(0, h * 0.10, 0.011))
    .multiply(new THREE.Matrix4().makeScale(figureScale, figureScale, figureScale));
  buddha(bag, figure, figureMatrix, earthMudra, detailed);
}

/** A tiny seated figure modeled as faceted relief, not a printed icon. */
function miniIcon(bag: Bag, name: MatName, matrix: THREE.Matrix4): void {
  const positions: number[] = [];
  const uvs: number[] = [];

  const tri = (a: V3, b: V3, c: V3): void => {
    for (const p of [a, b, c]) {
      positions.push(p[0], p[1], p[2]);
      uvs.push(p[0] + 0.5, p[1]);
    }
  };

  const ll: V3 = [-0.48, 0, 0.005];
  const lr: V3 = [0.48, 0, 0.005];
  const lt: V3 = [-0.29, 0.25, 0.015];
  const rt: V3 = [0.29, 0.25, 0.015];
  const lc: V3 = [0, 0.13, 0.10];

  tri(ll, lr, lc);
  tri(lr, rt, lc);
  tri(rt, lt, lc);
  tri(lt, ll, lc);

  const bl: V3 = [-0.20, 0.20, 0.020];
  const br: V3 = [0.20, 0.20, 0.020];
  const sl: V3 = [-0.15, 0.59, 0.025];
  const sr: V3 = [0.15, 0.59, 0.025];
  const tc: V3 = [0, 0.39, 0.10];

  tri(bl, br, tc);
  tri(br, sr, tc);
  tri(sr, sl, tc);
  tri(sl, bl, tc);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  emit(bag, name, g, matrix);

  tetrahedron(bag, name, 0, 0.745, 0.070, 0.12, 0.135, 0.070, matrix);
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
  const spacing = iconHeight * 1.05;
  const width = count * spacing;
  const panelHeight = iconHeight * 1.02;

  plane(bag, 'dark', width, panelHeight, 0, iconHeight * 0.44, 0.003, m);
  plane(bag, name, width + 0.012, 0.008, 0, -0.006, 0.006, m);
  plane(
    bag, name,
    width + 0.012, 0.008,
    0, iconHeight * 0.93, 0.006,
    m,
  );

  for (let i = 0; i <= count; i++) {
    const x = (i - count * 0.5) * spacing;
    plane(
      bag, name,
      0.006, panelHeight,
      x, iconHeight * 0.44, 0.007,
      m,
    );
  }

  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) * 0.5) * spacing;
    const im = m.clone()
      .multiply(new THREE.Matrix4().makeTranslation(x, 0, 0.008))
      .multiply(new THREE.Matrix4().makeScale(
        iconHeight,
        iconHeight,
        iconHeight * 2.0,
      ));
    miniIcon(bag, name, im);
  }
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Seam-safe deterministic erosion of the silhouette. */
function weather(geometry: THREE.BufferGeometry, amount: number, seed: number): void {
  if (amount <= 0) return;
  const rng = seeded(seed);
  const phaseA = rng() * TAU;
  const phaseB = rng() * TAU;
  const p = geometry.attributes.position;

  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const angle = Math.atan2(x, z);
    const f = 1 + amount * (
      Math.sin(angle * 3 + phaseA) +
      0.45 * Math.sin(angle * 7 + y * 4 + phaseB) +
      0.20 * Math.sin(angle * 2 - y * 19)
    );
    p.setXYZ(i, x * f, y, z * f);
  }

  p.needsUpdate = true;
  geometry.computeVertexNormals();
}

/** Continuous vertical drum and rounded anda, without a sphere/cylinder seam. */
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
  seed: number,
): void {
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(radius * 0.95, bottom),
    new THREE.Vector2(radius * 0.99, bottom + 0.025),
    new THREE.Vector2(radius, bottom + 0.055),
    new THREE.Vector2(radius, spring),
  ];
  const capHeight = top - spring;

  for (let i = 1; i <= capRings; i++) {
    const a = (i / capRings) * Math.PI * 0.5;
    profile.push(new THREE.Vector2(
      Math.max(0, radius * Math.cos(a)),
      spring + capHeight * Math.sin(a),
    ));
  }

  const g = new THREE.LatheGeometry(profile, segments);
  weather(g, weathering, seed);
  emit(bag, name, g);
}

/** Square harmika and its broad bevelled chattra slab. */
function harmika(
  bag: Bag,
  name: MatName,
  bottom: number,
  width: number,
  height: number,
): number {
  box(bag, name, width, height, width, 0, bottom + height * 0.5, 0);

  const slabBottom = bottom + height;
  const cap = width * 0.26;
  squareProfile(bag, name, [
    [slabBottom, width * 1.55],
    [slabBottom + cap * 0.25, width * 1.55],
    [slabBottom + cap * 0.72, width * 1.32],
    [slabBottom + cap, width * 1.32],
  ]);
  return slabBottom + cap;
}

/** Separate, deeply undercut umbrella discs around a narrow tapering core. */
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
  const finialHeight = Math.max(total * 0.12, radius * 0.28);
  const umbrellaHeight = total - finialHeight;
  const step = umbrellaHeight / tiers;
  const discHeight = step * 0.82;
  const lastTop = bottom + (tiers - 1) * step + discHeight;

  cylinder(
    bag, stone,
    radius * 0.055, radius * 0.32,
    lastTop - bottom, 8,
    0, bottom + (lastTop - bottom) * 0.5, 0,
    undefined, false,
  );

  for (let i = 0; i < tiers; i++) {
    const f = tiers === 1 ? 0 : i / (tiers - 1);
    const r = radius * (1 - 0.76 * f);
    const y = bottom + i * step;
    const h = discHeight;
    const seg = i > tiers * 0.55
      ? Math.max(8, segments - 2)
      : segments;

    revolve(bag, stone, [
      [0, y],
      [r * 0.90, y],
      [r, y + h * 0.22],
      [r * 0.985, y + h * 0.70],
      [r * 0.76, y + h],
      [0, y + h],
    ], seg);
  }

  const coneBase = lastTop - 0.004;
  const cone = new THREE.ConeGeometry(
    radius * 0.15,
    tip - coneBase,
    8,
    1,
    false,
  );
  cone.translate(0, coneBase + (tip - coneBase) * 0.5, 0);
  emit(bag, finial, cone);
}

function smallBasalt(bag: Bag): void {
  squareProfile(bag, 'basalt', [
    [0, 0.76],
    [0.035, 0.76],
    [0.035, 0.69],
    [0.070, 0.69],
    [0.070, 0.73],
    [0.102, 0.73],
    [0.102, 0.65],
    [0.132, 0.65],
    [0.132, 0.69],
    [0.158, 0.69],
    [0.180, 0.64],
  ]);

  dome(bag, 'basalt', 0.315, 0.172, 0.550, 0.840, 32, 10, 0.0015, 11);
  roundedBand(bag, 'basalt', 0.318, 0.205, 0.026, 24);
  roundedBand(bag, 'basalt', 0.320, 0.528, 0.028, 24);
  lotusRing(bag, 'basalt', 0.320, 0.473, 16, 0.100, 0.055);

  niche(
    bag, 'basalt', 'gold',
    0.275, 0.315, 0.205, 0.319,
    0, true, true,
  );

  const spireBottom = harmika(bag, 'basalt', 0.835, 0.18, 0.065);
  umbrellaSpire(bag, 'basalt', 'gold', spireBottom, 1.20, 0.150, 5, 10);
}

function mediumPala(bag: Bag): void {
  squareProfile(bag, 'basalt', [
    [0, 1.06],
    [0.050, 1.06],
    [0.050, 0.99],
    [0.110, 0.99],
    [0.110, 1.02],
    [0.155, 1.02],
    [0.155, 0.90],
    [0.215, 0.90],
    [0.215, 0.86],
    [0.350, 0.86],
    [0.350, 0.89],
    [0.365, 0.95],
    [0.390, 0.97],
    [0.415, 0.95],
    [0.435, 0.89],
    [0.445, 0.86],
    [0.485, 0.80],
  ]);

  dome(bag, 'basalt', 0.400, 0.475, 1.190, 1.480, 32, 8, 0.0015, 23);
  roundedBand(bag, 'basalt', 0.404, 0.510, 0.030, 24);
  roundedBand(bag, 'basalt', 0.405, 1.165, 0.030, 24);

  for (let side = 0; side < 4; side++) {
    const angle = side * Math.PI * 0.5;

    frieze(bag, 'basalt', angle, 0.238, 0.432, 7, 0.078);

    niche(
      bag,
      'basalt',
      side === 0 ? 'gold' : 'basalt',
      0.38,
      0.50,
      0.600,
      0.404,
      angle,
      side === 0,
      true,
    );

    for (const yy of [0.690, 0.860, 1.030]) {
      frieze(
        bag,
        'basalt',
        angle + Math.PI * 0.25,
        yy,
        0.404,
        3,
        0.064,
      );
    }
  }

  lotusRing(bag, 'basalt', 0.406, 1.110, 20, 0.110, 0.060);

  const spireBottom = harmika(bag, 'basalt', 1.475, 0.240, 0.090);
  umbrellaSpire(bag, 'basalt', 'gold', spireBottom, 2.00, 0.210, 7, 10);
}

function largeStucco(bag: Bag): void {
  squareProfile(bag, 'stucco', [
    [0, 1.46],
    [0.060, 1.46],
    [0.060, 1.38],
    [0.120, 1.38],
    [0.120, 1.40],
    [0.170, 1.40],
    [0.170, 1.30],
    [0.220, 1.30],
    [0.230, 1.26],
    [0.390, 1.18],
    [0.400, 1.26],
    [0.425, 1.30],
    [0.450, 1.26],
    [0.470, 1.16],
    [0.500, 1.16],
    [0.520, 1.14],
    [0.660, 1.07],
    [0.680, 1.15],
    [0.705, 1.19],
    [0.730, 1.14],
    [0.750, 1.04],
    [0.780, 1.04],
    [0.800, 1.02],
    [0.920, 0.96],
    [0.940, 1.04],
    [0.965, 1.08],
    [0.990, 1.03],
    [1.055, 0.98],
  ]);

  dome(bag, 'stucco', 0.500, 1.040, 1.670, 2.020, 30, 7, 0.0012, 37);
  roundedBand(bag, 'sandstone', 0.505, 1.085, 0.034, 16);
  roundedBand(bag, 'sandstone', 0.507, 1.640, 0.032, 16);

  // Horizontal ribs remain visible on the curved fields beside each shrine.
  for (const yy of [1.240, 1.330, 1.420, 1.510]) {
    roundedBand(bag, 'sandstone', 0.504, yy, 0.018, 20);
  }

  for (let side = 0; side < 4; side++) {
    niche(
      bag,
      'granite',
      side === 0 ? 'gold' : 'sandstone',
      0.46,
      0.54,
      1.130,
      0.505,
      side * Math.PI * 0.5,
      side === 0,
      true,
      true,
      true,
    );
  }

  lotusRing(bag, 'sandstone', 0.508, 1.570, 18, 0.155, 0.065);

  const spireBottom = harmika(bag, 'sandstone', 2.015, 0.300, 0.100);
  umbrellaSpire(bag, 'sandstone', 'gold', spireBottom, 3.20, 0.290, 11, 10);
}

function squatWeathered(bag: Bag): void {
  squareProfile(bag, 'basalt', [
    [0, 1.04],
    [0.040, 1.04],
    [0.040, 0.97],
    [0.090, 0.97],
    [0.090, 1.00],
    [0.130, 1.00],
    [0.130, 0.90],
    [0.170, 0.90],
    [0.200, 0.88],
  ]);

  dome(bag, 'basalt', 0.490, 0.180, 0.560, 1.020, 40, 12, 0.006, 51);
  roundedBand(bag, 'basalt', 0.488, 0.215, 0.028, 24);
  roundedBand(bag, 'basalt', 0.493, 0.540, 0.030, 24);

  niche(
    bag, 'basalt', 'basalt',
    0.340, 0.340, 0.205, 0.494,
    0, false, true, true,
  );

  const spireBottom = harmika(bag, 'basalt', 1.015, 0.210, 0.055);
  umbrellaSpire(bag, 'basalt', 'gold', spireBottom, 1.50, 0.180, 3, 10);
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
