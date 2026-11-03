import * as THREE from 'three';

// Photo textures generated per temple (scripts/textures) live in public/textures/<temple>/.
// A material keeps its procedural map until the photo arrives, so a missing file
// degrades to the canvas look instead of a blank surface.

const loader = new THREE.TextureLoader();
const cache = new Map<string, Promise<THREE.Texture>>();

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
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url);
    cache.set(url, p);
  }
  return p;
}

/** put a photo texture on a material once it has loaded */
export function photo(mat: THREE.MeshStandardMaterial, url: string, o: PhotoOptions = {}) {
  load(url).then((base) => {
    const tex = base.clone();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = o.mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
    tex.repeat.set(...(o.repeat ?? [1, 1]));
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    mat.map = tex;
    if (o.bump) {
      const bump = tex.clone();
      bump.colorSpace = THREE.NoColorSpace;
      mat.bumpMap = bump;
      mat.bumpScale = o.bump;
    }
    if (!o.keepColor) mat.color.set(0xffffff);
    mat.needsUpdate = true;
  }).catch(() => { /* keep the procedural look */ });
  return mat;
}
