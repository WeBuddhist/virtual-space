// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, tower round 4); regenerate rather than hand-edit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './kit';
import type { MatName } from './kit';

type NicheKit = {
  stone: THREE.BufferGeometry;
  dark: THREE.BufferGeometry;
  figure?: THREE.BufferGeometry;
  backMaterial?: MatName;
};

/** A gavaksha opening: either a broad horseshoe arch or a restrained pointed arch. */
function traceArch(
  path: THREE.Path,
  width: number,
  height: number,
  baseY = 0,
  rounded = false,
): void {
  const w = width / 2;
  const rise = width * (rounded ? 0.76 : 0.58);
  const spring = baseY + height - rise;
  path.moveTo(-w, baseY);
  path.lineTo(w, baseY);
  path.lineTo(w, spring);
  if (rounded) {
    path.absellipse(0, spring, w, rise, 0, Math.PI, false, 0);
  } else {
    path.quadraticCurveTo(w, baseY + height - width * 0.14, 0, baseY + height);
    path.quadraticCurveTo(-w, baseY + height - width * 0.14, -w, spring);
  }
  path.lineTo(-w, baseY);
  path.closePath();
}

function transformed(
  source: THREE.BufferGeometry,
  x = 0,
  y = 0,
  z = 0,
  sx = 1,
  sy = 1,
  sz = 1,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.BufferGeometry {
  const g = source.clone();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    q,
    new THREE.Vector3(sx, sy, sz),
  );
  g.applyMatrix4(m);
  return g;
}

function bake(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = parts.map((g) => (g.index ? g.toNonIndexed() : g.clone()));
  const merged = mergeGeometries(normalized, false);
  if (!merged) throw new Error('Could not merge temple carving geometry');
  return merged;
}

/** Eight-corner prism. Rings run back-left, back-right, front-right, front-left. */
function prismGeometry(bottom: number[][], top: number[][]): THREE.BufferGeometry {
  const v = bottom.concat(top);
  const faces = [
    [3, 2, 6, 7],
    [1, 0, 4, 5],
    [2, 1, 5, 6],
    [0, 3, 7, 4],
    [7, 6, 5, 4],
    [0, 1, 2, 3],
  ];
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const face of faces) {
    const base = positions.length / 3;
    for (const index of face) {
      positions.push(v[index][0], v[index][1], v[index][2]);
    }
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function squareFrustum(bottomHalf: number, topHalf: number, height: number): THREE.BufferGeometry {
  return prismGeometry(
    [
      [-bottomHalf, 0, -bottomHalf],
      [bottomHalf, 0, -bottomHalf],
      [bottomHalf, 0, bottomHalf],
      [-bottomHalf, 0, bottomHalf],
    ],
    [
      [-topHalf, height, -topHalf],
      [topHalf, height, -topHalf],
      [topHalf, height, topHalf],
      [-topHalf, height, topHalf],
    ],
  );
}

function ribGeometry(
  height: number,
  coreBottom: number,
  coreTop: number,
  widthBottom: number,
  widthTop: number,
  projectionBottom: number,
  projectionTop: number,
): THREE.BufferGeometry {
  const backB = coreBottom - 0.14;
  const backT = coreTop - 0.10;
  const frontB = coreBottom + projectionBottom;
  const frontT = coreTop + projectionTop;
  return prismGeometry(
    [
      [-widthBottom / 2, 0, backB],
      [widthBottom / 2, 0, backB],
      [widthBottom / 2, 0, frontB],
      [-widthBottom / 2, 0, frontB],
    ],
    [
      [-widthTop / 2, height, backT],
      [widthTop / 2, height, backT],
      [widthTop / 2, height, frontT],
      [-widthTop / 2, height, frontT],
    ],
  );
}

function cornerStripGeometry(
  height: number,
  bottomHalf: number,
  topHalf: number,
  bottomWidth: number,
  topWidth: number,
  sx: number,
  sz: number,
): THREE.BufferGeometry {
  const bx = sx * bottomHalf;
  const bz = sz * bottomHalf;
  const tx = sx * topHalf;
  const tz = sz * topHalf;
  const wb = bottomWidth / 2;
  const wt = topWidth / 2;
  return prismGeometry(
    [
      [bx - wb, 0, bz - wb],
      [bx + wb, 0, bz - wb],
      [bx + wb, 0, bz + wb],
      [bx - wb, 0, bz + wb],
    ],
    [
      [tx - wt, height, tz - wt],
      [tx + wt, height, tz - wt],
      [tx + wt, height, tz + wt],
      [tx - wt, height, tz + wt],
    ],
  );
}

function limb(a: THREE.Vector3, b: THREE.Vector3, radius: number): THREE.BufferGeometry {
  const direction = b.clone().sub(a);
  const length = direction.length();
  const g = new THREE.CylinderGeometry(radius * 0.82, radius, length, 5, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  const m = new THREE.Matrix4().compose(
    a.clone().add(b).multiplyScalar(0.5),
    q,
    new THREE.Vector3(1, 1, 1),
  );
  g.applyMatrix4(m);
  return g;
}

/** Low-relief Buddha in dhyana mudra, with crossed legs, hands, halo and ushnisha. */
function buddhaParts(detailed: boolean): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const segments = detailed ? 8 : 6;
  const rows = detailed ? 5 : 4;

  parts.push(transformed(new THREE.BoxGeometry(0.78, 0.11, 0.19), 0, 0.18, 0.075));
  parts.push(
    transformed(
      new THREE.SphereGeometry(0.5, segments, rows),
      0,
      0.39,
      0.10,
      0.75,
      0.23,
      0.24,
    ),
  );
  parts.push(
    transformed(
      new THREE.SphereGeometry(0.5, segments, rows),
      0,
      0.79,
      0.085,
      0.54,
      0.72,
      0.24,
    ),
  );
  parts.push(
    transformed(
      new THREE.SphereGeometry(0.5, segments, rows),
      0,
      1.22,
      0.09,
      0.31,
      0.36,
      0.25,
    ),
  );
  parts.push(
    transformed(
      new THREE.SphereGeometry(0.5, 6, 4),
      0,
      1.405,
      0.09,
      0.13,
      0.15,
      0.13,
    ),
  );

  if (detailed) {
    const leftElbow = new THREE.Vector3(-0.29, 0.54, 0.13);
    const rightElbow = new THREE.Vector3(0.29, 0.54, 0.13);
    parts.push(
      limb(new THREE.Vector3(-0.20, 0.95, 0.10), leftElbow, 0.052),
      limb(new THREE.Vector3(0.20, 0.95, 0.10), rightElbow, 0.052),
      limb(leftElbow, new THREE.Vector3(-0.08, 0.49, 0.18), 0.040),
      limb(rightElbow, new THREE.Vector3(0.08, 0.49, 0.18), 0.040),
    );
    parts.push(
      transformed(
        new THREE.SphereGeometry(0.5, 6, 4),
        -0.075,
        0.50,
        0.18,
        0.15,
        0.075,
        0.08,
      ),
      transformed(
        new THREE.SphereGeometry(0.5, 6, 4),
        0.075,
        0.50,
        0.18,
        0.15,
        0.075,
        0.08,
      ),
      transformed(
        new THREE.SphereGeometry(0.5, 5, 3),
        -0.165,
        1.20,
        0.09,
        0.055,
        0.14,
        0.06,
      ),
      transformed(
        new THREE.SphereGeometry(0.5, 5, 3),
        0.165,
        1.20,
        0.09,
        0.055,
        0.14,
        0.06,
      ),
    );
    parts.push(
      limb(
        new THREE.Vector3(-0.17, 1.00, 0.205),
        new THREE.Vector3(0.12, 0.64, 0.205),
        0.018,
      ),
    );
    parts.push(transformed(new THREE.TorusGeometry(0.215, 0.025, 4, 14), 0, 1.22, 0.025));
  }
  return parts;
}

/** Extruded arch, side colonnettes, capitals, sill, and a separately shaded figure. */
function makeNiche(
  detailed: boolean,
  withFigure: boolean,
  rounded = false,
  blind = false,
): NicheKit {
  const outer = new THREE.Shape();
  traceArch(outer, 1, 2, 0, rounded);
  const hole = new THREE.Path();
  traceArch(hole, 0.72, 1.68, 0.14, rounded);
  outer.holes.push(hole);

  const frame = new THREE.ExtrudeGeometry(outer, {
    depth: 0.15,
    steps: 1,
    bevelEnabled: false,
    curveSegments: detailed ? 5 : 3,
  });

  const stoneParts: THREE.BufferGeometry[] = [
    frame,
    transformed(new THREE.BoxGeometry(1.18, 0.10, 0.25), 0, 0.045, 0.095),
    transformed(new THREE.BoxGeometry(0.96, 0.055, 0.20), 0, 0.145, 0.07),
    transformed(new THREE.ConeGeometry(0.080, 0.17, 5), 0, 2.055, 0.075),
  ];

  for (const sign of [-1, 1]) {
    stoneParts.push(
      transformed(new THREE.BoxGeometry(0.095, 1.24, 0.16), sign * 0.55, 0.79, 0.055),
      transformed(new THREE.BoxGeometry(0.22, 0.12, 0.21), sign * 0.55, 1.43, 0.07),
      transformed(new THREE.BoxGeometry(0.19, 0.11, 0.19), sign * 0.55, 0.19, 0.065),
    );
  }

  const backShape = new THREE.Shape();
  traceArch(backShape, 0.72, 1.68, 0.14, rounded);
  const dark = transformed(new THREE.ShapeGeometry(backShape, detailed ? 5 : 3), 0, 0, 0.012);

  return {
    stone: bake(stoneParts),
    dark: bake([dark]),
    figure: withFigure ? bake(buddhaParts(detailed)) : undefined,
    backMaterial: blind ? 'sandstone' : 'dark',
  };
}

function makeWindow(): NicheKit {
  const rearOuter = new THREE.Shape();
  traceArch(rearOuter, 2.14, 7.48, -0.12, false);
  const rearHole = new THREE.Path();
  traceArch(rearHole, 1.82, 7.20, 0, false);
  rearOuter.holes.push(rearHole);

  const outer = new THREE.Shape();
  traceArch(outer, 1.82, 7.20, 0, false);
  const hole = new THREE.Path();
  traceArch(hole, 1.10, 6.62, 0.22, false);
  outer.holes.push(hole);

  const rearFrame = new THREE.ExtrudeGeometry(rearOuter, {
    depth: 0.10,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 8,
  });
  const frame = new THREE.ExtrudeGeometry(outer, {
    depth: 0.25,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 8,
  });

  const stone = bake([
    rearFrame,
    transformed(frame, 0, 0, 0.07),
    transformed(new THREE.BoxGeometry(2.34, 0.18, 0.40), 0, 0.07, 0.12),
    transformed(new THREE.BoxGeometry(2.16, 0.10, 0.32), 0, 0.25, 0.10),
  ]);

  const backShape = new THREE.Shape();
  traceArch(backShape, 1.10, 6.62, 0.22, false);
  const dark = bake([transformed(new THREE.ShapeGeometry(backShape, 8), 0, 0, 0.015)]);
  return { stone, dark };
}

/** Circular Buddha shrine used on the central offset. */
function makeMedallion(): NicheKit {
  const figureParts = buddhaParts(true).map((g) =>
    transformed(g, 0, -0.72, 0.07, 0.72, 0.72, 0.72),
  );
  const stone = bake([
    transformed(new THREE.TorusGeometry(0.62, 0.085, 6, 24), 0, 0, 0.08),
    transformed(new THREE.TorusGeometry(0.75, 0.035, 4, 24), 0, 0, 0.04),
    transformed(new THREE.BoxGeometry(1.62, 0.10, 0.23), 0, -0.73, 0.08),
    transformed(new THREE.ConeGeometry(0.075, 0.16, 5), 0, 0.81, 0.07),
  ]);
  const dark = bake([transformed(new THREE.CircleGeometry(0.55, 20), 0, 0, 0.015)]);
  return { stone, dark, figure: bake(figureParts) };
}

function makeSmallRecess(round: boolean): NicheKit {
  if (round) {
    return {
      stone: bake([
        transformed(new THREE.TorusGeometry(0.36, 0.07, 4, 14), 0, 0, 0.055),
        transformed(new THREE.BoxGeometry(0.92, 0.08, 0.15), 0, -0.45, 0.045),
      ]),
      dark: bake([transformed(new THREE.CircleGeometry(0.29, 12), 0, 0, 0.012)]),
    };
  }
  return {
    stone: bake([
      transformed(new THREE.BoxGeometry(0.88, 0.10, 0.16), 0, 0.40, 0.05),
      transformed(new THREE.BoxGeometry(0.88, 0.10, 0.16), 0, -0.40, 0.05),
      transformed(new THREE.BoxGeometry(0.10, 0.72, 0.16), -0.39, 0, 0.05),
      transformed(new THREE.BoxGeometry(0.10, 0.72, 0.16), 0.39, 0, 0.05),
      transformed(new THREE.BoxGeometry(0.98, 0.07, 0.19), 0, 0.49, 0.055),
    ]),
    dark: bake([transformed(new THREE.PlaneGeometry(0.65, 0.65), 0, 0, 0.012)]),
  };
}

/** Continuous paired foliate scroll for the lower storey's carved frieze. */
function makeScroll(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const curl = new THREE.TorusGeometry(0.19, 0.026, 4, 10, Math.PI * 1.55);
  parts.push(
    transformed(curl, -0.20, 0.01, 0.035, 1, 1, 1, 0, 0, 0.35),
    transformed(curl, 0.20, 0.01, 0.035, 1, 1, 1, 0, 0, Math.PI + 0.35),
    limb(
      new THREE.Vector3(-0.52, -0.13, 0.03),
      new THREE.Vector3(0.52, -0.13, 0.03),
      0.018,
    ),
  );

  const leaf = new THREE.SphereGeometry(0.5, 5, 3);
  for (const [x, y, angle] of [
    [-0.39, -0.04, -0.65],
    [-0.10, 0.18, 0.55],
    [0.10, 0.18, -0.55],
    [0.39, -0.04, 0.65],
  ]) {
    parts.push(transformed(leaf, x, y, 0.035, 0.15, 0.29, 0.075, 0, 0, angle));
  }
  parts.push(transformed(new THREE.SphereGeometry(0.5, 5, 3), 0, 0, 0.07, 0.17, 0.17, 0.09));
  return bake(parts);
}

/** Small kirttimukha-like cornice mask with projecting muzzle and dark eyes. */
function makeLionMask(): NicheKit {
  const stone = bake([
    transformed(new THREE.SphereGeometry(0.5, 6, 4), 0, 0, 0.08, 0.62, 0.58, 0.30),
    transformed(new THREE.SphereGeometry(0.5, 5, 3), -0.10, -0.10, 0.22, 0.24, 0.19, 0.18),
    transformed(new THREE.SphereGeometry(0.5, 5, 3), 0.10, -0.10, 0.22, 0.24, 0.19, 0.18),
    transformed(new THREE.ConeGeometry(0.09, 0.20, 5), -0.25, 0.18, 0.07, 1, 1, 1, 0, 0, -0.45),
    transformed(new THREE.ConeGeometry(0.09, 0.20, 5), 0.25, 0.18, 0.07, 1, 1, 1, 0, 0, 0.45),
  ]);
  const dark = bake([
    transformed(new THREE.SphereGeometry(0.5, 5, 3), -0.115, 0.055, 0.245, 0.075, 0.065, 0.045),
    transformed(new THREE.SphereGeometry(0.5, 5, 3), 0.115, 0.055, 0.245, 0.075, 0.065, 0.045),
  ]);
  return { stone, dark };
}

export function build(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Mahabodhi temple tower';

  const buckets = new Map<MatName, THREE.BufferGeometry[]>();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const yAxis = new THREE.Vector3(0, 1, 0);

  function put(source: THREE.BufferGeometry, material: MatName, matrix: THREE.Matrix4): void {
    const g = source.index ? source.toNonIndexed() : source.clone();
    g.applyMatrix4(matrix);
    let list = buckets.get(material);
    if (!list) {
      list = [];
      buckets.set(material, list);
    }
    list.push(g);
  }

  function matrixAt(
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1,
  ): THREE.Matrix4 {
    return new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(sx, sy, sz),
    );
  }

  function boxAt(
    material: MatName,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    ry = 0,
  ): void {
    put(unitBox, material, matrixAt(x, y, z, 0, ry, 0, width, height, depth));
  }

  function placeKit(kit: NicheKit, matrix: THREE.Matrix4): void {
    put(kit.stone, 'stucco', matrix);
    put(kit.dark, kit.backMaterial ?? 'dark', matrix);
    if (kit.figure) put(kit.figure, 'sandstone', matrix);
  }

  /** Local x crosses a face, local y follows its batter, local z projects outward. */
  function faceMatrix(
    face: number,
    u: number,
    y: number,
    half: number,
    outward: number,
    slope: number,
    sx: number,
    sy: number,
    sz: number,
    cx = 0,
    cz = 0,
  ): THREE.Matrix4 {
    const angle = face * Math.PI / 2;
    const m = new THREE.Matrix4().makeRotationY(angle);
    m.multiply(new THREE.Matrix4().makeRotationX(-Math.atan(slope)));
    m.multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
    const p = new THREE.Vector3(u, y, half + outward).applyAxisAngle(yAxis, angle);
    p.x += cx;
    p.z += cz;
    m.setPosition(p);
    return m;
  }

  function faceBox(
    material: MatName,
    face: number,
    u: number,
    y: number,
    half: number,
    outward: number,
    width: number,
    height: number,
    depth: number,
    slope = 0,
    cx = 0,
    cz = 0,
  ): void {
    put(
      unitBox,
      material,
      faceMatrix(face, u, y, half, outward, slope, width, height, depth, cx, cz),
    );
  }

  function faceNiche(
    kit: NicheKit,
    face: number,
    u: number,
    baseY: number,
    half: number,
    outward: number,
    slope: number,
    width: number,
    height: number,
    cx = 0,
    cz = 0,
  ): void {
    placeKit(
      kit,
      faceMatrix(face, u, baseY, half, outward, slope, width, height / 2, width, cx, cz),
    );
  }

  function faceRecess(
    kit: NicheKit,
    face: number,
    u: number,
    centerY: number,
    half: number,
    outward: number,
    slope: number,
    width: number,
    height: number,
    cx = 0,
    cz = 0,
  ): void {
    placeKit(
      kit,
      faceMatrix(face, u, centerY, half, outward, slope, width, height, width, cx, cz),
    );
  }

  function ringAt(
    half: number,
    thickness: number,
    height: number,
    y: number,
    material: MatName,
    cx = 0,
    cz = 0,
    doorHalfGap = 0,
  ): void {
    const full = 2 * (half + thickness);
    boxAt(material, full, height, thickness, cx, y, cz - half - thickness / 2);
    boxAt(material, thickness, height, 2 * half, cx - half - thickness / 2, y, cz);
    boxAt(material, thickness, height, 2 * half, cx + half + thickness / 2, y, cz);

    if (doorHalfGap > 0) {
      const length = half + thickness - doorHalfGap;
      const center = doorHalfGap + length / 2;
      boxAt(material, length, height, thickness, cx - center, y, cz + half + thickness / 2);
      boxAt(material, length, height, thickness, cx + center, y, cz + half + thickness / 2);
    } else {
      boxAt(material, full, height, thickness, cx, y, cz + half + thickness / 2);
    }
  }

  const highNiche = makeNiche(true, true, false);
  const highRoundNiche = makeNiche(true, true, true);
  const lowNiche = makeNiche(false, true, false);
  const lowRoundNiche = makeNiche(false, true, true);
  const emptyNiche = makeNiche(false, false, false);
  const blindRoundNiche = makeNiche(false, false, true, true);
  const roundRecess = makeSmallRecess(true);
  const squareRecess = makeSmallRecess(false);
  const medallion = makeMedallion();
  const tallWindow = makeWindow();
  const scroll = makeScroll();
  const lionMask = makeLionMask();
  const cornicePetal = new THREE.SphereGeometry(0.5, 5, 3);
  const lotusPetal = new THREE.OctahedronGeometry(0.5, 0);

  // ---------------------------------------------------------------------------
  // Lower storey. Every interior face remains outside its keep-clear volume.
  // ---------------------------------------------------------------------------
  const WALL = 7.2;

  boxAt('sandstone', 14.4, 11, 4.0, 0, 5.5, -5.2);
  boxAt('sandstone', 4.2, 11, 10.4, -5.1, 5.5, 2.0);
  boxAt('sandstone', 4.2, 11, 10.4, 5.1, 5.5, 2.0);
  boxAt('sandstone', 2.1, 11, 4.4, -1.95, 5.5, 5.0);
  boxAt('sandstone', 2.1, 11, 4.4, 1.95, 5.5, 5.0);
  boxAt('sandstone', 1.8, 7.6, 4.4, 0, 7.2, 5.0);
  boxAt('sandstone', 6.0, 4.0, 6.0, 0, 9.0, -0.2);

  // Visible dark lining, all just outside the sanctum and passage clearances.
  boxAt('dark', 5.8, 6.8, 0.02, 0, 3.4, -3.19);
  boxAt('dark', 0.02, 3.25, 4.3, -0.895, 1.675, 5.0);
  boxAt('dark', 0.02, 3.25, 4.3, 0.895, 1.675, 5.0);
  boxAt('dark', 1.72, 0.02, 4.3, 0, 3.39, 5.0);

  const lowerMouldings: Array<[number, number, number]> = [
    [0.15, 0.30, 0.28],
    [0.43, 0.14, 0.20],
    [0.68, 0.20, 0.24],
    [0.94, 0.10, 0.13],
    [5.64, 0.18, 0.18],
    [5.91, 0.11, 0.12],
    [9.91, 0.16, 0.18],
    [10.16, 0.15, 0.25],
    [10.43, 0.20, 0.18],
    [10.72, 0.20, 0.29],
  ];
  for (const [y, h, projection] of lowerMouldings) {
    const gap = y - h / 2 < 3.36 ? 1.03 : 0;
    ringAt(WALL, projection, h, y, 'stucco', 0, 0, gap);
  }

  for (let face = 0; face < 4; face++) {
    const lowerPositions = face === 0 ? [-5.15, -2.55, 2.55, 5.15] : [-5.15, -2.55, 0, 2.55, 5.15];
    for (const u of lowerPositions) {
      faceNiche(highRoundNiche, face, u, 1.45, WALL, 0.018, 0, 1.35, 3.60);
    }

    for (let i = 0; i < 7; i++) {
      const u = -5.70 + i * 1.90;
      faceNiche(
        i % 3 === 1 ? highNiche : highRoundNiche,
        face,
        u,
        7.15,
        WALL,
        0.018,
        0,
        1.15,
        2.25,
      );
    }

    for (const u of [-6.55, -3.95, -1.25, 1.25, 3.95, 6.55]) {
      faceBox('stucco', face, u, 3.28, WALL, 0.075, 0.22, 4.75, 0.18);
      faceBox('stucco', face, u, 5.69, WALL, 0.10, 0.43, 0.18, 0.25);
      faceBox('sandstone', face, u, 0.96, WALL, 0.07, 0.39, 0.22, 0.20);
    }
    for (const u of [-6.63, 6.63]) {
      faceBox('stucco', face, u, 8.25, WALL, 0.08, 0.25, 2.55, 0.20);
      faceBox('stucco', face, u, 9.50, WALL, 0.11, 0.47, 0.18, 0.26);
    }

    for (let i = 0; i < 9; i++) {
      const u = -5.60 + i * 1.40;
      put(scroll, 'stucco', faceMatrix(face, u, 6.38, WALL, 0.055, 0, 1.08, 1.08, 1.08));
    }

    for (let i = 0; i < 29; i++) {
      const u = -6.72 + i * 0.48;
      faceBox('stucco', face, u, 9.77, WALL, 0.12, 0.20, 0.20, 0.22);
      if (i % 4 === 2) {
        placeKit(
          lionMask,
          faceMatrix(face, u, 10.47, WALL, 0.19, 0, 0.70, 0.70, 0.70),
        );
      } else {
        put(
          cornicePetal,
          'stucco',
          faceMatrix(face, u, 10.47, WALL, 0.17, 0, 0.25, 0.34, 0.12),
        );
      }
    }
  }

  // Open east doorway; jambs and lintel remain outside the passage.
  boxAt('stucco', 0.28, 3.40, 0.34, -1.04, 1.70, 7.25);
  boxAt('stucco', 0.28, 3.40, 0.34, 1.04, 1.70, 7.25);
  boxAt('stucco', 2.42, 0.30, 0.38, 0, 3.55, 7.25);
  boxAt('sandstone', 2.72, 0.15, 0.29, 0, 3.77, 7.23);
  faceNiche(emptyNiche, 0, 0, 3.82, WALL, 0.04, 0, 2.22, 1.72);

  // Terrace, parapet and coping.
  boxAt('sandstone', 14.55, 0.25, 14.55, 0, 10.94, 0);
  ringAt(6.98, 0.27, 0.62, 11.35, 'sandstone');
  ringAt(6.98, 0.40, 0.16, 11.72, 'stucco');
  ringAt(6.98, 0.32, 0.12, 11.08, 'stucco');
  for (let face = 0; face < 4; face++) {
    for (const u of [-5.7, -4.55, -3.4, -2.25, -1.1, 0, 1.1, 2.25, 3.4, 4.55, 5.7]) {
      faceBox('stucco', face, u, 11.37, 7.0, 0.16, 0.10, 0.42, 0.10);
    }
  }

  const stupaProfile = [
    new THREE.Vector2(0.25, 0.10),
    new THREE.Vector2(0.29, 0.18),
    new THREE.Vector2(0.27, 0.29),
    new THREE.Vector2(0.22, 0.44),
    new THREE.Vector2(0.15, 0.55),
    new THREE.Vector2(0.12, 0.64),
    new THREE.Vector2(0.08, 0.73),
  ];
  const smallStupa = bake([
    transformed(new THREE.BoxGeometry(0.58, 0.12, 0.58), 0, 0.06, 0),
    new THREE.LatheGeometry(stupaProfile, 12),
    transformed(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), 0, 0.68, 0),
    transformed(new THREE.ConeGeometry(0.13, 0.48, 12), 0, 0.96, 0),
    transformed(new THREE.SphereGeometry(0.055, 6, 4), 0, 1.21, 0),
  ]);
  for (let face = 0; face < 4; face++) {
    for (const u of [-4.2, -2.8, -1.4, 0, 1.4, 2.8, 4.2]) {
      const angle = face * Math.PI / 2;
      const p = new THREE.Vector3(u, 0, 6.53).applyAxisAngle(yAxis, angle);
      put(smallStupa, 'stucco', matrixAt(p.x, 11.18, p.z, 0, angle, 0));
    }
  }

  // Ribbed corner-amalaka prototype repeated at each main shikhara tier.
  const tierKnob = bake([
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.20, 0),
        new THREE.Vector2(0.25, 0.06),
        new THREE.Vector2(0.25, 0.12),
        new THREE.Vector2(0.20, 0.17),
        new THREE.Vector2(0.22, 0.23),
        new THREE.Vector2(0.17, 0.30),
        new THREE.Vector2(0.10, 0.36),
        new THREE.Vector2(0.04, 0.40),
      ],
      12,
    ),
    transformed(new THREE.TorusGeometry(0.215, 0.028, 4, 12), 0, 0.20, 0, 1, 1, 1, Math.PI / 2),
    transformed(new THREE.SphereGeometry(0.05, 6, 4), 0, 0.40, 0),
  ]);

  // ---------------------------------------------------------------------------
  // Shared crown: stepped neck, ribbed amalaka, upper neck and gold stupa-finial.
  // ---------------------------------------------------------------------------
  const amalaka = new THREE.LatheGeometry(
    [
      new THREE.Vector2(1.34, 1.10),
      new THREE.Vector2(1.62, 1.20),
      new THREE.Vector2(1.94, 1.34),
      new THREE.Vector2(2.13, 1.51),
      new THREE.Vector2(2.17, 1.69),
      new THREE.Vector2(2.09, 1.88),
      new THREE.Vector2(1.84, 2.03),
      new THREE.Vector2(1.43, 2.14),
    ],
    48,
  );
  const upperNeck = new THREE.LatheGeometry(
    [
      new THREE.Vector2(1.40, 2.05),
      new THREE.Vector2(1.39, 2.25),
      new THREE.Vector2(1.23, 2.38),
      new THREE.Vector2(1.20, 2.70),
      new THREE.Vector2(1.08, 2.87),
      new THREE.Vector2(1.05, 3.23),
      new THREE.Vector2(0.91, 3.43),
      new THREE.Vector2(0.88, 3.83),
      new THREE.Vector2(0.73, 4.04),
      new THREE.Vector2(0.70, 4.34),
    ],
    40,
  );
  const goldStupa = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.68, 4.30),
      new THREE.Vector2(0.79, 4.43),
      new THREE.Vector2(0.80, 4.62),
      new THREE.Vector2(0.67, 4.82),
      new THREE.Vector2(0.55, 4.98),
      new THREE.Vector2(0.52, 5.23),
      new THREE.Vector2(0.43, 5.43),
      new THREE.Vector2(0.36, 5.78),
      new THREE.Vector2(0.28, 6.10),
      new THREE.Vector2(0.20, 6.54),
      new THREE.Vector2(0.13, 7.08),
      new THREE.Vector2(0.065, 7.65),
      new THREE.Vector2(0.02, 7.94),
      new THREE.Vector2(0, 8.0),
    ],
    32,
  );
  const lowerNeck = new THREE.CylinderGeometry(1.37, 1.48, 0.72, 32, 1);

  function addCrown(cx: number, cz: number, baseY: number, scale: number): void {
    boxAt('stucco', 4.82 * scale, 0.24 * scale, 4.82 * scale, cx, baseY + 0.12 * scale, cz);
    boxAt('sandstone', 4.48 * scale, 0.23 * scale, 4.48 * scale, cx, baseY + 0.355 * scale, cz);
    boxAt('stucco', 4.18 * scale, 0.12 * scale, 4.18 * scale, cx, baseY + 0.53 * scale, cz);

    put(
      lowerNeck,
      'sandstone',
      matrixAt(cx, baseY + 0.90 * scale, cz, 0, 0, 0, scale, scale, scale),
    );
    put(amalaka, 'sandstone', matrixAt(cx, baseY, cz, 0, 0, 0, scale, scale, scale));
    put(upperNeck, 'sandstone', matrixAt(cx, baseY, cz, 0, 0, 0, scale, scale, scale));

    // Lotus collar beneath the ribbed amalaka.
    for (let i = 0; i < 40; i++) {
      const a = i * Math.PI * 2 / 40;
      const r = 1.47 * scale;
      put(
        lotusPetal,
        'stucco',
        matrixAt(
          cx + Math.sin(a) * r,
          baseY + 1.13 * scale,
          cz + Math.cos(a) * r,
          0,
          a,
          0,
          0.22 * scale,
          0.50 * scale,
          0.13 * scale,
        ),
      );
    }

    for (let i = 0; i < 48; i++) {
      const a = i * Math.PI * 2 / 48;
      const r = 2.12 * scale;
      boxAt(
        'stucco',
        0.105 * scale,
        0.57 * scale,
        0.17 * scale,
        cx + Math.sin(a) * r,
        baseY + 1.66 * scale,
        cz + Math.cos(a) * r,
        a,
      );
    }

    for (const [radius, y, tube] of [
      [1.30, 2.31, 0.065],
      [1.10, 2.84, 0.055],
      [0.93, 3.40, 0.050],
      [0.75, 4.03, 0.045],
    ]) {
      put(
        new THREE.TorusGeometry(radius, tube, 5, 40),
        'stucco',
        matrixAt(cx, baseY + y * scale, cz, Math.PI / 2, 0, 0, scale, scale, scale),
      );
    }

    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI * 2 / 16;
      const r = 1.04 * scale;
      boxAt(
        'dark',
        0.20 * scale,
        0.30 * scale,
        0.035 * scale,
        cx + Math.sin(a) * r,
        baseY + 3.12 * scale,
        cz + Math.cos(a) * r,
        a,
      );
    }

    put(goldStupa, 'gold', matrixAt(cx, baseY, cz, 0, 0, 0, scale, scale, scale));
    const discs: Array<[number, number, number]> = [
      [0.77, 4.93, 0.11],
      [0.64, 5.47, 0.10],
      [0.51, 5.98, 0.09],
      [0.39, 6.45, 0.08],
      [0.28, 6.88, 0.07],
    ];
    for (const [radius, y, height] of discs) {
      put(
        new THREE.CylinderGeometry(radius * 0.94, radius, height, 24, 1),
        'gold',
        matrixAt(cx, baseY + y * scale, cz, 0, 0, 0, scale, scale, scale),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Great shikhara: 10 m square at y=11 and 4.5 m square at y=47.
  // ---------------------------------------------------------------------------
  const BASE_Y = 11;
  const MAIN_H = 36;
  const MAIN_BOTTOM = 5;
  const MAIN_TOP = 2.25;
  const MAIN_SLOPE = (MAIN_BOTTOM - MAIN_TOP) / MAIN_H;
  const mainHalf = (y: number) => MAIN_BOTTOM - MAIN_SLOPE * (y - BASE_Y);
  const mainRibWidth = (y: number) => 3.35 - 2.45 * ((y - BASE_Y) / MAIN_H);
  const mainProjection = (y: number) => 0.60 - 0.32 * ((y - BASE_Y) / MAIN_H);

  put(squareFrustum(MAIN_BOTTOM, MAIN_TOP, MAIN_H), 'sandstone', matrixAt(0, BASE_Y, 0));
  const mainRib = ribGeometry(MAIN_H, MAIN_BOTTOM, MAIN_TOP, 3.35, 0.90, 0.60, 0.28);
  for (let face = 0; face < 4; face++) {
    put(mainRib, 'stucco', matrixAt(0, BASE_Y, 0, 0, face * Math.PI / 2, 0));
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      put(
        cornerStripGeometry(MAIN_H, MAIN_BOTTOM, MAIN_TOP, 0.54, 0.34, sx, sz),
        'sandstone',
        matrixAt(0, BASE_Y, 0),
      );
    }
  }

  for (let tier = 0; tier < 9; tier++) {
    const y0 = BASE_Y + tier * 4;
    const y1 = y0 + 4;
    const mid = y0 + 1.65;
    const t = tier / 8;

    for (const y of [y0 + 0.08, y0 + 0.31]) {
      const half = mainHalf(y);
      const lower = y === y0 + 0.08;
      ringAt(half, lower ? 0.31 : 0.15, lower ? 0.17 : 0.10, y, lower ? 'stucco' : 'sandstone');
      for (let face = 0; face < 4; face++) {
        if (face === 0 && y > 13.7 && y < 21.6) continue;
        const projection = mainProjection(y);
        faceBox(
          'stucco',
          face,
          0,
          y,
          half,
          projection / 2 + 0.04,
          mainRibWidth(y) + 0.34,
          lower ? 0.17 : 0.10,
          projection + (lower ? 0.36 : 0.28),
        );
      }
    }

    const midBandY = y0 + 2.78;
    const midBandHalf = mainHalf(midBandY);
    ringAt(midBandHalf, 0.12, 0.09, midBandY, 'sandstone');
    ringAt(midBandHalf, 0.21, 0.10, midBandY + 0.15, 'stucco');
    for (let face = 0; face < 4; face++) {
      if (!(face === 0 && midBandY < 21.6)) {
        const projection = mainProjection(midBandY);
        faceBox(
          'stucco',
          face,
          0,
          midBandY + 0.15,
          mainHalf(midBandY + 0.15),
          projection / 2 + 0.035,
          mainRibWidth(midBandY) + 0.22,
          0.10,
          projection + 0.24,
        );
      }

      const petalY = midBandY + 0.15;
      const petalHalf = mainHalf(petalY);
      const petalCount = Math.max(9, Math.floor((petalHalf * 2) / 0.55));
      for (let i = 0; i < petalCount; i++) {
        const u = -petalHalf + 0.22 + i * ((petalHalf * 2 - 0.44) / (petalCount - 1));
        if (face === 0 && petalY < 21.6 && Math.abs(u) < 1.34) continue;
        put(
          lotusPetal,
          'stucco',
          faceMatrix(face, u, petalY, petalHalf, 0.20, 0, 0.25, 0.28, 0.13),
        );
      }
    }

    const halfMid = mainHalf(mid);
    const ribMid = mainRibWidth(mid);
    const sideInner = ribMid / 2 + 0.13;
    const sideOuter = halfMid - (0.30 - 0.15 * t);
    const sideZone = Math.max(0.65, sideOuter - sideInner);
    const mainHeight = 1.90 - 0.38 * t;
    const singleSideNiche = tier >= 7;

    for (let face = 0; face < 4; face++) {
      for (const sign of [-1, 1]) {
        const fractions = singleSideNiche ? [0.50] : [0.27, 0.73];
        for (let column = 0; column < fractions.length; column++) {
          const u = sign * (sideInner + sideZone * fractions[column]);
          const rounded = (tier + face + column + (sign > 0 ? 1 : 0)) % 4 !== 0;
          const blind = (tier * 5 + face * 2 + column + (sign > 0 ? 3 : 0)) % 8 === 0;
          const width = singleSideNiche
            ? Math.min(0.80, Math.max(0.56, sideZone * 0.96))
            : Math.min(1.24, sideZone * 0.43);
          const height = singleSideNiche ? mainHeight * 0.88 : mainHeight;
          faceNiche(
            blind ? blindRoundNiche : (rounded ? highRoundNiche : highNiche),
            face,
            u,
            y0 + 0.48,
            mainHalf(y0 + 0.48),
            0.022,
            MAIN_SLOPE,
            width,
            height,
          );
        }

        for (let column = 0; column < 2; column++) {
          const fraction = column === 0 ? 0.27 : 0.73;
          const u = sign * (sideInner + sideZone * fraction);
          const smallKit = (tier + column + face + (sign > 0 ? 1 : 0)) % 2 === 0
            ? roundRecess
            : squareRecess;
          faceRecess(
            smallKit,
            face,
            u,
            y0 + 3.34,
            mainHalf(y0 + 3.34),
            0.026,
            MAIN_SLOPE,
            0.58 - 0.14 * t,
            0.57 - 0.12 * t,
          );
        }
      }

      const centralBlocked = face === 0 && (tier === 1 || tier === 2);
      if (!centralBlocked) {
        const centralBase = y0 + 0.48;
        if (tier === 3 || tier === 6) {
          const centerY = y0 + 1.55;
          const medallionScale = tier === 3 ? 1.16 : 0.84;
          placeKit(
            medallion,
            faceMatrix(
              face,
              0,
              centerY,
              mainHalf(centerY),
              mainProjection(centerY) + 0.035,
              MAIN_SLOPE,
              medallionScale,
              medallionScale,
              medallionScale,
            ),
          );
        } else {
          const centralHeight = tier >= 7 ? mainHeight * 0.82 : mainHeight + 0.14;
          faceNiche(
            tier % 2 === 0 ? highNiche : highRoundNiche,
            face,
            0,
            centralBase,
            mainHalf(centralBase),
            mainProjection(centralBase) + 0.025,
            MAIN_SLOPE,
            Math.min(1.62, mainRibWidth(centralBase) * 0.57),
            centralHeight,
          );
        }

        if (!(face === 0 && tier === 0)) {
          faceRecess(
            tier % 2 === 0 ? squareRecess : roundRecess,
            face,
            0,
            y0 + 3.36,
            mainHalf(y0 + 3.36),
            mainProjection(y0 + 3.36) + 0.025,
            MAIN_SLOPE,
            0.61 - 0.15 * t,
            0.60 - 0.12 * t,
          );
        }
      }

      const pilasterBase = y0 + 0.46;
      const pilasterHeight = mainHeight + 0.20;
      const pilasterPositions = [-sideOuter, -sideInner, sideInner, sideOuter];
      for (const u of pilasterPositions) {
        faceBox(
          'stucco',
          face,
          u,
          pilasterBase + pilasterHeight / 2,
          mainHalf(pilasterBase + pilasterHeight / 2),
          0.075,
          0.12,
          pilasterHeight,
          0.17,
          MAIN_SLOPE,
        );
        faceBox(
          'stucco',
          face,
          u,
          pilasterBase + pilasterHeight,
          mainHalf(pilasterBase + pilasterHeight),
          0.10,
          0.26,
          0.12,
          0.22,
          MAIN_SLOPE,
        );
      }

      const dentilHalf = mainHalf(y1 - 0.28);
      const count = Math.max(9, Math.floor((dentilHalf * 2) / 0.46));
      for (let i = 0; i <= count; i++) {
        const u = -dentilHalf + 0.20 + i * ((dentilHalf * 2 - 0.40) / count);
        faceBox('stucco', face, u, y1 - 0.30, dentilHalf, 0.13, 0.16, 0.18, 0.19);
      }
    }

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const h = mainHalf(y1 - 0.15);
        boxAt('stucco', 0.66 - 0.18 * t, 0.18, 0.66 - 0.18 * t, sx * h, y1 - 0.12, sz * h);
        const knobScale = 0.95 - 0.35 * t;
        put(
          tierKnob,
          'sandstone',
          matrixAt(sx * h, y1 - 0.03, sz * h, 0, 0, 0, knobScale, knobScale, knobScale),
        );
      }
    }
  }

  // Narrow, deeply framed east window with blind elongated panels on either side.
  placeKit(
    tallWindow,
    faceMatrix(
      0,
      0,
      14.0,
      mainHalf(14.0),
      mainProjection(14.0) + 0.035,
      MAIN_SLOPE,
      1,
      1,
      1,
    ),
  );
  for (const u of [-1.28, 1.28]) {
    faceNiche(
      blindRoundNiche,
      0,
      u,
      14.35,
      mainHalf(14.35),
      mainProjection(14.35) + 0.04,
      MAIN_SLOPE,
      0.48,
      4.55,
    );
  }
  for (const u of [-1.65, 1.65]) {
    faceBox(
      'stucco',
      0,
      u,
      16.85,
      mainHalf(16.85),
      mainProjection(16.85) + 0.08,
      0.17,
      10.20,
      0.23,
      MAIN_SLOPE,
    );
    faceBox(
      'stucco',
      0,
      u,
      22.00,
      mainHalf(22.00),
      mainProjection(22.00) + 0.11,
      0.42,
      0.23,
      0.31,
      MAIN_SLOPE,
    );
  }

  ringAt(2.25, 0.28, 0.20, 47.00, 'stucco');
  ringAt(2.25, 0.18, 0.13, 47.25, 'stucco');
  addCrown(0, 0, 47.0, 1);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      put(smallStupa, 'stucco', matrixAt(sx * 1.92, 47.43, sz * 1.92, 0, 0, 0, 0.66, 0.66, 0.66));
    }
  }

  // ---------------------------------------------------------------------------
  // Four miniature shikharas, each with four carved tiers and its own crown.
  // ---------------------------------------------------------------------------
  const CORNER_BASE = 11.10;
  const CORNER_H = 7.25;
  const CORNER_BOTTOM = 1.65;
  const CORNER_TOP = 0.65;
  const CORNER_SLOPE = (CORNER_BOTTOM - CORNER_TOP) / CORNER_H;
  const cornerHalf = (y: number) => CORNER_BOTTOM - CORNER_SLOPE * (y - CORNER_BASE);
  const cornerRibWidth = (y: number) => 1.08 - 0.52 * ((y - CORNER_BASE) / CORNER_H);
  const cornerProjection = (y: number) => 0.18 - 0.08 * ((y - CORNER_BASE) / CORNER_H);

  const cornerCore = squareFrustum(CORNER_BOTTOM, CORNER_TOP, CORNER_H);
  const cornerRib = ribGeometry(
    CORNER_H,
    CORNER_BOTTOM,
    CORNER_TOP,
    1.08,
    0.56,
    0.18,
    0.10,
  );

  for (const cx of [-5.5, 5.5]) {
    for (const cz of [-5.5, 5.5]) {
      boxAt('stucco', 3.38, 0.22, 3.38, cx, 11.16, cz);
      boxAt('sandstone', 3.24, 0.20, 3.24, cx, 11.35, cz);
      put(cornerCore, 'sandstone', matrixAt(cx, CORNER_BASE, cz));
      for (let face = 0; face < 4; face++) {
        put(cornerRib, 'sandstone', matrixAt(cx, CORNER_BASE, cz, 0, face * Math.PI / 2, 0));
      }
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          put(
            cornerStripGeometry(CORNER_H, CORNER_BOTTOM, CORNER_TOP, 0.25, 0.15, sx, sz),
            'sandstone',
            matrixAt(cx, CORNER_BASE, cz),
          );
        }
      }

      for (let tier = 0; tier < 4; tier++) {
        const y0 = CORNER_BASE + tier * (CORNER_H / 4);
        const tierH = CORNER_H / 4;
        for (const y of [y0 + 0.04, y0 + 0.18]) {
          ringAt(cornerHalf(y), 0.13, 0.11, y, 'stucco', cx, cz);
          for (let face = 0; face < 4; face++) {
            const p = cornerProjection(y);
            faceBox(
              'stucco',
              face,
              0,
              y,
              cornerHalf(y),
              p / 2 + 0.025,
              cornerRibWidth(y) + 0.18,
              0.11,
              p + 0.17,
              0,
              cx,
              cz,
            );
          }
        }
        ringAt(cornerHalf(y0 + 1.46), 0.10, 0.08, y0 + 1.46, 'sandstone', cx, cz);

        const nicheY = y0 + 0.30;
        const h = Math.min(1.02, tierH - 0.65);
        for (let face = 0; face < 4; face++) {
          const half = cornerHalf(nicheY + 0.45);
          const inner = cornerRibWidth(nicheY) / 2 + 0.07;
          const outer = half - 0.18;
          const u = (inner + outer) / 2;
          for (const sign of [-1, 1]) {
            faceNiche(
              (tier + face) % 2 === 0 ? lowRoundNiche : lowNiche,
              face,
              sign * u,
              nicheY,
              cornerHalf(nicheY),
              0.015,
              CORNER_SLOPE,
              0.44,
              h,
              cx,
              cz,
            );
          }
          faceNiche(
            tier % 2 === 0 ? lowNiche : lowRoundNiche,
            face,
            0,
            nicheY,
            cornerHalf(nicheY),
            cornerProjection(nicheY) + 0.018,
            CORNER_SLOPE,
            0.53,
            h + 0.05,
            cx,
            cz,
          );
          faceRecess(
            (tier + face) % 2 === 0 ? roundRecess : squareRecess,
            face,
            0,
            y0 + 1.60,
            cornerHalf(y0 + 1.60),
            cornerProjection(y0 + 1.60) + 0.02,
            CORNER_SLOPE,
            0.25,
            0.27,
            cx,
            cz,
          );
        }
      }

      ringAt(CORNER_TOP, 0.16, 0.13, CORNER_BASE + CORNER_H, 'stucco', cx, cz);
      addCrown(cx, cz, CORNER_BASE + CORNER_H, 0.34);
    }
  }

  // One merged mesh per material; repeated carvings are cloned from shared prototypes.
  for (const [name, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mat(name));
    mesh.name = `temple-${name}`;
    mesh.castShadow = name !== 'dark';
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}
