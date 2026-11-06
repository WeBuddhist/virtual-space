import * as THREE from 'three';

// Photo textures generated per temple (scripts/textures) live in public/textures/<temple>/.
// A material keeps its procedural map until the photo arrives, so a missing file
// degrades to the canvas look instead of a blank surface.
//
// Loading is tracked: main.ts awaits photosPending() and pre-uploads every texture
// with renderer.initTexture() before the first frame, so walking around later does
// not hitch on image decode and GPU upload. Textures are also shared between
// materials that ask for the same file with the same options — one GPU upload each.

const loader = new THREE.TextureLoader();
const imageCache = new Map<string, Promise<THREE.Texture>>();
/** finished textures by url+options key: { map, bump } ready to assign */
const texCache = new Map<string, { map: THREE.Texture; bump?: THREE.Texture }>();
const pending = new Set<Promise<unknown>>();
const loaded = new Set<THREE.Texture>();

interface PhotoOptions {
  repeat?: [number, number];
  /** mirror alternate tiles, which hides the seams of generated textures */
  mirror?: boolean;
  /** also use the photo's light and shade as a bump map */
  bump?: number;
  /** keep the material's existing color instead of resetting it to white */
  keepColor?: boolean;
}

function load(url: string) {
  let p = imageCache.get(url);
  if (!p) {
    p = loader.loadAsync(url);
    imageCache.set(url, p);
  }
  return p;
}

/** promises behind every photo() call so far (for preloading before the first frame) */
export function photosPending(): Promise<unknown>[] {
  return [...pending];
}

/** every photo texture that has finished loading (for renderer.initTexture) */
export function loadedPhotos(): THREE.Texture[] {
  return [...loaded];
}

/** put a photo texture on a material once it has loaded */
export function photo(mat: THREE.MeshStandardMaterial, url: string, o: PhotoOptions = {}) {
  const key = `${url}|${o.repeat ?? ''}|${o.mirror ? 'm' : ''}|${o.bump ?? ''}`;
  let entry = texCache.get(key);
  if (!entry) {
    entry = { map: undefined as unknown as THREE.Texture };
    texCache.set(key, entry);
    const p = load(url).then((base) => {
      const tex = base.clone();
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = o.mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
      tex.repeat.set(...(o.repeat ?? [1, 1]));
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      entry!.map = tex;
      loaded.add(tex);
      if (o.bump) {
        const bump = tex.clone();
        bump.colorSpace = THREE.NoColorSpace;
        bump.needsUpdate = true;
        entry!.bump = bump;
        loaded.add(bump);
      }
      assign(mat, entry!, o);
      return tex;
    }).catch(() => { /* keep the procedural look */ });
    pending.add(p);
    p.then(() => pending.delete(p));
  } else if (entry.map) {
    assign(mat, entry, o);
  } else {
    // still in flight: wait for the shared promise
    const p = load(url).then(() => { if (entry!.map) assign(mat, entry!, o); }).catch(() => {});
    pending.add(p);
    p.then(() => pending.delete(p));
  }
  return mat;
}

function assign(mat: THREE.MeshStandardMaterial, entry: { map: THREE.Texture; bump?: THREE.Texture }, o: PhotoOptions) {
  mat.map = entry.map;
  if (o.bump && entry.bump) {
    mat.bumpMap = entry.bump;
    mat.bumpScale = o.bump;
  }
  if (!o.keepColor) mat.color.set(0xffffff);
  mat.needsUpdate = true;
}
