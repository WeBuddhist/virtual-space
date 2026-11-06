import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { photo } from '../../../kit/textures';

// Small helpers for the Wat Yai site: textured quads in metre UVs, photo cut-outs
// (generated textures drawn on black, the black made transparent), and merging.

export const TEX = '/textures/theravada/';

/** a material that shows one of this temple's photo textures */
export function tex(name: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}, repeat?: [number, number], mirror = false) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, ...opts });
  photo(mat, `${TEX}${name}.jpg`, { repeat, mirror, keepColor: opts.color !== undefined });
  return mat;
}

/**
 * Cut a photo drawn on flat black out of its background: dark pixels become
 * transparent (alpha test, so it sorts like an opaque surface).
 */
export function cutout(name: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}, lo = 0.09, hi = 0.2) {
  const mat = tex(name, { alphaTest: 0.5, side: THREE.DoubleSide, ...opts });
  mat.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
#ifdef USE_MAP
      diffuseColor.a *= smoothstep(${lo.toFixed(3)}, ${hi.toFixed(3)}, max(sampledDiffuseColor.r, sampledDiffuseColor.g));
#endif`,
    );
  };
  mat.customProgramCacheKey = () => `cutout${lo}-${hi}`;
  return mat;
}

/**
 * A flat quad through four corners (counter-clockwise seen from the front), with UVs
 * in metres divided by `tile` (so a texture repeats every `tile` metres), or 0…1.
 */
export function quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, tile?: number) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray()], 3));
  let uv: number[];
  if (tile) {
    const w = a.distanceTo(b) / tile, w2 = d.distanceTo(c) / tile;
    // keep both edges anchored at their middle so trapezoids taper evenly
    const h = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5).distanceTo(new THREE.Vector3().addVectors(c, d).multiplyScalar(0.5)) / tile;
    uv = [0.5 - w / 2, 0, 0.5 + w / 2, 0, 0.5 + w2 / 2, h, 0.5 - w2 / 2, h];
  } else {
    uv = [0, 0, 1, 0, 1, 1, 0, 1];
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
}

/** a vertical rectangle facing +x/−x/+z/−z, centred at (x, y, z) */
export function panel(w: number, h: number, facing: 'x+' | 'x-' | 'z+' | 'z-') {
  const g = new THREE.PlaneGeometry(w, h);
  const r = { 'z+': 0, 'x+': Math.PI / 2, 'z-': Math.PI, 'x-': -Math.PI / 2 }[facing];
  g.rotateY(r);
  return g;
}

export function boxAt(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

/** merge geometries (all non-indexed or all indexed are both fine) into one mesh */
export function merged(geos: THREE.BufferGeometry[], mat: THREE.Material, shadows = true) {
  const norm = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    // every part needs the same attributes
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    if (!n.attributes.normal) n.computeVertexNormals();
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  const m = new THREE.Mesh(mergeGeometries(norm, false), mat);
  m.castShadow = shadows;
  m.receiveShadow = true;
  return m;
}

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** an upswept Thai finial (chofa at the gable peak, hang hong at the eaves): a slim hook */
export function finialGeometry(height: number, depth = 0.08) {
  const s = new THREE.Shape();
  const h = height;
  s.moveTo(-0.12 * h, 0);
  s.bezierCurveTo(-0.14 * h, 0.35 * h, -0.02 * h, 0.6 * h, 0.06 * h, 0.82 * h);
  s.bezierCurveTo(0.1 * h, 0.94 * h, 0.04 * h, 1.02 * h, -0.04 * h, h);
  s.bezierCurveTo(0.02 * h, 0.9 * h, 0.0 * h, 0.78 * h, -0.05 * h, 0.66 * h);
  s.bezierCurveTo(-0.02 * h, 0.45 * h, 0.06 * h, 0.2 * h, 0.12 * h, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** a small seated gilded Buddha (about 1.25 m with its base), facing +z, for rows of images */
export function seatedBuddhaGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.CylinderGeometry(0.46, 0.5, 0.2, 16).translate(0, 0.1, 0)); // lotus base
  parts.push(new THREE.SphereGeometry(0.5, 16, 10).scale(0.92, 0.3, 0.62).translate(0, 0.3, 0.06)); // crossed legs
  parts.push(new THREE.SphereGeometry(0.3, 16, 12).scale(0.82, 1.15, 0.6).translate(0, 0.62, -0.02)); // torso
  parts.push(new THREE.SphereGeometry(0.16, 12, 8).scale(1.6, 0.7, 0.9).translate(0, 0.86, -0.02)); // shoulders
  parts.push(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 10).translate(0, 0.98, -0.01)); // neck
  parts.push(new THREE.SphereGeometry(0.12, 14, 10).scale(1, 1.18, 1).translate(0, 1.1, 0)); // head
  parts.push(new THREE.SphereGeometry(0.075, 10, 8).translate(0, 1.22, -0.01)); // ushnisha
  parts.push(new THREE.ConeGeometry(0.04, 0.2, 8).translate(0, 1.38, -0.01)); // flame finial
  // the right arm reaching down over the knee, the left hand in the lap
  parts.push(new THREE.CylinderGeometry(0.045, 0.055, 0.42, 8).rotateX(0.5).rotateZ(0.12).translate(-0.24, 0.6, 0.1));
  parts.push(new THREE.CylinderGeometry(0.04, 0.05, 0.26, 8).rotateZ(1.3).translate(0.08, 0.44, 0.2));
  const norm = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of norm) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  return mergeGeometries(norm, false);
}
