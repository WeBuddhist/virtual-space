// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, tower round 3); regenerate rather than hand-edit.
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

/**
 * The amalaka is modelled as a genuinely corrugated surface. Three angular samples
 * per rib make forty-eight substantial radial ridges, rather than a smooth torus.
 */
function ribbedAmalakaGeometry(): THREE.BufferGeometry {
  const profile: Array<[number, number, number]> = [
    [1.34, 1.10, 0.025],
    [1.62, 1.20, 0.070],
    [1.94, 1.34, 0.095],
    [2.13, 1.51, 0.110],
    [2.17, 1.69, 0.115],
    [2.09, 1.88, 0.100],
    [1.84, 2.03, 0.065],
    [1.43, 2.14, 0.020],
  ];
  const radial = 144;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row < profile.length; row++) {
    const [radius, y, depth] = profile[row];
    for (let i = 0; i <= radial; i++) {
      const angle = i * Math.PI * 2 / radial;
      const ridge = i % 3 === 1 ? depth : 0;
      const r = radius + ridge;
      positions.push(Math.sin(angle) * r, y, Math.cos(angle) * r);
      uvs.push(i / radial, row / (profile.length - 1));
    }
  }

  for (let row = 0; row < profile.length - 1; row++) {
    for (let i = 0; i < radial; i++) {
      const a = row * (radial + 1) + i;
      const b = a + radial + 1;
      indices.push(a, a + 1, b + 1, a, b + 1, b);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
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

  parts.push(transformed(new THREE.BoxGeometry(0.82, 0.11, 0.21), 0, 0.17, 0.075));
  parts.push(
    transformed(
      new THREE.SphereGeometry(0.5, segments, rows),
      0,
      0.37,
      0.105,
      0.77,
      0.20,
      0.25,
    ),
  );

  if (detailed) {
    parts.push(
      transformed(
        new THREE.SphereGeometry(0.5, segments, rows),
        0,
        0.77,
        0.085,
        0.55,
        0.60,
        0.24,
      ),
    );
  } else {
    // A tapered torso avoids the snowman-like silhouette of a spherical body.
    parts.push(
      transformed(
        new THREE.CylinderGeometry(0.27, 0.18, 0.52, 6, 1),
        0,
        0.76,
        0.085,
        1,
        1,
        0.45,
      ),
    );
  }

  parts.push(
    transformed(
      new THREE.SphereGeometry(0.5, segments, rows),
      0,
      1.19,
      0.09,
      0.31,
      0.32,
      0.25,
    ),
  );
  parts.push(
    transformed(
      new THREE.SphereGeometry(0.5, 6, 4),
      0,
      1.37,
      0.09,
      0.12,
      0.10,
      0.12,
    ),
  );

  if (!detailed) {
    parts.push(
      transformed(
        new THREE.BoxGeometry(0.075, 0.42, 0.085),
        -0.225,
        0.72,
        0.13,
        1,
        1,
        1,
        0,
        0,
        -0.12,
      ),
      transformed(
        new THREE.BoxGeometry(0.075, 0.42, 0.085),
        0.225,
        0.72,
        0.13,
        1,
        1,
        1,
        0,
        0,
        0.12,
      ),
      transformed(new THREE.BoxGeometry(0.31, 0.065, 0.09), 0, 0.49, 0.17),
    );
  }

  if (detailed) {
    parts.push(
      transformed(
        new THREE.SphereGeometry(0.5, 6, 4),
        -0.255,
        0.335,
        0.14,
        0.34,
        0.16,
        0.22,
      ),
      transformed(
        new THREE.SphereGeometry(0.5, 6, 4),
        0.255,
        0.335,
        0.14,
        0.34,
        0.16,
        0.22,
      ),
    );

    const leftElbow = new THREE.Vector3(-0.29, 0.54, 0.13);
    const rightElbow = new THREE.Vector3(0.29, 0.54, 0.13);
    parts.push(
      limb(new THREE.Vector3(-0.20, 0.93, 0.10), leftElbow, 0.052),
      limb(new THREE.Vector3(0.20, 0.93, 0.10), rightElbow, 0.052),
      limb(leftElbow, new THREE.Vector3(-0.08, 0.48, 0.18), 0.040),
      limb(rightElbow, new THREE.Vector3(0.08, 0.48, 0.18), 0.040),
    );
    parts.push(
      transformed(
        new THREE.SphereGeometry(0.5, 6, 4),
        -0.075,
        0.48,
        0.18,
        0.15,
        0.075,
        0.08,
      ),
      transformed(
        new THREE.SphereGeometry(0.5, 6, 4),
        0.075,
        0.48,
        0.18,
        0.15,
        0.075,
        0.08,
      ),
      transformed(
        new THREE.SphereGeometry(0.5, 5, 3),
        -0.165,
        1.18,
        0.09,
        0.055,
        0.13,
        0.06,
      ),
      transformed(
        new THREE.SphereGeometry(0.5, 5, 3),
        0.165,
        1.18,
        0.09,
        0.055,
        0.13,
        0.06,
      ),
    );
    parts.push(
      limb(
        new THREE.Vector3(-0.17, 0.96, 0.205),
        new THREE.Vector3(0.12, 0.61, 0.205),
        0.018,
      ),
    );
    parts.push(transformed(new THREE.TorusGeometry(0.215, 0.025, 4, 14), 0, 1.19, 0.025));
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
    depth: 0.20,
    steps: 1,
    bevelEnabled: false,
    curveSegments: detailed ? 5 : 3,
  });

  const stoneParts: THREE.BufferGeometry[] = [
    frame,
    transformed(new THREE.BoxGeometry(1.18, 0.10, 0.28), 0, 0.045, 0.10),
    transformed(new THREE.BoxGeometry(0.96, 0.055, 0.22), 0, 0.145, 0.08),
    transformed(new THREE.ConeGeometry(0.080, 0.17, 5), 0, 2.055, 0.13),
  ];

  if (detailed) {
    const hoodOuter = new THREE.Shape();
    traceArch(hoodOuter, 1.12, 2.12, -0.04, rounded);
    const hoodHole = new THREE.Path();
    traceArch(hoodHole, 0.98, 1.94, 0.03, rounded);
    hoodOuter.holes.push(hoodHole);
    stoneParts.push(
      transformed(
        new THREE.ExtrudeGeometry(hoodOuter, {
          depth: 0.06,
          steps: 1,
          bevelEnabled: false,
          curveSegments: 4,
        }),
        0,
        0,
        -0.035,
      ),
    );

    const bead = new THREE.OctahedronGeometry(0.5, 0);
    const rise = rounded ? 0.76 : 0.58;
    const spring = 2 - rise;
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * i / 8;
      stoneParts.push(
        transformed(
          bead,
          Math.cos(a) * 0.515,
          spring + Math.sin(a) * rise * 1.03,
          0.225,
          0.075,
          0.075,
          0.05,
        ),
      );
    }
    stoneParts.push(
      transformed(bead, -0.48, 1.69, 0.19, 0.16, 0.16, 0.07, 0, 0, Math.PI / 4),
      transformed(bead, 0.48, 1.69, 0.19, 0.16, 0.16, 0.07, 0, 0, Math.PI / 4),
    );
  }

  for (const sign of [-1, 1]) {
    stoneParts.push(
      transformed(new THREE.BoxGeometry(0.095, 1.24, 0.20), sign * 0.55, 0.79, 0.075),
      transformed(new THREE.BoxGeometry(0.22, 0.12, 0.24), sign * 0.55, 1.43, 0.09),
      transformed(new THREE.BoxGeometry(0.19, 0.11, 0.22), sign * 0.55, 0.19, 0.08),
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

/** The actual dark east opening, surmounted by its own deep moulded lintel. */
function makeWindow(): NicheKit {
  const rearOuter = new THREE.Shape();
  traceArch(rearOuter, 2.58, 4.62, -0.08, false);
  const rearHole = new THREE.Path();
  traceArch(rearHole, 2.20, 4.30, 0.04, false);
  rearOuter.holes.push(rearHole);

  const outer = new THREE.Shape();
  traceArch(outer, 2.20, 4.30, 0, false);
  const hole = new THREE.Path();
  traceArch(hole, 1.46, 3.38, 0.20, false);
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

  const stoneParts: THREE.BufferGeometry[] = [
    rearFrame,
    transformed(frame, 0, 0, 0.07),
    transformed(new THREE.BoxGeometry(2.78, 0.18, 0.42), 0, 0.07, 0.12),
    transformed(new THREE.BoxGeometry(2.52, 0.12, 0.34), 0, 0.27, 0.10),
    transformed(new THREE.BoxGeometry(2.56, 0.16, 0.38), 0, 4.25, 0.12),
    transformed(new THREE.BoxGeometry(2.82, 0.12, 0.42), 0, 4.48, 0.13),
    transformed(new THREE.ConeGeometry(0.09, 0.22, 6), 0, 4.68, 0.13),
  ];

  for (const sign of [-1, 1]) {
    stoneParts.push(
      transformed(new THREE.BoxGeometry(0.13, 3.55, 0.24), sign * 1.23, 1.98, 0.12),
      transformed(new THREE.BoxGeometry(0.29, 0.16, 0.31), sign * 1.23, 3.82, 0.14),
      transformed(new THREE.BoxGeometry(0.27, 0.14, 0.29), sign * 1.23, 0.24, 0.13),
    );
  }

  const backShape = new THREE.Shape();
  traceArch(backShape, 1.46, 3.38, 0.20, false);
  const dark = bake([transformed(new THREE.ShapeGeometry(backShape, 8), 0, 0, 0.015)]);
  return { stone: bake(stoneParts), dark };
}

/** Circular Buddha shrine used on the central offset. */
function makeMedallion(): NicheKit {
  const figureParts = buddhaParts(true).map((g) =>
    transformed(g, 0, -0.72, 0.07, 0.72, 0.72, 0.72),
  );
  const stoneParts: THREE.BufferGeometry[] = [
    transformed(new THREE.TorusGeometry(0.62, 0.085, 6, 24), 0, 0, 0.08),
    transformed(new THREE.TorusGeometry(0.75, 0.035, 4, 24), 0, 0, 0.04),
    transformed(new THREE.BoxGeometry(1.62, 0.10, 0.23), 0, -0.73, 0.08),
    transformed(new THREE.ConeGeometry(0.075, 0.16, 5), 0, 0.81, 0.07),
  ];
  const petal = new THREE.OctahedronGeometry(0.5, 0);
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI * 2 / 16;
    stoneParts.push(
      transformed(
        petal,
        Math.cos(a) * 0.72,
        Math.sin(a) * 0.72,
        0.055,
        0.10,
        0.17,
        0.06,
        0,
        0,
        a - Math.PI / 2,
      ),
    );
  }
  const dark = bake([transformed(new THREE.CircleGeometry(0.55, 20), 0, 0, 0.015)]);
  return { stone: bake(stoneParts), dark, figure: bake(figureParts) };
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

/** Eight-petal floral boss for the carved lower-wall pilasters. */
function makeRosette(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const petal = new THREE.OctahedronGeometry(0.5, 0);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI * 2 / 8;
    parts.push(
      transformed(
        petal,
        Math.cos(a) * 0.16,
        Math.sin(a) * 0.16,
        0.025,
        0.12,
        0.24,
        0.08,
        0,
        0,
        a - Math.PI / 2,
      ),
    );
  }
  parts.push(transformed(new THREE.SphereGeometry(0.5, 5, 3), 0, 0, 0.06, 0.12, 0.12, 0.08));
  return bake(parts);
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
  const shallowNiche = makeNiche(false, true, false);
  shallowNiche.backMaterial = 'sandstone';
  const shallowRoundNiche = makeNiche(false, true, true);
  shallowRoundNiche.backMaterial = 'sandstone';
  const emptyNiche = makeNiche(false, false, false);
  const blindRoundNiche = makeNiche(false, false, true, true);
  const roundRecess = makeSmallRecess(true);
  const squareRecess = makeSmallRecess(false);
  const medallion = makeMedallion();
  const tallWindow = makeWindow();
  const scroll = makeScroll();
  const lionMask = makeLionMask();
  const rosette = makeRosette();
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

    // Five broad gavaksha bays, with an emphasized central arch.
    const upperPositions = [-5.55, -2.78, 0, 2.78, 5.55];
    for (let i = 0; i < upperPositions.length; i++) {
      const emphasized = i === 2;
      faceNiche(
        i % 2 === 0 ? highRoundNiche : highNiche,
        face,
        upperPositions[i],
        7.15,
        WALL,
        0.018,
        0,
        emphasized ? 1.72 : 1.38,
        emphasized ? 2.55 : 2.32,
      );
    }

    for (const u of [-6.55, -3.95, -1.25, 1.25, 3.95, 6.55]) {
      faceBox('stucco', face, u, 3.28, WALL, 0.075, 0.22, 4.75, 0.18);
      faceBox('stucco', face, u, 5.69, WALL, 0.10, 0.43, 0.18, 0.25);
      faceBox('sandstone', face, u, 0.96, WALL, 0.07, 0.39, 0.22, 0.20);
      for (const y of [1.45, 3.15, 4.75]) {
        put(
          rosette,
          'stucco',
          faceMatrix(face, u, y, WALL, 0.185, 0, 0.62, 0.62, 0.38),
        );
      }
      for (const y of [2.25, 4.05]) {
        faceBox('stucco', face, u, y, WALL, 0.12, 0.31, 0.075, 0.22);
      }
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
  const smallStupaRecessParts: THREE.BufferGeometry[] = [];
  for (let face = 0; face < 4; face++) {
    const panel = transformed(new THREE.PlaneGeometry(0.12, 0.18), 0, 0.37, 0.252);
    smallStupaRecessParts.push(
      transformed(panel, 0, 0, 0, 1, 1, 1, 0, face * Math.PI / 2, 0),
    );
  }
  const smallStupaRecesses = bake(smallStupaRecessParts);

  function placeSmallStupa(matrix: THREE.Matrix4): void {
    put(smallStupa, 'stucco', matrix);
    put(smallStupaRecesses, 'dark', matrix);
  }

  for (let face = 0; face < 4; face++) {
    for (const u of [-4.2, -2.8, -1.4, 0, 1.4, 2.8, 4.2]) {
      const angle = face * Math.PI / 2;
      const p = new THREE.Vector3(u, 0, 6.53).applyAxisAngle(yAxis, angle);
      placeSmallStupa(matrixAt(p.x, 11.18, p.z, 0, angle, 0));
    }
  }

  // Miniature corner shrines form the stepped, serrated edges of the great tower.
  const tierShrineStone = bake([
    transformed(new THREE.BoxGeometry(0.78, 0.10, 0.78), 0, 0.05, 0),
    transformed(squareFrustum(0.36, 0.23, 0.44), 0, 0.10, 0),
    transformed(new THREE.BoxGeometry(0.55, 0.08, 0.55), 0, 0.57, 0),
    transformed(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.18, 0),
          new THREE.Vector2(0.24, 0.04),
          new THREE.Vector2(0.24, 0.10),
          new THREE.Vector2(0.18, 0.14),
        ],
        12,
      ),
      0,
      0.60,
      0,
    ),
    transformed(new THREE.ConeGeometry(0.13, 0.34, 8), 0, 0.89, 0),
    transformed(new THREE.SphereGeometry(0.05, 6, 4), 0, 1.07, 0),
  ]);
  const tierShrineDarkParts: THREE.BufferGeometry[] = [];
  for (let face = 0; face < 4; face++) {
    const panel = transformed(new THREE.PlaneGeometry(0.16, 0.22), 0, 0.35, 0.305);
    tierShrineDarkParts.push(
      transformed(panel, 0, 0, 0, 1, 1, 1, 0, face * Math.PI / 2, 0),
    );
  }
  const tierShrineDark = bake(tierShrineDarkParts);

  // ---------------------------------------------------------------------------
  // Shared crown: stepped neck, massively ribbed amalaka and gold stupa-finial.
  // ---------------------------------------------------------------------------
  const amalaka = ribbedAmalakaGeometry();
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

    const petalCount = scale > 0.5 ? 40 : 28;
    for (let i = 0; i < petalCount; i++) {
      const a = i * Math.PI * 2 / petalCount;
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

    for (const [radius, y, tube] of [
      [2.16, 1.65, 0.045],
      [1.98, 1.96, 0.040],
      [1.30, 2.31, 0.065],
      [1.10, 2.84, 0.055],
      [0.93, 3.40, 0.050],
      [0.75, 4.03, 0.045],
    ]) {
      put(
        new THREE.TorusGeometry(radius, tube, 4, 40),
        'stucco',
        matrixAt(cx, baseY + y * scale, cz, Math.PI / 2, 0, 0, scale, scale, scale),
      );
    }

    const panelCount = scale > 0.5 ? 16 : 12;
    const panelLevels: Array<[number, number, number]> = [
      [2.60, 1.21, 0.28],
      [3.35, 0.97, 0.24],
    ];
    for (const [panelY, radius, panelH] of panelLevels) {
      for (let i = 0; i < panelCount; i++) {
        const a = i * Math.PI * 2 / panelCount;
        const sin = Math.sin(a);
        const cos = Math.cos(a);
        const px = cx + sin * radius * scale;
        const pz = cz + cos * radius * scale;
        const py = baseY + panelY * scale;
        boxAt(
          'dark',
          0.18 * scale,
          panelH * scale,
          0.035 * scale,
          px,
          py,
          pz,
          a,
        );
        for (const sign of [-1, 1]) {
          const offset = sign * 0.14 * scale;
          boxAt(
            'stucco',
            0.045 * scale,
            (panelH + 0.07) * scale,
            0.065 * scale,
            px + cos * offset,
            py,
            pz - sin * offset,
            a,
          );
        }
        boxAt(
          'stucco',
          0.33 * scale,
          0.05 * scale,
          0.065 * scale,
          px,
          py + (panelH / 2 + 0.045) * scale,
          pz,
          a,
        );
      }
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
  const mainProjection = (y: number) => 0.72 - 0.40 * ((y - BASE_Y) / MAIN_H);

  put(squareFrustum(MAIN_BOTTOM, MAIN_TOP, MAIN_H), 'sandstone', matrixAt(0, BASE_Y, 0));
  const mainRib = ribGeometry(MAIN_H, MAIN_BOTTOM, MAIN_TOP, 3.35, 0.90, 0.72, 0.32);
  for (let face = 0; face < 4; face++) {
    put(mainRib, 'sandstone', matrixAt(0, BASE_Y, 0, 0, face * Math.PI / 2, 0));
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

  /** Stepped roof and finial above each pair of niche panels. */
  const rooflet = bake([
    transformed(unitBox, 0, 0.07, 0.07, 2.50, 0.14, 0.36),
    transformed(unitBox, 0, 0.20, 0.06, 2.20, 0.13, 0.32),
    transformed(unitBox, 0, 0.32, 0.05, 1.74, 0.12, 0.28),
    transformed(unitBox, 0, 0.43, 0.04, 1.28, 0.11, 0.24),
    transformed(squareFrustum(0.32, 0.17, 0.32), 0, 0.47, 0),
    transformed(new THREE.ConeGeometry(0.13, 0.28, 6), 0, 0.92, 0),
    transformed(lotusPetal, -0.86, 0.48, 0.06, 0.18, 0.25, 0.14),
    transformed(lotusPetal, 0.86, 0.48, 0.06, 0.18, 0.25, 0.14),
  ]);

  // Two large lower registers followed by seven receding upper tiers.
  const tierHeights = [5, 5, 26 / 7, 26 / 7, 26 / 7, 26 / 7, 26 / 7, 26 / 7, 26 / 7];
  let mainTierY = BASE_Y;

  for (let tier = 0; tier < 9; tier++) {
    const tierH = tierHeights[tier];
    const y0 = mainTierY;
    const y1 = y0 + tierH;
    const t = tier / 8;
    const nicheBase = y0 + 0.48;
    const mainHeight = tier === 0 ? 3.00 : tier === 1 ? 2.65 : 1.92 - 0.38 * t;
    const mid = nicheBase + mainHeight * 0.5;
    const midBandY = y1 - 1.12;
    const smallY = y1 - 0.56;

    for (const y of [y0 + 0.08, y0 + 0.31, y0 + 0.46]) {
      const half = mainHalf(y);
      const lower = y === y0 + 0.08;
      const sill = y === y0 + 0.46;
      ringAt(
        half,
        lower ? 0.36 : sill ? 0.22 : 0.17,
        lower ? 0.17 : sill ? 0.08 : 0.10,
        y,
        lower || sill ? 'stucco' : 'sandstone',
      );
      if (sill) continue;
      for (let face = 0; face < 4; face++) {
        if (face === 0 && y > 13.7 && y < 21.4) continue;
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
          projection + (lower ? 0.42 : 0.30),
        );
      }
    }

    // A substantial cap at every tier gives the silhouette its stepped rhythm.
    const capY = y1 - 0.12;
    ringAt(mainHalf(capY), 0.29, 0.12, capY, 'stucco');
    for (let face = 0; face < 4; face++) {
      if (face === 0 && capY > 13.7 && capY < 21.4) continue;
      const projection = mainProjection(capY);
      faceBox(
        'stucco',
        face,
        0,
        capY,
        mainHalf(capY),
        projection / 2 + 0.04,
        mainRibWidth(capY) + 0.30,
        0.12,
        projection + 0.34,
      );
    }

    const midBandHalf = mainHalf(midBandY);
    ringAt(midBandHalf, 0.13, 0.09, midBandY, 'sandstone');
    ringAt(mainHalf(midBandY + 0.15), 0.24, 0.10, midBandY + 0.15, 'stucco');
    for (let face = 0; face < 4; face++) {
      if (!(face === 0 && midBandY < 21.8)) {
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
          projection + 0.27,
        );
      }

      const petalY = midBandY + 0.15;
      const petalHalf = mainHalf(petalY);
      const petalCount = Math.max(9, Math.floor((petalHalf * 2) / 0.55));
      for (let i = 0; i < petalCount; i++) {
        const u = -petalHalf + 0.22 + i * ((petalHalf * 2 - 0.44) / (petalCount - 1));
        if (face === 0 && petalY < 21.8 && Math.abs(u) < 1.34) continue;
        put(
          lotusPetal,
          'stucco',
          faceMatrix(face, u, petalY, petalHalf, 0.22, 0, 0.25, 0.28, 0.13),
        );
      }
    }

    const halfMid = mainHalf(mid);
    const ribMid = mainRibWidth(mid);
    const sideInner = ribMid / 2 + 0.13;
    const sideOuter = halfMid - (0.30 - 0.15 * t);
    const sideZone = Math.max(0.65, sideOuter - sideInner);
    const singleSideNiche = tier >= 7;

    for (let face = 0; face < 4; face++) {
      for (const sign of [-1, 1]) {
        const centerU = sign * (sideInner + sideZone * 0.5);
        faceBox(
          'sandstone',
          face,
          centerU,
          nicheBase + mainHeight / 2,
          mainHalf(nicheBase + mainHeight / 2),
          -0.035,
          sideZone * 0.96,
          mainHeight + 0.16,
          0.10,
          MAIN_SLOPE,
        );
        faceBox(
          'stucco',
          face,
          centerU,
          nicheBase + mainHeight + 0.18,
          mainHalf(nicheBase + mainHeight + 0.18),
          0.05,
          sideZone * 0.99,
          0.10,
          0.20,
          MAIN_SLOPE,
        );

        const roofY = nicheBase + mainHeight + 0.08;
        const roofH = tier === 0 ? 0.42 : tier === 1 ? 0.46 : 0.32 - 0.06 * t;
        const roofScale = sideZone * 0.98 / 2.50;
        put(
          rooflet,
          'stucco',
          faceMatrix(
            face,
            centerU,
            roofY,
            mainHalf(roofY),
            0.035,
            MAIN_SLOPE,
            roofScale,
            roofH,
            roofScale,
          ),
        );

        const fractions = singleSideNiche ? [0.50] : [0.27, 0.73];
        for (let column = 0; column < fractions.length; column++) {
          const u = sign * (sideInner + sideZone * fractions[column]);
          const rounded = (tier + face + column + (sign > 0 ? 1 : 0)) % 4 !== 0;
          const blind = (tier * 5 + face * 2 + column + (sign > 0 ? 3 : 0)) % 8 === 0;
          const deep = (tier + face + column + (sign > 0 ? 1 : 0)) % 3 !== 0;
          const width = singleSideNiche
            ? Math.min(0.80, Math.max(0.56, sideZone * 0.96))
            : Math.min(1.24, sideZone * 0.43);
          const height = singleSideNiche ? mainHeight * 0.88 : mainHeight;

          let kit: NicheKit;
          if (blind) {
            kit = blindRoundNiche;
          } else if (tier === 0) {
            kit = rounded ? highRoundNiche : highNiche;
          } else if (deep) {
            kit = rounded ? lowRoundNiche : lowNiche;
          } else {
            kit = rounded ? shallowRoundNiche : shallowNiche;
          }

          faceNiche(
            kit,
            face,
            u,
            nicheBase,
            mainHalf(nicheBase),
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
            smallY,
            mainHalf(smallY),
            0.026,
            MAIN_SLOPE,
            0.58 - 0.14 * t,
            0.57 - 0.12 * t,
          );
        }
      }

      const centralBlocked = face === 0 && (tier === 1 || tier === 2);
      const medallionTier = tier === 2 || tier === 4 || tier === 6;
      if (!centralBlocked) {
        if (medallionTier) {
          const centerY = y0 + Math.min(1.65, tierH * 0.45);
          const medallionScale = tier === 2 ? 1.02 : tier === 4 ? 0.90 : 0.78;
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
          let centralHeight = tier >= 7 ? mainHeight * 0.82 : mainHeight + 0.14;
          if (face === 0 && tier === 0) centralHeight = 1.85;
          let centralKit: NicheKit;
          if (tier < 2) {
            centralKit = tier % 2 === 0 ? highNiche : highRoundNiche;
          } else if ((tier + face) % 3 !== 0) {
            centralKit = tier % 2 === 0 ? lowNiche : lowRoundNiche;
          } else {
            centralKit = tier % 2 === 0 ? shallowNiche : shallowRoundNiche;
          }
          const centralWidth = Math.min(1.62, mainRibWidth(nicheBase) * 0.57);
          faceNiche(
            centralKit,
            face,
            0,
            nicheBase,
            mainHalf(nicheBase),
            mainProjection(nicheBase) + 0.025,
            MAIN_SLOPE,
            centralWidth,
            centralHeight,
          );

          if (tier >= 2) {
            const roofY = nicheBase + centralHeight + 0.04;
            const roofScale = mainRibWidth(roofY) * 0.72 / 2.50;
            put(
              rooflet,
              'stucco',
              faceMatrix(
                face,
                0,
                roofY,
                mainHalf(roofY),
                mainProjection(roofY) + 0.035,
                MAIN_SLOPE,
                roofScale,
                0.28,
                roofScale,
              ),
            );
          }
        }

        if (!(face === 0 && tier === 0)) {
          faceRecess(
            tier % 2 === 0 ? squareRecess : roundRecess,
            face,
            0,
            smallY,
            mainHalf(smallY),
            mainProjection(smallY) + 0.025,
            MAIN_SLOPE,
            0.61 - 0.15 * t,
            0.60 - 0.12 * t,
          );
        }
      }

      // Colonnettes on the projecting central rib, not behind its edges.
      if (!centralBlocked && tier >= 2) {
        const pilasterHeight = mainHeight + 0.18;
        const u = Math.min(mainRibWidth(nicheBase) * 0.41, 1.08);
        for (const sign of [-1, 1]) {
          const centerY = nicheBase + pilasterHeight / 2;
          faceBox(
            'stucco',
            face,
            sign * u,
            centerY,
            mainHalf(centerY),
            mainProjection(centerY) + 0.075,
            0.10,
            pilasterHeight,
            0.18,
            MAIN_SLOPE,
          );
          faceBox(
            'stucco',
            face,
            sign * u,
            nicheBase + pilasterHeight,
            mainHalf(nicheBase + pilasterHeight),
            mainProjection(nicheBase + pilasterHeight) + 0.09,
            0.25,
            0.12,
            0.23,
            MAIN_SLOPE,
          );
        }
      }

      const pilasterHeight = mainHeight + 0.20;
      const pilasterPositions = [-sideOuter, -sideInner, sideInner, sideOuter];
      for (const u of pilasterPositions) {
        faceBox(
          'stucco',
          face,
          u,
          nicheBase + pilasterHeight / 2,
          mainHalf(nicheBase + pilasterHeight / 2),
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
          nicheBase + pilasterHeight,
          mainHalf(nicheBase + pilasterHeight),
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
        faceBox('stucco', face, u, y1 - 0.30, dentilHalf, 0.15, 0.18, 0.20, 0.21);
      }
    }

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const h = mainHalf(y1 - 0.15);
        boxAt('stucco', 1.02 - 0.24 * t, 0.16, 1.02 - 0.24 * t, sx * h, y1 - 0.12, sz * h);
        const shrineScale = 1.20 - 0.42 * t;
        const shrineMatrix = matrixAt(
          sx * h,
          y1 - 0.03,
          sz * h,
          0,
          0,
          0,
          shrineScale,
          shrineScale,
          shrineScale,
        );
        put(tierShrineStone, 'sandstone', shrineMatrix);
        put(tierShrineDark, 'dark', shrineMatrix);
      }
    }

    mainTierY = y1;
  }

  // East frontispiece: dark opening, colonnaded frieze and circular Buddha panel.
  placeKit(
    tallWindow,
    faceMatrix(
      0,
      0,
      13.65,
      mainHalf(13.65),
      mainProjection(13.65) + 0.035,
      MAIN_SLOPE,
      1,
      1,
      1,
    ),
  );

  faceBox(
    'sandstone',
    0,
    0,
    19.86,
    mainHalf(19.86),
    mainProjection(19.86) + 0.035,
    2.74,
    3.20,
    0.14,
    MAIN_SLOPE,
  );

  for (const y of [18.28, 18.92]) {
    faceBox(
      'stucco',
      0,
      0,
      y,
      mainHalf(y),
      mainProjection(y) + 0.13,
      2.66,
      0.10,
      0.23,
      MAIN_SLOPE,
    );
  }

  for (let i = 0; i < 7; i++) {
    const u = -1.05 + i * 0.35;
    faceBox(
      'dark',
      0,
      u,
      18.60,
      mainHalf(18.60),
      mainProjection(18.60) + 0.12,
      0.13,
      0.38,
      0.025,
      MAIN_SLOPE,
    );
  }
  for (let i = 0; i < 8; i++) {
    const u = -1.225 + i * 0.35;
    faceBox(
      'stucco',
      0,
      u,
      18.60,
      mainHalf(18.60),
      mainProjection(18.60) + 0.15,
      0.07,
      0.50,
      0.16,
      MAIN_SLOPE,
    );
  }

  placeKit(
    medallion,
    faceMatrix(
      0,
      0,
      20.22,
      mainHalf(20.22),
      mainProjection(20.22) + 0.13,
      MAIN_SLOPE,
      0.95,
      0.95,
      0.95,
    ),
  );

  for (const u of [-1.25, 1.25]) {
    faceBox(
      'stucco',
      0,
      u,
      19.84,
      mainHalf(19.84),
      mainProjection(19.84) + 0.14,
      0.11,
      3.20,
      0.20,
      MAIN_SLOPE,
    );
  }

  for (const y of [13.55, 21.48]) {
    const projection = mainProjection(y);
    faceBox(
      'stucco',
      0,
      0,
      y,
      mainHalf(y),
      projection / 2 + 0.055,
      mainRibWidth(y) + 0.30,
      0.17,
      projection + 0.34,
      MAIN_SLOPE,
    );
  }

  for (const u of [-1.23, 1.23]) {
    faceBox(
      'stucco',
      0,
      u,
      16.40,
      mainHalf(16.40),
      mainProjection(16.40) + 0.08,
      0.12,
      9.90,
      0.23,
      MAIN_SLOPE,
    );
    for (const y of [11.48, 21.35]) {
      faceBox(
        'stucco',
        0,
        u,
        y,
        mainHalf(y),
        mainProjection(y) + 0.11,
        0.32,
        0.20,
        0.31,
        MAIN_SLOPE,
      );
    }
  }

  ringAt(2.25, 0.28, 0.20, 47.00, 'stucco');
  ringAt(2.25, 0.18, 0.13, 47.25, 'stucco');
  addCrown(0, 0, 47.0, 1);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      placeSmallStupa(
        matrixAt(sx * 1.92, 47.43, sz * 1.92, 0, 0, 0, 0.66, 0.66, 0.66),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Four miniature shikharas with tall blind pedestals and dense upper tiers.
  // ---------------------------------------------------------------------------
  const CORNER_BASE = 11.10;
  const CORNER_H = 7.25;
  const CORNER_BOTTOM = 1.65;
  const CORNER_TOP = 0.65;
  const CORNER_SLOPE = (CORNER_BOTTOM - CORNER_TOP) / CORNER_H;
  const CORNER_LOWER_H = 2.85;
  const CORNER_UPPER_H = (CORNER_H - CORNER_LOWER_H) / 3;
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

      let cornerTierY = CORNER_BASE;
      for (let tier = 0; tier < 4; tier++) {
        const tierH = tier === 0 ? CORNER_LOWER_H : CORNER_UPPER_H;
        const y0 = cornerTierY;
        const y1 = y0 + tierH;

        for (const y of [y0 + 0.04, y0 + 0.18]) {
          ringAt(cornerHalf(y), tier === 0 ? 0.16 : 0.13, 0.11, y, 'stucco', cx, cz);
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

        const midRingY = y1 - 0.40;
        ringAt(cornerHalf(midRingY), 0.10, 0.08, midRingY, 'sandstone', cx, cz);
        ringAt(cornerHalf(y1 - 0.10), 0.16, 0.10, y1 - 0.10, 'stucco', cx, cz);

        const nicheY = y0 + (tier === 0 ? 0.32 : 0.24);
        const h = tier === 0 ? 1.72 : 0.70;
        for (let face = 0; face < 4; face++) {
          const half = cornerHalf(nicheY + 0.45);
          const inner = cornerRibWidth(nicheY) / 2 + 0.07;
          const outer = half - 0.18;
          const u = (inner + outer) / 2;
          const sideWidth = Math.min(
            tier === 0 ? 0.54 : 0.44,
            Math.max(0.28, (outer - inner) * 0.90),
          );

          for (const sign of [-1, 1]) {
            const sideKit = tier === 0
              ? blindRoundNiche
              : (tier + face) % 2 === 0 ? lowRoundNiche : lowNiche;
            faceNiche(
              sideKit,
              face,
              sign * u,
              nicheY,
              cornerHalf(nicheY),
              0.015,
              CORNER_SLOPE,
              sideWidth,
              h,
              cx,
              cz,
            );
          }

          faceNiche(
            tier === 0 ? blindRoundNiche : tier % 2 === 0 ? lowNiche : lowRoundNiche,
            face,
            0,
            nicheY,
            cornerHalf(nicheY),
            cornerProjection(nicheY) + 0.018,
            CORNER_SLOPE,
            tier === 0 ? 0.62 : 0.50,
            h + 0.05,
            cx,
            cz,
          );

          faceRecess(
            (tier + face) % 2 === 0 ? roundRecess : squareRecess,
            face,
            0,
            y1 - 0.17,
            cornerHalf(y1 - 0.17),
            cornerProjection(y1 - 0.17) + 0.02,
            CORNER_SLOPE,
            0.25,
            0.27,
            cx,
            cz,
          );

          if (tier > 0) {
            for (const sign of [-1, 1]) {
              faceRecess(
                (tier + face + (sign > 0 ? 1 : 0)) % 2 === 0 ? roundRecess : squareRecess,
                face,
                sign * u,
                y1 - 0.17,
                cornerHalf(y1 - 0.17),
                0.022,
                CORNER_SLOPE,
                0.18,
                0.20,
                cx,
                cz,
              );
            }
          } else {
            for (const pilasterU of [-outer, outer]) {
              const centerY = nicheY + h / 2;
              faceBox(
                'stucco',
                face,
                pilasterU,
                centerY,
                cornerHalf(centerY),
                0.055,
                0.10,
                h + 0.08,
                0.16,
                CORNER_SLOPE,
                cx,
                cz,
              );
              for (const capitalY of [nicheY + 0.02, nicheY + h + 0.05]) {
                faceBox(
                  'stucco',
                  face,
                  pilasterU,
                  capitalY,
                  cornerHalf(capitalY),
                  0.075,
                  0.23,
                  0.11,
                  0.21,
                  CORNER_SLOPE,
                  cx,
                  cz,
                );
              }
            }
          }
        }

        cornerTierY = y1;
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
