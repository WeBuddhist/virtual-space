import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Baked statues (scripts/statues) carry named materials; this finishes them at
// runtime: the painted face, glass for crystal, and shadows.

export type FaceStyle = 'tibetan-painted' | 'gilt';

const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group>>();

/** face-UV space: 0.26 m square, x −0.13…0.13 around the head, y −0.15…0.11 from its centre */
const S = 1024;
const px = (x: number) => ((x + 0.13) / 0.26) * S;
const py = (y: number) => (1 - (y + 0.15) / 0.26) * S;
const m = (v: number) => (v / 0.26) * S; // metres to pixels

function faceTextures(style: FaceStyle, gilt: string) {
  const color = document.createElement('canvas');
  const mr = document.createElement('canvas');
  color.width = color.height = mr.width = mr.height = S;
  const c = color.getContext('2d')!;
  const r = mr.getContext('2d')!;
  c.fillStyle = gilt;
  c.fillRect(0, 0, S, S);
  // metalness in blue, roughness in green: the gilt is metallic, paint is not
  r.fillStyle = 'rgb(0, 100, 190)';
  r.fillRect(0, 0, S, S);
  const both = (fn: (g: CanvasRenderingContext2D, isMr: boolean) => void) => { fn(c, false); fn(r, true); };
  const paintMr = 'rgb(0, 150, 0)';

  if (style === 'tibetan-painted') {
    for (const side of [-1, 1]) {
      const ex = 0.044 * side, ey = 0.011;
      const inner = 0.018 * side, outer = 0.071 * side;
      // the almond of the eye, half open and looking down
      const almond = (g: CanvasRenderingContext2D) => {
        g.beginPath();
        g.moveTo(px(inner), py(ey + 0.001));
        g.bezierCurveTo(px(ex - 0.012 * side), py(ey + 0.009), px(ex + 0.014 * side), py(ey + 0.009), px(outer), py(ey + 0.004));
        g.bezierCurveTo(px(ex + 0.012 * side), py(ey - 0.004), px(ex - 0.012 * side), py(ey - 0.004), px(inner), py(ey + 0.001));
        g.closePath();
      };
      both((g, isMr) => {
        g.save();
        almond(g);
        g.fillStyle = isMr ? paintMr : '#f6f1e6';
        g.fill();
        g.clip();
        if (!isMr) {
          // iris tucked under the upper lid: blue ring, dark pupil, a catch-light
          g.fillStyle = '#2f62b8';
          g.beginPath(); g.arc(px(ex + 0.002 * side), py(ey + 0.003), m(0.0066), 0, Math.PI * 2); g.fill();
          g.fillStyle = '#0d0f1c';
          g.beginPath(); g.arc(px(ex + 0.002 * side), py(ey + 0.003), m(0.0032), 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,.8)';
          g.beginPath(); g.arc(px(ex + 0.0005 * side), py(ey + 0.0055), m(0.0011), 0, Math.PI * 2); g.fill();
          // the pinkish lower rim
          g.strokeStyle = 'rgba(205,120,120,.7)';
          g.lineWidth = m(0.0012);
          g.beginPath();
          g.moveTo(px(inner), py(ey + 0.001));
          g.bezierCurveTo(px(ex - 0.012 * side), py(ey - 0.004), px(ex + 0.012 * side), py(ey - 0.004), px(outer), py(ey + 0.004));
          g.stroke();
        }
        g.restore();
        // the heavy black upper lid, swept out past the corner
        g.strokeStyle = isMr ? paintMr : '#111017';
        g.lineCap = 'round';
        g.lineWidth = m(0.0026);
        g.beginPath();
        g.moveTo(px(inner), py(ey + 0.0015));
        g.bezierCurveTo(px(ex - 0.012 * side), py(ey + 0.0095), px(ex + 0.014 * side), py(ey + 0.0095), px(outer + 0.006 * side), py(ey + 0.007));
        g.stroke();
        // a blue line above the lid
        g.strokeStyle = isMr ? paintMr : '#3a7bd0';
        g.lineWidth = m(0.0014);
        g.beginPath();
        g.moveTo(px(inner + 0.002 * side), py(ey + 0.006));
        g.bezierCurveTo(px(ex - 0.01 * side), py(ey + 0.0135), px(ex + 0.014 * side), py(ey + 0.0135), px(outer + 0.004 * side), py(ey + 0.0105));
        g.stroke();
        // the long arched brow: black with a blue edge above
        const brow = (g2: CanvasRenderingContext2D, dy: number) => {
          g2.beginPath();
          g2.moveTo(px(0.011 * side), py(0.03 + dy));
          g2.bezierCurveTo(px(0.03 * side), py(0.043 + dy), px(0.06 * side), py(0.045 + dy), px(0.088 * side), py(0.031 + dy));
          g2.stroke();
        };
        g.strokeStyle = isMr ? paintMr : '#121019';
        g.lineWidth = m(0.0026);
        brow(g, 0);
        g.strokeStyle = isMr ? paintMr : '#3a7bd0';
        g.lineWidth = m(0.0013);
        brow(g, 0.0028);
      });
    }
    // pink lips with a darker parting line
    both((g, isMr) => {
      g.fillStyle = isMr ? paintMr : '#d9707a';
      g.beginPath();
      g.moveTo(px(-0.026), py(-0.064));
      g.bezierCurveTo(px(-0.014), py(-0.052), px(-0.004), py(-0.055), px(0), py(-0.0535));
      g.bezierCurveTo(px(0.004), py(-0.055), px(0.014), py(-0.052), px(0.026), py(-0.064));
      g.bezierCurveTo(px(0.014), py(-0.081), px(-0.014), py(-0.081), px(-0.026), py(-0.064));
      g.fill();
      if (!isMr) {
        g.strokeStyle = '#8c3440';
        g.lineWidth = m(0.0012);
        g.beginPath();
        g.moveTo(px(-0.025), py(-0.064));
        g.bezierCurveTo(px(-0.01), py(-0.067), px(0.01), py(-0.067), px(0.025), py(-0.064));
        g.stroke();
      }
    });
    // the urna: a small silver spiral ornament
    both((g, isMr) => {
      g.fillStyle = isMr ? 'rgb(0, 60, 255)' : '#d8dbe2';
      g.beginPath(); g.arc(px(0), py(0.046), m(0.0075), 0, Math.PI * 2); g.fill();
      if (!isMr) {
        g.strokeStyle = '#7b7f8a';
        g.lineWidth = m(0.0009);
        g.beginPath();
        for (let a = 0; a < Math.PI * 6; a += 0.2) g.lineTo(px(Math.cos(a) * a * 0.0004), py(0.046 + Math.sin(a) * a * 0.0004));
        g.stroke();
      }
    });
  } else {
    // a gilt face: only a soft shadow line for eyes and lips, like cast bronze
    c.strokeStyle = 'rgba(70,45,10,.45)';
    c.lineWidth = m(0.0018);
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(px(0.018 * side), py(0.012));
      c.bezierCurveTo(px(0.032 * side), py(0.006), px(0.055 * side), py(0.006), px(0.07 * side), py(0.014));
      c.stroke();
    }
    c.beginPath();
    c.moveTo(px(-0.024), py(-0.064));
    c.bezierCurveTo(px(-0.01), py(-0.067), px(0.01), py(-0.067), px(0.024), py(-0.064));
    c.stroke();
  }
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const mrMap = new THREE.CanvasTexture(mr);
  return { map, mrMap };
}

/** repoussé gold: a diamond lattice with a dot in each cell (the Mahabodhi cushion) */
function latticeTexture(gold: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  const b = document.createElement('canvas');
  b.width = 512;
  b.height = 128;
  const h = b.getContext('2d')!;
  g.fillStyle = gold;
  g.fillRect(0, 0, 512, 128);
  h.fillStyle = '#808080';
  h.fillRect(0, 0, 512, 128);
  const step = 32;
  for (const [ctx, line, dot] of [[g, 'rgba(90,60,10,.55)', 'rgba(255,240,190,.7)'], [h, '#ffffff', '#ffffff']] as const) {
    ctx.strokeStyle = line;
    ctx.lineWidth = 3;
    for (let x = -128; x < 640; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 128, 128); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 128); ctx.lineTo(x + 128, 0); ctx.stroke();
    }
    ctx.fillStyle = dot;
    for (let y = 0; y <= 128; y += step) for (let x = 0; x <= 512; x += step) {
      ctx.beginPath(); ctx.arc(x + step / 2, y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const bump = new THREE.CanvasTexture(b);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return { map, bump };
}

/** load a baked statue and finish its materials */
export function loadStatue(id: string, face: FaceStyle): Promise<THREE.Group> {
  const key = `${id}:${face}`;
  let p = cache.get(key);
  if (!p) {
    p = loader.loadAsync(`/models/statues/${id}.glb`).then((gltf) => {
      const root = gltf.scene;
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.name === 'face') {
          // getHexString already returns sRGB
          const gilt = '#' + mat.color.getHexString();
          const { map, mrMap } = faceTextures(face, gilt);
          mat.color.set(0xffffff);
          mat.map = map;
          mat.metalnessMap = mrMap;
          mat.roughnessMap = mrMap;
          mat.metalness = 1;
          mat.roughness = 1;
          mat.needsUpdate = true;
        } else if (mat.name === 'cloth') {
          // offered brocade robe: satin with a soft sheen
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: mat.color, metalness: 0.15, roughness: 0.32, sheen: 0.7, sheenColor: new THREE.Color(0xffc640),
            sheenRoughness: 0.35, clearcoat: 0.35, clearcoatRoughness: 0.25,
          });
        } else if (mat.name === 'seat' && (mesh.geometry.attributes.uv)) {
          const tex = latticeTexture('#' + mat.color.getHexString());
          mat.color.set(0xffffff);
          mat.map = tex.map;
          mat.bumpMap = tex.bump;
          mat.bumpScale = 2;
          mat.needsUpdate = true;
        } else if (mat.name === 'crystal') {
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 0.85, thickness: 0.05, ior: 1.5,
            iridescence: 0.6, clearcoat: 1, envMapIntensity: 1.6,
          });
        }
      });
      return root;
    });
    cache.set(key, p);
  }
  return p.then((g) => g.clone(true));
}
