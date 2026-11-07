import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { FY } from './layout';

// The hall's polished granite mirrors the three gilded images down the aisle (every photo of
// the hall shows it). A planar reflector over the aisle renders only the altar (its own layer,
// so the reflection costs one small extra pass of the altar, not the whole room) at a low
// resolution, and is added over the floor so the stone's own pattern shows through.

const LAYER = 5;

const shader = {
  name: 'TibetanFloorReflection',
  uniforms: {
    color: { value: null as THREE.Color | null },
    tDiffuse: { value: null as THREE.Texture | null },
    textureMatrix: { value: null as THREE.Matrix4 | null },
    strength: { value: 0.55 },
    size: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vLocal;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vLocal = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float strength;
    varying vec4 vUv;
    varying vec2 vLocal;
    void main() {
      // a slight ripple, as polished slabs are never quite one plane
      vec4 p = vUv;
      p.x += sin(vLocal.y * 90.0) * 0.0025 * p.w;
      vec3 c = texture2DProj(tDiffuse, p).rgb;
      // fade out toward the sides of the aisle and the door
      float edge = smoothstep(0.0, 0.12, vLocal.x) * smoothstep(1.0, 0.88, vLocal.x) * smoothstep(0.0, 0.25, vLocal.y);
      gl_FragColor = vec4(c * strength * edge, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

/** a reflection of `source` (the altar) in the floor strip x0..x1, z0..z1 */
export function floorReflection(source: THREE.Object3D, x0: number, x1: number, z0: number, z1: number) {
  const w = x1 - x0, d = z1 - z0;
  const refl = new Reflector(new THREE.PlaneGeometry(w, d), {
    textureWidth: 512, textureHeight: 1024, clipBias: 0.003, multisample: 0, shader,
  });
  refl.rotation.x = -Math.PI / 2;
  refl.position.set((x0 + x1) / 2, FY + 0.01, (z0 + z1) / 2);
  const mat = refl.material as THREE.ShaderMaterial;
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  refl.renderOrder = 1;
  refl.camera.layers.set(LAYER);

  // only the altar, on its own layer; the sky must not show in the stone
  let frame = 0;
  const render = refl.onBeforeRender;
  const clear = new THREE.Color();
  refl.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
    // statues stream in after the first frames: keep tagging what the altar holds
    if (frame++ % 90 === 0) source.traverse((o) => o.layers.enable(LAYER));
    const bg = scene.background, fog = scene.fog;
    const alpha = renderer.getClearAlpha();
    renderer.getClearColor(clear);
    scene.background = null;
    scene.fog = null;
    renderer.setClearColor(0x000000, 1);
    render.call(this, renderer, scene, camera, geometry, material, group);
    renderer.setClearColor(clear, alpha);
    scene.background = bg;
    scene.fog = fog;
  };
  return {
    mesh: refl,
    /** dimmer at night when the floods are eased */
    setStrength(s: number) { (mat.uniforms.strength as { value: number }).value = s; },
  };
}
