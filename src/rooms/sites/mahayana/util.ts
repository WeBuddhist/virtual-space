import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { photo } from '../../../kit/textures';

// Shared helpers for the Tōdai-ji room: materials from the photo textures in
// public/textures/mahayana, a static-geometry batcher, and canvas textures.

export const TEX = '/textures/mahayana/';

export const std = (color: number, roughness = 0.85, metalness = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

/** a material whose photo texture, once loaded, also serves as its alpha (and glow) map */
export function cutout(url: string, opts: { alphaTest?: number; emissive?: number; color?: number; metalness?: number; roughness?: number } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0xffffff, metalness: opts.metalness ?? 0.6, roughness: opts.roughness ?? 0.4,
    alphaTest: opts.alphaTest ?? 0.12, side: THREE.DoubleSide,
  });
  // photos shot on black: the green channel is ~0 off the object, so the map is its own alpha
  Object.defineProperty(mat, 'alphaMap', { get() { return this.map; }, set() {}, configurable: true });
  if (opts.emissive) {
    mat.emissive.setHex(0xffffff);
    mat.emissiveIntensity = opts.emissive;
    Object.defineProperty(mat, 'emissiveMap', { get() { return this.map; }, set() {}, configurable: true });
  }
  photo(mat, url, { keepColor: opts.color !== undefined });
  return mat;
}

/** a canvas-backed texture */
export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1], srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

/**
 * Collects static geometry per material and merges it into one mesh each, so a
 * building of hundreds of beams draws in a handful of calls.
 */
export class Batch {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  constructor(private shadows = true) {}

  add(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    let list = this.parts.get(mat);
    if (!list) this.parts.set(mat, (list = []));
    list.push(g);
    return this;
  }

  /** an axis-aligned box (before the y rotation), centred at x,y,z */
  box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
    return this.add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, ry);
  }

  /** a box spanning y0..y1 */
  post(mat: THREE.Material, w: number, d: number, x: number, z: number, y0: number, y1: number) {
    return this.box(mat, w, y1 - y0, d, x, (y0 + y1) / 2, z);
  }

  cyl(mat: THREE.Material, r0: number, r1: number, x: number, z: number, y0: number, y1: number, seg = 14) {
    return this.add(new THREE.CylinderGeometry(r1, r0, y1 - y0, seg), mat, x, (y0 + y1) / 2, z);
  }

  /** merge everything into meshes under `parent` */
  build(parent: THREE.Object3D, castShadow = this.shadows) {
    const meshes: THREE.Mesh[] = [];
    for (const [mat, list] of this.parts) {
      const geo = mergeGeometries(list);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.parts.clear();
    return meshes;
  }
}

/** the same mesh at many spots: one InstancedMesh */
export function instances(geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], cast = true) {
  const m = new THREE.InstancedMesh(geo, mat, mats.length);
  mats.forEach((x, i) => m.setMatrixAt(i, x));
  m.castShadow = cast;
  m.receiveShadow = true;
  m.computeBoundingSphere();
  return m;
}

export const at = (x: number, y: number, z: number, ry = 0, s = 1, sy = s) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, sy, s));

/**
 * A hipped roof with the Japanese concave profile and flicked-up eave corners, from
 * an eave rectangle (half-extents hw, hd) up to a top rectangle (rw, rd): rd = 0 makes
 * a true hip with a ridge of half-length rw; rd > 0 a pent roof (mokoshi) that stops
 * against an inner wall. Tiles map in metres / `tile`.
 */
export function hipRoofGeometry(hw: number, hd: number, rw: number, rd: number, yEave: number, yTop: number, zc: number, lift: number, curve = 1.6, tile = 1.8) {
  const NU = 30, NV = 12;
  const geos: THREE.BufferGeometry[] = [];
  const slope = (eave: (u: number) => [number, number], top: (u: number) => [number, number]) => {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const e0 = eave(0);
    for (let j = 0; j <= NV; j++) {
      const t = j / NV; // 0 at the eave, 1 at the top
      const y = yEave + (yTop - yEave) * Math.pow(t, curve);
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        const [ex, ez] = eave(u);
        const [rx, rz] = top(u);
        const up = lift * Math.pow(Math.abs(2 * u - 1), 6) * Math.pow(1 - t, 2.2);
        pos.push(ex + (rx - ex) * t, y + up, ez + (rz - ez) * t);
        uv.push(Math.hypot(ex - e0[0], ez - e0[1]) / tile, (t * Math.hypot(rx - ex, rz - ez, yTop - yEave)) / tile);
      }
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  };
  geos.push(slope((u) => [-hw + u * 2 * hw, zc + hd], (u) => [-rw + u * 2 * rw, zc + rd]));
  geos.push(slope((u) => [hw - u * 2 * hw, zc - hd], (u) => [rw - u * 2 * rw, zc - rd]));
  geos.push(slope((u) => [hw, zc + hd - u * 2 * hd], (u) => [rw, zc + rd - u * 2 * rd]));
  geos.push(slope((u) => [-hw, zc - hd + u * 2 * hd], (u) => [-rw, zc - rd + u * 2 * rd]));
  const g = mergeGeometries(geos)!;
  g.computeVertexNormals();
  return g;
}

/** a gabled (kirizuma) roof along x, for corridors: half-width hw, length len */
export function gableRoofGeometry(len: number, hw: number, yEave: number, yRidge: number, tile = 1.2) {
  const g = new THREE.BufferGeometry();
  const L = len / 2;
  const pos = [
    -L, yEave, hw, L, yEave, hw, -L, yRidge, 0, L, yRidge, 0,
    L, yEave, -hw, -L, yEave, -hw, L, yRidge, 0, -L, yRidge, 0,
  ];
  const s = Math.hypot(hw, yRidge - yEave) / tile;
  const uv = [0, 0, len / tile, 0, 0, s, len / tile, s, 0, 0, len / tile, 0, 0, s, len / tile, s];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6]);
  g.computeVertexNormals();
  return g;
}
