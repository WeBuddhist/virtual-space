// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, vajrasana round 5); regenerate rather than hand-edit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './kit';
import type { MatName } from './kit';

type SurfacePoint = (u: number, v: number) => [number, number, number];

const TAU = Math.PI * 2;
const BOX = new THREE.BoxGeometry(1, 1, 1);
const ICO = new THREE.IcosahedronGeometry(1, 0);
const SPHERE = new THREE.SphereGeometry(1, 10, 6);
const GLOBE = new THREE.SphereGeometry(1, 12, 8);
const ROUNDEL_RING = new THREE.RingGeometry(0.78, 1, 16, 1);
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

const PETAL = petalGeometry();

function goldPatchGeometry(phase: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.38, -0.5);
  for (let j = 0; j <= 8; j++) {
    const y = -0.5 + j / 8;
    const x = 0.4 + 0.055 * Math.sin(j * 1.71 + phase);
    shape.lineTo(x, y);
  }
  for (let j = 8; j >= 0; j--) {
    const y = -0.5 + j / 8;
    const x = -0.4 + 0.05 * Math.sin(j * 1.37 + phase + 1.2);
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
    stone: MatName = 'pink-sandstone',
    metal: MatName = 'gold',
    petalCount = 8,
  ): void {
    put(
      unitCylinder(12),
      stone,
      base,
      x,
      y,
      z,
      Math.PI / 2,
      0,
      0,
      radius,
      0.018,
      radius,
    );
    put(
      ROUNDEL_RING,
      metal,
      base,
      x,
      y,
      z + 0.012,
      0,
      0,
      0,
      radius,
      radius,
      radius,
    );

    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * TAU;
      const px = x + Math.sin(angle) * radius * 0.44;
      const py = y + Math.cos(angle) * radius * 0.44;
      put(
        PETAL,
        stone,
        base,
        px,
        py,
        z + 0.022,
        0,
        0,
        -angle,
        radius * 0.52,
        radius * 0.7,
        radius * 0.65,
      );
    }
    blob(metal, radius * 0.18, radius * 0.18, radius * 0.1, x, y, z + 0.047, base);
  }

  function fanCarving(
    base: THREE.Matrix4,
    x: number,
    y: number,
    z: number,
    radius: number,
  ): void {
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI / 2 + (i / 6) * Math.PI;
      const px = x + Math.sin(angle) * radius * 0.48;
      const py = y + Math.cos(angle) * radius * 0.48;
      put(
        PETAL,
        'sandstone',
        base,
        px,
        py,
        z,
        0,
        0,
        -angle,
        radius * 0.47,
        radius * 0.72,
        radius * 0.7,
      );
    }
    blob('gold', radius * 0.15, radius * 0.11, radius * 0.08, x, y + 0.01, z + 0.025, base);
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
    put(
      unitCylinder(12),
      'gold',
      base,
      x,
      y,
      z + 0.008,
      Math.PI / 2,
      0,
      0,
      radius * 0.27,
      0.026,
      radius * 0.27,
    );
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * TAU;
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      rod(
        'gold',
        new THREE.Vector3(x + s * radius * 0.38, y + c * radius * 0.38, z + 0.02),
        new THREE.Vector3(x + s * radius * 0.76, y + c * radius * 0.76, z + 0.02),
        0.008,
        5,
        base,
      );
    }
    blob('brass', radius * 0.16, radius * 0.16, radius * 0.1, x, y, z + 0.037, base);
  }

  const patches = [goldPatchGeometry(0), goldPatchGeometry(1.8), goldPatchGeometry(3.5)];

  // Marble forecourt, kept below the pilgrim keep-clear volumes.
  box('marble', 4.7, 0.04, 4.84, 0, 0.02, -0.39);
  for (const z of [-2.4, -1.6, -0.8, 0, 0.8, 1.6]) {
    box('granite', 4.68, 0.003, 0.008, 0, 0.0415, z);
  }
  for (const x of [-1.56, -0.78, 0, 0.78, 1.56]) {
    box('granite', 0.008, 0.003, 4.82, x, 0.0415, -0.39);
  }
  box('red-cloth', 1.5, 0.008, 0.62, 0, 0.045, 1.66);

  // Stepped Vajrasana plinth and polished sandstone slab.
  box('granite', 2.86, 0.08, 1.86, 0, 0.04, 0);
  box('granite', 2.74, 0.07, 1.74, 0, 0.115, 0);
  box('sandstone', 2.5, 0.31, 1.54, 0, 0.305, 0);
  box('sandstone', 2.6, 0.05, 1.6, 0, 0.485, 0);
  box('sandstone', 2.62, 0.07, 1.62, 0, 0.545, 0);
  box('sandstone', 2.42, 0.02, 1.52, 0, 0.59, 0);
  box('sandstone', 2.3, 0.12, 1.4, 0, 0.66, 0);

  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.44;
    box('pink-sandstone', 0.32, 0.19, 0.012, x, 0.305, 0.776);
    box('sandstone', 0.37, 0.024, 0.026, x, 0.412, 0.79);
    box('sandstone', 0.37, 0.024, 0.026, x, 0.198, 0.79);
    box('sandstone', 0.024, 0.21, 0.026, x - 0.173, 0.305, 0.79);
    box('sandstone', 0.024, 0.21, 0.026, x + 0.173, 0.305, 0.79);
    medallion(IDENTITY, x, 0.305, 0.79, 0.065, 'sandstone', 'brass', 6);
  }

  for (const side of [-1, 1]) {
    const sideBase = frame(side * 1.25, 0, 0, side * Math.PI / 2);
    for (const offset of [-0.4, 0.4]) {
      box('pink-sandstone', 0.34, 0.19, 0.012, offset, 0.305, 0.006, 0, sideBase);
      medallion(sideBase, offset, 0.305, 0.018, 0.065, 'sandstone', 'brass', 6);
    }
  }

  for (let i = 0; i < 18; i++) {
    box('sandstone', 0.065, 0.045, 0.055, (i - 8.5) * 0.137, 0.485, 0.81);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      box('sandstone', 0.055, 0.045, 0.065, side * 1.31, 0.485, (i - 4.5) * 0.145);
    }
  }

  // Saffron throne cloth, hanging folds and woven gold borders.
  box('saffron-cloth', 2.34, 0.018, 1.44, 0, 0.728, 0);
  box('gold', 2.32, 0.012, 0.018, 0, 0.741, 0.711);
  box('gold', 2.32, 0.012, 0.018, 0, 0.741, -0.711);
  box('gold', 0.018, 0.012, 1.42, 1.161, 0.741, 0);
  box('gold', 0.018, 0.012, 1.42, -1.161, 0.741, 0);

  function clothDrape(base: THREE.Matrix4, length: number, drop: number): void {
    const depthAt = (u: number): number => drop + 0.022 * Math.sin(u * TAU * 3);
    const foldAt = (u: number, v: number): number =>
      0.09 * v + 0.016 * Math.sin(u * TAU * 7) * (0.25 + 0.75 * v);

    const cloth = gridGeometry(20, 6, (u, v) => [
      (u - 0.5) * length,
      -v * depthAt(u),
      foldAt(u, v),
    ]);
    emitDouble(cloth, 'saffron-cloth', base);

    const border = gridGeometry(20, 1, (u, v) => [
      (u - 0.5) * length,
      -depthAt(u) - v * 0.022,
      foldAt(u, 1) + 0.002,
    ]);
    emitDouble(border, 'gold', base);
  }

  clothDrape(frame(0, 0.739, 0.71), 2.32, 0.32);
  clothDrape(frame(0, 0.739, -0.71, Math.PI), 2.32, 0.22);
  clothDrape(frame(1.16, 0.739, 0, Math.PI / 2), 1.42, 0.24);
  clothDrape(frame(-1.16, 0.739, 0, -Math.PI / 2), 1.42, 0.24);

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
    for (let j = 0; j < 9; j++) {
      const angle = (j / 9) * TAU + random() * 0.3;
      const radius = 0.018 + random() * 0.058;
      const size = 0.024 + random() * 0.014;
      const flowerMaterial: MatName =
        (i + j) % 7 === 0 ? 'marble' : (i + j) % 5 === 0 ? 'red-cloth' : 'saffron-cloth';
      blob(
        flowerMaterial,
        size,
        size * 0.8,
        size,
        x + Math.sin(angle) * radius,
        0.825 + random() * 0.025,
        z + Math.cos(angle) * radius,
      );
    }
  }

  function lotusOffering(x: number, z: number, radius: number, color: MatName): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU;
      put(
        ICO,
        color,
        IDENTITY,
        x + Math.sin(angle) * radius * 0.38,
        0.78,
        z + Math.cos(angle) * radius * 0.38,
        0,
        angle,
        0,
        radius * 0.22,
        radius * 0.12,
        radius * 0.48,
      );
    }
    blob('gold', radius * 0.2, radius * 0.16, radius * 0.2, x, 0.795, z);
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

  // Offering table at the right, leaving the axial view of the throne open.
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

  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.23;
    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * TAU + random() * 0.25;
      const radius = 0.015 + random() * 0.06;
      const size = 0.025 + random() * 0.014;
      const color: MatName =
        (i + j) % 6 === 0 ? 'red-cloth' : (i + j) % 4 === 0 ? 'marble' : 'saffron-cloth';
      blob(
        color,
        size,
        size * 0.75,
        size,
        x + Math.sin(angle) * radius,
        0.785 + random() * 0.022,
        Math.cos(angle) * radius,
        tableBase,
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
          ICO,
          j === 1 ? 'red-cloth' : 'marble',
          tableBase,
          x + dx + Math.sin(angle) * 0.025,
          flowerY,
          -0.1 + Math.cos(angle) * 0.025,
          0,
          angle,
          0,
          0.018,
          0.014,
          0.042,
        );
      }
      blob('gold', 0.015, 0.012, 0.015, x + dx, flowerY + 0.01, -0.1, tableBase);
    }
  }

  // Low flower chest opposite the table.
  const chestBase = frame(-0.88, 0, 1.45);
  box('marble', 1.44, 0.12, 0.64, 0, 0.06, 0, 0, chestBase);
  box('wood', 1.34, 0.38, 0.56, 0, 0.29, 0, 0, chestBase);
  box('wood', 1.4, 0.045, 0.62, 0, 0.495, 0, 0, chestBase);
  box('dark', 1.25, 0.02, 0.47, 0, 0.523, 0, 0, chestBase);
  box('brass', 0.055, 0.09, 0.016, 0, 0.31, 0.288, 0, chestBase);
  for (const x of [-0.57, 0.57]) {
    box('brass', 0.025, 0.32, 0.015, x, 0.3, 0.288, 0, chestBase);
  }
  for (let i = 0; i < 42; i++) {
    const x = (random() - 0.5) * 1.16;
    const z = (random() - 0.5) * 0.4;
    const size = 0.045 + random() * 0.025;
    const color: MatName =
      i % 5 === 0 ? 'red-cloth' : i % 3 === 0 ? 'marble' : 'saffron-cloth';
    blob(
      color,
      size,
      size * 0.72,
      size,
      x,
      0.56 + random() * 0.06,
      z,
      chestBase,
    );
  }

  // Close gilded screens around the throne, rising well above the offering slab.
  const cornerX = 1.57;
  const cornerZ = 1.07;

  function thronePanel(base: THREE.Matrix4, length: number, count: number, gate: boolean): void {
    rod(
      'gold',
      new THREE.Vector3(-length / 2, 0.23, 0),
      new THREE.Vector3(length / 2, 0.23, 0),
      0.032,
      8,
      base,
    );
    rod(
      'gold',
      new THREE.Vector3(-length / 2, 1.95, 0),
      new THREE.Vector3(length / 2, 1.95, 0),
      0.035,
      8,
      base,
    );
    rod(
      'brass',
      new THREE.Vector3(-length / 2, 1.03, 0),
      new THREE.Vector3(length / 2, 1.03, 0),
      0.019,
      6,
      base,
    );
    rod(
      'brass',
      new THREE.Vector3(-length / 2, 1.67, 0),
      new THREE.Vector3(length / 2, 1.67, 0),
      0.014,
      6,
      base,
    );

    for (let i = 0; i < count; i++) {
      const x = -length / 2 + (i / (count - 1)) * length;
      rod(
        i % 3 === 0 ? 'gold' : 'brass',
        new THREE.Vector3(x, 0.25, 0),
        new THREE.Vector3(x, 1.94, 0),
        0.015,
        6,
        base,
      );
      if (i % 2 === 0) blob('gold', 0.022, 0.028, 0.022, x, 1.975, 0, base);
    }

    if (gate) {
      sunburst(base, 0, 1.27, 0.04, 0.34, 20);
      const arch = new THREE.TorusGeometry(0.42, 0.02, 5, 24, Math.PI);
      put(arch, 'gold', base, 0, 1.55, 0.038);
      rod(
        'gold',
        new THREE.Vector3(-0.42, 1.02, 0.038),
        new THREE.Vector3(-0.42, 1.55, 0.038),
        0.018,
        6,
        base,
      );
      rod(
        'gold',
        new THREE.Vector3(0.42, 1.02, 0.038),
        new THREE.Vector3(0.42, 1.55, 0.038),
        0.018,
        6,
        base,
      );
      blob('gold', 0.045, 0.06, 0.035, 0, 1.995, 0.038, base);
    }
  }

  thronePanel(frame(0, 0, cornerZ), 2.94, 17, true);
  thronePanel(frame(0, 0, -cornerZ, Math.PI), 2.94, 17, false);
  thronePanel(frame(cornerX, 0, 0, Math.PI / 2), 1.94, 11, false);
  thronePanel(frame(-cornerX, 0, 0, -Math.PI / 2), 1.94, 11, false);

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
      0.006,
      4,
      base,
    );
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const material: MatName = i % 5 === 0 ? 'red-cloth' : 'saffron-cloth';
      blob(
        material,
        0.024,
        0.026,
        0.024,
        x + Math.sin(t * TAU * 1.4) * 0.018,
        top + (bottom - top) * t,
        z,
        base,
      );
    }
  }

  // Tall gold-leafed canopy piers with carved lotus capitals.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * cornerX;
      const z = sz * cornerZ;
      box('granite', 0.34, 0.12, 0.34, x, 0.12, z);
      box('pink-sandstone', 0.28, 0.12, 0.28, x, 0.22, z);
      box('pink-sandstone', 0.26, 2.42, 0.26, x, 1.49, z);
      box('gold', 0.3, 0.1, 0.3, x, 2.73, z);
      box('gold', 0.38, 0.08, 0.38, x, 2.82, z);
      box('gold', 0.44, 0.08, 0.44, x, 2.9, z);

      for (const dx of [-0.105, 0.105]) {
        for (const dz of [-0.105, 0.105]) {
          rod(
            'gold',
            new THREE.Vector3(x + dx, 0.42, z + dz),
            new THREE.Vector3(x + dx, 2.58, z + dz),
            0.012,
            6,
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
          1.47,
          0.134,
          0,
          0,
          0,
          0.26,
          1.82,
          1,
        );
        medallion(faceBase, 0, 0.9, 0.142, 0.096, 'sandstone');
        medallion(faceBase, 0, 1.95, 0.142, 0.096, 'sandstone');
        fanCarving(faceBase, 0, 2.52, 0.145, 0.105);
      }

      if (sz > 0) garland(frame(x, 0, z), 0, 0.15, 2.52, 1.42, 14);
    }
  }

  const khata = gridGeometry(3, 10, (u, v) => [
    -0.87 + (u - 0.5) * 0.13 + Math.sin(v * TAU) * 0.012,
    1.42 - v * 0.58,
    cornerZ + 0.055 + Math.sin(v * TAU * 1.5 + u) * 0.015,
  ]);
  emitDouble(khata, 'whitewash');

  // A small, irregular bundle of offered scarves over the right side of the gate.
  for (let i = 0; i < 5; i++) {
    const x = 0.43 + i * 0.17;
    const top = 1.97 - (i % 2) * 0.035;
    const length = 0.5 + (i % 3) * 0.09;
    const width = 0.1 + (i % 2) * 0.025;
    const material: MatName =
      i === 1 ? 'saffron-cloth' : i === 4 ? 'red-cloth' : 'whitewash';
    const scarf = gridGeometry(2, 8, (u, v) => [
      x + (u - 0.5) * width + Math.sin(v * TAU + i) * 0.008,
      top - v * length,
      cornerZ + 0.065 + Math.sin(v * TAU * 1.3 + u + i) * 0.014,
    ]);
    emitDouble(scarf, material);

    const hem = gridGeometry(2, 1, (u, v) => [
      x + (u - 0.5) * width + Math.sin(TAU + i) * 0.008,
      top - length - v * 0.018,
      cornerZ + 0.065 + Math.sin(TAU * 1.3 + u + i) * 0.014,
    ]);
    emitDouble(hem, 'gold');
  }

  // Canopy beams and softly sagging hipped cloth roof.
  const beamY = 2.94;
  rod('gold', new THREE.Vector3(-cornerX, beamY, cornerZ), new THREE.Vector3(cornerX, beamY, cornerZ), 0.045, 8);
  rod('gold', new THREE.Vector3(-cornerX, beamY, -cornerZ), new THREE.Vector3(cornerX, beamY, -cornerZ), 0.045, 8);
  rod('gold', new THREE.Vector3(cornerX, beamY, -cornerZ), new THREE.Vector3(cornerX, beamY, cornerZ), 0.045, 8);
  rod('gold', new THREE.Vector3(-cornerX, beamY, -cornerZ), new THREE.Vector3(-cornerX, beamY, cornerZ), 0.045, 8);

  const roofX = 2.15;
  const roofZ = 1.78;
  const roofEave = 3.0;
  const roofRidge = 3.44;
  const roof = gridGeometry(24, 18, (u, v) => {
    const x = (u * 2 - 1) * roofX;
    const z = (v * 2 - 1) * roofZ;
    const r = Math.max(Math.abs(x) / roofX, Math.abs(z) / roofZ);
    const y =
      roofEave +
      (roofRidge - roofEave) * (1 - r) -
      0.055 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * r +
      0.022 * Math.sin((u - v) * Math.PI * 8) * r * (1 - r);
    return [x, y, z];
  });
  emitDouble(roof, 'saffron-cloth');

  const roofCorners = [
    new THREE.Vector3(-roofX, roofEave, -roofZ),
    new THREE.Vector3(roofX, roofEave, -roofZ),
    new THREE.Vector3(roofX, roofEave, roofZ),
    new THREE.Vector3(-roofX, roofEave, roofZ),
  ];
  for (let i = 0; i < 4; i++) {
    rod('gold', roofCorners[i], roofCorners[(i + 1) % 4], 0.018, 8);
    rod('gold', roofCorners[i], new THREE.Vector3(0, roofRidge, 0), 0.012, 6);
  }

  const roofMidEdges = [
    new THREE.Vector3(0, roofEave, -roofZ),
    new THREE.Vector3(roofX, roofEave, 0),
    new THREE.Vector3(0, roofEave, roofZ),
    new THREE.Vector3(-roofX, roofEave, 0),
  ];
  for (const edge of roofMidEdges) {
    rod('gold', edge, new THREE.Vector3(0, roofRidge, 0), 0.008, 5);
  }

  function canopyValance(base: THREE.Matrix4, length: number): void {
    const folds = Math.max(4, Math.round(length / 0.42));
    const dropAt = (u: number): number => {
      const scallop = 0.5 + 0.5 * Math.cos(u * TAU * 4);
      return 0.19 + 0.075 * scallop;
    };
    const foldAt = (u: number, v: number): number =>
      0.028 * Math.sin(u * TAU * folds) * (0.4 + 0.6 * v) +
      0.012 * Math.sin(Math.PI * v);

    const valance = gridGeometry(24, 4, (u, v) => [
      (u - 0.5) * length,
      -v * dropAt(u),
      foldAt(u, v),
    ]);
    emitDouble(valance, 'saffron-cloth', base);

    const border = gridGeometry(24, 1, (u, v) => [
      (u - 0.5) * length,
      -dropAt(u) - v * 0.024,
      foldAt(u, 1) + 0.002,
    ]);
    emitDouble(border, 'gold', base);
  }

  canopyValance(frame(0, roofEave, roofZ), roofX * 2);
  canopyValance(frame(0, roofEave, -roofZ, Math.PI), roofX * 2);
  canopyValance(frame(roofX, roofEave, 0, Math.PI / 2), roofZ * 2);
  canopyValance(frame(-roofX, roofEave, 0, -Math.PI / 2), roofZ * 2);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      rod(
        'gold',
        new THREE.Vector3(sx * roofX, roofEave, sz * roofZ),
        new THREE.Vector3(sx * roofX, 2.73, sz * roofZ),
        0.008,
        6,
      );
      blob('gold', 0.025, 0.035, 0.025, sx * roofX, 2.71, sz * roofZ);
    }
  }

  for (let i = 0; i < 23; i++) {
    const t = i / 22;
    const x = -1.45 + t * 2.9;
    const y = 2.69 - Math.sin(Math.PI * t) * 0.16;
    blob(
      i % 6 === 0 ? 'red-cloth' : 'saffron-cloth',
      0.026,
      0.028,
      0.026,
      x,
      y,
      cornerZ + 0.06,
    );
  }

  cylinder('gold', 0.07, 0.05, 0, 3.465, 0, 12);
  blob('gold', 0.085, 0.04, 0.085, 0, 3.51, 0, IDENTITY, true);
  cone('gold', 0.04, 0.08, 0, 3.56, 0, 10);

  // Raised circular Bodhi platform with vertical grey masonry.
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
  const bedJoint = new THREE.TorusGeometry(5.283, 0.003, 4, 64);
  put(bedJoint, 'dark', treeBase, 0, 0.275, 0, Math.PI / 2);

  // Low stone setting for the supplied roots; all of it remains below y=0.6.
  cylinder('sandstone', 1.55, 0.035, 0, 0.505, 0, 48, treeBase);
  const rootKerb = new THREE.TorusGeometry(1.55, 0.025, 4, 48);
  put(rootKerb, 'granite', treeBase, 0, 0.528, 0, Math.PI / 2);

  // Rectangular flagstone joints, clipped to the circular platform.
  const pavingRadius = 5.08;
  for (let i = -4; i <= 4; i++) {
    const offset = i * 1.05;
    const half = Math.sqrt(pavingRadius * pavingRadius - offset * offset);
    rod(
      'granite',
      new THREE.Vector3(offset, 0.506, -half),
      new THREE.Vector3(offset, 0.506, half),
      0.004,
      4,
      treeBase,
    );
    rod(
      'granite',
      new THREE.Vector3(-half, 0.506, offset),
      new THREE.Vector3(half, 0.506, offset),
      0.004,
      4,
      treeBase,
    );
  }
  const outerPavingJoint = new THREE.TorusGeometry(5.06, 0.007, 4, 48);
  put(outerPavingJoint, 'granite', treeBase, 0, 0.507, 0, Math.PI / 2);

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
  }

  annularWall(4.72, 5.18, 0.5, 0.78, 'granite');
  annularWall(4.68, 5.24, 0.78, 0.86, 'sandstone');

  function lantern(base: THREE.Matrix4, speaker: boolean): void {
    if (speaker) {
      box('dark', 0.2, 0.18, 0.12, 0, 2.57, 0.12, 0, base);
    }
    cylinder('brass', 0.036, 0.16, 0, 2.57, 0, 8, base);
    cylinder('dark', 0.07, 0.045, 0, 2.66, 0, 10, base);
    put(GLOBE, 'whitewash', base, 0, 2.83, 0, 0, 0, 0, 0.15, 0.165, 0.15);

    for (let meridian = 0; meridian < 4; meridian++) {
      const angle = (meridian / 4) * TAU;
      for (let j = 0; j < 5; j++) {
        const t0 = 0.22 + ((Math.PI - 0.44) * j) / 5;
        const t1 = 0.22 + ((Math.PI - 0.44) * (j + 1)) / 5;
        const pointAt = (t: number): THREE.Vector3 => new THREE.Vector3(
          0.156 * Math.sin(t) * Math.cos(angle),
          2.83 + 0.169 * Math.cos(t),
          0.156 * Math.sin(t) * Math.sin(angle),
        );
        rod('dark', pointAt(t0), pointAt(t1), 0.0065, 4, base);
      }
    }

    cylinder('dark', 0.06, 0.04, 0, 3.005, 0, 10, base);
    cone('dark', 0.082, 0.07, 0, 3.055, 0, 10, base);
    blob('gold', 0.022, 0.026, 0.022, 0, 3.102, 0, base);
  }

  const bayCount = 20;
  const bayAngle = TAU / bayCount;
  const railingRadius = 4.94;
  const chordRadius = railingRadius * Math.cos(bayAngle / 2);
  const bayLength = 2 * railingRadius * Math.sin(bayAngle / 2);

  // Pink piers, worn gilding, stacked buff lotus relief and fan-shaped capitals.
  for (let i = 0; i < bayCount; i++) {
    const centreAngle = Math.PI / 2 + i * bayAngle;
    const postAngle = centreAngle - bayAngle / 2;
    const base = radialFrame(postAngle, railingRadius, TREE_Z);

    box('pink-sandstone', 0.44, 0.14, 0.44, 0, 0.85, 0, 0, base);
    box('pink-sandstone', 0.38, 1.31, 0.38, 0, 1.555, 0, 0, base);
    box('sandstone', 0.44, 0.08, 0.44, 0, 2.2, 0, 0, base);
    box('pink-sandstone', 0.5, 0.12, 0.5, 0, 2.28, 0, 0, base);
    box('sandstone', 0.56, 0.08, 0.56, 0, 2.38, 0, 0, base);
    blob('pink-sandstone', 0.17, 0.1, 0.17, 0, 2.44, 0, base, true);

    put(
      patches[i % patches.length],
      'gold',
      base,
      0,
      1.46,
      0.194,
      0,
      0,
      0,
      0.38,
      1.28,
      1,
    );
    medallion(base, 0, 1.12, 0.202, 0.17, 'sandstone');
    fanCarving(base, 0, 1.42, 0.205, 0.13);
    medallion(base, 0, 1.68, 0.202, 0.16, 'sandstone');
    fanCarving(base, 0, 2.075, 0.205, 0.17);

    for (let flake = 0; flake < 3; flake++) {
      const x = (random() - 0.5) * 0.29;
      const y = 0.94 + random() * 1.12;
      blob(
        'gold',
        0.015 + random() * 0.018,
        0.025 + random() * 0.035,
        0.004,
        x,
        y,
        0.196,
        base,
      );
    }

    if (i % 4 === 0 || i === 1 || i === 6 || i === 14) {
      lantern(base, i === 0 || i === 8 || i === 16);
    } else {
      blob('gold', 0.035, 0.045, 0.035, 0, 2.56, 0, base);
    }

    if (i === 0 || i === 1) garland(base, 0, 0.24, 2.3, 1.34, 14);
  }

  // Chordal bays with heavy rounded stone bars and dense gilded grilles.
  for (let i = 0; i < bayCount; i++) {
    const angle = Math.PI / 2 + i * bayAngle;
    const base = radialFrame(angle, chordRadius, TREE_Z);
    const usable = bayLength - 0.38;
    const inscription = i === 1 || i === bayCount - 1;

    box('sandstone', bayLength + 0.02, 0.18, 0.26, 0, 2.2, 0, 0, base);
    box('sandstone', bayLength, 0.08, 0.3, 0, 0.84, 0, 0, base);

    if (i !== 0) {
      const levels = inscription ? [0.99, 1.32] : [0.99, 1.32, 1.65, 1.98];
      const barMaterial: MatName = i % 4 === 0 ? 'sandstone' : 'pink-sandstone';
      for (const y of levels) {
        rod(
          barMaterial,
          new THREE.Vector3(-usable / 2, y, 0),
          new THREE.Vector3(usable / 2, y, 0),
          0.095,
          12,
          base,
        );
      }

      for (let j = 0; j < 9; j++) {
        const x = -usable / 2 + (j / 8) * usable;
        rod(
          j % 3 === 0 ? 'brass' : 'gold',
          new THREE.Vector3(x, 0.88, -0.08),
          new THREE.Vector3(x, 2.12, -0.08),
          0.0155,
          6,
          base,
        );
      }
      for (const y of [0.89, 1.2, 1.53, 1.86, 2.11]) {
        rod(
          y === 0.89 || y === 2.11 ? 'gold' : 'brass',
          new THREE.Vector3(-usable / 2, y, -0.08),
          new THREE.Vector3(usable / 2, y, -0.08),
          y === 0.89 || y === 2.11 ? 0.022 : 0.015,
          y === 0.89 || y === 2.11 ? 8 : 6,
          base,
        );
      }

      if (inscription) {
        box('pink-sandstone', usable * 0.94, 0.48, 0.075, 0, 1.78, 0.035, 0, base);
        box('sandstone', usable * 0.94, 0.025, 0.02, 0, 2.025, 0.078, 0, base);
        box('sandstone', usable * 0.94, 0.025, 0.02, 0, 1.535, 0.078, 0, base);
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 5; col++) {
            const width = 0.065 + 0.025 * ((row + col * 2) % 3);
            const x = (col - 2) * usable * 0.16;
            const y = 1.92 - row * 0.07;
            box('dark', width, 0.009, 0.006, x, y, 0.076, 0, base);
          }
        }
      }
    } else {
      // Principal gate on the throne-to-tree axis.
      for (let j = 0; j < 11; j++) {
        const x = -usable / 2 + (j / 10) * usable;
        rod(
          j % 2 === 0 ? 'gold' : 'brass',
          new THREE.Vector3(x, 0.87, -0.025),
          new THREE.Vector3(x, 2.13, -0.025),
          0.014,
          6,
          base,
        );
      }
      for (const y of [0.88, 1.1, 1.36, 1.64, 1.9, 2.12]) {
        rod(
          'gold',
          new THREE.Vector3(-usable / 2, y, -0.02),
          new THREE.Vector3(usable / 2, y, -0.02),
          0.017,
          6,
          base,
        );
      }
      sunburst(base, 0, 1.48, 0.025, 0.34, 20);
      const arch = new THREE.TorusGeometry(0.32, 0.018, 5, 24, Math.PI);
      put(arch, 'gold', base, 0, 1.76, 0.025);
      blob('gold', 0.045, 0.06, 0.035, 0, 2.105, 0.025, base);
    }
  }

  // Uneven groups of cotton swags.
  const swagBays = [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 19];
  for (const i of swagBays) {
    const angle = Math.PI / 2 + i * bayAngle;
    const base = radialFrame(angle, chordRadius, TREE_Z);
    const phase = i * 0.63;
    const swag = gridGeometry(16, 3, (u, v) => {
      const x = (u - 0.5) * (bayLength + 0.04);
      const sag = 0.28 * Math.sin(Math.PI * u);
      const drop = 0.24 + 0.035 * Math.sin(u * TAU * 2 + phase);
      const y = 2.34 - sag - v * drop;
      const z = 0.2 + 0.024 * Math.sin(u * TAU * 5 + phase) * (0.35 + v * 0.65);
      return [x, y, z];
    });
    emitDouble(swag, 'saffron-cloth', base);

    for (const side of [-1, 1]) {
      blob(
        'saffron-cloth',
        0.06,
        0.045,
        0.04,
        side * bayLength * 0.5,
        2.34,
        0.215,
        base,
      );
    }
  }

  // Long, irregular yellow hangings almost reaching the railing plinth.
  for (const i of [5, 6, 12, 13]) {
    const angle = Math.PI / 2 + i * bayAngle;
    const base = radialFrame(angle, chordRadius, TREE_Z);
    const width = bayLength - 0.38;
    const hanging = gridGeometry(12, 6, (u, v) => {
      const x = (u - 0.5) * width;
      const hem = 1.02 + 0.12 * Math.sin(u * TAU * 1.5 + i);
      const y = 2.16 - v * hem - 0.06 * Math.sin(Math.PI * u);
      const z = 0.12 + 0.04 * Math.sin(u * TAU * 5 + i * 0.4) * (0.35 + 0.65 * v);
      return [x, y, z];
    });
    emitDouble(hanging, 'saffron-cloth', base);
  }

  // Thick U-shaped loops of marigolds against the exposed stone bars.
  for (const i of [2, 3, 18, 19]) {
    const angle = Math.PI / 2 + i * bayAngle;
    const base = radialFrame(angle, chordRadius, TREE_Z);
    for (const centre of [-0.28, 0.28]) {
      rod(
        'brass',
        new THREE.Vector3(centre - 0.2, 1.88, 0.12),
        new THREE.Vector3(centre + 0.2, 1.88, 0.12),
        0.005,
        4,
        base,
      );
      for (let j = 0; j < 13; j++) {
        const t = j / 12;
        blob(
          (j + i) % 7 === 0 ? 'red-cloth' : 'saffron-cloth',
          0.038,
          0.04,
          0.034,
          centre + (t - 0.5) * 0.4,
          1.87 - Math.sin(Math.PI * t) * 0.4,
          0.13,
          base,
        );
      }
    }
  }

  const scarfBays = [0, 2, 6, 9, 12, 16, 18];
  for (const i of scarfBays) {
    const angle = Math.PI / 2 + i * bayAngle;
    const base = radialFrame(angle, chordRadius, TREE_Z);
    const centre = i % 2 === 0 ? -0.3 : 0.3;
    const length = 0.78 + (i % 3) * 0.12;
    const scarf = gridGeometry(3, 10, (u, v) => [
      centre + (u - 0.5) * 0.15 + Math.sin(v * TAU + i) * 0.012,
      2.08 - v * length,
      0.11 + Math.sin(v * TAU * 1.4 + u * 1.7) * 0.018,
    ]);
    emitDouble(scarf, 'whitewash', base);
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
