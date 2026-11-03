// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, torana round 3); regenerate rather than hand-edit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './kit';

function transform(
  geometry: THREE.BufferGeometry,
  x = 0, y = 0, z = 0,
  rx = 0, ry = 0, rz = 0,
  sx = 1, sy = 1, sz = 1,
): THREE.BufferGeometry {
  const g = geometry.clone();
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
  g.applyMatrix4(matrix);
  return g.index ? g.toNonIndexed() : g;
}

function combine(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = geometries.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(flat, false);
  if (!merged) throw new Error('Could not merge torana geometry');
  return merged;
}

/** A pointed, ridged stone petal used throughout the lotus and vine relief. */
function petalGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array([
    0, 0, 0,
    -0.24, 0.28, 0,
    -0.27, 0.60, 0,
    -0.14, 0.84, 0,
    0, 1, 0,
    0.14, 0.84, 0,
    0.27, 0.60, 0,
    0.24, 0.28, 0,
    0, 0.25, 0.08,
    0, 0.58, 0.12,
    0, 0.82, 0.085,
  ]);
  const uvs = new Float32Array([
    0.50, 0.00,
    0.055, 0.28,
    0.00, 0.60,
    0.24, 0.84,
    0.50, 1.00,
    0.76, 0.84,
    1.00, 0.60,
    0.945, 0.28,
    0.50, 0.25,
    0.50, 0.58,
    0.50, 0.82,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex([
    0, 8, 1, 0, 7, 8,
    1, 8, 9, 1, 9, 2,
    2, 9, 10, 2, 10, 3,
    3, 10, 4,
    7, 9, 8, 7, 6, 9,
    6, 10, 9, 6, 5, 10,
    5, 4, 10,
  ]);
  g.computeVertexNormals();
  return g;
}

function spiralGeometry(
  radius: number,
  tube: number,
  turns: number,
  segments: number,
): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = -Math.PI / 2 + t * Math.PI * 2 * turns;
    const r = radius * (1 - 0.82 * t);
    points.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),
    segments, tube, 4, false,
  );
}

function rosetteGeometry(petal: THREE.BufferGeometry): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(transform(
    new THREE.CylinderGeometry(0.83, 0.83, 0.085, 12),
    0, 0, 0, Math.PI / 2,
  ));
  for (let i = 0; i < 10; i++) {
    parts.push(transform(
      petal,
      0, 0, 0.043,
      0, 0, (i / 10) * Math.PI * 2,
      1.02, 1, 1,
    ));
  }
  parts.push(transform(
    new THREE.CylinderGeometry(0.25, 0.30, 0.20, 10),
    0, 0, 0.11, Math.PI / 2,
  ));
  return combine(parts);
}

/** Opposed volutes embedded in broad, fleshy acanthus foliage. */
function scrollGeometry(petal: THREE.BufferGeometry): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const vine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.50, -0.10, 0),
    new THREE.Vector3(-0.38, 0.09, 0),
    new THREE.Vector3(-0.22, 0.16, 0),
    new THREE.Vector3(-0.06, 0.075, 0),
    new THREE.Vector3(0.06, -0.075, 0),
    new THREE.Vector3(0.22, -0.14, 0),
    new THREE.Vector3(0.38, -0.015, 0),
    new THREE.Vector3(0.50, 0.14, 0),
  ]);
  parts.push(new THREE.TubeGeometry(vine, 14, 0.025, 4, false));

  const curl = spiralGeometry(0.135, 0.025, 1.16, 12);
  parts.push(transform(curl, -0.215, -0.005, 0.002));
  parts.push(transform(curl, 0.215, 0.005, 0.002, 0, 0, Math.PI));

  const leaves: number[][] = [
    [-0.43, 0.035, -0.82, 0.15, 0.20],
    [-0.08, 0.065, 2.18, 0.12, 0.17],
    [0.035, -0.055, -0.56, 0.12, 0.18],
    [0.39, -0.025, 0.94, 0.14, 0.19],
    [0.26, 0.035, 2.70, 0.10, 0.15],
    [-0.29, -0.055, 2.18, 0.13, 0.19],
    [0.29, 0.055, -2.18, 0.13, 0.19],
    [-0.015, 0.045, -0.48, 0.11, 0.17],
    [0.10, -0.075, 2.72, 0.10, 0.16],
  ];
  for (const [x, y, rz, sx, sy] of leaves) {
    parts.push(transform(
      petal,
      x, y, 0.004,
      0, 0, rz,
      sx, sy, sy * 1.15,
    ));
  }
  return combine(parts);
}

/** A long, worn creeper for the tall panel on the left approach-side post. */
function creeperGeometry(petal: THREE.BufferGeometry): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const vine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.045, 0.18, 0),
    new THREE.Vector3(0.040, 0.38, 0),
    new THREE.Vector3(-0.035, 0.60, 0),
    new THREE.Vector3(0.030, 0.82, 0),
    new THREE.Vector3(0, 1, 0),
  ]);
  parts.push(new THREE.TubeGeometry(vine, 16, 0.012, 4, false));
  for (let i = 0; i < 6; i++) {
    const left = i % 2 === 0;
    parts.push(transform(
      petal,
      left ? -0.025 : 0.025,
      0.12 + i * 0.135,
      0.004,
      0, 0, left ? 0.96 : -0.96,
      0.10, 0.17, 0.15,
    ));
  }
  return combine(parts);
}

function palmetteGeometry(petal: THREE.BufferGeometry): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const d = i - 3;
    const length = 0.48 - Math.abs(d) * 0.035;
    parts.push(transform(
      petal,
      0, 0, 0,
      0, 0, d * 0.28,
      0.19, length, length,
    ));
  }
  const curl = spiralGeometry(0.078, 0.013, 1.06, 12);
  parts.push(transform(curl, -0.11, 0.035, 0.008));
  parts.push(transform(curl, 0.11, 0.035, 0.008, 0, 0, Math.PI));
  parts.push(transform(new THREE.BoxGeometry(0.18, 0.06, 0.06), 0, -0.015, 0.018));
  return combine(parts);
}

function archGeometry(
  width: number,
  height: number,
  tube: number,
  segments = 18,
): THREE.BufferGeometry {
  const points = [
    new THREE.Vector3(-width / 2, 0, 0),
    new THREE.Vector3(-width / 2, height * 0.43, 0),
    new THREE.Vector3(-width * 0.45, height * 0.68, 0),
    new THREE.Vector3(-width * 0.25, height * 0.89, 0),
    new THREE.Vector3(0, height, 0),
    new THREE.Vector3(width * 0.25, height * 0.89, 0),
    new THREE.Vector3(width * 0.45, height * 0.68, 0),
    new THREE.Vector3(width / 2, height * 0.43, 0),
    new THREE.Vector3(width / 2, 0, 0),
  ];
  const arch = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),
    segments, tube, 4, false,
  );
  const sill = transform(
    new THREE.BoxGeometry(width * 0.98, tube * 1.25, tube * 1.5),
    0, tube * 0.25, 0,
  );
  return combine([arch, sill]);
}

function solidArchGeometry(
  width: number,
  height: number,
  depth: number,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(-width / 2, height * 0.42);
  shape.bezierCurveTo(
    -width / 2, height * 0.69,
    -width * 0.28, height * 0.91,
    0, height,
  );
  shape.bezierCurveTo(
    width * 0.28, height * 0.91,
    width / 2, height * 0.69,
    width / 2, height * 0.42,
  );
  shape.lineTo(width / 2, 0);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 5,
    bevelEnabled: false,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

function figurePairGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const head = new THREE.SphereGeometry(1, 8, 5);

  const limb = (
    ax: number, ay: number, bx: number, by: number,
    radius: number, z: number,
  ) => {
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    parts.push(transform(
      new THREE.CylinderGeometry(radius, radius * 0.92, length, 6),
      (ax + bx) / 2, (ay + by) / 2, z,
      0, 0, Math.atan2(-dx, dy),
      1, 1, 0.60,
    ));
  };

  for (let f = 0; f < 2; f++) {
    const x = f === 0 ? -0.135 : 0.135;
    const lift = f === 0 ? 0.012 : -0.008;

    parts.push(transform(new THREE.BoxGeometry(0.12, 0.04, 0.06), x - 0.040, 0.025, 0.038));
    parts.push(transform(new THREE.BoxGeometry(0.12, 0.04, 0.06), x + 0.046, 0.025, 0.038));
    limb(x - 0.038, 0.055, x - 0.032, 0.275, 0.029, 0.043);
    limb(x + 0.043, 0.055, x + 0.032, 0.275, 0.029, 0.043);

    parts.push(transform(
      new THREE.CylinderGeometry(0.073, f === 0 ? 0.122 : 0.105, 0.28, 7),
      x, 0.35, 0.045,
      0, 0, 0,
      1, 1, 0.52,
    ));
    parts.push(transform(
      new THREE.CylinderGeometry(0.085, 0.065, 0.22, 8),
      x, 0.555 + lift, 0.048,
      0, 0, 0,
      1, 1, 0.54,
    ));
    parts.push(transform(
      head,
      x, 0.718 + lift, 0.052,
      0, 0, 0,
      0.076, 0.081, 0.041,
    ));
    parts.push(transform(
      new THREE.ConeGeometry(0.083, 0.087, 7),
      x, 0.801 + lift, 0.047,
      0, 0, 0,
      1, 1, 0.50,
    ));

    limb(x - 0.068, 0.630 + lift, x - 0.124, 0.49, 0.025, 0.055);
    limb(x - 0.124, 0.49, x - 0.091, 0.375, 0.023, 0.057);
    limb(x + 0.066, 0.625 + lift, x + 0.115, 0.51, 0.025, 0.055);
    limb(x + 0.115, 0.51, x + 0.074, 0.425, 0.023, 0.057);

    parts.push(transform(
      new THREE.BoxGeometry(0.17, 0.018, 0.025),
      x, 0.37, 0.087, 0, 0, f === 0 ? 0.24 : -0.24,
    ));
    parts.push(transform(
      new THREE.BoxGeometry(0.14, 0.016, 0.024),
      x, 0.30, 0.086, 0, 0, f === 0 ? -0.18 : 0.18,
    ));
  }

  limb(-0.075, 0.635, 0.075, 0.655, 0.023, 0.069);
  limb(0.075, 0.655, 0.155, 0.595, 0.021, 0.069);
  return combine(parts);
}

function voluteFaceGeometry(petal: THREE.BufferGeometry): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(spiralGeometry(0.195, 0.031, 1.23, 20));
  parts.push(transform(
    new THREE.CylinderGeometry(0.066, 0.074, 0.065, 8),
    0, 0, 0.016, Math.PI / 2,
  ));
  parts.push(transform(petal, -0.13, -0.205, 0.002, 0, 0, -0.48, 0.08, 0.14, 0.14));
  parts.push(transform(petal, 0.00, -0.225, 0.002, 0, 0, 0, 0.08, 0.13, 0.13));
  parts.push(transform(petal, 0.13, -0.205, 0.002, 0, 0, 0.48, 0.08, 0.14, 0.14));
  return combine(parts);
}

/**
 * Chamfered rectangular rings joined into one stone course. The optional wear
 * offsets are deterministic and small enough to preserve the monolithic mass.
 */
function rectangularProfile(
  rings: number[][],
  worn = false,
): THREE.BufferGeometry {
  const ringPoints: THREE.Vector3[][] = [];
  let minY = Infinity;
  let maxY = -Infinity;

  for (let j = 0; j < rings.length; j++) {
    const [y, width, depth] = rings[j];
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    const w = width / 2;
    const d = depth / 2;
    const c = Math.min(0.018, width * 0.08, depth * 0.08);
    const coordinates: number[][] = [
      [-w + c, -d],
      [w - c, -d],
      [w, -d + c],
      [w, d - c],
      [w - c, d],
      [-w + c, d],
      [-w, d - c],
      [-w, -d + c],
    ];
    const points: THREE.Vector3[] = [];
    for (let k = 0; k < coordinates.length; k++) {
      let x = coordinates[k][0];
      let z = coordinates[k][1];
      if (worn && j > 0 && j < rings.length - 1) {
        const e = 0.0035 * Math.sin((j + 1) * 2.17 + (k + 1) * 1.31);
        x += Math.sign(x) * e;
        z += Math.sign(z) * e * 0.65;
      }
      points.push(new THREE.Vector3(x, y, z));
    }
    ringPoints.push(points);
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const vertex = (p: THREE.Vector3, u: number, v: number) => {
    positions.push(p.x, p.y, p.z);
    uvs.push(u, v);
  };
  const height = Math.max(0.001, maxY - minY);

  for (let j = 0; j < ringPoints.length - 1; j++) {
    const lower = ringPoints[j];
    const upper = ringPoints[j + 1];
    const v0 = (lower[0].y - minY) / height;
    const v1 = (upper[0].y - minY) / height;
    for (let k = 0; k < 8; k++) {
      const next = (k + 1) % 8;
      const u0 = k / 8;
      const u1 = (k + 1) / 8;
      vertex(lower[k], u0, v0);
      vertex(upper[next], u1, v1);
      vertex(lower[next], u1, v0);
      vertex(lower[k], u0, v0);
      vertex(upper[k], u0, v1);
      vertex(upper[next], u1, v1);
    }
  }

  for (const [ringIndex, top] of [[0, false], [ringPoints.length - 1, true]] as const) {
    const ring = ringPoints[ringIndex];
    const center = new THREE.Vector3(0, ring[0].y, 0);
    for (let k = 0; k < 8; k++) {
      const next = (k + 1) % 8;
      vertex(center, 0.5, 0.5);
      if (top) {
        vertex(ring[next], ring[next].x + 0.5, ring[next].z + 0.5);
        vertex(ring[k], ring[k].x + 0.5, ring[k].z + 0.5);
      } else {
        vertex(ring[k], ring[k].x + 0.5, ring[k].z + 0.5);
        vertex(ring[next], ring[next].x + 0.5, ring[next].z + 0.5);
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

function weatheredShaftGeometry(): THREE.BufferGeometry {
  const rings: number[][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    rings.push([
      t * 6,
      THREE.MathUtils.lerp(1.02, 0.80, t),
      THREE.MathUtils.lerp(0.86, 0.78, t),
    ]);
  }
  return rectangularProfile(rings, true);
}

function cushionCapitalGeometry(): THREE.BufferGeometry {
  return rectangularProfile([
    [-0.30, 0.85, 0.84],
    [-0.23, 0.90, 0.87],
    [-0.06, 1.02, 0.99],
    [0.15, 1.12, 1.06],
    [0.30, 1.13, 1.06],
  ]);
}

function bevelledBlock(
  width: number,
  height: number,
  depth: number,
  bevel: number,
): THREE.BufferGeometry {
  const b = Math.min(bevel, width * 0.1, height * 0.22, depth * 0.1);
  const w = width / 2 - b;
  const h = height / 2 - b;
  const shape = new THREE.Shape();
  shape.moveTo(-w, -h);
  shape.lineTo(w, -h);
  shape.lineTo(w, h);
  shape.lineTo(-w, h);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * b,
    steps: 1,
    curveSegments: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: b,
    bevelThickness: b,
  });
  g.translate(0, 0, -(depth - 2 * b) / 2);
  return g;
}

export function build(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Mahabodhi east approach torana';

  const parts: THREE.BufferGeometry[] = [];
  const add = (
    geometry: THREE.BufferGeometry,
    x = 0, y = 0, z = 0,
    rx = 0, ry = 0, rz = 0,
    sx = 1, sy = 1, sz = 1,
  ) => {
    parts.push(transform(geometry, x, y, z, rx, ry, rz, sx, sy, sz));
  };
  const box = (
    width: number, height: number, depth: number,
    x: number, y: number, z = 0,
  ) => add(new THREE.BoxGeometry(width, height, depth), x, y, z);

  const petal = petalGeometry();
  const rosette = rosetteGeometry(petal);
  const scroll = scrollGeometry(petal);
  const creeper = creeperGeometry(petal);
  const palmette = palmetteGeometry(petal);
  const figures = figurePairGeometry();
  const friezeArch = archGeometry(0.49, 0.29, 0.029, 18);
  const innerFriezeArch = archGeometry(0.34, 0.205, 0.015, 12);
  const voluteFace = voluteFaceGeometry(petal);
  const voluteDrum = new THREE.CylinderGeometry(0.25, 0.25, 1.10, 12);
  const bead = new THREE.CylinderGeometry(0.034, 0.034, 0.032, 8);
  const shaft = weatheredShaftGeometry();
  const cushionCapital = cushionCapitalGeometry();

  const postBand = (
    cx: number,
    y: number,
    height: number,
    width: number,
    depth: number,
  ) => {
    add(rectangularProfile([
      [y - height * 0.50, width * 0.94, depth * 0.94],
      [y - height * 0.32, width * 1.03, depth * 1.03],
      [y - height * 0.10, width * 1.07, depth * 1.07],
      [y + height * 0.16, width * 1.05, depth * 1.05],
      [y + height * 0.38, width * 0.99, depth * 0.99],
      [y + height * 0.50, width * 0.96, depth * 0.96],
    ]), cx, 0, 0);
  };

  for (const cx of [-3.5, 3.5]) {
    const plainApproachPost = cx > 0;

    box(1.18, 0.12, 1.18, cx, 0.06, 0);
    postBand(cx, 0.20, 0.16, 1.06, 1.00);
    add(shaft, cx, 0.27, 0);

    if (!plainApproachPost) {
      // The more extensively carved left monolith.
      postBand(cx, 2.56, 0.14, 0.99, 0.91);
      postBand(cx, 3.53, 0.14, 1.00, 0.93);
      box(0.95, 0.62, 0.94, cx, 3.93, 0);
      postBand(cx, 4.31, 0.14, 0.99, 0.93);
      postBand(cx, 4.96, 0.15, 1.00, 0.95);
      box(0.96, 0.58, 0.92, cx, 5.34, 0);
      postBand(cx, 5.72, 0.17, 1.00, 0.96);
      box(0.87, 0.42, 0.86, cx, 6.02, 0);
    } else {
      // The right approach face is plain for more than half its height.
      postBand(cx, 4.38, 0.16, 1.00, 0.94);
      box(0.94, 0.62, 0.90, cx, 4.77, 0);
      postBand(cx, 5.15, 0.14, 0.99, 0.93);
      box(0.94, 0.52, 0.90, cx, 5.50, 0);
      postBand(cx, 5.83, 0.15, 1.00, 0.94);
      box(0.85, 0.34, 0.84, cx, 6.04, 0);
    }
    postBand(cx, 6.28, 0.14, 1.03, 0.98);

    for (const face of [1, -1]) {
      const ry = face === 1 ? 0 : Math.PI;
      const plainRightFace = plainApproachPost && face === 1;

      if (!plainRightFace) {
        // Rear faces retain the lotus-foot carving visible in the close photographs.
        if (face === -1) {
          add(
            palmette,
            cx, 0.30, -0.435,
            0, Math.PI, 0,
            1.03, 1.03, 1.03,
          );
        }

        // Tall, quiet lower field, with a narrow creeper only on the left front.
        box(0.034, 1.94, 0.046, cx - 0.385, 1.50, face * 0.430);
        box(0.034, 1.94, 0.046, cx + 0.385, 1.50, face * 0.430);
        box(0.79, 0.038, 0.046, cx, 0.52, face * 0.430);
        box(0.79, 0.044, 0.046, cx, 2.48, face * 0.430);

        if (face === 1) {
          add(
            creeper,
            cx, 0.69, face * 0.427,
            0, ry, 0,
            1.20, 1.67, 0.65,
          );
        } else if (cx < 0) {
          add(rosette, cx, 1.52, -0.427, 0, Math.PI, 0, 0.13, 0.13, 0.13);
        }

        // Recessed paired-figure tablet.
        box(0.76, 0.82, 0.040, cx, 3.04, face * 0.414);
        box(0.060, 0.84, 0.065, cx - 0.385, 3.04, face * 0.438);
        box(0.060, 0.84, 0.065, cx + 0.385, 3.04, face * 0.438);
        box(0.026, 0.75, 0.070, cx - 0.385, 3.04, face * 0.449);
        box(0.026, 0.75, 0.070, cx + 0.385, 3.04, face * 0.449);
        box(0.84, 0.070, 0.068, cx, 2.62, face * 0.442);
        box(0.84, 0.080, 0.072, cx, 3.46, face * 0.444);
        add(figures, cx, 2.70, face * 0.437, 0, ry, 0, 0.88, 0.88, 0.84);

        // On the plain right shaft these rear panels are applied only to the back.
        if (plainApproachPost) {
          for (const yy of [2.56, 3.53, 4.31, 4.96, 5.72]) {
            box(0.98, 0.10, 0.13, cx, yy, -0.425);
          }
          box(0.94, 0.62, 0.13, cx, 3.93, -0.425);
          box(0.94, 0.58, 0.13, cx, 5.34, -0.425);
        }

        add(scroll, cx, 3.93, face * 0.472, 0, ry, 0, 0.76, 1.04, 1.30);

        box(0.70, 0.48, 0.030, cx, 4.63, face * 0.409);
        box(0.75, 0.035, 0.040, cx, 4.39, face * 0.425);
        box(0.75, 0.035, 0.040, cx, 4.87, face * 0.425);
        add(rosette, cx, 4.63, face * 0.425, 0, ry, 0, 0.15, 0.15, 0.15);
        add(petal, cx - 0.18, 4.58, face * 0.427, 0, ry, 1.10, 0.11, 0.17, 0.17);
        add(petal, cx + 0.18, 4.58, face * 0.427, 0, ry, -1.10, 0.11, 0.17, 0.17);

        add(scroll, cx, 5.34, face * 0.462, 0, ry, 0, 0.75, 1.03, 1.25);
        add(rosette, cx, 5.34, face * 0.474, 0, ry, 0, 0.125, 0.125, 0.125);
        add(scroll, cx, 6.02, face * 0.432, 0, ry, 0, 0.66, 0.73, 1.20);
      } else {
        // Two broad floral belts, rather than duplicating the left figure programme.
        box(0.76, 0.48, 0.035, cx, 4.77, 0.453);
        add(scroll, cx, 4.77, 0.454, 0, 0, 0, 0.75, 1.00, 1.25);

        box(0.76, 0.40, 0.035, cx, 5.50, 0.453);
        add(scroll, cx, 5.50, 0.454, 0, 0, 0, 0.74, 0.88, 1.20);
        add(rosette, cx, 5.50, 0.466, 0, 0, 0, 0.125, 0.125, 0.125);

        add(scroll, cx, 6.04, 0.431, 0, 0, 0, 0.65, 0.68, 1.15);
      }

      // Carved cushion-capital centre.
      add(palmette, cx, 6.38, face * 0.444, 0, ry, 0, 0.66, 0.66, 0.66);
      add(rosette, cx, 6.70, face * 0.493, 0, ry, 0, 0.175, 0.175, 0.175);
    }

    for (const side of [-1, 1]) {
      const sideRotation = side * Math.PI / 2;

      if (!plainApproachPost) {
        add(
          palmette,
          cx + side * 0.513, 0.30, 0,
          0, sideRotation, 0,
          1.00, 1.00, 1.00,
        );
        add(
          scroll,
          cx + side * 0.472, 3.93, 0,
          0, sideRotation, 0,
          0.73, 1.02, 1.25,
        );
        add(
          scroll,
          cx + side * 0.481, 5.34, 0,
          0, sideRotation, 0,
          0.71, 1.02, 1.20,
        );
        add(
          rosette,
          cx + side * 0.487, 5.34, 0,
          0, sideRotation, 0,
          0.12, 0.12, 0.12,
        );

        if (side === -1) {
          add(
            creeper,
            cx - 0.493, 0.69, 0,
            0, -Math.PI / 2, 0,
            1.12, 1.67, 0.60,
          );
        }
      } else {
        add(
          scroll,
          cx + side * 0.472, 4.77, 0,
          0, sideRotation, 0,
          0.70, 1.00, 1.20,
        );
        add(
          scroll,
          cx + side * 0.472, 5.50, 0,
          0, sideRotation, 0,
          0.70, 0.88, 1.18,
        );
        add(
          rosette,
          cx + side * 0.482, 5.50, 0,
          0, sideRotation, 0,
          0.12, 0.12, 0.12,
        );
      }

      add(
        rosette,
        cx + side * 0.494, 6.68, 0,
        0, sideRotation, 0,
        0.155, 0.155, 0.155,
      );
    }

    add(cushionCapital, cx, 6.65, 0);
    for (const dx of [-0.58, 0.58]) {
      add(voluteDrum, cx + dx, 6.86, 0, Math.PI / 2);
      for (const face of [1, -1]) {
        add(
          voluteFace,
          cx + dx, 6.86, face * 0.552,
          0, face === 1 ? 0 : Math.PI, dx > 0 ? Math.PI : 0,
        );
      }
    }
    add(bevelledBlock(1.36, 0.12, 1.12, 0.018), cx, 6.99, 0);
    add(bevelledBlock(1.56, 0.16, 1.18, 0.020), cx, 7.13, 0);
  }

  // Bearing courses and the deep, plain lower architrave.
  box(8.18, 0.10, 0.98, 0, 7.25, 0);
  box(8.26, 0.08, 1.02, 0, 7.34, 0);
  box(8.12, 0.07, 0.96, 0, 7.415, 0);

  const fasciaOffsets = [0, 0.005, -0.004, 0.003, -0.002];
  for (let i = 0; i < 5; i++) {
    add(
      bevelledBlock(1.610, 0.57, 0.86, 0.018),
      (i - 2) * 1.624, 7.665 + fasciaOffsets[i], 0,
    );
  }

  for (let i = -10; i <= 10; i++) {
    for (const face of [1, -1]) {
      if (i % 2 === 0) {
        add(bead, i * 0.38, 7.43, face * 0.493, Math.PI / 2);
      } else {
        box(0.058, 0.060, 0.040, i * 0.38, 7.43, face * 0.490);
      }
    }
  }

  // Recessed architrave frieze of chaitya windows and lotus medallions.
  box(8.18, 0.38, 0.82, 0, 8.14, 0);
  for (const face of [1, -1]) {
    const ry = face === 1 ? 0 : Math.PI;
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 0.86;
      box(0.77, 0.305, 0.022, x, 8.14, face * 0.419);

      if (i % 2 === 0) {
        add(friezeArch, x, 7.985, face * 0.443, 0, ry);
        add(innerFriezeArch, x, 8.005, face * 0.447, 0, ry);
        add(rosette, x, 8.105, face * 0.449, 0, ry, 0, 0.064, 0.064, 0.064);
        add(petal, x - 0.10, 8.015, face * 0.450, 0, ry, 0.75, 0.055, 0.085, 0.085);
        add(petal, x + 0.10, 8.015, face * 0.450, 0, ry, -0.75, 0.055, 0.085, 0.085);
      } else {
        add(rosette, x, 8.14, face * 0.435, 0, ry, 0, 0.145, 0.145, 0.145);
        add(petal, x - 0.19, 8.075, face * 0.440, 0, ry, 1.08, 0.09, 0.14, 0.14);
        add(petal, x + 0.19, 8.075, face * 0.440, 0, ry, -1.08, 0.09, 0.14, 0.14);
      }
    }

    for (let i = 0; i < 10; i++) {
      const x = (i - 4.5) * 0.86;
      box(0.032, 0.32, 0.050, x, 8.14, face * 0.443);
      box(0.072, 0.035, 0.055, x, 8.305, face * 0.445);
      box(0.072, 0.030, 0.055, x, 7.975, face * 0.445);
    }
  }

  for (const side of [-1, 1]) {
    add(scroll, side * 4.055, 7.665, 0, 0, side * Math.PI / 2, 0, 0.62, 0.85, 1.10);
    add(rosette, side * 4.091, 8.14, 0, 0, side * Math.PI / 2, 0, 0.13, 0.13, 0.13);
  }

  box(8.28, 0.07, 1.00, 0, 8.365, 0);
  for (let i = 0; i < 35; i++) {
    const x = (i - 17) * 0.232;
    for (const face of [1, -1]) {
      box(0.115, 0.090, 0.085, x, 8.407, face * 0.522);
    }
  }
  box(8.48, 0.12, 1.10, 0, 8.50, 0);
  box(8.34, 0.08, 1.02, 0, 8.60, 0);

  const corniceRoll = new THREE.CylinderGeometry(0.034, 0.034, 8.34, 6);
  for (const face of [1, -1]) {
    add(corniceRoll, 0, 8.59, face * 0.512, 0, 0, Math.PI / 2);
  }

  const copingOffsets = [0, 0.004, -0.003, 0.003, -0.002, 0.004, 0];
  const copingDepths = [1.14, 1.15, 1.13, 1.14, 1.15, 1.13, 1.14];
  for (let i = 0; i < 7; i++) {
    add(
      bevelledBlock(8.52 / 7 - 0.010, 0.12, copingDepths[i], 0.018),
      (i - 3) * (8.52 / 7),
      8.70 + copingOffsets[i],
      0,
    );
  }

  const centralCrest = solidArchGeometry(0.76, 0.20, 0.96);
  const endCrest = solidArchGeometry(0.48, 0.15, 0.96);
  const crestRoll = archGeometry(0.58, 0.15, 0.018, 14);
  const endCrestRoll = archGeometry(0.34, 0.09, 0.013, 10);
  add(centralCrest, 0, 8.745, 0);
  for (const x of [-3.65, 3.65]) add(endCrest, x, 8.745, 0);

  for (const face of [1, -1]) {
    const ry = face === 1 ? 0 : Math.PI;
    add(crestRoll, 0, 8.758, face * 0.481, 0, ry);
    add(rosette, 0, 8.825, face * 0.483, 0, ry, 0, 0.041, 0.041, 0.041);
    for (const x of [-3.65, 3.65]) {
      add(endCrestRoll, x, 8.758, face * 0.481, 0, ry);
    }
  }

  const mesh = new THREE.Mesh(combine(parts), mat('sandstone'));
  mesh.name = 'Carved sandstone posts, volute capitals and architraves';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}
