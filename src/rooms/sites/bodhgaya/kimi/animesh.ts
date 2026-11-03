// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, animesh round 4); regenerate rather than hand-edit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './kit';
import type { MatName } from './kit';

export function build(): THREE.Group {
  let state = 0x41c64e6d;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  type Vec3 = [number, number, number];
  type Pose = {
    p?: Vec3;
    r?: Vec3;
    s?: Vec3;
    f?: THREE.Matrix4;
  };

  const buckets = new Map<MatName, THREE.BufferGeometry[]>();
  const IDENTITY = new THREE.Matrix4();
  const FRONT = new THREE.Matrix4();
  const RIGHT = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  const BACK = new THREE.Matrix4().makeRotationY(Math.PI);
  const LEFT = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
  const FACES = [FRONT, RIGHT, BACK, LEFT];

  function put(source: THREE.BufferGeometry, material: MatName, pose: Pose = {}) {
    const p = pose.p ?? [0, 0, 0];
    const r = pose.r ?? [0, 0, 0];
    const s = pose.s ?? [1, 1, 1];
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2]));
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(p[0], p[1], p[2]),
      q,
      new THREE.Vector3(s[0], s[1], s[2]),
    );
    if (pose.f) matrix.premultiply(pose.f);

    let geometry = source.clone();
    geometry.applyMatrix4(matrix);
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flat;
    }
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv) {
      geometry.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2),
      );
    }

    const list = buckets.get(material);
    if (list) list.push(geometry);
    else buckets.set(material, [geometry]);
  }

  function boxGeometry(w: number, h: number, d: number, tile = 0) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    if (tile > 0) {
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        const face = Math.floor(i / 4);
        const du = face < 2 ? d : w;
        const dv = face >= 2 && face < 4 ? d : h;
        uv.setXY(i, uv.getX(i) * du / tile, uv.getY(i) * dv / tile);
      }
    }
    return geometry;
  }

  function boxAt(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: MatName,
    frame: THREE.Matrix4 = IDENTITY,
    tile = 0,
  ) {
    put(boxGeometry(w, h, d, tile), material, { p: [x, y, z], f: frame });
  }

  /** Flat-shaded square frustum, used for the tower and its small corner shrines. */
  function squareFrustum(bottomWidth: number, topWidth: number, height: number) {
    const b = bottomWidth / 2;
    const t = topWidth / 2;
    const bottom: Vec3[] = [
      [-b, 0, b],
      [b, 0, b],
      [b, 0, -b],
      [-b, 0, -b],
    ];
    const top: Vec3[] = [
      [-t, height, t],
      [t, height, t],
      [t, height, -t],
      [-t, height, -t],
    ];
    const positions: number[] = [];
    const uvs: number[] = [];

    const triangle = (a: Vec3, c: Vec3, d: Vec3, uv: number[]) => {
      positions.push(...a, ...c, ...d);
      uvs.push(...uv);
    };

    for (let side = 0; side < 4; side++) {
      const next = (side + 1) % 4;
      triangle(bottom[side], bottom[next], top[next], [0, 0, 1, 0, 1, 1]);
      triangle(bottom[side], top[next], top[side], [0, 0, 1, 1, 0, 1]);
    }
    triangle(top[0], top[1], top[2], [0, 0, 1, 0, 1, 1]);
    triangle(top[0], top[2], top[3], [0, 0, 1, 1, 0, 1]);
    triangle(bottom[0], bottom[2], bottom[1], [0, 0, 1, 1, 1, 0]);
    triangle(bottom[0], bottom[3], bottom[2], [0, 0, 0, 1, 1, 1]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    return geometry;
  }

  function tapered(
    y: number,
    height: number,
    bottomWidth: number,
    topWidth: number,
    material: MatName,
  ) {
    put(squareFrustum(bottomWidth, topWidth, height), material, { p: [0, y, 0] });
  }

  function course(y: number, height: number, width: number, material: MatName) {
    tapered(y, height, width, width, material);
  }

  function traceArch(path: THREE.Path, width: number, height: number, base = 0) {
    path.moveTo(-width / 2, base);
    path.lineTo(-width / 2, base + height * 0.57);
    path.quadraticCurveTo(-width / 2, base + height * 0.82, 0, base + height);
    path.quadraticCurveTo(width / 2, base + height * 0.82, width / 2, base + height * 0.57);
    path.lineTo(width / 2, base);
    path.closePath();
  }

  function archFill(width: number, height: number) {
    const shape = new THREE.Shape();
    traceArch(shape, width, height);
    return new THREE.ShapeGeometry(shape, 5);
  }

  function archRing(
    width: number,
    height: number,
    innerWidth: number,
    innerHeight: number,
    depth: number,
  ) {
    const shape = new THREE.Shape();
    traceArch(shape, width, height);
    const hole = new THREE.Path();
    traceArch(hole, innerWidth, innerHeight, (height - innerHeight) * 0.42);
    shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 5,
    });
  }

  function plasterPatch(
    frame: THREE.Matrix4,
    material: MatName,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    tilt = 0,
    vertices = 10,
  ) {
    const shape = new THREE.Shape();
    for (let i = 0; i < vertices; i++) {
      const angle = i / vertices * Math.PI * 2;
      const radius = 0.76 + random() * 0.30;
      const px = Math.cos(angle) * rx * radius;
      const py = Math.sin(angle) * ry * radius;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();

    put(new THREE.ShapeGeometry(shape), material, {
      p: [x, y, z],
      r: [tilt, 0, 0],
      f: frame,
    });
  }

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const darkDisc = new THREE.CircleGeometry(1, 14);
  const nicheRim = new THREE.TorusGeometry(1, 0.13, 4, 14);
  const nicheOuterRim = new THREE.TorusGeometry(1.24, 0.05, 4, 14);
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const smallSphere = new THREE.SphereGeometry(1, 8, 6);
  const smoothSphere = new THREE.SphereGeometry(1, 20, 14);
  const diamond = new THREE.OctahedronGeometry(1, 0);

  // A raised chaitya hood is reserved for the principal circular openings.
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(-1.38, -1.28);
  hoodShape.lineTo(-1.38, 0.12);
  hoodShape.quadraticCurveTo(-1.38, 0.98, 0, 1.58);
  hoodShape.quadraticCurveTo(1.38, 0.98, 1.38, 0.12);
  hoodShape.lineTo(1.38, -1.28);
  hoodShape.closePath();
  const hoodHole = new THREE.Path();
  hoodHole.absarc(0, 0, 1, 0, Math.PI * 2, true);
  hoodShape.holes.push(hoodHole);

  const nicheHood = new THREE.ExtrudeGeometry(hoodShape, {
    depth: 0.28,
    bevelEnabled: false,
    curveSegments: 3,
  });

  function roundNiche(
    frame: THREE.Matrix4,
    x: number,
    y: number,
    surface: number,
    radius: number,
    tilt: number,
    grand = false,
  ) {
    const rotation: Vec3 = [tilt, 0, 0];

    put(darkDisc, 'dark', {
      p: [x, y, surface + 0.004],
      r: rotation,
      s: [radius, radius, 1],
      f: frame,
    });

    if (grand || radius >= 0.125) {
      put(nicheHood, grand ? 'sandstone' : 'granite', {
        p: [x, y, surface + 0.007],
        r: rotation,
        s: [radius, radius, radius],
        f: frame,
      });
    }

    put(nicheRim, 'sandstone', {
      p: [x, y, surface + radius * (grand || radius >= 0.125 ? 0.27 : 0.08)],
      r: rotation,
      s: [radius, radius, radius],
      f: frame,
    });

    if (grand) {
      put(nicheOuterRim, 'sandstone', {
        p: [x, y, surface + radius * 0.22],
        r: rotation,
        s: [radius, radius, radius],
        f: frame,
      });

      for (const side of [-1, 1]) {
        put(unitBox, 'sandstone', {
          p: [x + side * radius * 1.60, y, surface + 0.025],
          r: rotation,
          s: [0.035, radius * 3.15, 0.050],
          f: frame,
        });
      }

      put(unitBox, 'sandstone', {
        p: [x, y + radius * 1.75, surface + 0.034],
        r: rotation,
        s: [radius * 3.35, 0.040, 0.060],
        f: frame,
      });
      put(diamond, 'stucco', {
        p: [x, y + radius * 1.96, surface + 0.050],
        r: rotation,
        s: [0.040, 0.055, 0.025],
        f: frame,
      });
    } else if (radius < 0.125) {
      put(unitBox, 'sandstone', {
        p: [x, y + radius * 1.30, surface + 0.027],
        r: rotation,
        s: [radius * 1.75, 0.026, 0.045],
        f: frame,
      });
    }

    put(unitBox, grand ? 'sandstone' : 'granite', {
      p: [x, y - radius * 1.34, surface + 0.035],
      r: rotation,
      s: [radius * 2.65, 0.036, 0.070],
      f: frame,
    });
  }

  // ---------------------------------------------------------------------------
  // Four substantial plinth steps and the hollow sanctum.
  // ---------------------------------------------------------------------------
  boxAt(4.80, 0.12, 4.80, 0, 0.06, 0, 'granite', IDENTITY, 0.8);
  boxAt(4.62, 0.12, 4.62, 0, 0.18, 0, 'sandstone', IDENTITY, 0.8);
  boxAt(4.44, 0.12, 4.44, 0, 0.30, 0, 'granite', IDENTITY, 0.8);
  boxAt(4.24, 0.10, 4.24, 0, 0.41, 0, 'stucco', IDENTITY, 0.8);
  boxAt(4.14, 0.055, 4.14, 0, 0.4875, 0, 'sandstone');

  // The inner front wall is well behind the outer portico.
  boxAt(1.18, 2.48, 0.32, -1.45, 1.72, 1.32, 'granite', IDENTITY, 0.85);
  boxAt(1.18, 2.48, 0.32, 1.45, 1.72, 1.32, 'granite', IDENTITY, 0.85);
  boxAt(1.72, 0.33, 0.32, 0, 2.795, 1.32, 'granite', IDENTITY, 0.85);
  boxAt(0.36, 2.48, 3.66, -1.86, 1.72, -0.17, 'granite', IDENTITY, 0.85);
  boxAt(0.36, 2.48, 3.66, 1.86, 1.72, -0.17, 'granite', IDENTITY, 0.85);
  boxAt(4.08, 2.48, 0.36, 0, 1.72, -1.84, 'stucco', IDENTITY, 0.85);

  boxAt(3.35, 0.08, 3.35, 0, 0.535, -0.10, 'sandstone');
  boxAt(3.32, 2.25, 0.035, 0, 1.65, -1.635, 'dark');
  boxAt(3.45, 0.12, 3.40, 0, 2.91, -0.08, 'dark');

  course(0.580, 0.060, 4.14, 'granite');
  course(0.655, 0.040, 4.09, 'sandstone');
  course(2.760, 0.055, 4.13, 'sandstone');
  course(2.825, 0.050, 4.18, 'granite');

  // Deep, wall-like portico piers. Their outer faces clear the side walls.
  for (const side of [-1, 1]) {
    boxAt(1.00, 2.20, 0.46, side * 1.55, 1.58, 1.82, 'granite', IDENTITY, 0.85);
    boxAt(0.15, 2.16, 0.50, side * 0.985, 1.57, 1.84, 'sandstone');
    boxAt(1.08, 0.12, 0.56, side * 1.55, 0.58, 1.87, 'granite');
    boxAt(1.02, 0.09, 0.52, side * 1.55, 0.685, 1.87, 'sandstone');
    boxAt(1.04, 0.075, 0.53, side * 1.55, 2.675, 1.87, 'granite');

    for (let i = 0; i < 4; i++) {
      boxAt(
        0.83 - i * 0.035,
        0.085,
        0.48 - i * 0.045,
        side * 1.64,
        0.515 + i * 0.085,
        2.10 - i * 0.025,
        i % 2 === 0 ? 'granite' : 'stucco',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Portal and strongly projecting engaged pilasters.
  // ---------------------------------------------------------------------------
  boxAt(0.11, 2.14, 0.15, -0.805, 1.56, 1.36, 'sandstone');
  boxAt(0.11, 2.14, 0.15, 0.805, 1.56, 1.36, 'sandstone');
  boxAt(1.73, 0.13, 0.18, 0, 2.61, 1.36, 'sandstone');
  boxAt(1.82, 0.10, 0.94, 0, 2.625, 1.80, 'granite');

  function porticoPillar(x: number, z: number, widthScale: number) {
    const ws = widthScale;

    boxAt(0.50 * ws, 0.12, 0.46 * ws, x, 0.54, z, 'granite');
    boxAt(0.42 * ws, 0.09, 0.39 * ws, x, 0.645, z, 'stucco');
    boxAt(0.36 * ws, 0.10, 0.34 * ws, x, 0.740, z, 'sandstone');
    boxAt(0.27 * ws, 1.35, 0.27 * ws, x, 1.455, z, 'whitewash');
    boxAt(0.105 * ws, 0.98, 0.030, x, 1.47, z + 0.151 * ws, 'stucco');

    for (const y of [0.89, 1.91, 2.06]) {
      boxAt(0.34 * ws, 0.065, 0.34 * ws, x, y, z, 'sandstone');
    }

    const capital = new THREE.LatheGeometry([
      new THREE.Vector2(0.125 * ws, 0),
      new THREE.Vector2(0.175 * ws, 0.035),
      new THREE.Vector2(0.185 * ws, 0.085),
      new THREE.Vector2(0.145 * ws, 0.125),
      new THREE.Vector2(0.185 * ws, 0.175),
      new THREE.Vector2(0.170 * ws, 0.225),
      new THREE.Vector2(0.130 * ws, 0.275),
    ], 12);

    put(capital, 'granite', { p: [x, 2.095, z] });
    boxAt(0.39 * ws, 0.075, 0.38 * ws, x, 2.405, z, 'stucco');
    boxAt(0.45 * ws, 0.085, 0.42 * ws, x, 2.485, z, 'sandstone');
    boxAt(0.40 * ws, 0.105, 0.38 * ws, x, 2.580, z, 'granite');
  }

  porticoPillar(-1.06, 2.11, 1);
  porticoPillar(1.06, 2.11, 1);
  porticoPillar(-1.78, 2.07, 0.76);
  porticoPillar(1.78, 2.07, 0.76);

  boxAt(2.42, 0.17, 0.69, 0, 2.675, 1.985, 'granite');
  boxAt(2.72, 0.075, 0.72, 0, 2.790, 2.000, 'stucco');
  boxAt(3.12, 0.17, 0.70, 0, 2.905, 2.000, 'sandstone');
  boxAt(3.30, 0.065, 0.75, 0, 3.020, 2.000, 'stucco');
  boxAt(3.38, 0.055, 0.76, 0, 3.080, 2.000, 'granite');

  for (let i = 0; i < 17; i++) {
    put(diamond, i % 2 === 0 ? 'stucco' : 'sandstone', {
      p: [(i - 8) * 0.174, 2.913, 2.365],
      s: [0.052, 0.052, 0.024],
    });
  }

  // Open timber leaves, held close to the reveals so the Buddha remains visible.
  for (const side of [-1, 1]) {
    const width = 0.65;
    const angle = side * 1.32;
    const cx = side * 0.82 - side * width * 0.5 * Math.cos(angle);
    const cz = 1.47 + width * 0.5 * Math.sin(Math.abs(angle));
    const frame = new THREE.Matrix4()
      .makeTranslation(cx, 0, cz)
      .multiply(new THREE.Matrix4().makeRotationY(angle));

    boxAt(width, 1.92, 0.055, 0, 1.51, 0, 'wood', frame, 0.5);

    for (const x of [-0.267, 0.267]) {
      boxAt(0.035, 1.78, 0.025, x, 1.51, 0.038, 'wood', frame);
    }
    for (const y of [0.64, 1.20, 1.83, 2.39]) {
      boxAt(0.58, 0.045, 0.026, 0, y, 0.039, 'wood', frame);
    }
    for (const y of [0.92, 1.515, 2.11]) {
      boxAt(0.45, 0.45, 0.018, 0, y, 0.036, 'wood', frame);
    }
    for (const y of [0.82, 2.16]) {
      boxAt(0.18, 0.025, 0.018, side * 0.19, y, 0.057, 'brass', frame);
    }

    put(smallSphere, 'brass', {
      p: [-side * 0.23, 1.43, 0.071],
      s: [0.024, 0.024, 0.024],
      f: frame,
    });
  }

  // ---------------------------------------------------------------------------
  // Parapet with squat columns and a central image niche.
  // ---------------------------------------------------------------------------
  course(2.96, 0.54, 4.12, 'granite');
  course(3.50, 0.075, 4.22, 'granite');
  tapered(3.575, 0.065, 4.22, 4.38, 'stucco');
  course(3.640, 0.075, 4.40, 'sandstone');
  tapered(3.715, 0.070, 4.40, 4.28, 'stucco');
  course(3.785, 0.065, 4.34, 'granite');

  function miniatureColumn(frame: THREE.Matrix4, x: number) {
    const z = 2.085;

    put(unitBox, 'granite', {
      p: [x, 3.075, z],
      s: [0.38, 0.070, 0.25],
      f: frame,
    });
    put(unitBox, 'stucco', {
      p: [x, 3.140, z],
      s: [0.30, 0.060, 0.22],
      f: frame,
    });
    put(new THREE.CylinderGeometry(0.09, 0.115, 0.22, 8), 'granite', {
      p: [x, 3.275, z],
      f: frame,
    });
    put(smallSphere, 'sandstone', {
      p: [x, 3.405, z],
      s: [0.145, 0.105, 0.125],
      f: frame,
    });
    put(unitBox, 'sandstone', {
      p: [x, 3.500, z],
      s: [0.33, 0.065, 0.25],
      f: frame,
    });
  }

  for (const frame of FACES) {
    for (const x of [-1.73, -1.16, -0.59, 0.59, 1.16, 1.73]) {
      miniatureColumn(frame, x);
    }
  }

  const parapetArch = archRing(0.48, 0.51, 0.28, 0.38, 0.045);
  const parapetArchDark = archFill(0.28, 0.38);

  for (const frame of FACES) {
    put(parapetArchDark, 'dark', { p: [0, 3.105, 2.073], f: frame });
    put(parapetArch, 'sandstone', { p: [0, 3.035, 2.085], f: frame });
    put(new THREE.CylinderGeometry(0.035, 0.065, 0.19, 8), 'basalt', {
      p: [0, 3.245, 2.105],
      f: frame,
    });
    put(smallSphere, 'basalt', {
      p: [0, 3.380, 2.105],
      s: [0.042, 0.052, 0.032],
      f: frame,
    });

    // Thin, irregular runoff marks below the coping.
    for (const x of [-1.43, -0.28, 1.42]) {
      plasterPatch(
        frame,
        'basalt',
        x,
        3.35 - random() * 0.08,
        2.066,
        0.014 + random() * 0.015,
        0.10 + random() * 0.12,
        0,
        7,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Weathered lower walls and the less formal rear elevation.
  // ---------------------------------------------------------------------------
  for (const side of [-1, 1]) {
    plasterPatch(FRONT, 'brick', side * 1.82, 0.91, 2.056, 0.075, 0.20, 0, 10);
    plasterPatch(FRONT, 'whitewash', side * 1.43, 1.48, 2.056, 0.12, 0.24, 0, 10);
    plasterPatch(FRONT, 'stucco', side * 1.90, 2.24, 2.056, 0.055, 0.18, 0, 8);
    plasterPatch(FRONT, 'brick', side * 1.27, 0.73, 2.056, 0.065, 0.08, 0, 8);
  }

  for (let i = 0; i < 18; i++) {
    const selector = i % 6;
    const material: MatName = selector === 0
      ? 'brick'
      : selector === 1
        ? 'pink-sandstone'
        : 'sandstone';

    plasterPatch(
      BACK,
      material,
      -1.72 + random() * 3.44,
      0.72 + random() * 2.02,
      2.026,
      0.11 + random() * 0.24,
      0.10 + random() * 0.24,
    );
  }

  for (const frame of [RIGHT, LEFT]) {
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      plasterPatch(
        frame,
        i % 3 === 0 ? 'brick' : 'stucco',
        side * (1.48 + random() * 0.20),
        0.74 + random() * 1.82,
        2.046,
        0.065 + random() * 0.10,
        0.09 + random() * 0.16,
      );
    }

    // Broad plaster wall between shallow corner strips, without modern panels.
    for (const x of [-1.52, 1.52]) {
      put(unitBox, 'stucco', {
        p: [x, 1.62, 2.067],
        s: [0.085, 1.65, 0.045],
        f: frame,
      });
      for (const y of [0.78, 2.46]) {
        put(unitBox, 'sandstone', {
          p: [x, y, 2.077],
          s: [0.16, 0.075, 0.065],
          f: frame,
        });
      }
    }
  }

  function rearWindow(x: number, y: number, width: number, height: number, bars: number) {
    put(unitBox, 'dark', {
      p: [x, y, 2.048],
      s: [width, height, 0.025],
      f: BACK,
    });
    put(unitBox, 'sandstone', {
      p: [x, y + height / 2 + 0.045, 2.075],
      s: [width + 0.16, 0.085, 0.11],
      f: BACK,
    });
    put(unitBox, 'sandstone', {
      p: [x, y - height / 2 - 0.045, 2.090],
      s: [width + 0.20, 0.085, 0.17],
      f: BACK,
    });

    for (const side of [-1, 1]) {
      put(unitBox, 'sandstone', {
        p: [x + side * (width / 2 + 0.038), y, 2.068],
        s: [0.065, height, 0.085],
        f: BACK,
      });
    }

    for (let i = 0; i < bars; i++) {
      const bx = x + (i - (bars - 1) / 2) * width / (bars + 0.5);
      put(new THREE.CylinderGeometry(0.012, 0.012, height * 0.89, 6), 'basalt', {
        p: [bx, y, 2.094],
        f: BACK,
      });
    }
  }

  rearWindow(-1.15, 1.62, 0.43, 0.66, 5);
  rearWindow(0, 1.54, 0.24, 0.43, 0);
  rearWindow(1.15, 1.55, 0.34, 0.52, 2);

  // Exposed brick island and its recessed mortar courses on the rear wall.
  plasterPatch(BACK, 'brick', 0.20, 2.53, 2.056, 0.51, 0.28, 0, 15);

  for (let row = 0; row < 6; row++) {
    const width = 0.77 - Math.abs(row - 2.5) * 0.075;
    put(unitBox, 'dark', {
      p: [0.20, 2.36 + row * 0.065, 2.061],
      s: [width, 0.008, 0.007],
      f: BACK,
    });

    for (let j = 0; j < 4; j++) {
      put(unitBox, 'dark', {
        p: [0.20 + (j - 1.5) * 0.18 + (row % 2) * 0.075, 2.39 + row * 0.065, 2.062],
        s: [0.007, 0.052, 0.007],
        f: BACK,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Shikhara: continuous taper, subsidiary courses and dense carved relief.
  // ---------------------------------------------------------------------------
  course(3.850, 0.09, 3.62, 'granite');
  tapered(3.940, 0.08, 3.62, 3.42, 'stucco');
  course(4.020, 0.06, 3.42, 'sandstone');

  tapered(4.080, 1.12, 3.38, 3.06, 'granite');
  course(4.160, 0.035, 3.40, 'sandstone');
  course(4.205, 0.030, 3.34, 'granite');
  course(5.035, 0.035, 3.16, 'sandstone');
  course(5.075, 0.035, 3.13, 'sandstone');
  course(5.200, 0.07, 3.20, 'granite');
  course(5.270, 0.06, 3.30, 'stucco');
  tapered(5.330, 0.06, 3.30, 3.00, 'sandstone');

  tapered(5.390, 1.03, 3.00, 2.66, 'granite');
  course(5.440, 0.035, 3.03, 'sandstone');
  course(5.485, 0.030, 2.98, 'granite');
  course(6.265, 0.035, 2.75, 'sandstone');
  course(6.300, 0.035, 2.73, 'sandstone');
  course(6.420, 0.07, 2.84, 'granite');
  course(6.490, 0.06, 2.94, 'stucco');
  tapered(6.550, 0.06, 2.94, 2.62, 'sandstone');

  tapered(6.610, 0.91, 2.62, 2.30, 'brick');
  course(6.665, 0.035, 2.62, 'sandstone');
  course(7.400, 0.035, 2.36, 'sandstone');
  course(7.440, 0.035, 2.34, 'sandstone');
  course(7.520, 0.07, 2.46, 'granite');
  course(7.590, 0.07, 2.58, 'stucco');
  tapered(7.660, 0.07, 2.58, 2.34, 'sandstone');

  // Compact stepped crown, not a broad hipped roof.
  course(7.730, 0.07, 2.34, 'stucco');
  course(7.800, 0.07, 2.16, 'sandstone');
  course(7.870, 0.07, 1.98, 'stucco');
  course(7.940, 0.07, 1.78, 'sandstone');
  course(8.010, 0.07, 1.58, 'stucco');

  function dentilRow(y: number, width: number, spacing: number) {
    const count = Math.max(3, Math.floor((width - 0.18) / spacing));

    for (const frame of FACES) {
      for (let i = 0; i < count; i++) {
        put(unitBox, i % 3 === 0 ? 'stucco' : 'sandstone', {
          p: [(i - (count - 1) / 2) * spacing, y, width / 2 + 0.026],
          s: [0.075, 0.062, 0.055],
          f: frame,
        });
      }
    }
  }

  dentilRow(3.655, 4.40, 0.23);
  dentilRow(4.225, 3.34, 0.24);
  dentilRow(5.295, 3.30, 0.22);
  dentilRow(6.515, 2.94, 0.21);
  dentilRow(7.615, 2.58, 0.20);

  const towerArch = archRing(0.50, 0.72, 0.32, 0.56, 0.050);
  const towerArchDark = archFill(0.32, 0.56);

  function pointedTowerNiche(
    frame: THREE.Matrix4,
    base: number,
    surfaceAtBase: number,
    tilt: number,
    scale = 1,
  ) {
    put(towerArchDark, 'dark', {
      p: [0, base + 0.067 * scale, surfaceAtBase + 0.010],
      r: [tilt, 0, 0],
      s: [scale, scale, 1],
      f: frame,
    });
    put(towerArch, 'sandstone', {
      p: [0, base, surfaceAtBase + 0.020],
      r: [tilt, 0, 0],
      s: [scale, scale, scale],
      f: frame,
    });
    put(new THREE.CylinderGeometry(0.036 * scale, 0.068 * scale, 0.25 * scale, 8), 'basalt', {
      p: [0, base + 0.265 * scale, surfaceAtBase + 0.066 * scale],
      r: [tilt, 0, 0],
      f: frame,
    });
    put(smallSphere, 'basalt', {
      p: [0, base + 0.445 * scale, surfaceAtBase + 0.066 * scale],
      s: [0.043 * scale, 0.054 * scale, 0.035 * scale],
      f: frame,
    });
    put(unitBox, 'sandstone', {
      p: [0, base + 0.105 * scale, surfaceAtBase + 0.057 * scale],
      s: [0.20 * scale, 0.055 * scale, 0.09 * scale],
      f: frame,
    });
  }

  function cornerTurret(x: number, y: number, z: number, scale: number) {
    put(unitBox, 'sandstone', {
      p: [x, y, z],
      s: [0.26 * scale, 0.07 * scale, 0.26 * scale],
    });
    put(squareFrustum(0.23 * scale, 0.15 * scale, 0.20 * scale), 'sandstone', {
      p: [x, y + 0.035 * scale, z],
    });
    put(unitBox, 'granite', {
      p: [x, y + 0.245 * scale, z],
      s: [0.19 * scale, 0.045 * scale, 0.19 * scale],
    });
    put(diamond, 'stucco', {
      p: [x, y + 0.295 * scale, z],
      s: [0.060 * scale, 0.070 * scale, 0.060 * scale],
    });
  }

  const tiers = [
    { y0: 4.08, y1: 5.20, wb: 3.38, wt: 3.06 },
    { y0: 5.39, y1: 6.42, wb: 3.00, wt: 2.66 },
    { y0: 6.61, y1: 7.52, wb: 2.62, wt: 2.30 },
  ];

  // Each physical corner receives one turret, avoiding coincident duplicates.
  for (const tier of tiers) {
    const c = tier.wb / 2 - 0.04;
    const y = tier.y0 + 0.18;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cornerTurret(sx * c, y, sz * c, 0.90);
      }
    }
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cornerTurret(sx * 0.66, 8.075, sz * 0.66, 0.55);
    }
  }

  for (const frame of FACES) {
    for (let tierIndex = 0; tierIndex < tiers.length; tierIndex++) {
      const tier = tiers[tierIndex];
      const height = tier.y1 - tier.y0;
      const tilt = -Math.atan((tier.wb - tier.wt) / (2 * height));
      const middle = (tier.y0 + tier.y1) / 2;
      const middleWidth = (tier.wb + tier.wt) / 2;

      for (const side of [-1, 1]) {
        put(unitBox, 'sandstone', {
          p: [side * (middleWidth / 2 - 0.075), middle, middleWidth / 2 + 0.038],
          r: [tilt, 0, 0],
          s: [0.105, height * 0.82, 0.075],
          f: frame,
        });

        for (const dy of [-0.29, 0.29]) {
          put(unitBox, 'stucco', {
            p: [side * (middleWidth / 2 - 0.075), middle + dy, middleWidth / 2 + 0.072],
            r: [tilt, 0, 0],
            s: [0.17, 0.055, 0.10],
            f: frame,
          });
        }

        const py = tier.y0 + 0.22 + random() * (height - 0.44);
        const widthAtY = tier.wb + (tier.wt - tier.wb) * (py - tier.y0) / height;

        plasterPatch(
          frame,
          tierIndex === 2 ? 'stucco' : 'sandstone',
          side * widthAtY * (0.32 + random() * 0.06),
          py,
          widthAtY / 2 + 0.006,
          0.045 + random() * 0.060,
          0.06 + random() * 0.09,
          tilt,
          8,
        );
      }

      // Vertical ratha segments above and below the principal medallion.
      for (const dy of [-0.40, 0.40]) {
        put(unitBox, 'sandstone', {
          p: [0, middle + dy, middleWidth / 2 + 0.036],
          r: [tilt, 0, 0],
          s: [0.13, 0.20, 0.070],
          f: frame,
        });
      }

      // Additional narrow divisions make the tower continuous rather than three boxes.
      if (tierIndex < 2) {
        const ribX = tierIndex === 0 ? 0.43 : 0.82;
        const surfaceAtMiddle = middleWidth / 2;
        for (const side of [-1, 1]) {
          put(unitBox, 'sandstone', {
            p: [side * ribX, middle, surfaceAtMiddle + 0.030],
            r: [tilt, 0, 0],
            s: [0.050, height * 0.55, 0.055],
            f: frame,
          });
          put(unitBox, 'stucco', {
            p: [side * ribX, middle + height * 0.28, surfaceAtMiddle + 0.052],
            r: [tilt, 0, 0],
            s: [0.10, 0.045, 0.065],
            f: frame,
          });
        }
      }
    }

    // Lower storey: principal medallion and four lesser openings.
    {
      const tier = tiers[0];
      const height = tier.y1 - tier.y0;
      const tilt = -Math.atan((tier.wb - tier.wt) / (2 * height));
      const surfaceAt = (y: number) =>
        (tier.wb + (tier.wt - tier.wb) * (y - tier.y0) / height) / 2;

      roundNiche(frame, 0, 4.64, surfaceAt(4.64), 0.20, tilt, true);
      roundNiche(frame, -0.80, 4.70, surfaceAt(4.70), 0.13, tilt);
      roundNiche(frame, 0.80, 4.70, surfaceAt(4.70), 0.13, tilt);
      roundNiche(frame, -1.25, 4.77, surfaceAt(4.77), 0.085, tilt);
      roundNiche(frame, 1.25, 4.77, surfaceAt(4.77), 0.085, tilt);

      for (const x of [-1.20, -0.60, 0, 0.60, 1.20]) {
        put(diamond, 'stucco', {
          p: [x, 4.30, surfaceAt(4.30) + 0.030],
          r: [tilt, 0, 0],
          s: [0.035, 0.050, 0.022],
          f: frame,
        });
        put(unitBox, 'sandstone', {
          p: [x, 5.015, surfaceAt(5.015) + 0.025],
          r: [tilt, 0, 0],
          s: [0.12, 0.040, 0.050],
          f: frame,
        });
      }
    }

    // Middle storey: central medallion with tall flanking chaitya recesses.
    {
      const tier = tiers[1];
      const height = tier.y1 - tier.y0;
      const tilt = -Math.atan((tier.wb - tier.wt) / (2 * height));
      const surfaceAt = (y: number) =>
        (tier.wb + (tier.wt - tier.wb) * (y - tier.y0) / height) / 2;

      roundNiche(frame, 0, 5.91, surfaceAt(5.91), 0.195, tilt, true);

      for (const side of [-1, 1]) {
        const base = 5.56;

        put(towerArchDark, 'dark', {
          p: [side * 0.49, base + 0.050, surfaceAt(base) + 0.010],
          r: [tilt, 0, 0],
          s: [0.47, 0.75, 1],
          f: frame,
        });
        put(towerArch, 'granite', {
          p: [side * 0.49, base, surfaceAt(base) + 0.020],
          r: [tilt, 0, 0],
          s: [0.55, 0.78, 0.75],
          f: frame,
        });
        put(smallSphere, 'sandstone', {
          p: [side * 0.49, base + 0.30, surfaceAt(base) + 0.065],
          s: [0.025, 0.034, 0.020],
          f: frame,
        });

        roundNiche(frame, side * 1.04, 5.96, surfaceAt(5.96), 0.11, tilt);
      }
    }

    // Exposed brick upper storey, with the small image and a high row of openings.
    {
      const tier = tiers[2];
      const height = tier.y1 - tier.y0;
      const tilt = -Math.atan((tier.wb - tier.wt) / (2 * height));
      const surfaceAt = (y: number) =>
        (tier.wb + (tier.wt - tier.wb) * (y - tier.y0) / height) / 2;

      // Subtle recessed brick joints remain behind the applied niches.
      for (let row = 0; row < 5; row++) {
        const y = 6.78 + row * 0.125;
        put(unitBox, 'dark', {
          p: [0, y, surfaceAt(y) + 0.003],
          r: [tilt, 0, 0],
          s: [surfaceAt(y) * 1.48, 0.007, 0.006],
          f: frame,
        });
      }

      pointedTowerNiche(frame, 6.72, surfaceAt(6.72), tilt, 0.78);
      roundNiche(frame, 0, 7.36, surfaceAt(7.36), 0.065, tilt);
      roundNiche(frame, -0.31, 7.34, surfaceAt(7.34), 0.055, tilt);
      roundNiche(frame, 0.31, 7.34, surfaceAt(7.34), 0.055, tilt);

      for (const x of [-0.94, -0.53, 0.53, 0.94]) {
        const y = Math.abs(x) > 0.8 ? 7.05 : 7.10;
        roundNiche(frame, x, y, surfaceAt(y), Math.abs(x) > 0.8 ? 0.10 : 0.088, tilt);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Double lotus crown and compact, rounded, ringed kalasha.
  // ---------------------------------------------------------------------------
  put(new THREE.CylinderGeometry(0.52, 0.57, 0.12, 20), 'sandstone', {
    p: [0, 8.10, 0],
  });

  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.quadraticCurveTo(-0.125, 0.09, -0.072, 0.235);
  petalShape.quadraticCurveTo(-0.035, 0.305, 0, 0.355);
  petalShape.quadraticCurveTo(0.035, 0.305, 0.072, 0.235);
  petalShape.quadraticCurveTo(0.125, 0.09, 0, 0);

  const petal = new THREE.ExtrudeGeometry(petalShape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelSize: 0.009,
    bevelThickness: 0.008,
    bevelSegments: 1,
    curveSegments: 4,
  });

  for (let i = 0; i < 16; i++) {
    const frame = new THREE.Matrix4().makeRotationY(i / 16 * Math.PI * 2);
    put(petal, i % 2 === 0 ? 'sandstone' : 'stucco', {
      p: [0, 8.09, 0.49],
      r: [0.16, 0, 0],
      s: [1.12, 0.90, 1],
      f: frame,
    });
  }

  for (let i = 0; i < 8; i++) {
    const frame = new THREE.Matrix4().makeRotationY((i + 0.5) / 8 * Math.PI * 2);
    put(petal, 'sandstone', {
      p: [0, 8.16, 0.34],
      r: [0.10, 0, 0],
      s: [0.76, 0.72, 0.80],
      f: frame,
    });
  }

  put(new THREE.TorusGeometry(0.50, 0.030, 6, 24), 'granite', {
    p: [0, 8.145, 0],
    r: [Math.PI / 2, 0, 0],
  });

  const finialProfile: [number, number][] = [
    [0.47, 0.00], [0.52, 0.035], [0.52, 0.075], [0.43, 0.115],
    [0.45, 0.155], [0.43, 0.195], [0.35, 0.235],
    [0.38, 0.270], [0.36, 0.310], [0.29, 0.350],
    [0.32, 0.385], [0.30, 0.425], [0.235, 0.465],
    [0.265, 0.500], [0.245, 0.540], [0.185, 0.580],
    [0.210, 0.615], [0.190, 0.655], [0.140, 0.695],
    [0.160, 0.730], [0.140, 0.770], [0.095, 0.810],
    [0.105, 0.850], [0.075, 0.900], [0.052, 0.950],
    [0.022, 1.010], [0.00, 1.055],
  ];

  put(
    new THREE.LatheGeometry(finialProfile.map((p) => new THREE.Vector2(p[0], p[1])), 20),
    'sandstone',
    { p: [0, 8.17, 0] },
  );
  put(smallSphere, 'brass', { p: [0, 9.245, 0], s: [0.042, 0.042, 0.042] });
  put(new THREE.ConeGeometry(0.043, 0.23, 10), 'gold', { p: [0, 9.365, 0] });

  // ---------------------------------------------------------------------------
  // Standing gold Buddha in the deep, dark sanctum.
  // ---------------------------------------------------------------------------
  put(archFill(0.94, 1.96), 'dark', { p: [0, 0.56, 0.70] });
  put(new THREE.CylinderGeometry(0.31, 0.36, 0.12, 16), 'sandstone', {
    p: [0, 0.60, 0.88],
  });
  put(new THREE.TorusGeometry(0.29, 0.024, 5, 20), 'gold', {
    p: [0, 0.662, 0.88],
    r: [Math.PI / 2, 0, 0],
  });

  const BUDDHA = new THREE.Matrix4()
    .makeTranslation(0, 0.66, 0.88)
    .multiply(new THREE.Matrix4().makeScale(1.08, 1.08, 1.08));

  put(new THREE.LatheGeometry([
    new THREE.Vector2(0.24, 0.055),
    new THREE.Vector2(0.27, 0.085),
    new THREE.Vector2(0.25, 0.18),
    new THREE.Vector2(0.215, 0.52),
    new THREE.Vector2(0.175, 0.86),
    new THREE.Vector2(0.18, 1.00),
  ], 20), 'gold', { f: BUDDHA });

  put(new THREE.LatheGeometry([
    new THREE.Vector2(0.175, 0.80),
    new THREE.Vector2(0.170, 0.92),
    new THREE.Vector2(0.215, 1.00),
    new THREE.Vector2(0.205, 1.055),
    new THREE.Vector2(0.120, 1.105),
    new THREE.Vector2(0.060, 1.13),
  ], 20), 'gold', { f: BUDDHA });

  put(new THREE.CylinderGeometry(0.055, 0.063, 0.10, 12), 'gold', {
    p: [0, 1.15, 0.005],
    f: BUDDHA,
  });
  put(smoothSphere, 'gold', {
    p: [0, 1.305, 0.018],
    s: [0.112, 0.150, 0.105],
    f: BUDDHA,
  });
  put(sphere, 'gold', {
    p: [0, 1.445, 0.003],
    s: [0.058, 0.056, 0.055],
    f: BUDDHA,
  });
  put(new THREE.ConeGeometry(0.026, 0.065, 10), 'gold', {
    p: [0, 1.497, 0.003],
    f: BUDDHA,
  });

  for (const side of [-1, 1]) {
    put(smallSphere, 'gold', {
      p: [side * 0.113, 1.295, 0.015],
      s: [0.020, 0.060, 0.021],
      f: BUDDHA,
    });
    put(smallSphere, 'gold', {
      p: [side * 0.09, 0.045, 0.055],
      s: [0.09, 0.036, 0.14],
      f: BUDDHA,
    });
    put(smallSphere, 'basalt', {
      p: [side * 0.036, 1.320, 0.119],
      s: [0.014, 0.0045, 0.004],
      f: BUDDHA,
    });
  }

  put(new THREE.ConeGeometry(0.015, 0.048, 8), 'gold', {
    p: [0, 1.30, 0.121],
    r: [Math.PI / 2, 0, 0],
    f: BUDDHA,
  });
  put(smallSphere, 'brass', {
    p: [0, 1.258, 0.116],
    s: [0.018, 0.004, 0.004],
    f: BUDDHA,
  });
  put(new THREE.TorusGeometry(0.205, 0.015, 6, 28), 'gold', {
    p: [0, 1.315, -0.090],
    f: BUDDHA,
  });

  // Hanging arm.
  put(new THREE.CylinderGeometry(0.032, 0.043, 0.43, 10), 'gold', {
    p: [-0.205, 0.82, 0.015],
    r: [0, 0, -0.09],
    f: BUDDHA,
  });
  put(smallSphere, 'gold', {
    p: [-0.225, 0.585, 0.025],
    s: [0.037, 0.060, 0.032],
    f: BUDDHA,
  });

  // Bent arm and upright abhaya-mudra palm.
  put(new THREE.CylinderGeometry(0.033, 0.043, 0.29, 10), 'gold', {
    p: [0.215, 0.90, 0.025],
    r: [0, 0, 0.28],
    f: BUDDHA,
  });
  put(new THREE.CylinderGeometry(0.029, 0.034, 0.24, 10), 'gold', {
    p: [0.255, 0.925, 0.070],
    f: BUDDHA,
  });
  put(smallSphere, 'gold', {
    p: [0.255, 1.075, 0.074],
    s: [0.043, 0.064, 0.022],
    f: BUDDHA,
  });

  for (let i = 0; i < 3; i++) {
    put(unitBox, 'gold', {
      p: [0.238 + i * 0.017, 1.129, 0.075],
      s: [0.009, 0.047 - i * 0.005, 0.013],
      f: BUDDHA,
    });
  }

  // Diagonal robe edge and rounded hem.
  put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.145, 1.055, 0.105),
    new THREE.Vector3(-0.025, 0.955, 0.165),
    new THREE.Vector3(0.125, 0.815, 0.180),
  ]), 12, 0.014, 5, false), 'brass', { f: BUDDHA });

  put(new THREE.TorusGeometry(0.245, 0.008, 4, 20), 'brass', {
    p: [0, 0.10, 0],
    r: [Math.PI / 2, 0, 0],
    s: [1, 1, 0.82],
    f: BUDDHA,
  });

  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.042;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.11, 0.245),
      new THREE.Vector3(x * 0.84 - 0.012, 0.43, 0.225),
      new THREE.Vector3(x * 0.62 - 0.020, 0.78, 0.185),
    ]);

    put(new THREE.TubeGeometry(curve, 8, 0.0055, 4, false), i % 2 === 0 ? 'gold' : 'brass', {
      f: BUDDHA,
    });
  }

  // Repeated relief is merged into one mesh per shared material.
  const group = new THREE.Group();
  group.name = 'Animesh Lochana Chaitya';

  for (const [name, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) continue;

    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mat(name));
    mesh.name = `chaitya-${name}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    for (const geometry of geometries) geometry.dispose();
  }

  return group;
}
