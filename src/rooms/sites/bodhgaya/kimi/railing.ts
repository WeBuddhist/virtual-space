// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, railing round 4); regenerate rather than hand-edit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './kit';

type V3 = [number, number, number];

const TAU = Math.PI * 2;

function join(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(flat, false);
  if (!merged) throw new Error('Could not merge railing geometry');
  return merged;
}

function geometry(
  positions: number[],
  uvs: number[],
  indices?: number[],
): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (indices) g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Repeat a carving on the inward face, with its relief directed outwards. */
function bothFaces(face: THREE.BufferGeometry): THREE.BufferGeometry {
  return join([face, face.clone().rotateY(Math.PI)]);
}

/** Clipped-corner monolithic shaft with a slight swelling at the middle lotus. */
function pillarBody(): THREE.BufferGeometry {
  const rings: Array<[number, number, number]> = [
    [0.00, 0.155, 0.135],
    [0.34, 0.148, 0.130],
    [0.95, 0.155, 0.137],
    [1.20, 0.155, 0.137],
    [1.72, 0.141, 0.126],
    [2.03, 0.151, 0.134],
  ];
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const [y, w, d] of rings) {
    const c = 0.027;
    const section: Array<[number, number]> = [
      [-w + c, -d], [w - c, -d],
      [w, -d + c], [w, d - c],
      [w - c, d], [-w + c, d],
      [-w, d - c], [-w, -d + c],
    ];
    for (let i = 0; i < 8; i++) {
      positions.push(section[i][0], y, section[i][1]);
      uvs.push(i / 8, y / 2.03);
    }
  }

  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < 8; i++) {
      const a = j * 8 + i;
      const b = j * 8 + ((i + 1) % 8);
      const c = (j + 1) * 8 + ((i + 1) % 8);
      const d = (j + 1) * 8 + i;
      indices.push(a, d, c, a, c, b);
    }
  }

  const bottom = positions.length / 3;
  positions.push(0, 0, 0);
  uvs.push(0.5, 0.5);
  for (let i = 0; i < 8; i++) indices.push(bottom, i, (i + 1) % 8);

  const top = positions.length / 3;
  const topRing = (rings.length - 1) * 8;
  positions.push(0, 2.03, 0);
  uvs.push(0.5, 0.5);
  for (let i = 0; i < 8; i++) {
    indices.push(top, topRing + ((i + 1) % 8), topRing + i);
  }

  return geometry(positions, uvs, indices);
}

/** A broad-faced lens section with reduced tenons entering each pillar. */
function lensBar(length: number): THREE.BufferGeometry {
  const sides = 10;
  const end = Math.min(0.055, length * 0.18);
  const sections: Array<[number, number]> = [
    [-length / 2, 0.78],
    [-length / 2 + end, 1],
    [length / 2 - end, 1],
    [length / 2, 0.78],
  ];
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const [x, scale] of sections) {
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * TAU;
      const c = Math.cos(a);
      const y = Math.sin(a) * 0.170 * scale;
      const z = Math.sign(c) * Math.pow(Math.abs(c), 0.80) * 0.128 * scale;
      positions.push(x, y, z);
      uvs.push(x / length + 0.5, i / sides);
    }
  }

  for (let j = 0; j < sections.length - 1; j++) {
    for (let i = 0; i < sides; i++) {
      const a = j * sides + i;
      const b = j * sides + ((i + 1) % sides);
      const c = (j + 1) * sides + ((i + 1) % sides);
      const d = (j + 1) * sides + i;
      indices.push(a, d, c, a, c, b);
    }
  }

  const left = positions.length / 3;
  positions.push(-length / 2, 0, 0);
  uvs.push(0.5, 0.5);
  for (let i = 0; i < sides; i++) indices.push(left, i, (i + 1) % sides);

  const right = positions.length / 3;
  const last = (sections.length - 1) * sides;
  positions.push(length / 2, 0, 0);
  uvs.push(0.5, 0.5);
  for (let i = 0; i < sides; i++) {
    indices.push(right, last + ((i + 1) % sides), last + i);
  }

  return geometry(positions, uvs, indices);
}

/** Recessed circular field with its backing buried in the parent stone. */
function backingDisc(
  radius: number,
  depth: number,
  lip: number,
  segments: number,
): THREE.BufferGeometry {
  const height = depth + lip;
  const side = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    segments,
    1,
    true,
  );
  side.rotateX(Math.PI / 2);
  side.translate(0, 0, (lip - depth) / 2);
  const field = new THREE.CircleGeometry(radius, segments);
  return join([side, field]);
}

/** Smoothly shaded annular band for rounded rims and concentric carving. */
function slopedRing(
  inner: number,
  outer: number,
  zInner: number,
  zOuter: number,
  segments: number,
  half = false,
  upper = true,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const start = half ? (upper ? 0 : Math.PI) : 0;
  const sweep = half ? Math.PI : TAU;

  for (let i = 0; i <= segments; i++) {
    const angle = start + (i / segments) * sweep;
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    positions.push(inner * c, inner * s, zInner);
    uvs.push(0.5 + (inner * c) / (outer * 2), 0.5 + (inner * s) / (outer * 2));

    positions.push(outer * c, outer * s, zOuter);
    uvs.push(0.5 + c * 0.5, 0.5 + s * 0.5);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 3;
    const d = a + 2;
    indices.push(a, b, c, a, c, d);
  }

  return geometry(positions, uvs, indices);
}

/**
 * A broad convex petal with a rounded shoulder and raised central crown.
 * Shared vertices give smooth stone relief while retaining a pointed tip.
 */
function roundedPetal(
  inner: number,
  outer: number,
  halfWidth: number,
  z: number,
  height: number,
  angle: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);

  const add = (x: number, radial: number, depth: number) => {
    const px = x * ca + radial * sa;
    const py = -x * sa + radial * ca;
    positions.push(px, py, depth);
    uvs.push(0.5 + px / (outer * 2), py / outer);
  };

  add(0, inner, z);

  const sections: Array<[number, number, number]> = [
    [0.30, 0.90, 0.74],
    [0.72, 0.95, 1.00],
  ];
  for (const [t, widthScale, crownScale] of sections) {
    const radial = inner + (outer - inner) * t;
    const width = halfWidth * widthScale;
    const edge = z + height * 0.015;
    add(-width, radial, edge);
    add(0, radial, z + height * crownScale);
    add(width, radial, edge);
  }

  add(0, outer, z + height * 0.22);

  const indices = [
    0, 2, 1,
    0, 3, 2,
    1, 2, 5,
    1, 5, 4,
    2, 3, 6,
    2, 6, 5,
    4, 5, 7,
    5, 6, 7,
  ];

  return geometry(positions, uvs, indices);
}

/** Flat pointed petal reserved for tiny palmettes and coping leaves. */
function petal(
  inner: number,
  outer: number,
  halfWidth: number,
  z: number,
  height: number,
  angle: number,
): THREE.BufferGeometry {
  const length = outer - inner;
  const w = halfWidth;
  const outline: Array<[number, number]> = [
    [0, inner],
    [-w, inner + length * 0.30],
    [-0.82 * w, inner + length * 0.68],
    [0, outer],
    [0.82 * w, inner + length * 0.68],
    [w, inner + length * 0.30],
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);

  const emit = (p: V3) => {
    const x = p[0] * ca - p[1] * sa;
    const y = p[0] * sa + p[1] * ca;
    positions.push(x, y, p[2]);
    uvs.push(0.5 + x / (outer * 2), y / outer);
  };

  const centre: V3 = [0, inner + length * 0.53, z + height];
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i];
    const q = outline[(i + 1) % outline.length];
    emit(centre);
    emit([q[0], q[1], z]);
    emit([p[0], p[1], z]);
  }

  return geometry(positions, uvs);
}

function centralBust(radius: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const shoulders = new THREE.SphereGeometry(1, 4, 3);
  shoulders.scale(radius * 0.36, radius * 0.16, radius * 0.11);
  shoulders.translate(0, -radius * 0.18, 0.020);
  parts.push(shoulders);

  const head = new THREE.SphereGeometry(1, 4, 3);
  head.scale(radius * 0.155, radius * 0.195, radius * 0.105);
  head.translate(0, radius * 0.10, 0.027);
  parts.push(head);

  const topknot = new THREE.SphereGeometry(1, 4, 3);
  topknot.scale(radius * 0.09, radius * 0.105, radius * 0.065);
  topknot.translate(-radius * 0.055, radius * 0.315, 0.027);
  parts.push(topknot);

  const nose = new THREE.ConeGeometry(
    radius * 0.032,
    radius * 0.075,
    4,
    1,
    false,
  );
  nose.rotateX(Math.PI / 2);
  nose.translate(0, radius * 0.085, 0.048);
  parts.push(nose);

  return join(parts);
}

/** Full lotus roundel with a recessed field and substantial carved rim. */
function lotusFace(
  radius: number,
  outerCount: number,
  innerCount: number,
  offset: number,
  figured: boolean,
  segments: number,
  backDepth: number,
): THREE.BufferGeometry {
  const lip = radius * 0.14;
  const parts: THREE.BufferGeometry[] = [];

  if (segments > 12) {
    const outerLip = lip * 0.18;
    parts.push(
      backingDisc(radius, backDepth, outerLip, segments),
      slopedRing(
        radius * 0.80,
        radius * 0.90,
        0,
        lip,
        segments,
      ),
      slopedRing(
        radius * 0.90,
        radius,
        lip,
        outerLip,
        segments,
      ),
    );
  } else {
    parts.push(
      backingDisc(radius, backDepth, lip, segments),
      slopedRing(radius * 0.80, radius, 0, lip, segments),
    );
  }

  const r0 = radius * 0.25;
  const r1 = radius * 0.86;
  const mid = (r0 + r1) / 2;
  const width = mid * Math.sin(Math.PI / outerCount) * 1.04;

  for (let i = 0; i < outerCount; i++) {
    parts.push(roundedPetal(
      r0,
      r1,
      width,
      0.002,
      radius * 0.215,
      offset + (i / outerCount) * TAU,
    ));
  }

  if (!figured && innerCount > 0) {
    for (let i = 0; i < innerCount; i++) {
      const a = offset + Math.PI / outerCount + (i / innerCount) * TAU;
      parts.push(roundedPetal(
        radius * 0.12,
        radius * 0.50,
        radius * 0.30 * Math.sin(Math.PI / innerCount) * 1.05,
        0.003,
        radius * 0.17,
        a,
      ));
    }
  }

  parts.push(slopedRing(
    radius * 0.19,
    radius * 0.30,
    0.004,
    radius * 0.12,
    12,
  ));

  if (figured) {
    parts.push(centralBust(radius));
  } else {
    const boss = new THREE.SphereGeometry(1, 6, 2);
    boss.scale(radius * 0.18, radius * 0.18, radius * 0.11);
    boss.translate(0, 0, radius * 0.12);
    parts.push(boss);
  }

  return join(parts);
}

/** Semicircular backing whose outer wall meets the raised lotus rim. */
function halfBacking(
  radius: number,
  depth: number,
  lip: number,
  upper: boolean,
  segments = 8,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];

  const tri = (a: V3, b: V3, c: V3) => {
    for (const p of [a, b, c]) {
      positions.push(p[0], p[1], p[2]);
      uvs.push(
        0.5 + p[0] / (radius * 2),
        0.5 + p[1] / (radius * 2),
      );
    }
  };

  const base: V3[] = [];
  const field: V3[] = [];
  const top: V3[] = [];

  for (let i = 0; i <= segments; i++) {
    const a = (upper ? 0 : Math.PI) + (i / segments) * Math.PI;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    base.push([x, y, -depth]);
    field.push([x, y, 0]);
    top.push([x, y, lip]);
  }

  for (let i = 0; i < segments; i++) {
    tri([0, 0, 0], field[i], field[i + 1]);
    tri(base[i], base[i + 1], top[i + 1]);
    tri(base[i], top[i + 1], top[i]);
  }

  if (upper) {
    tri(base[0], field[0], field[segments]);
    tri(base[0], field[segments], base[segments]);
  } else {
    tri(base[0], field[segments], field[0]);
    tri(base[0], base[segments], field[segments]);
  }

  return geometry(positions, uvs);
}

function halfLotusFace(radius: number, upper: boolean): THREE.BufferGeometry {
  const lip = radius * 0.14;
  const parts: THREE.BufferGeometry[] = [
    halfBacking(radius, 0.040, lip, upper),
    slopedRing(radius * 0.80, radius, 0, lip, 8, true, upper),
  ];

  const count = 7;
  for (let i = 0; i < count; i++) {
    const fan = -1.35 + (i / (count - 1)) * 2.70;
    const angle = upper ? fan : Math.PI + fan;
    parts.push(roundedPetal(
      radius * 0.18,
      radius * 0.86,
      radius * 0.125,
      0.002,
      radius * 0.21,
      angle,
    ));
  }

  const boss = new THREE.SphereGeometry(1, 4, 2);
  boss.scale(radius * 0.16, radius * 0.13, radius * 0.09);
  boss.translate(0, 0, radius * 0.12);
  parts.push(boss);

  return join(parts);
}

function polygonRelief(
  points: Array<[number, number]>,
  depth: number,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 1,
  });
}

function humanFigure(): THREE.BufferGeometry {
  return polygonRelief([
    [-0.025, -0.085], [-0.045, 0.005], [-0.065, 0.045],
    [-0.028, 0.028], [-0.025, 0.060], [-0.015, 0.082],
    [0.015, 0.082], [0.025, 0.060], [0.028, 0.028],
    [0.065, 0.045], [0.045, 0.005], [0.025, -0.085],
    [0, -0.055],
  ], 0.024);
}

function elephantFigure(): THREE.BufferGeometry {
  return polygonRelief([
    [-0.075, -0.055], [-0.075, 0.025], [-0.045, 0.060],
    [0.020, 0.065], [0.055, 0.045], [0.065, 0.010],
    [0.085, -0.005], [0.080, -0.070], [0.065, -0.070],
    [0.065, -0.025], [0.050, -0.005], [0.050, -0.060],
    [0.032, -0.060], [0.030, -0.015], [-0.030, -0.015],
    [-0.035, -0.060], [-0.055, -0.060], [-0.052, -0.005],
  ], 0.025);
}

/** Narrow raised stone ribbon with a triangular carved ridge. */
function reliefStroke(
  points: Array<[number, number]>,
  width: number,
  z: number,
  height: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const sections: V3[] = [];

  for (let i = 0; i < points.length; i++) {
    const before = points[Math.max(0, i - 1)];
    const after = points[Math.min(points.length - 1, i + 1)];
    const dx = after[0] - before[0];
    const dy = after[1] - before[1];
    const length = Math.hypot(dx, dy) || 1;
    const nx = (-dy / length) * width * 0.5;
    const ny = (dx / length) * width * 0.5;
    const p = points[i];

    sections.push([p[0] + nx, p[1] + ny, z]);
    sections.push([p[0], p[1], z + height]);
    sections.push([p[0] - nx, p[1] - ny, z]);
  }

  const emit = (p: V3) => {
    positions.push(p[0], p[1], p[2]);
    uvs.push(p[0] * 2 + 0.5, p[1] * 4);
  };

  const quad = (a: V3, b: V3, c: V3, d: V3) => {
    emit(a); emit(b); emit(c);
    emit(a); emit(c); emit(d);
  };

  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 3;
    const b = (i + 1) * 3;
    quad(sections[a], sections[a + 1], sections[b + 1], sections[b]);
    quad(sections[a + 1], sections[a + 2], sections[b + 2], sections[b + 1]);
  }

  return geometry(positions, uvs);
}

/** Palmette, mithuna couple, or elephant above the upper half-lotus. */
function topOrnament(variant: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const panel = polygonRelief([
    [-0.125, 1.840], [0.125, 1.840], [0.125, 2.012],
    [0.095, 2.030], [-0.095, 2.030], [-0.125, 2.012],
  ], 0.008);
  panel.translate(0, 0, 0.130);
  parts.push(panel);

  parts.push(reliefStroke(
    [[-0.120, 1.850], [0.120, 1.850]],
    0.017,
    0.139,
    0.014,
  ));
  parts.push(reliefStroke(
    [[-0.120, 1.868], [0.120, 1.868]],
    0.013,
    0.139,
    0.013,
  ));

  for (const x of [-0.060, 0.060]) {
    parts.push(reliefStroke(
      [[x, 1.850], [x, 1.868]],
      0.009,
      0.139,
      0.012,
    ));
  }

  if (variant === 0) {
    for (const angle of [-0.58, 0, 0.58]) {
      const p = petal(0.012, 0.140, 0.034, 0.139, 0.028, angle);
      p.translate(0, 1.868, 0);
      parts.push(p);
    }
  } else if (variant === 1) {
    for (const x of [-0.043, 0.043]) {
      const person = humanFigure();
      person.scale(0.90, 0.90, 1);
      person.translate(x, 1.945, 0.139);
      parts.push(person);
    }
  } else {
    const elephant = elephantFigure();
    elephant.scale(1.03, 1.03, 1);
    elephant.translate(0, 1.938, 0.139);
    parts.push(elephant);
  }

  return bothFaces(join(parts));
}

function pillarGeometry(variant: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [pillarBody()];

  const middle = lotusFace(
    0.180,
    12,
    6,
    variant === 2 ? Math.PI / 12 : 0,
    variant === 1,
    14,
    0.035,
  );
  middle.translate(0, 0, 0.133);
  const middleBoth = bothFaces(middle);
  middleBoth.translate(0, 1.05, 0);
  parts.push(middleBoth);

  const lower = halfLotusFace(0.165, true);
  lower.translate(0, 0, 0.138);
  const lowerBoth = bothFaces(lower);
  lowerBoth.translate(0, 0.080, 0);
  parts.push(lowerBoth);

  const upper = halfLotusFace(0.165, false);
  upper.translate(0, 0, 0.132);
  const upperBoth = bothFaces(upper);
  upperBoth.translate(0, 1.835, 0);
  parts.push(upperBoth);

  parts.push(topOrnament(variant));
  return join(parts);
}

function barGeometry(length: number, variant: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [lensBar(length)];
  const face = lotusFace(
    0.160,
    variant === 2 ? 10 : 8,
    variant === 1 ? 6 : 0,
    variant === 1 ? Math.PI / 8 : 0,
    false,
    12,
    0.140,
  );
  face.translate(0, 0, 0.130);
  parts.push(bothFaces(face));
  return join(parts);
}

/** Rounded coping with deep arrises and a bold paired-volute vine frieze. */
function copingGeometry(pitch: number): THREE.BufferGeometry {
  const length = pitch - 0.008;
  const profile: Array<[number, number]> = [
    [0.220, 2.005], [0.275, 2.035], [0.292, 2.085],
    [0.292, 2.220], [0.275, 2.270], [0.225, 2.315],
    [0.150, 2.340], [0.000, 2.350], [-0.150, 2.340],
    [-0.225, 2.315], [-0.275, 2.270], [-0.292, 2.220],
    [-0.292, 2.085], [-0.275, 2.035], [-0.220, 2.005],
  ];
  const n = profile.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const x of [-length / 2, length / 2]) {
    for (let i = 0; i < n; i++) {
      positions.push(x, profile[i][1], profile[i][0]);
      uvs.push(x / length + 0.5, i / n);
    }
  }

  for (let i = 0; i < n; i++) {
    const a = i;
    const b = (i + 1) % n;
    const c = n + ((i + 1) % n);
    const d = n + i;
    indices.push(a, d, c, a, c, b);
  }

  const left = positions.length / 3;
  positions.push(-length / 2, 2.17, 0);
  uvs.push(0.5, 0.5);
  for (let i = 0; i < n; i++) indices.push(left, i, (i + 1) % n);

  const right = positions.length / 3;
  positions.push(length / 2, 2.17, 0);
  uvs.push(0.5, 0.5);
  for (let i = 0; i < n; i++) {
    indices.push(right, n + ((i + 1) % n), n + i);
  }

  const parts: THREE.BufferGeometry[] = [geometry(positions, uvs, indices)];
  const faceParts: THREE.BufferGeometry[] = [];

  for (const y of [2.073, 2.248]) {
    faceParts.push(reliefStroke(
      [[-length / 2 + 0.012, y], [length / 2 - 0.012, y]],
      0.022,
      0,
      0.026,
    ));
  }

  const vine: Array<[number, number]> = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    vine.push([
      -length / 2 + 0.030 + (length - 0.060) * t,
      2.160 + Math.sin(t * TAU) * 0.035,
    ]);
  }
  faceParts.push(reliefStroke(vine, 0.022, 0, 0.027));

  for (const side of [-1, 1]) {
    const cx = side * length * 0.235;
    const spiral: Array<[number, number]> = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const a = side * (-0.45 + t * TAU * 1.12);
      const r = 0.058 * (1 - t * 0.80);
      spiral.push([
        cx + Math.cos(a) * r,
        2.164 + Math.sin(a) * r * 0.78,
      ]);
    }
    faceParts.push(reliefStroke(spiral, 0.021, 0, 0.028));
  }

  const leafAngles = [0.88, -0.88, Math.PI - 0.88, Math.PI + 0.88];
  const leafX = [-0.36, -0.10, 0.10, 0.36];
  for (let i = 0; i < 4; i++) {
    const leaf = petal(0, 0.068, 0.023, 0, 0.027, leafAngles[i]);
    leaf.translate(
      length * leafX[i],
      2.162 + (i % 2 ? -0.015 : 0.015),
      0,
    );
    faceParts.push(leaf);
  }

  const frieze = join(faceParts);
  frieze.translate(0, 0, 0.296);
  parts.push(bothFaces(frieze));

  return join(parts);
}

function addInstances(
  group: THREE.Group,
  name: string,
  geo: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  matrices: THREE.Matrix4[],
  tints: THREE.Color[],
): void {
  if (matrices.length === 0) return;

  const mesh = new THREE.InstancedMesh(geo, material, matrices.length);
  mesh.name = name;

  for (let i = 0; i < matrices.length; i++) {
    mesh.setMatrixAt(i, matrices[i]);
    mesh.setColorAt(i, tints[i % tints.length]);
  }

  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  group.add(mesh);
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function build(opts: { length: number }): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Sunga stone railing (vedika)';

  const length = opts.length;
  const bays = Math.max(1, Math.round(length / 1.4));
  const pitch = length / bays;
  const random = seeded(0x5a17c9e3 ^ Math.round(length * 1000));
  const phase = Math.floor(random() * 3);
  const granite = mat('granite');

  const stoneTints = [
    new THREE.Color(1.00, 0.98, 0.95),
    new THREE.Color(0.95, 0.97, 0.99),
    new THREE.Color(1.06, 1.01, 0.95),
    new THREE.Color(1.03, 0.96, 0.93),
    new THREE.Color(0.98, 0.98, 0.96),
  ];

  const pillarGeometries = [0, 1, 2].map((v) => pillarGeometry(v));
  const pillarMatrices: THREE.Matrix4[][] = [[], [], []];

  for (let i = 0; i <= bays; i++) {
    const variant = (i + phase) % 3;
    pillarMatrices[variant].push(
      new THREE.Matrix4().makeTranslation(
        -length / 2 + i * pitch,
        0,
        0,
      ),
    );
  }

  for (let v = 0; v < 3; v++) {
    addInstances(
      group,
      `carved railing pillars ${v}`,
      pillarGeometries[v],
      granite,
      pillarMatrices[v],
      stoneTints,
    );
  }

  const clearLength = pitch - 0.25;
  const barGeometries = [0, 1, 2].map((v) => barGeometry(clearLength, v));
  const barMatrices: THREE.Matrix4[][] = [[], [], []];
  const levels = [0.55, 1.05, 1.55] as const;

  for (let bay = 0; bay < bays; bay++) {
    const x = -length / 2 + (bay + 0.5) * pitch;
    for (let level = 0; level < levels.length; level++) {
      const variant = (bay + level + phase) % 3;
      barMatrices[variant].push(
        new THREE.Matrix4().makeTranslation(x, levels[level], 0),
      );
    }
  }

  for (let v = 0; v < 3; v++) {
    addInstances(
      group,
      `lens-section suchi crossbars ${v}`,
      barGeometries[v],
      granite,
      barMatrices[v],
      stoneTints,
    );
  }

  const copingMatrices: THREE.Matrix4[] = [];
  for (let bay = 0; bay < bays; bay++) {
    copingMatrices.push(new THREE.Matrix4().makeTranslation(
      -length / 2 + (bay + 0.5) * pitch,
      0,
      0,
    ));
  }

  addInstances(
    group,
    'rounded coping stones with scroll frieze',
    copingGeometry(pitch),
    granite,
    copingMatrices,
    stoneTints,
  );

  return group;
}
