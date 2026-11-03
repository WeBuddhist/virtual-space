// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, vajrasana round 2); regenerate rather than hand-edit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './kit';
import type { MatName } from './kit';

type SurfacePoint = (u: number, v: number) => [number, number, number];

const TAU = Math.PI * 2;
const BOX = new THREE.BoxGeometry(1, 1, 1);
const PLANE = new THREE.PlaneGeometry(1, 1);
const ICO = new THREE.IcosahedronGeometry(1, 0);
const FLOWER = new THREE.OctahedronGeometry(1, 0);
const SPHERE = new THREE.SphereGeometry(1, 10, 6);
const GLOBE = new THREE.SphereGeometry(1, 12, 8);
const DISK = new THREE.CircleGeometry(1, 12);
const ROUNDEL_RING = new THREE.RingGeometry(0.78, 1, 14, 1);
const FAN_BAND = new THREE.RingGeometry(0.82, 1, 12, 1, 0, Math.PI);
const CYLINDERS = new Map<number, THREE.CylinderGeometry>();
const RODS = new Map<number, THREE.CylinderGeometry>();

function unitCylinder(segments: number): THREE.CylinderGeometry {
  let geometry = CYLINDERS.get(segments);
  if (!geometry) {
    geometry = new THREE.CylinderGeometry(1, 1, 1, segments, 1, false);
    CYLINDERS.set(segments, geometry);
  }
  return geometry;
}

function unitRod(segments: number): THREE.CylinderGeometry {
  let geometry = RODS.get(segments);
  if (!geometry) {
    geometry = new THREE.CylinderGeometry(1, 1, 1, segments, 1, true);
    RODS.set(segments, geometry);
  }
  return geometry;
}

function gridGeometry(nu: number, nv: number, point: SurfacePoint): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      const p = point(u, v);
      positions.push(p[0], p[1], p[2]);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const d = a + nu + 1;
      const c = d + 1;
      indices.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function reversedGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = source.clone();
  if (geometry.index) {
    const indices = geometry.index.array;
    for (let i = 0; i < indices.length; i += 3) {
      const temporary = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = temporary;
    }
    geometry.index.needsUpdate = true;
  }
  geometry.computeVertexNormals();
  return geometry;
}

function petalGeometry(): THREE.BufferGeometry {
  const positions = [
    0, -0.5, 0,
    -0.34, -0.05, 0,
    0, 0.5, 0,
    0.34, -0.05, 0,
    0, 0, 0.12,
    0, 0, -0.035,
  ];
  const uvs = [
    0.5, 0,
    0, 0.45,
    0.5, 1,
    1, 0.45,
    0.5, 0.5,
    0.5, 0.5,
  ];
  const indices = [
    0, 4, 1, 1, 4, 2, 2, 4, 3, 3, 4, 0,
    0, 1, 5, 1, 2, 5, 2, 3, 5, 3, 0, 5,
  ];
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  indexed.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  indexed.setIndex(indices);
  const geometry = indexed.toNonIndexed();
  geometry.computeVertexNormals();
  indexed.dispose();
  return geometry;
}

function rootMoundGeometry(): THREE.BufferGeometry {
  const segments = 48;
  const rings = 6;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * TAU;
      const outline =
        2.08 +
        0.09 * Math.sin(angle * 5 + 0.4) +
        0.05 * Math.cos(angle * 9 - 0.7);
      const radius = outline * t;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y =
        0.515 +
        0.07 * (1 - t * t) +
        0.0025 * Math.sin(angle * 3 + t * 4) * t;
      positions.push(x, y, z);
      uvs.push(0.5 + x / 4.5, 0.5 + z / 4.5);
    }
  }

  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + 1;
      const d = a + segments + 1;
      const c = d + 1;
      indices.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const PETAL = petalGeometry();

function goldPatchGeometry(phase: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.34, -0.5);
  for (let j = 0; j <= 12; j++) {
    const y = -0.5 + j / 12;
    const x =
      0.31 +
      0.065 * Math.sin(j * 1.71 + phase) +
      0.025 * Math.sin(j * 3.2 + phase);
    shape.lineTo(x, y);
  }
  for (let j = 12; j >= 0; j--) {
    const y = -0.5 + j / 12;
    const x =
      -0.31 +
      0.06 * Math.sin(j * 1.37 + phase + 1.2) +
      0.022 * Math.cos(j * 2.8 + phase);
    shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export function build(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Vajrasana and Bodhi tree enclosure';

  let randomState = 0x51a7c3d9;
  const random = (): number => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };

  const buckets = new Map<MatName, THREE.BufferGeometry[]>();
  const IDENTITY = new THREE.Matrix4();

  function emit(source: THREE.BufferGeometry, material: MatName, transform?: THREE.Matrix4): void {
    let geometry = source.clone();
    if (transform) geometry.applyMatrix4(transform);
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flat;
    }
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();

    for (const attribute of Object.keys(geometry.attributes)) {
      if (attribute !== 'position' && attribute !== 'normal' && attribute !== 'uv') {
        geometry.deleteAttribute(attribute);
      }
    }
    if (!geometry.getAttribute('uv')) {
      const count = geometry.getAttribute('position').count;
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }

    const list = buckets.get(material);
    if (list) list.push(geometry);
    else buckets.set(material, [geometry]);
  }

  function emitDouble(
    source: THREE.BufferGeometry,
    material: MatName,
    transform?: THREE.Matrix4,
  ): void {
    emit(source, material, transform);
    const reverse = reversedGeometry(source);
    emit(reverse, material, transform);
    reverse.dispose();
  }

  function frame(x: number, y: number, z: number, ry = 0): THREE.Matrix4 {
    const matrix = new THREE.Matrix4().makeRotationY(ry);
    matrix.setPosition(x, y, z);
    return matrix;
  }

  function radialFrame(angle: number, radius: number, treeZ: number): THREE.Matrix4 {
    return frame(
      Math.cos(angle) * radius,
      0,
      treeZ + Math.sin(angle) * radius,
      Math.PI / 2 - angle,
    );
  }

  function put(
    geometry: THREE.BufferGeometry,
    material: MatName,
    base: THREE.Matrix4,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1,
  ): void {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(sx, sy, sz),
    );
    emit(geometry, material, new THREE.Matrix4().multiplyMatrices(base, local));
  }

  function box(
    material: MatName,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    ry = 0,
    base: THREE.Matrix4 = IDENTITY,
  ): void {
    put(BOX, material, base, x, y, z, 0, ry, 0, width, height, depth);
  }

  function cylinder(
    material: MatName,
    radius: number,
    height: number,
    x: number,
    y: number,
    z: number,
    segments = 10,
    base: THREE.Matrix4 = IDENTITY,
  ): void {
    put(unitCylinder(segments), material, base, x, y, z, 0, 0, 0, radius, height, radius);
  }

  function frustum(
    material: MatName,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    x: number,
    y: number,
    z: number,
    segments = 12,
    base: THREE.Matrix4 = IDENTITY,
  ): void {
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false);
    put(geometry, material, base, x, y, z);
    geometry.dispose();
  }

  function cone(
    material: MatName,
    radius: number,
    height: number,
    x: number,
    y: number,
    z: number,
    segments = 10,
    base: THREE.Matrix4 = IDENTITY,
  ): void {
    const geometry = new THREE.ConeGeometry(radius, height, segments);
    put(geometry, material, base, x, y, z);
    geometry.dispose();
  }

  function blob(
    material: MatName,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    base: THREE.Matrix4 = IDENTITY,
    smooth = false,
  ): void {
    put(smooth ? SPHERE : ICO, material, base, x, y, z, 0, 0, 0, sx, sy, sz);
  }

  function floret(
    material: MatName,
    size: number,
    x: number,
    y: number,
    z: number,
    base: THREE.Matrix4 = IDENTITY,
    yScale = 1,
  ): void {
    put(FLOWER, material, base, x, y, z, 0, 0, 0, size, size * yScale, size);
  }

  function rod(
    material: MatName,
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    segments = 6,
    base: THREE.Matrix4 = IDENTITY,
  ): void {
    const a = start.clone().applyMatrix4(base);
    const b = end.clone().applyMatrix4(base);
    const direction = b.clone().sub(a);
    const length = direction.length();
    if (length < 0.00001) return;

    const matrix = new THREE.Matrix4().compose(
      a.clone().add(b).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.multiplyScalar(1 / length),
      ),
      new THREE.Vector3(radius, length, radius),
    );
    emit(unitRod(segments), material, matrix);
  }

  function medallion(
    base: THREE.Matrix4,
    x: number,
    y: number,
    z: number,
    radius: number,
    stone: MatName = 'sandstone',
    metal: MatName = 'gold',
    petalCount = 8,
  ): void {
    put(DISK, stone, base, x, y, z, 0, 0, 0, radius * 0.9, radius * 0.9, 1);
    put(
      ROUNDEL_RING,
      metal,
      base,
      x,
      y,
      z + 0.009,
      0,
      0,
      0,
      radius,
      radius,
      radius,
    );

    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * TAU;
      const px = x + Math.sin(angle) * radius * 0.43;
      const py = y + Math.cos(angle) * radius * 0.43;
      put(
        PETAL,
        stone,
        base,
        px,
        py,
        z + 0.02,
        0,
        0,
        -angle,
        radius * 0.5,
        radius * 0.7,
        radius * 0.65,
      );
    }
    blob(metal, radius * 0.17, radius * 0.17, radius * 0.09, x, y, z + 0.044, base);
  }

  function fanCarving(
    base: THREE.Matrix4,
    x: number,
    y: number,
    z: number,
    radius: number,
  ): void {
    put(FAN_BAND, 'gold', base, x, y, z + 0.002, 0, 0, Math.PI, radius, radius, radius);
    put(
      FAN_BAND,
      'sandstone',
      base,
      x,
      y,
      z + 0.012,
      0,
      0,
      Math.PI,
      radius * 0.71,
      radius * 0.71,
      radius * 0.71,
    );

    for (let i = 0; i < 5; i++) {
      const angle = Math.PI / 2 + (i / 4) * Math.PI;
      const px = x + Math.sin(angle) * radius * 0.43;
      const py = y + Math.cos(angle) * radius * 0.43;
      put(
        PETAL,
        'sandstone',
        base,
        px,
        py,
        z + 0.018,
        0,
        0,
        -angle,
        radius * 0.48,
        radius * 0.69,
        radius * 0.62,
      );
    }

    for (let i = 0; i < 7; i++) {
      const angle = Math.PI + (i / 6) * Math.PI;
      floret(
        'sandstone',
        radius * 0.038,
        x + Math.cos(angle) * radius * 0.91,
        y + Math.sin(angle) * radius * 0.91,
        z + 0.027,
        base,
        0.9,
      );
    }
    floret('gold', radius * 0.12, x, y - radius * 0.04, z + 0.04, base, 0.75);
  }

  function sunburst(
    base: THREE.Matrix4,
    x: number,
    y: number,
    z: number,
    radius: number,
    rays: number,
  ): void {
    put(
      ROUNDEL_RING,
      'gold',
      base,
      x,
      y,
      z,
      0,
      0,
      0,
      radius,
      radius,
      radius,
    );
    put(DISK, 'gold', base, x, y, z + 0.008, 0, 0, 0, radius * 0.26, radius * 0.26, 1);

    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * TAU;
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      rod(
        'gold',
        new THREE.Vector3(x + s * radius * 0.37, y + c * radius * 0.37, z + 0.02),
        new THREE.Vector3(x + s * radius * 0.77, y + c * radius * 0.77, z + 0.02),
        0.007,
        5,
        base,
      );
    }
    blob('brass', radius * 0.15, radius * 0.15, radius * 0.09, x, y, z + 0.036, base);
  }

  const patches = [goldPatchGeometry(0), goldPatchGeometry(1.8), goldPatchGeometry(3.5)];

  // Marble forecourt, narrow enough to read as paving rather than a second plinth.
  box('marble', 3.7, 0.04, 4.84, 0, 0.02, -0.39);
  for (const z of [-2.4, -1.6, -0.8, 0, 0.8, 1.6]) {
    box('granite', 3.68, 0.003, 0.008, 0, 0.0415, z);
  }
  for (const x of [-1.23, -0.61, 0, 0.61, 1.23]) {
    box('granite', 0.008, 0.003, 4.82, x, 0.0415, -0.39);
  }

  box('red-cloth', 1.22, 0.008, 0.7, 0, 0.046, 1.67);
  box('gold', 1.24, 0.004, 0.018, 0, 0.052, 2.015);
  box('gold', 1.24, 0.004, 0.018, 0, 0.052, 1.325);
  box('gold', 0.018, 0.004, 0.69, -0.611, 0.052, 1.67);
  box('gold', 0.018, 0.004, 0.69, 0.611, 0.052, 1.67);

  // Stepped Vajrasana plinth, carved panels and polished sandstone slab.
  box('granite', 2.86, 0.09, 1.86, 0, 0.045, 0);
  box('granite', 2.74, 0.08, 1.74, 0, 0.13, 0);
  box('sandstone', 2.5, 0.32, 1.54, 0, 0.33, 0);
  box('sandstone', 2.6, 0.04, 1.6, 0, 0.51, 0);
  box('sandstone', 2.62, 0.06, 1.62, 0, 0.56, 0);
  box('sandstone', 2.42, 0.02, 1.52, 0, 0.6, 0);
  box('sandstone', 2.3, 0.12, 1.4, 0, 0.66, 0);

  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.44;
    box('pink-sandstone', 0.32, 0.2, 0.012, x, 0.33, 0.776);
    box('sandstone', 0.37, 0.024, 0.026, x, 0.437, 0.79);
    box('sandstone', 0.37, 0.024, 0.026, x, 0.223, 0.79);
    box('sandstone', 0.024, 0.22, 0.026, x - 0.173, 0.33, 0.79);
    box('sandstone', 0.024, 0.22, 0.026, x + 0.173, 0.33, 0.79);
    medallion(IDENTITY, x, 0.33, 0.792, 0.067, 'sandstone', 'brass', 6);
  }

  for (const side of [-1, 1]) {
    const sideBase = frame(side * 1.25, 0, 0, side * Math.PI / 2);
    for (const offset of [-0.4, 0.4]) {
      box('pink-sandstone', 0.34, 0.2, 0.012, offset, 0.33, 0.006, 0, sideBase);
      medallion(sideBase, offset, 0.33, 0.018, 0.067, 'sandstone', 'brass', 6);
    }
  }

  for (let i = 0; i < 20; i++) {
    const x = (i - 9.5) * 0.126;
    put(PETAL, 'sandstone', IDENTITY, x, 0.535, 0.817, 0, 0, Math.PI, 0.09, 0.085, 0.07);
    put(PETAL, 'sandstone', IDENTITY, x, 0.535, -0.817, 0, Math.PI, Math.PI, 0.09, 0.085, 0.07);
  }
  for (const side of [-1, 1]) {
    const base = frame(side * 1.315, 0, 0, side * Math.PI / 2);
    for (let i = 0; i < 11; i++) {
      put(
        PETAL,
        'sandstone',
        base,
        (i - 5) * 0.139,
        0.535,
        0,
        0,
        0,
        Math.PI,
        0.09,
        0.085,
        0.07,
      );
    }
  }

  // Saffron throne cloth with red undercloth, gold woven borders and folds.
  box('red-cloth', 2.35, 0.01, 1.45, 0, 0.723, 0);
  box('saffron-cloth', 2.34, 0.016, 1.44, 0, 0.733, 0);
  box('gold', 2.32, 0.01, 0.018, 0, 0.744, 0.711);
  box('gold', 2.32, 0.01, 0.018, 0, 0.744, -0.711);
  box('gold', 0.018, 0.01, 1.42, 1.161, 0.744, 0);
  box('gold', 0.018, 0.01, 1.42, -1.161, 0.744, 0);

  function clothDrape(base: THREE.Matrix4, length: number, drop: number): void {
    const depthAt = (u: number): number => drop + 0.022 * Math.sin(u * TAU * 3);
    const foldAt = (u: number, v: number): number =>
      0.09 * v + 0.016 * Math.sin(u * TAU * 7) * (0.25 + 0.75 * v);

    const cloth = gridGeometry(18, 5, (u, v) => [
      (u - 0.5) * length,
      -v * depthAt(u),
      foldAt(u, v),
    ]);
    emitDouble(cloth, 'saffron-cloth', base);
    cloth.dispose();

    const border = gridGeometry(18, 1, (u, v) => [
      (u - 0.5) * length,
      -depthAt(u) - v * 0.022,
      foldAt(u, 1) + 0.002,
    ]);
    emitDouble(border, 'gold', base);
    border.dispose();
  }

  clothDrape(frame(0, 0.744, 0.71), 2.32, 0.32);
  clothDrape(frame(0, 0.744, -0.71, Math.PI), 2.32, 0.22);
  clothDrape(frame(1.16, 0.744, 0, Math.PI / 2), 1.42, 0.24);
  clothDrape(frame(-1.16, 0.744, 0, -Math.PI / 2), 1.42, 0.24);

  const bowlGeometry = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.065, 0),
    new THREE.Vector2(0.09, 0.025),
    new THREE.Vector2(0.105, 0.065),
    new THREE.Vector2(0.1, 0.078),
    new THREE.Vector2(0.085, 0.045),
    new THREE.Vector2(0.025, 0.035),
    new THREE.Vector2(0, 0.035),
  ], 12);

  const offeringPositions = [
    [-0.72, 0.3],
    [-0.25, 0.39],
    [0.25, 0.39],
    [0.72, 0.3],
  ];

  for (let i = 0; i < offeringPositions.length; i++) {
    const [x, z] = offeringPositions[i];
    put(bowlGeometry, 'brass', IDENTITY, x, 0.75, z);
    for (let j = 0; j < 11; j++) {
      const angle = (j / 11) * TAU + random() * 0.3;
      const radius = 0.018 + random() * 0.058;
      const size = 0.024 + random() * 0.014;
      const flowerMaterial: MatName =
        (i + j) % 7 === 0 ? 'marble' : (i + j) % 5 === 0 ? 'red-cloth' : 'saffron-cloth';
      floret(
        flowerMaterial,
        size,
        x + Math.sin(angle) * radius,
        0.825 + random() * 0.025,
        z + Math.cos(angle) * radius,
        IDENTITY,
        0.8,
      );
    }
  }

  function lotusOffering(x: number, z: number, radius: number, color: MatName): void {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * TAU;
      put(
        PETAL,
        color,
        IDENTITY,
        x + Math.sin(angle) * radius * 0.32,
        0.785,
        z + Math.cos(angle) * radius * 0.32,
        -Math.PI / 2 + 0.25,
        angle,
        0,
        radius * 0.42,
        radius * 0.92,
        radius * 0.52,
      );
    }
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * TAU + 0.25;
      put(
        PETAL,
        color,
        IDENTITY,
        x + Math.sin(angle) * radius * 0.15,
        0.8,
        z + Math.cos(angle) * radius * 0.15,
        -Math.PI / 2 + 0.62,
        angle,
        0,
        radius * 0.32,
        radius * 0.65,
        radius * 0.45,
      );
    }
    blob('gold', radius * 0.19, radius * 0.15, radius * 0.19, x, 0.805, z);
  }

  lotusOffering(-0.94, -0.02, 0.14, 'marble');
  lotusOffering(0.94, -0.02, 0.14, 'red-cloth');
  lotusOffering(0, -0.2, 0.13, 'marble');

  for (const x of [-0.97, 0.97]) {
    cylinder('brass', 0.065, 0.025, x, 0.762, -0.4, 12);
    cylinder('brass', 0.018, 0.15, x, 0.845, -0.4, 8);
    frustum('brass', 0.085, 0.035, 0.04, x, 0.94, -0.4, 12);
    cone('gold', 0.018, 0.055, x, 0.986, -0.4, 8);
  }

  // Low wooden offering table, offset to preserve the axial view.
  const tableBase = frame(0.82, 0, 1.44);
  box('wood', 1.42, 0.07, 0.48, 0, 0.7, 0, 0, tableBase);
  box('wood', 1.2, 0.035, 0.36, 0, 0.22, 0, 0, tableBase);
  for (const x of [-0.6, 0.6]) {
    for (const z of [-0.17, 0.17]) {
      box('wood', 0.065, 0.62, 0.065, x, 0.35, z, 0, tableBase);
    }
  }
  box('saffron-cloth', 1.46, 0.014, 0.52, 0, 0.744, 0, 0, tableBase);
  clothDrape(frame(0.82, 0.752, 1.69), 1.44, 0.18);

  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 0.2;
    for (let j = 0; j < 7; j++) {
      const angle = (j / 7) * TAU + random() * 0.25;
      const radius = 0.015 + random() * 0.06;
      const size = 0.024 + random() * 0.014;
      const color: MatName =
        (i + j) % 6 === 0 ? 'red-cloth' : (i + j) % 4 === 0 ? 'marble' : 'saffron-cloth';
      floret(
        color,
        size,
        x + Math.sin(angle) * radius,
        0.785 + random() * 0.022,
        Math.cos(angle) * radius,
        tableBase,
        0.78,
      );
    }
  }

  const vaseGeometry = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.055, 0),
    new THREE.Vector2(0.07, 0.04),
    new THREE.Vector2(0.045, 0.13),
    new THREE.Vector2(0.03, 0.2),
    new THREE.Vector2(0.045, 0.22),
  ], 8);

  for (const x of [-0.53, 0.53]) {
    put(vaseGeometry, 'brass', tableBase, x, 0.75, -0.1);
    for (let j = 0; j < 3; j++) {
      const dx = (j - 1) * 0.05;
      const flowerY = 1.08 + (j % 2) * 0.04;
      rod(
        'wood',
        new THREE.Vector3(x, 0.94, -0.1),
        new THREE.Vector3(x + dx, flowerY, -0.1),
        0.006,
        4,
        tableBase,
      );
      for (let petal = 0; petal < 7; petal++) {
        const angle = (petal / 7) * TAU;
        put(
          PETAL,
          j === 1 ? 'red-cloth' : 'marble',
          tableBase,
          x + dx + Math.sin(angle) * 0.024,
          flowerY,
          -0.1 + Math.cos(angle) * 0.024,
          -Math.PI / 2 + 0.35,
          angle,
          0,
          0.035,
          0.075,
          0.04,
        );
      }
      floret('gold', 0.016, x + dx, flowerY + 0.01, -0.1, tableBase);
    }
  }

  // Flower chest opposite the table.
  const chestBase = frame(-0.88, 0, 1.45);
  box('marble', 1.44, 0.12, 0.64, 0, 0.06, 0, 0, chestBase);
  box('wood', 1.34, 0.38, 0.56, 0, 0.29, 0, 0, chestBase);
  box('wood', 1.4, 0.045, 0.62, 0, 0.495, 0, 0, chestBase);
  box('dark', 1.25, 0.02, 0.47, 0, 0.523, 0, 0, chestBase);
  box('brass', 0.055, 0.09, 0.016, 0, 0.31, 0.288, 0, chestBase);
  for (const x of [-0.57, 0.57]) {
    box('brass', 0.025, 0.32, 0.015, x, 0.3, 0.288, 0, chestBase);
  }
  for (let i = 0; i < 54; i++) {
    const x = (random() - 0.5) * 1.16;
    const z = (random() - 0.5) * 0.4;
    const size = 0.04 + random() * 0.026;
    const color: MatName =
      i % 5 === 0 ? 'red-cloth' : i % 3 === 0 ? 'marble' : 'saffron-cloth';
    floret(color, size, x, 0.56 + random() * 0.07, z, chestBase, 0.75);
  }

  // Gilded screens; the central lower portion is deliberately more open.
  const cornerX = 1.53;
  const cornerZ = 1.03;

  function thronePanel(base: THREE.Matrix4, length: number, count: number, gate: boolean): void {
    rod(
      'gold',
      new THREE.Vector3(-length / 2, 0.23, 0),
      new THREE.Vector3(length / 2, 0.23, 0),
      0.03,
      8,
      base,
    );
    rod(
      'gold',
      new THREE.Vector3(-length / 2, 1.95, 0),
      new THREE.Vector3(length / 2, 1.95, 0),
      0.034,
      8,
      base,
    );
    rod(
      'brass',
      new THREE.Vector3(-length / 2, 1.03, 0),
      new THREE.Vector3(length / 2, 1.03, 0),
      0.015,
      6,
      base,
    );
    rod(
      'brass',
      new THREE.Vector3(-length / 2, 1.67, 0),
      new THREE.Vector3(length / 2, 1.67, 0),
      0.013,
      6,
      base,
    );

    for (let i = 0; i < count; i++) {
      const x = -length / 2 + (i / (count - 1)) * length;
      const openLowerCentre = gate && Math.abs(x) < 0.65;
      rod(
        i % 4 === 0 ? 'gold' : 'brass',
        new THREE.Vector3(x, openLowerCentre ? 0.94 : 0.25, 0),
        new THREE.Vector3(x, 1.94, 0),
        gate ? 0.011 : 0.013,
        6,
        base,
      );
      if (i % 2 === 0) floret('gold', 0.021, x, 1.975, 0, base, 1.25);
    }

    if (gate) {
      sunburst(base, 0, 1.46, 0.04, 0.27, 18);
      const arch = new THREE.TorusGeometry(0.4, 0.017, 5, 20, Math.PI);
      put(arch, 'gold', base, 0, 1.61, 0.038);
      arch.dispose();
      rod(
        'gold',
        new THREE.Vector3(-0.4, 1.08, 0.038),
        new THREE.Vector3(-0.4, 1.61, 0.038),
        0.015,
        6,
        base,
      );
      rod(
        'gold',
        new THREE.Vector3(0.4, 1.08, 0.038),
        new THREE.Vector3(0.4, 1.61, 0.038),
        0.015,
        6,
        base,
      );
      blob('gold', 0.04, 0.055, 0.03, 0, 2.025, 0.038, base);
    }
  }

  thronePanel(frame(0, 0, cornerZ), 2.86, 11, true);
  thronePanel(frame(0, 0, -cornerZ, Math.PI), 2.86, 15, false);
  thronePanel(frame(cornerX, 0, 0, Math.PI / 2), 1.86, 10, false);
  thronePanel(frame(-cornerX, 0, 0, -Math.PI / 2), 1.86, 10, false);

  function garland(
    base: THREE.Matrix4,
    x: number,
    z: number,
    top: number,
    bottom: number,
    count: number,
  ): void {
    rod(
      'brass',
      new THREE.Vector3(x, top, z),
      new THREE.Vector3(x, bottom, z),
      0.005,
      4,
      base,
    );
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const material: MatName =
        i % 7 === 0 ? 'marble' : i % 5 === 0 ? 'red-cloth' : 'saffron-cloth';
      floret(
        material,
        0.026,
        x + Math.sin(t * TAU * 1.4) * 0.018,
        top + (bottom - top) * t,
        z,
        base,
        1.08,
      );
    }
  }

  // Broad gold-leafed canopy piers with layered capitals and lotus relief.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * cornerX;
      const z = sz * cornerZ;
      box('granite', 0.34, 0.12, 0.34, x, 0.12, z);
      box('pink-sandstone', 0.32, 0.12, 0.32, x, 0.22, z);
      box('pink-sandstone', 0.3, 2.36, 0.3, x, 1.46, z);
      box('sandstone', 0.32, 0.055, 0.32, x, 0.315, z);
      box('brass', 0.33, 0.09, 0.33, x, 2.68, z);
      box('gold', 0.38, 0.08, 0.38, x, 2.765, z);
      box('gold', 0.44, 0.08, 0.44, x, 2.845, z);

      for (const dx of [-0.123, 0.123]) {
        for (const dz of [-0.123, 0.123]) {
          rod(
            'gold',
            new THREE.Vector3(x + dx, 0.42, z + dz),
            new THREE.Vector3(x + dx, 2.57, z + dz),
            0.009,
            5,
          );
        }
      }

      const faces = [
        { angle: sz > 0 ? 0 : Math.PI, phase: sx > 0 ? 0 : 1 },
        { angle: sx > 0 ? Math.PI / 2 : -Math.PI / 2, phase: sz > 0 ? 2 : 1 },
      ];

      for (const face of faces) {
        const faceBase = frame(x, 0, z, face.angle);
        put(
          patches[face.phase],
          'gold',
          faceBase,
          0,
          1.46,
          0.154,
          0,
          0,
          0,
          0.3,
          1.78,
          1,
        );
        medallion(faceBase, 0, 0.88, 0.163, 0.105, 'sandstone');
        fanCarving(faceBase, 0, 1.41, 0.166, 0.114);
        medallion(faceBase, 0, 1.91, 0.163, 0.105, 'sandstone');
        fanCarving(faceBase, 0, 2.56, 0.166, 0.122);
      }

      rod(
        'brass',
        new THREE.Vector3(x - sx * 0.12, 2.59, z),
        new THREE.Vector3(x - sx * 0.43, 2.9, z),
        0.018,
        6,
      );
      rod(
        'brass',
        new THREE.Vector3(x, 2.59, z - sz * 0.12),
        new THREE.Vector3(x, 2.9, z - sz * 0.43),
        0.018,
        6,
      );

      if (sz > 0) garland(frame(x, 0, z), 0, 0.17, 2.7, 0.96, 23);
    }
  }

  // Broad scalloped white ceremonial umbrellas inside the railing.
  function umbrella(x: number, z: number, phase: number): void {
    const base = frame(x, 0, z, phase);
    const radius = 0.37;

    cylinder('brass', 0.05, 0.05, 0, 0.065, 0, 10, base);
    cylinder('red-cloth', 0.019, 2.42, 0, 1.25, 0, 8, base);
    cylinder('gold', 0.021, 0.3, 0, 2.58, 0, 8, base);

    const canopyPoint = (u: number, v: number): [number, number, number] => {
      const angle = u * TAU;
      const pleat = 1 + 0.014 * Math.sin(angle * 16) * v;
      const r = radius * v * pleat;
      const scallop = 0.017 * Math.cos(angle * 16) * Math.pow(v, 5);
      const y = 2.76 - 0.31 * Math.pow(v, 1.45) + scallop;
      return [Math.cos(angle) * r, y, Math.sin(angle) * r];
    };

    const canopy = gridGeometry(32, 5, canopyPoint);
    emitDouble(canopy, 'whitewash', base);
    canopy.dispose();

    for (let i = 0; i < 12; i++) {
      const u = i / 12;
      const angle = u * TAU;
      const rim = canopyPoint(u, 1);
      const bottom = 2.29 - (i % 3) * 0.025;
      rod(
        'gold',
        new THREE.Vector3(rim[0], rim[1] - 0.006, rim[2]),
        new THREE.Vector3(rim[0], bottom + 0.025, rim[2]),
        0.003,
        4,
        base,
      );
      floret('gold', 0.016, rim[0], bottom, rim[2], base, 1.5);

      if (i % 2 === 0) {
        rod(
          'brass',
          new THREE.Vector3(0, 2.745, 0),
          new THREE.Vector3(
            Math.cos(angle) * radius * 0.96,
            2.47,
            Math.sin(angle) * radius * 0.96,
          ),
          0.003,
          4,
          base,
        );
      }
    }

    blob('gold', 0.035, 0.025, 0.035, 0, 2.775, 0, base, true);
    cone('gold', 0.018, 0.055, 0, 2.815, 0, 8, base);
  }

  umbrella(-1.15, 0.72, 0.08);
  umbrella(1.15, 0.72, -0.08);

  // Long, folded scarves suspended from the canopy.
  const hangingScarves: Array<[number, number, number, MatName]> = [
    [-1.22, 0.13, 0.88, 'whitewash'],
    [-1.01, 0.11, 0.69, 'saffron-cloth'],
    [0.34, 0.12, 0.76, 'whitewash'],
    [0.55, 0.14, 1.02, 'whitewash'],
    [0.77, 0.12, 0.88, 'saffron-cloth'],
    [0.98, 0.15, 1.1, 'whitewash'],
    [1.2, 0.12, 0.82, 'red-cloth'],
  ];

  for (let i = 0; i < hangingScarves.length; i++) {
    const [x, width, length, material] = hangingScarves[i];
    const top = 2.82 - (i % 2) * 0.035;
    const scarf = gridGeometry(3, 9, (u, v) => {
      const taper = 1 - 0.18 * v + 0.08 * Math.sin(v * Math.PI);
      const angledHem = (u - 0.5) * 0.055 * Math.pow(v, 5);
      return [
        x +
          (u - 0.5) * width * taper +
          Math.sin(v * TAU + i) * 0.011,
        top - v * length + angledHem,
        cornerZ +
          0.065 +
          Math.sin(v * TAU * 1.3 + u * 1.8 + i) * (0.012 + 0.012 * v),
      ];
    });
    emitDouble(scarf, material);
    scarf.dispose();

    if (material === 'saffron-cloth') {
      const hem = gridGeometry(3, 1, (u, v) => [
        x + (u - 0.5) * width * 0.82 + Math.sin(TAU + i) * 0.011,
        top - length + (u - 0.5) * 0.055 - v * 0.02,
        cornerZ + 0.065 + Math.sin(TAU * 1.3 + u * 1.8 + i) * 0.024,
      ]);
      emitDouble(hem, 'gold');
      hem.dispose();
    }
  }

  // Broad, soft hipped cloth roof with sagged edges and sewn panel seams.
  const beamY = 2.91;
  rod('brass', new THREE.Vector3(-cornerX, beamY, cornerZ), new THREE.Vector3(cornerX, beamY, cornerZ), 0.042, 8);
  rod('brass', new THREE.Vector3(-cornerX, beamY, -cornerZ), new THREE.Vector3(cornerX, beamY, -cornerZ), 0.042, 8);
  rod('brass', new THREE.Vector3(cornerX, beamY, -cornerZ), new THREE.Vector3(cornerX, beamY, cornerZ), 0.042, 8);
  rod('brass', new THREE.Vector3(-cornerX, beamY, -cornerZ), new THREE.Vector3(-cornerX, beamY, cornerZ), 0.042, 8);
  box('red-cloth', 3.08, 0.012, 2.08, 0, 2.885, 0);

  const roofX = 2.35;
  const roofZ = 1.95;
  const roofEave = 3.0;
  const roofRidge = 3.42;
  const ridgeHalf = 0.52;

  function roofHeight(x: number, z: number): number {
    const u = (x / roofX + 1) * 0.5;
    const v = (z / roofZ + 1) * 0.5;
    const rx = Math.max(0, (Math.abs(x) - ridgeHalf) / (roofX - ridgeHalf));
    const rz = Math.abs(z) / roofZ;
    const r = Math.max(rx, rz);
    const frontBackSag = Math.pow(rz, 10) * Math.sin(Math.PI * u) * 0.085;
    const sideSag = Math.pow(rx, 10) * Math.sin(Math.PI * v) * 0.06;
    return (
      roofEave +
      (roofRidge - roofEave) * (1 - r) -
      0.04 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * (0.3 + 0.7 * r) +
      0.018 * Math.sin(u * TAU * 6 + v * 2.1) * r * (1 - r) -
      frontBackSag -
      sideSag
    );
  }

  const roof = gridGeometry(28, 20, (u, v) => {
    const x = (u * 2 - 1) * roofX;
    const z = (v * 2 - 1) * roofZ;
    return [x, roofHeight(x, z), z];
  });
  emitDouble(roof, 'saffron-cloth');
  roof.dispose();

  function roofSeam(start: THREE.Vector3, end: THREE.Vector3, segments: number, radius: number): void {
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const x0 = start.x + (end.x - start.x) * t0;
      const z0 = start.z + (end.z - start.z) * t0;
      const x1 = start.x + (end.x - start.x) * t1;
      const z1 = start.z + (end.z - start.z) * t1;
      rod(
        'gold',
        new THREE.Vector3(x0, roofHeight(x0, z0) + 0.006, z0),
        new THREE.Vector3(x1, roofHeight(x1, z1) + 0.006, z1),
        radius,
        6,
      );
    }
  }

  roofSeam(new THREE.Vector3(-roofX, 0, -roofZ), new THREE.Vector3(roofX, 0, -roofZ), 14, 0.012);
  roofSeam(new THREE.Vector3(roofX, 0, -roofZ), new THREE.Vector3(roofX, 0, roofZ), 12, 0.012);
  roofSeam(new THREE.Vector3(roofX, 0, roofZ), new THREE.Vector3(-roofX, 0, roofZ), 14, 0.012);
  roofSeam(new THREE.Vector3(-roofX, 0, roofZ), new THREE.Vector3(-roofX, 0, -roofZ), 12, 0.012);
  roofSeam(new THREE.Vector3(-ridgeHalf, 0, 0), new THREE.Vector3(ridgeHalf, 0, 0), 5, 0.01);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      roofSeam(
        new THREE.Vector3(sx * roofX, 0, sz * roofZ),
        new THREE.Vector3(sx * ridgeHalf, 0, 0),
        8,
        0.007,
      );
    }
  }

  function canopyValance(base: THREE.Matrix4, length: number, sag: number): void {
    const folds = Math.max(5, Math.round(length / 0.52));
    const dropAt = (u: number): number => {
      const scallop = 0.5 + 0.5 * Math.cos(u * TAU * 5);
      return 0.25 + 0.09 * scallop + 0.018 * Math.sin(u * TAU * 2);
    };
    const foldAt = (u: number, v: number): number =>
      0.035 * Math.sin(u * TAU * folds) * (0.35 + 0.65 * v) +
      0.015 * Math.sin(Math.PI * v);

    const valance = gridGeometry(28, 4, (u, v) => [
      (u - 0.5) * length,
      -sag * Math.sin(Math.PI * u) - v * dropAt(u),
      foldAt(u, v),
    ]);
    emitDouble(valance, 'saffron-cloth', base);
    valance.dispose();

    const border = gridGeometry(28, 1, (u, v) => [
      (u - 0.5) * length,
      -sag * Math.sin(Math.PI * u) - dropAt(u) - v * 0.024,
      foldAt(u, 1) + 0.002,
    ]);
    emitDouble(border, 'gold', base);
    border.dispose();
  }

  canopyValance(frame(0, roofEave, roofZ), roofX * 2, 0.085);
  canopyValance(frame(0, roofEave, -roofZ, Math.PI), roofX * 2, 0.085);
  canopyValance(frame(roofX, roofEave, 0, Math.PI / 2), roofZ * 2, 0.06);
  canopyValance(frame(-roofX, roofEave, 0, -Math.PI / 2), roofZ * 2, 0.06);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      rod(
        'gold',
        new THREE.Vector3(sx * roofX, roofEave, sz * roofZ),
        new THREE.Vector3(sx * roofX, 2.69, sz * roofZ),
        0.007,
        5,
      );
      floret('gold', 0.024, sx * roofX, 2.67, sz * roofZ, IDENTITY, 1.4);
    }
  }

  for (let i = 0; i < 27; i++) {
    const t = i / 26;
    const x = -1.42 + t * 2.84;
    const y = 2.72 - Math.sin(Math.PI * t) * 0.18;
    floret(
      i % 7 === 0 ? 'red-cloth' : 'saffron-cloth',
      0.027,
      x,
      y,
      cornerZ + 0.07,
      IDENTITY,
      1.05,
    );
  }

  cylinder('gold', 0.065, 0.04, 0, 3.447, 0, 12);
  blob('gold', 0.08, 0.035, 0.08, 0, 3.485, 0, IDENTITY, true);
  cone('gold', 0.038, 0.09, 0, 3.55, 0, 10);

  // Raised circular Bodhi platform.
  const TREE_Z = -8.2;
  const treeBase = frame(0, 0, TREE_Z);
  cylinder('granite', 5.34, 0.1, 0, 0.05, 0, 64, treeBase);
  cylinder('granite', 5.28, 0.34, 0, 0.27, 0, 64, treeBase);
  cylinder('sandstone', 5.26, 0.06, 0, 0.47, 0, 64, treeBase);

  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * TAU;
    const jointBase = radialFrame(angle, 5.284, TREE_Z);
    box('dark', 0.006, 0.22, 0.006, 0, 0.275, 0, 0, jointBase);
  }
  const bedJoint = new THREE.TorusGeometry(5.283, 0.003, 4, 56);
  put(bedJoint, 'dark', treeBase, 0, 0.275, 0, Math.PI / 2);
  bedJoint.dispose();

  // Grey flagstones surrounding an irregular low root bed, all below y=0.6.
  const pavingField = new THREE.RingGeometry(1.85, 5.1, 64, 1);
  put(pavingField, 'granite', treeBase, 0, 0.503, 0, -Math.PI / 2);
  pavingField.dispose();

  const mound = rootMoundGeometry();
  put(mound, 'sandstone', treeBase);
  mound.dispose();

  const rootOutline = (angle: number): number =>
    2.08 +
    0.09 * Math.sin(angle * 5 + 0.4) +
    0.05 * Math.cos(angle * 9 - 0.7);

  for (let i = 0; i < 40; i++) {
    const a0 = (i / 40) * TAU;
    const a1 = ((i + 1) / 40) * TAU;
    const r0 = rootOutline(a0);
    const r1 = rootOutline(a1);
    rod(
      'granite',
      new THREE.Vector3(Math.cos(a0) * r0, 0.52, Math.sin(a0) * r0),
      new THREE.Vector3(Math.cos(a1) * r1, 0.52, Math.sin(a1) * r1),
      0.018,
      6,
      treeBase,
    );
  }

  const pavingRadius = 5.08;
  for (let i = -4; i <= 4; i++) {
    const offset = i * 1.05;
    const half = Math.sqrt(pavingRadius * pavingRadius - offset * offset);
    rod(
      'dark',
      new THREE.Vector3(offset, 0.508, -half),
      new THREE.Vector3(offset, 0.508, half),
      0.0035,
      4,
      treeBase,
    );
    rod(
      'dark',
      new THREE.Vector3(-half, 0.508, offset),
      new THREE.Vector3(half, 0.508, offset),
      0.0035,
      4,
      treeBase,
    );
  }
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * TAU;
    rod(
      'dark',
      new THREE.Vector3(Math.cos(angle) * 4.35, 0.51, Math.sin(angle) * 4.35),
      new THREE.Vector3(Math.cos(angle) * 5.09, 0.51, Math.sin(angle) * 5.09),
      0.004,
      4,
      treeBase,
    );
  }

  function annularWall(
    inner: number,
    outer: number,
    bottom: number,
    top: number,
    material: MatName,
  ): void {
    const geometry = new THREE.LatheGeometry([
      new THREE.Vector2(inner, bottom),
      new THREE.Vector2(outer, bottom),
      new THREE.Vector2(outer, top),
      new THREE.Vector2(inner, top),
      new THREE.Vector2(inner, bottom),
    ], 48);
    put(geometry, material, treeBase);
    geometry.dispose();
  }

  annularWall(4.72, 5.18, 0.5, 0.78, 'granite');
  annularWall(4.68, 5.24, 0.78, 0.86, 'sandstone');

  function lantern(base: THREE.Matrix4, speaker: boolean): void {
    if (speaker) {
      box('dark', 0.21, 0.18, 0.13, 0, 2.61, 0.12, 0, base);
    }
    cylinder('dark', 0.035, 0.15, 0, 2.59, 0, 8, base);
    cylinder('dark', 0.07, 0.045, 0, 2.675, 0, 10, base);
    put(GLOBE, 'whitewash', base, 0, 2.84, 0, 0, 0, 0, 0.15, 0.165, 0.15);

    for (let meridian = 0; meridian < 4; meridian++) {
      const angle = (meridian / 4) * TAU;
      for (let j = 0; j < 4; j++) {
        const t0 = 0.22 + ((Math.PI - 0.44) * j) / 4;
        const t1 = 0.22 + ((Math.PI - 0.44) * (j + 1)) / 4;
        const pointAt = (t: number): THREE.Vector3 => new THREE.Vector3(
          0.156 * Math.sin(t) * Math.cos(angle),
          2.84 + 0.169 * Math.cos(t),
          0.156 * Math.sin(t) * Math.sin(angle),
        );
        rod('dark', pointAt(t0), pointAt(t1), 0.0065, 4, base);
      }
    }

    cylinder('dark', 0.06, 0.04, 0, 3.015, 0, 10, base);
    cone('dark', 0.082, 0.07, 0, 3.065, 0, 10, base);
    floret('brass', 0.021, 0, 3.11, 0, base, 1.25);
  }

  const bayCount = 18;
  const bayAngle = TAU / bayCount;
  const railingRadius = 4.94;
  const chordRadius = railingRadius * Math.cos(bayAngle / 2);
  const bayLength = 2 * railingRadius * Math.sin(bayAngle / 2);
  const lampIndices = [0, 1, 4, 7, 9, 12, 15];

  // Substantial pink piers, weathered gilding and stacked buff lotus-fan relief.
  for (let i = 0; i < bayCount; i++) {
    const centreAngle = Math.PI / 2 + i * bayAngle;
    const postAngle = centreAngle - bayAngle / 2;
    const base = radialFrame(postAngle, railingRadius, TREE_Z);

    box('pink-sandstone', 0.46, 0.12, 0.46, 0, 0.84, 0, 0, base);
    box('pink-sandstone', 0.4, 1.3, 0.4, 0, 1.55, 0, 0, base);
    box('sandstone', 0.45, 0.08, 0.45, 0, 2.2, 0, 0, base);
    box('pink-sandstone', 0.51, 0.12, 0.51, 0, 2.3, 0, 0, base);
    box('sandstone', 0.55, 0.07, 0.55, 0, 2.395, 0, 0, base);
    blob('pink-sandstone', 0.16, 0.08, 0.16, 0, 2.45, 0, base, true);

    put(
      patches[i % patches.length],
      'gold',
      base,
      0,
      1.47,
      0.204,
      0,
      0,
      0,
      0.4,
      1.24,
      1,
    );
    medallion(base, 0, 1.1, 0.213, 0.17, 'sandstone');
    fanCarving(base, 0, 1.42, 0.216, 0.14);
    medallion(base, 0, 1.68, 0.213, 0.165, 'sandstone');
    fanCarving(base, 0, 2.075, 0.216, 0.176);

    for (const x of [-0.17, 0.17]) {
      box('sandstone', 0.018, 1.12, 0.018, x, 1.48, 0.207, 0, base);
    }

    for (let flake = 0; flake < 7; flake++) {
      const x = (random() - 0.5) * 0.3;
      const y = 0.94 + random() * 1.12;
      put(
        PLANE,
        'gold',
        base,
        x,
        y,
        0.208,
        0,
        0,
        (random() - 0.5) * 0.6,
        0.018 + random() * 0.026,
        0.025 + random() * 0.045,
        1,
      );
    }

    if (lampIndices.includes(i)) {
      lantern(base, i === 0 || i === 9);
    }

    if (i === 0 || i === 1) {
      garland(base, 0, 0.255, 2.31, 1.06, 20);
      for (let j = 0; j < 11; j++) {
        const angle = (j / 11) * TAU;
        floret(
          j % 3 === 0 ? 'marble' : 'red-cloth',
          0.037,
          Math.sin(angle) * 0.1,
          2.22 + Math.cos(angle) * 0.075,
          0.26,
          base,
        );
      }
    }
  }

  // Five heavy pink stone bars per bay, with brass grilles recessed behind.
  for (let i = 0; i < bayCount; i++) {
    const angle = Math.PI / 2 + i * bayAngle;
    const base = radialFrame(angle, chordRadius, TREE_Z);
    const usable = bayLength - 0.38;
    const inscription = i === 1 || i === bayCount - 1;

    box('pink-sandstone', bayLength + 0.02, 0.18, 0.27, 0, 2.2, 0, 0, base);
    box('sandstone', bayLength + 0.035, 0.045, 0.3, 0, 2.3, 0, 0, base);
    box('pink-sandstone', bayLength, 0.09, 0.3, 0, 0.84, 0, 0, base);

    if (i !== 0) {
      const levels = inscription
        ? [0.99, 1.27]
        : [0.98, 1.235, 1.49, 1.745, 2.0];

      for (const y of levels) {
        rod(
          'pink-sandstone',
          new THREE.Vector3(-usable / 2, y, 0),
          new THREE.Vector3(usable / 2, y, 0),
          inscription ? 0.096 : 0.103,
          12,
          base,
        );
      }

      for (let j = 0; j < 5; j++) {
        const x = -usable / 2 + (j / 4) * usable;
        rod(
          j === 2 ? 'gold' : 'brass',
          new THREE.Vector3(x, 0.88, -0.125),
          new THREE.Vector3(x, 2.12, -0.125),
          0.0115,
          6,
          base,
        );
      }
      for (const y of [0.89, 1.29, 1.7, 2.11]) {
        rod(
          'brass',
          new THREE.Vector3(-usable / 2, y, -0.125),
          new THREE.Vector3(usable / 2, y, -0.125),
          y === 0.89 || y === 2.11 ? 0.018 : 0.011,
          6,
          base,
        );
      }

      if (inscription) {
        box('pink-sandstone', usable * 0.96, 0.5, 0.075, 0, 1.76, 0.04, 0, base);
        box('sandstone', usable * 0.96, 0.025, 0.02, 0, 2.015, 0.083, 0, base);
        box('sandstone', usable * 0.96, 0.025, 0.02, 0, 1.505, 0.083, 0, base);
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 6; col++) {
            const width = 0.052 + 0.023 * ((row + col * 2) % 3);
            const x = (col - 2.5) * usable * 0.135;
            const y = 1.935 - row * 0.066;
            box('dark', width, 0.008, 0.006, x, y, 0.081, 0, base);
          }
        }
      }
    } else {
      // Principal gate on the throne-to-tree axis.
      for (let j = 0; j < 12; j++) {
        const x = -usable / 2 + (j / 11) * usable;
        rod(
          j % 3 === 0 ? 'gold' : 'brass',
          new THREE.Vector3(x, 0.87, -0.025),
          new THREE.Vector3(x, 2.13, -0.025),
          0.012,
          6,
          base,
        );
      }
      for (const y of [0.88, 1.08, 1.36, 1.65, 1.91, 2.12]) {
        rod(
          'gold',
          new THREE.Vector3(-usable / 2, y, -0.02),
          new THREE.Vector3(usable / 2, y, -0.02),
          0.015,
          6,
          base,
        );
      }
      sunburst(base, 0, 1.48, 0.025, 0.37, 24);
      const arch = new THREE.TorusGeometry(0.34, 0.017, 5, 20, Math.PI);
      put(arch, 'gold', base, 0, 1.78, 0.025);
      arch.dispose();
      blob('gold', 0.043, 0.057, 0.033, 0, 2.105, 0.025, base);
    }
  }

  // Lotus and marigold offerings on the outer stone ledge.
  function ledgeLotus(
    base: THREE.Matrix4,
    x: number,
    z: number,
    radius: number,
    color: MatName,
  ): void {
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * TAU;
      put(
        PETAL,
        color,
        base,
        x + Math.sin(angle) * radius * 0.3,
        0.91,
        z + Math.cos(angle) * radius * 0.3,
        -Math.PI / 2 + 0.32,
        angle,
        0,
        radius * 0.42,
        radius * 0.9,
        radius * 0.5,
      );
    }
    floret('gold', radius * 0.18, x, 0.925, z, base, 0.7);
  }

  for (const bay of [0, 1, 17]) {
    const angle = Math.PI / 2 + bay * bayAngle;
    const base = radialFrame(angle, 5.02, TREE_Z);
    for (let j = 0; j < 3; j++) {
      const x = (j - 1) * 0.35;
      ledgeLotus(base, x, 0.06, 0.13, j === 1 ? 'red-cloth' : 'marble');
      for (let k = 0; k < 4; k++) {
        floret(
          'saffron-cloth',
          0.027,
          x + 0.13 + (random() - 0.5) * 0.07,
          0.895 + random() * 0.025,
          0.04 + (random() - 0.5) * 0.08,
          base,
          0.8,
        );
      }
    }
  }

  const gateBase = radialFrame(Math.PI / 2, 5.03, TREE_Z);
  put(vaseGeometry, 'whitewash', gateBase, 0, 0.865, 0.12, 0, 0, 0, 1.45, 1.45, 1.45);
  ledgeLotus(gateBase, 0, 0.12, 0.16, 'marble');

  // Irregular cotton swags concentrated along the side runs.
  const swagBays = [4, 5, 6, 7, 8, 10, 11, 12, 13];
  for (const i of swagBays) {
    const angle = Math.PI / 2 + i * bayAngle;
    const base = radialFrame(angle, chordRadius, TREE_Z);
    const phase = i * 0.63;
    const swag = gridGeometry(16, 4, (u, v) => {
      const x = (u - 0.5) * (bayLength + 0.04);
      const sag = 0.34 * Math.sin(Math.PI * u);
      const drop = 0.24 + 0.045 * Math.sin(u * TAU * 2 + phase);
      const y = 2.35 - sag - v * drop;
      const z = 0.2 + 0.035 * Math.sin(u * TAU * 5 + phase) * (0.3 + v * 0.7);
      return [x, y, z];
    });
    emitDouble(swag, 'saffron-cloth', base);
    swag.dispose();

    for (const side of [-1, 1]) {
      blob(
        'saffron-cloth',
        0.065,
        0.045,
        0.045,
        side * bayLength * 0.5,
        2.35,
        0.215,
        base,
      );
    }
  }

  // Long, billowing yellow hangings with irregular hems.
  for (const i of [5, 6, 11, 12]) {
    const angle = Math.PI / 2 + i * bayAngle;
    const base = radialFrame(angle, chordRadius, TREE_Z);
    const width = bayLength - 0.34;
    const hanging = gridGeometry(14, 7, (u, v) => {
      const x = (u - 0.5) * width;
      const hem =
        1.02 +
        0.13 * Math.sin(u * TAU * 1.5 + i) +
        0.08 * Math.pow(Math.abs(u - 0.5) * 2, 3);
      const y = 2.17 - v * hem - 0.07 * Math.sin(Math.PI * u);
      const z =
        0.13 +
        0.06 * Math.sin(u * TAU * 5 + i * 0.4) * (0.3 + 0.7 * v) +
        0.025 * Math.sin(v * Math.PI) * Math.sin(u * TAU * 2);
      return [x, y, z];
    });
    emitDouble(hanging, 'saffron-cloth', base);
    hanging.dispose();
  }

  // Dense U-shaped marigold loops on the exposed front-side stone bars.
  for (const i of [2, 3, 14, 15, 16]) {
    const angle = Math.PI / 2 + i * bayAngle;
    const base = radialFrame(angle, chordRadius, TREE_Z);
    for (const centre of [-0.41, 0, 0.41]) {
      rod(
        'brass',
        new THREE.Vector3(centre - 0.17, 1.94, 0.13),
        new THREE.Vector3(centre + 0.17, 1.94, 0.13),
        0.004,
        4,
        base,
      );
      for (let j = 0; j < 15; j++) {
        const t = j / 14;
        floret(
          (j + i) % 9 === 0 ? 'red-cloth' : 'saffron-cloth',
          0.038,
          centre + (t - 0.5) * 0.34,
          1.93 - Math.sin(Math.PI * t) * 0.48,
          0.14,
          base,
          1.05,
        );
      }
    }
  }

  const scarfBays = [0, 2, 6, 9, 12, 16];
  for (const i of scarfBays) {
    const angle = Math.PI / 2 + i * bayAngle;
    const base = radialFrame(angle, chordRadius, TREE_Z);
    const centre = i % 2 === 0 ? -0.3 : 0.3;
    const length = 0.78 + (i % 3) * 0.12;
    const scarf = gridGeometry(3, 9, (u, v) => [
      centre + (u - 0.5) * 0.15 * (1 - v * 0.15) + Math.sin(v * TAU + i) * 0.012,
      2.08 - v * length + (u - 0.5) * 0.045 * Math.pow(v, 5),
      0.12 + Math.sin(v * TAU * 1.4 + u * 1.7) * (0.014 + v * 0.012),
    ]);
    emitDouble(scarf, 'whitewash', base);
    scarf.dispose();
  }

  for (const [name, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat(name));
      mesh.name = name;
      mesh.castShadow = name !== 'dark';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    for (const geometry of geometries) geometry.dispose();
  }

  return group;
}
