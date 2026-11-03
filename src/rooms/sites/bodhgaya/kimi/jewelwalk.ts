// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, jewelwalk round 3); regenerate rather than hand-edit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './kit';

const TOP_Y = 0.95;
const LOTUS_COUNT = 18;
const LOTUS_SPACING = 0.88;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(parts, false);
  if (!geometry) throw new Error('Unable to merge Jewel Walk geometry');
  return geometry;
}

/** Sweep the moulded cross-section through one individual ashlar slab. */
function sweptSlab(profile: THREE.Vector2[], x0: number, x1: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const vertex = (x: number, y: number, z: number, u: number, v: number): number => {
    const index = positions.length / 3;
    positions.push(x, y, z);
    uvs.push(u, v);
    return index;
  };

  for (let i = 0; i < profile.length; i++) {
    const a = profile[i];
    const b = profile[(i + 1) % profile.length];
    const useZForV = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
    const av = (useZForV ? a.x : a.y) / 1.2;
    const bv = (useZForV ? b.x : b.y) / 1.2;

    const a0 = vertex(x0, a.y, a.x, x0 / 1.6, av);
    const a1 = vertex(x1, a.y, a.x, x1 / 1.6, av);
    const b1 = vertex(x1, b.y, b.x, x1 / 1.6, bv);
    const b0 = vertex(x0, b.y, b.x, x0 / 1.6, bv);
    indices.push(a0, a1, b1, a0, b1, b0);
  }

  const contour = profile.map((p) => new THREE.Vector2(p.x, p.y));
  const capFaces = THREE.ShapeUtils.triangulateShape(contour, []);

  const addCap = (x: number, negativeX: boolean): void => {
    const first = positions.length / 3;
    for (const p of profile) {
      vertex(x, p.y, p.x, p.x / 1.1 + 0.5, p.y);
    }

    for (const face of capFaces) {
      let ia = face[0];
      let ib = face[1];
      const ic = face[2];
      const a = profile[ia];
      const b = profile[ib];
      const c = profile[ic];
      const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

      if ((negativeX && area < 0) || (!negativeX && area > 0)) {
        const swap = ia;
        ia = ib;
        ib = swap;
      }
      indices.push(first + ia, first + ib, first + ic);
    }
  };

  addCap(x0, true);
  addCap(x1, false);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function platformGeometry(): THREE.BufferGeometry {
  // A restrained splayed foot, tall plain dado and one heavy rounded coping.
  const profile = [
    [-0.500, 0.000],
    [0.500, 0.000],
    [0.540, 0.015],
    [0.550, 0.040],
    [0.550, 0.060],
    [0.530, 0.083],
    [0.500, 0.103],
    [0.485, 0.120],
    [0.485, 0.705],
    [0.498, 0.722],
    [0.520, 0.737],
    [0.538, 0.755],
    [0.550, 0.782],
    [0.550, 0.835],
    [0.544, 0.868],
    [0.528, 0.898],
    [0.505, 0.923],
    [0.478, 0.941],
    [0.450, 0.950],
    [-0.450, 0.950],
    [-0.478, 0.941],
    [-0.505, 0.923],
    [-0.528, 0.898],
    [-0.544, 0.868],
    [-0.550, 0.835],
    [-0.550, 0.782],
    [-0.538, 0.755],
    [-0.520, 0.737],
    [-0.498, 0.722],
    [-0.485, 0.705],
    [-0.485, 0.120],
    [-0.500, 0.103],
    [-0.530, 0.083],
    [-0.550, 0.060],
    [-0.550, 0.040],
    [-0.540, 0.015],
  ].map(([z, y]) => new THREE.Vector2(z, y));

  const parts: THREE.BufferGeometry[] = [];

  // Recessed masonry behind the joints keeps them narrow and shadowed.
  parts.push(new THREE.BoxGeometry(15.98, 0.88, 0.94).translate(0, 0.47, 0));

  const slabCount = 12;
  const slabLength = 16 / slabCount;
  for (let i = 0; i < slabCount; i++) {
    const a = -8 + i * slabLength;
    const b = a + slabLength;
    const x0 = a + (i === 0 ? 0 : 0.003);
    const x1 = b - (i === slabCount - 1 ? 0 : 0.003);
    parts.push(sweptSlab(profile, x0, x1));
  }

  return merge(parts);
}

/**
 * A broad petal carved into the top of the drum. Its edges and pointed ends
 * return to the stone surface; the five transverse columns form a soft crown.
 */
function carvedPetalGeometry(
  length: number,
  width: number,
  height: number,
  baseY: number,
  ts: number[],
  widthProfile: number[],
  heightProfile: number[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const across = [-1, -0.52, 0, 0.52, 1];
  const crown = [0, 0.86, 1, 0.86, 0];

  for (let r = 0; r < ts.length; r++) {
    const t = ts[r];
    const halfWidth = width * widthProfile[r];
    const z = length * t;
    const relief = height * heightProfile[r];

    for (let c = 0; c < across.length; c++) {
      positions.push(
        halfWidth * across[c],
        baseY + 0.0002 + relief * crown[c],
        z,
      );
      uvs.push(across[c] * 0.5 + 0.5, t);
    }
  }

  for (let r = 0; r < ts.length - 1; r++) {
    for (let c = 0; c < across.length - 1; c++) {
      const a = r * across.length + c;
      const b = a + 1;
      const d = (r + 1) * across.length + c;
      const e = d + 1;
      indices.push(a, d, e, a, e, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Shallow central receptacle with eighteen radiating carved flutes. */
function flutedBossGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const segments = 36;
  const rings = [
    { y: 0.108, radius: 0.088, flute: 0.000 },
    { y: 0.121, radius: 0.096, flute: 0.011 },
    { y: 0.140, radius: 0.092, flute: 0.009 },
    { y: 0.148, radius: 0.080, flute: 0.001 },
  ];

  for (let j = 0; j < rings.length; j++) {
    const ring = rings[j];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const radius = ring.radius + (i % 2 === 0 ? ring.flute : 0);
      positions.push(Math.cos(angle) * radius, ring.y, Math.sin(angle) * radius);
      uvs.push(i / segments, j / (rings.length - 1));
    }
  }

  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const a = j * segments + i;
      const b = j * segments + next;
      const c = (j + 1) * segments + next;
      const d = (j + 1) * segments + i;
      indices.push(a, d, c, a, c, b);
    }
  }

  const topStart = (rings.length - 1) * segments;
  const centre = positions.length / 3;
  positions.push(0, rings[rings.length - 1].y, 0);
  uvs.push(0.5, 0.5);

  for (let i = 0; i < segments; i++) {
    indices.push(centre, topStart + ((i + 1) % segments), topStart + i);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function lotusGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Both petal rings now share one low carved field. The shallow circular
  // incision at r=.212 separates them without hiding the outer petals.
  const drumProfile = [
    new THREE.Vector2(0.000, 0.000),
    new THREE.Vector2(0.290, 0.000),
    new THREE.Vector2(0.326, 0.008),
    new THREE.Vector2(0.345, 0.025),
    new THREE.Vector2(0.350, 0.050),
    new THREE.Vector2(0.350, 0.078),
    new THREE.Vector2(0.337, 0.094),
    new THREE.Vector2(0.322, 0.102),
    new THREE.Vector2(0.218, 0.102),
    new THREE.Vector2(0.212, 0.098),
    new THREE.Vector2(0.205, 0.102),
    new THREE.Vector2(0.000, 0.102),
  ];
  parts.push(new THREE.LatheGeometry(drumProfile, 32));

  const outer = carvedPetalGeometry(
    0.128,
    0.044,
    0.030,
    0.102,
    [0, 0.18, 0.42, 0.68, 0.88, 1],
    [0.18, 0.62, 1.00, 0.86, 0.45, 0.012],
    [0, 0.55, 1.00, 0.82, 0.38, 0],
  );

  for (let i = 0; i < 16; i++) {
    const petal = outer.clone();
    petal.translate(0, 0, 0.210);
    petal.rotateY((i / 16) * Math.PI * 2);
    parts.push(petal);
  }

  const inner = carvedPetalGeometry(
    0.150,
    0.034,
    0.036,
    0.102,
    [0, 0.22, 0.52, 0.80, 1],
    [0.20, 0.72, 1.00, 0.62, 0.012],
    [0, 0.55, 1.00, 0.70, 0],
  );

  for (let i = 0; i < 12; i++) {
    const petal = inner.clone();
    petal.translate(0, 0, 0.062);
    petal.rotateY((i / 12) * Math.PI * 2 + Math.PI / 16);
    parts.push(petal);
  }

  parts.push(flutedBossGeometry());

  const geometry = merge(parts);
  geometry.computeBoundingSphere();
  return geometry;
}

function flakeGeometry(
  cx: number,
  cz: number,
  y: number,
  rx: number,
  rz: number,
  rotation: number,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const factors = [1.00, 0.76, 1.08, 0.84, 1.12, 0.72, 0.94];

  for (let i = 0; i < factors.length; i++) {
    const angle = (i / factors.length) * Math.PI * 2;
    const x = Math.cos(angle) * rx * factors[i];
    const z = Math.sin(angle) * rz * factors[i];
    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateY(rotation);
  geometry.translate(cx, y, cz);
  return geometry;
}

function goldLeafGeometry(): THREE.BufferGeometry {
  return merge([
    flakeGeometry(0.012, 0.003, 0.1485, 0.027, 0.018, 0.35),
    flakeGeometry(-0.034, 0.018, 0.1486, 0.012, 0.009, -0.40),
    flakeGeometry(0.063, 0.319, 0.1027, 0.009, 0.014, 0.20),
  ]);
}

export function build(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Ratnachankrama — Jewel Walk';

  const platform = new THREE.Mesh(platformGeometry(), mat('granite'));
  platform.name = 'Moulded granite walk with recessed ashlar joints';
  platform.castShadow = true;
  platform.receiveShadow = true;
  group.add(platform);

  const lotus = new THREE.InstancedMesh(lotusGeometry(), mat('sandstone'), LOTUS_COUNT);
  lotus.name = 'Eighteen shallow carved lotus stones';
  lotus.castShadow = true;
  lotus.receiveShadow = true;

  const random = seededRandom(0x72a4c19);
  const giltMatrices: THREE.Matrix4[] = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < LOTUS_COUNT; i++) {
    const x = (i - (LOTUS_COUNT - 1) / 2) * LOTUS_SPACING;
    const angle = random() * Math.PI * 2;
    const baseScale = 0.985 + random() * 0.035;
    const scaleX = baseScale * (0.980 + random() * 0.040);
    const scaleY = 0.960 + random() * 0.070;
    const scaleZ = baseScale * (0.980 + random() * 0.040);

    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(x, TOP_Y + 0.001, 0),
      new THREE.Quaternion().setFromAxisAngle(up, angle),
      new THREE.Vector3(scaleX, scaleY, scaleZ),
    );

    lotus.setMatrixAt(i, matrix);
    if (i % 5 === 2) giltMatrices.push(matrix);
  }

  lotus.instanceMatrix.needsUpdate = true;
  group.add(lotus);

  const gold = new THREE.InstancedMesh(goldLeafGeometry(), mat('gold'), giltMatrices.length);
  gold.name = 'Small remnants of devotional gold leaf';
  gold.castShadow = false;
  gold.receiveShadow = true;

  for (let i = 0; i < giltMatrices.length; i++) {
    gold.setMatrixAt(i, giltMatrices[i]);
  }
  gold.instanceMatrix.needsUpdate = true;
  group.add(gold);

  return group;
}
