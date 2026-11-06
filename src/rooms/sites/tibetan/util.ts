import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { photo } from '../../../kit/textures';

// Small helpers for the Namdroling site: canvas textures, photo materials, and a batch
// that merges static geometry per material so the hall draws in a few calls.

export const TEX = '/textures/tibetan/';

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

type PhotoOpts = Parameters<typeof photo>[2];

/** a standard material that takes a photo texture from public/textures/tibetan once loaded */
export function photoMat(file: string, color: number, opts: PhotoOpts = {}, params: THREE.MeshStandardMaterialParameters = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...params });
  return photo(m, TEX + file, opts);
}

/** collects static geometry and merges it into one mesh per material */
export class Batch {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private shadow = new Map<THREE.Material, boolean>();

  add(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, castShadow = false) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')),
      new THREE.Vector3(1, 1, 1),
    ));
    let list = this.parts.get(mat);
    if (!list) this.parts.set(mat, (list = []));
    list.push(g);
    if (castShadow) this.shadow.set(mat, true);
    return this;
  }

  /** add a geometry already placed by a matrix */
  addM(geo: THREE.BufferGeometry, mat: THREE.Material, m: THREE.Matrix4, castShadow = false) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(m);
    let list = this.parts.get(mat);
    if (!list) this.parts.set(mat, (list = []));
    list.push(g);
    if (castShadow) this.shadow.set(mat, true);
    return this;
  }

  build(group: THREE.Object3D, receiveShadow = true) {
    const meshes: THREE.Mesh[] = [];
    for (const [mat, list] of this.parts) {
      const geo = mergeGeometries(list, false);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = this.shadow.get(mat) ?? false;
      mesh.receiveShadow = receiveShadow;
      group.add(mesh);
      meshes.push(mesh);
    }
    this.parts.clear();
    return meshes;
  }
}

/** a box whose UVs are scaled to metres / tile, so a texture repeats at a fixed size */
export function tiledBox(w: number, h: number, d: number, tile: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [sw, sh] = ax > 0.5 ? [d, h] : ay > 0.5 ? [w, d] : [w, h];
    uv.setXY(i, (uv.getX(i) * sw) / tile, (uv.getY(i) * sh) / tile);
  }
  return g;
}

/** a plane with UVs repeated `rx` × `ry` times */
export function tiledPlane(w: number, h: number, rx: number, ry: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
  return g;
}

/**
 * A Chinese-style hipped roof with upturned eaves: a ridge along x, four sloping faces,
 * and the corners lifted. Base centred at the origin (y = 0 at the eave line).
 */
export function hippedRoof(w: number, d: number, h: number, lift = 0.35, segs = 8) {
  const ridge = Math.max(0, w - d) / 2;
  const pos: number[] = [];
  // a grid over each face, sagging between ridge and eave, lifted toward the corners
  const P = (u: number, v: number, face: number): [number, number, number] => {
    // u: 0..1 along the eave, v: 0 at eave .. 1 at ridge
    let x: number, z: number;
    const ex = (u - 0.5) * w, ez = (u - 0.5) * d;
    const rx = (u - 0.5) * 2 * ridge;
    if (face === 0) { x = ex + (rx - ex) * v; z = d / 2 - (d / 2) * v; }
    else if (face === 1) { x = -ex + (-rx + ex) * v; z = -d / 2 + (d / 2) * v; }
    else if (face === 2) { x = w / 2 - (w / 2 - ridge) * v; z = -ez + ez * v; }
    else { x = -w / 2 + (w / 2 - ridge) * v; z = ez - ez * v; }
    const corner = Math.pow(Math.abs(u - 0.5) * 2, 3) * (1 - v);
    const y = h * (v - 0.22 * Math.sin(v * Math.PI)) + lift * corner;
    return [x, y, z];
  };
  for (let f = 0; f < 4; f++) {
    for (let i = 0; i < segs; i++) for (let j = 0; j < segs; j++) {
      const u0 = i / segs, u1 = (i + 1) / segs, v0 = j / segs, v1 = (j + 1) / segs;
      const a = P(u0, v0, f), b = P(u1, v0, f), c = P(u1, v1, f), e = P(u0, v1, f);
      pos.push(...a, ...b, ...c, ...a, ...c, ...e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // flip faces whose winding points down
  const p = g.attributes.position as THREE.BufferAttribute;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    A.fromBufferAttribute(p, i); B.fromBufferAttribute(p, i + 1); C.fromBufferAttribute(p, i + 2);
    const ny = B.clone().sub(A).cross(C.clone().sub(A)).y;
    if (ny < 0) { p.setXYZ(i + 1, C.x, C.y, C.z); p.setXYZ(i + 2, B.x, B.y, B.z); }
  }
  g.computeVertexNormals();
  return g;
}

/** points of a sagging rope between a and b */
export function catenary(a: THREE.Vector3, b: THREE.Vector3, sag: number, n = 16) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  return pts;
}
