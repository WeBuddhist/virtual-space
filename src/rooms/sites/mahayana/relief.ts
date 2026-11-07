import * as THREE from 'three';
import { photo } from '../../../kit/textures';
import { TEX } from './util';

// Photo reliefs: a real photograph of a statue, cut out (colour + alpha in <name>.webp) and
// pushed forward by a depth map (<name>-depth.png) so its body swells out of its halo or
// background. Made by reference/mahayana/retex/relief.py from Wikimedia Commons photos.
// Seen from the front and the circuit (within ~50° of its axis) it reads as the real figure.

const geos = new Map<string, THREE.PlaneGeometry>();

export interface ReliefOpts {
  /** width and height of the photo's crop, in metres */
  w: number;
  h: number;
  /** how far the deepest point of the body stands out, in metres */
  depth: number;
  /** a faint glow from the photo itself, so gilt reads in the gloom */
  glow?: number;
  metalness?: number;
  roughness?: number;
  /** colour behind (seen from the back) */
  back?: number;
}

/** a relief standing on its bottom edge at the origin, facing +z */
export function relief(name: string, o: ReliefOpts) {
  const key = `${o.w}|${o.h}`;
  let geo = geos.get(key);
  if (!geo) {
    geo = new THREE.PlaneGeometry(o.w, o.h, 96, Math.round(96 * o.h / o.w)).translate(0, o.h / 2, 0);
    geos.set(key, geo);
  }
  const mat = new THREE.MeshStandardMaterial({
    roughness: o.roughness ?? 0.55, metalness: o.metalness ?? 0.3, alphaTest: 0.5,
    displacementScale: o.depth,
  });
  photo(mat, `${TEX}${name}.webp`);
  // the depth map loads through the same tracked loader, on a stand-in material
  const depth = new THREE.MeshStandardMaterial();
  photo(depth, `${TEX}${name}-depth.png`);
  Object.defineProperty(mat, 'displacementMap', { get() { return depth.map; }, set() {}, configurable: true });
  if (o.glow) {
    mat.emissive.setHex(0xffffff);
    mat.emissiveIntensity = o.glow;
    Object.defineProperty(mat, 'emissiveMap', { get() { return this.map; }, set() {}, configurable: true });
  }
  const front = new THREE.Mesh(geo, mat);
  front.receiveShadow = true;
  // the back: the same outline, flat and nearly black (the photo's alpha, its colour darkened)
  const backMat = new THREE.MeshStandardMaterial({ color: o.back ?? 0x1c140e, roughness: 0.9, alphaTest: 0.5, side: THREE.BackSide });
  Object.defineProperty(backMat, 'map', { get() { return mat.map; }, set() {}, configurable: true });
  const back = new THREE.Mesh(geo, backMat);
  const g = new THREE.Group();
  g.add(front, back);
  return g;
}
