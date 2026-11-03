import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TEMPLE, templeClock, type StatueDef } from './temple';

// Layout (metres). The visitor spawns on the path facing -z toward the hall.
export const HALL = { x0: -6, x1: 6, z0: -14, z1: -6, floorY: 0.4, wallH: 4.2 };
export const SPAWN = new THREE.Vector3(0, 0, 7);
export const BURNER = new THREE.Vector3(0, 0, -3.4);
export const BURNER_STAND = new THREE.Vector3(0, 0, -2.4);
const BOUNDS = { x0: -17, x1: 17, z0: -13.6, z1: 17 };

export interface Box2 { x0: number; x1: number; z0: number; z1: number }
export interface Cushion { index: number; position: THREE.Vector3; mesh: THREE.Mesh }

export interface World {
  scene: THREE.Scene;
  floor: THREE.Object3D[];
  cushions: Cushion[];
  burner: THREE.Object3D;
  colliders: Box2[];
  groundHeight(x: number, z: number): number;
  clampToBounds(p: THREE.Vector3): void;
  addIncense(): void;
  update(dt: number, now: Date): void;
  daylight: number;
}

function std(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts });
}

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** cheap value noise for canvas textures */
function noiseCanvas(size: number, base: string, speck: string[], density = 0.6) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * density * 0.02; i++) {
    g.fillStyle = speck[i % speck.length];
    g.globalAlpha = 0.08 + Math.random() * 0.12;
    const r = 1 + Math.random() * 6;
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function stoneTileTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6d6a63';
  g.fillRect(0, 0, 512, 512);
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -64 : 0;
    while (x < 512) {
      const w = 96 + Math.random() * 80;
      const shade = 90 + Math.floor(Math.random() * 30);
      g.fillStyle = `rgb(${shade},${shade - 3},${shade - 9})`;
      g.fillRect(x + 3, r * 128 + 3, w - 6, 122);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.035)`;
        g.fillRect(x + Math.random() * w, r * 128 + Math.random() * 128, 8 + Math.random() * 20, 4 + Math.random() * 10);
      }
      x += w;
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signboardTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 220;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1d3b36';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#c9a24a';
  g.lineWidth = 14;
  g.strokeRect(10, 10, c.width - 20, c.height - 20);
  g.lineWidth = 3;
  g.strokeRect(30, 30, c.width - 60, c.height - 60);
  g.fillStyle = '#e8c766';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 96;
  do {
    g.font = `600 ${size}px "Noto Serif Tibetan", "Noto Sans Tibetan", serif`;
    size -= 4;
  } while (g.measureText(text).width > c.width - 120 && size > 30);
  g.fillText(text, c.width / 2, c.height / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** altar backdrop: a calm thangka-style wall painting drawn at runtime */
function altarWallTexture(statues: StatueDef[]) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1024;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 0, c.height);
  bg.addColorStop(0, '#5a1a17');
  bg.addColorStop(1, '#3a100e');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  // small seated-figure niches
  for (let y = 70; y < c.height - 60; y += 110) {
    for (let x = 60; x < c.width; x += 110) {
      g.fillStyle = 'rgba(214,160,72,0.18)';
      g.beginPath();
      g.ellipse(x, y, 30, 40, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(232,190,100,0.35)';
      g.beginPath();
      g.arc(x, y - 14, 8, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(x, y + 10, 14, 16, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  // aureoles behind each statue
  for (const s of statues) {
    const cx = c.width / 2 + (s.x / 7.5) * c.width;
    const cy = c.height * (s.scale < 1 ? 0.58 : 0.5);
    const r = 330 * s.scale;
    const col = new THREE.Color(s.halo);
    const grad = g.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    grad.addColorStop(0, `rgba(255,230,160,0.85)`);
    grad.addColorStop(0.55, `rgba(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0},0.75)`);
    grad.addColorStop(1, 'rgba(60,16,14,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(240,200,110,0.8)';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      g.strokeStyle = 'rgba(240,200,110,0.35)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3);
      g.lineTo(cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88);
      g.stroke();
    }
  }
  // cloud band
  g.fillStyle = 'rgba(120,170,190,0.25)';
  for (let x = 0; x < c.width; x += 140) {
    g.beginPath();
    g.ellipse(x, c.height - 70, 110, 40, 0, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeStatue(def: StatueDef) {
  const gold = new THREE.MeshStandardMaterial({ color: def.tint, metalness: 0.85, roughness: 0.32 });
  const lotusMat = new THREE.MeshStandardMaterial({ color: 0xc9786e, metalness: 0.3, roughness: 0.5 });
  const g = new THREE.Group();
  g.name = `statue:${def.id}`;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.22, 32), lotusMat);
  base.position.y = 0.11;
  g.add(base);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), lotusMat);
    petal.scale.set(1, 0.55, 0.5);
    petal.position.set(Math.cos(a) * 0.68, 0.2, Math.sin(a) * 0.68);
    petal.rotation.y = -a;
    g.add(petal);
  }
  const legs = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), gold);
  legs.scale.set(1.15, 0.38, 0.8);
  legs.position.y = 0.38;
  g.add(legs);

  const torsoProfile = [
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.4, 0), new THREE.Vector2(0.42, 0.12),
    new THREE.Vector2(0.36, 0.4), new THREE.Vector2(0.38, 0.62), new THREE.Vector2(0.3, 0.74),
    new THREE.Vector2(0.12, 0.8), new THREE.Vector2(0.0, 0.8),
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 32), gold);
  torso.scale.z = 0.72;
  torso.position.y = 0.42;
  g.add(torso);

  const hands = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), gold);
  hands.scale.set(1.4, 0.5, 0.9);
  hands.position.set(0, 0.56, 0.32);
  g.add(hands);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), gold);
  head.scale.set(1, 1.12, 1);
  head.position.y = 1.43;
  g.add(head);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 8), gold);
    ear.position.set(side * 0.2, 1.38, 0);
    g.add(ear);
  }

  if (def.id === 'shakyamuni') {
    const ush = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), gold);
    ush.position.y = 1.66;
    g.add(ush);
  } else {
    // five-pointed bodhisattva crown
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.42;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), gold);
      point.position.set(Math.sin(a) * 0.19, 1.66, Math.cos(a) * 0.12);
      g.add(point);
    }
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 24), gold);
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 1.58;
    g.add(crown);
  }
  if (def.id === 'manjushri') {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.015), new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 1, roughness: 0.2 }));
    blade.position.set(0.42, 1.55, 0.05);
    blade.rotation.z = -0.15;
    g.add(blade);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff6a10, emissiveIntensity: 1.2 }));
    flame.position.set(0.47, 1.98, 0.05);
    g.add(flame);
  }

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 40),
    new THREE.MeshBasicMaterial({ color: def.halo, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  halo.position.set(0, 1.45, -0.25);
  g.add(halo);
  const aureole = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 48),
    new THREE.MeshBasicMaterial({ color: def.halo, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  aureole.scale.y = 1.15;
  aureole.position.set(0, 0.95, -0.3);
  g.add(aureole);

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  g.scale.setScalar(def.scale * 1.25);
  return g;
}

function makePine(rng: () => number) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.4, 8), std(0x5a3d2b));
  trunk.position.y = 1.2;
  g.add(trunk);
  const needles = std(0x2f4a31, { roughness: 0.95 });
  const tiers = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < tiers; i++) {
    const r = 1.6 - i * 0.35;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 1.6, 9), needles);
    cone.position.y = 2 + i * 0.9;
    cone.rotation.y = rng() * Math.PI;
    g.add(cone);
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  const s = 0.9 + rng() * 0.7;
  g.scale.setScalar(s);
  return g;
}

function makePrayerFlags(a: THREE.Vector3, b: THREE.Vector3) {
  const g = new THREE.Group();
  const pole = std(0x6b5236);
  for (const p of [a, b]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 5, 8), pole);
    m.position.set(p.x, 2.5, p.z);
    g.add(m);
  }
  const colors = [0x2b62b8, 0xf1f1ea, 0xc8302b, 0x2f8a46, 0xe6c02b];
  const n = 22;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y = 4.8 - Math.sin(t * Math.PI) * 0.9;
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.4),
      new THREE.MeshStandardMaterial({ color: colors[i % 5], side: THREE.DoubleSide, roughness: 1 }),
    );
    flag.position.copy(p).add(new THREE.Vector3(0, -0.2, 0));
    flag.lookAt(flag.position.clone().add(new THREE.Vector3(b.z - a.z, 0, a.x - b.x)));
    flag.userData.sway = Math.random() * 10;
    g.add(flag);
  }
  return g;
}

function makeLantern(lit: THREE.Material, frame: THREE.Material) {
  const g = new THREE.Group();
  g.add(box(0.26, 0.36, 0.26, lit, 0, 0, 0));
  g.add(box(0.32, 0.04, 0.32, frame, 0, 0.2, 0));
  g.add(box(0.32, 0.04, 0.32, frame, 0, -0.2, 0));
  return g;
}

function makeStoneLantern(lit: THREE.Material) {
  const stone = std(0x8b8780);
  const g = new THREE.Group();
  g.add(box(0.5, 0.12, 0.5, stone, 0, 0.06, 0));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8), stone).translateY(0.47));
  g.add(box(0.36, 0.3, 0.36, lit, 0, 0.97, 0));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.28, 4), stone);
  cap.position.y = 1.26;
  cap.rotation.y = Math.PI / 4;
  g.add(cap);
  return g;
}

function makeSky() {
  const uniforms = {
    top: { value: new THREE.Color(0x7aa7d6) },
    bottom: { value: new THREE.Color(0xe7e2d2) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: 'varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vPos; void main(){ float h = clamp(vPos.y*1.6+0.1,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h),1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat);
  return { sky, uniforms };
}

function makeStars() {
  const n = 900;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection();
    v.y = Math.abs(v.y) * 0.9 + 0.08;
    v.normalize().multiplyScalar(380);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0 });
  return new THREE.Points(geo, mat);
}

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** 0 at night, 1 at day, blending an hour either side of 06:00 and 18:00 */
export function daylightAt(dayFraction: number) {
  const h = dayFraction * 24;
  return smooth(5.5, 6.8, h) * (1 - smooth(17.3, 18.6, h));
}

export function buildWorld(renderer: THREE.WebGLRenderer): World {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(0xd8d5c8, 30, 140);

  const rng = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const floor: THREE.Object3D[] = [];
  const colliders: Box2[] = [];

  // sky, sun, ambient
  const { sky, uniforms: skyU } = makeSky();
  scene.add(sky);
  const stars = makeStars();
  scene.add(stars);
  const hemi = new THREE.HemisphereLight(0xdfe8f5, 0x4a4436, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d8, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  // ground
  const grassTex = noiseCanvas(256, '#6f7350', ['#56603c', '#8a8458', '#4b5236', '#9a8f63']);
  grassTex.repeat.set(30, 30);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), std(0xffffff, { map: grassTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  floor.push(ground);

  const pathTex = stoneTileTexture();
  pathTex.repeat.set(1, 11);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 22), std(0xffffff, { map: pathTex, roughness: 0.95 }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.012, 5);
  path.receiveShadow = true;
  scene.add(path);
  floor.push(path);
  const plazaTex = stoneTileTexture();
  plazaTex.repeat.set(4, 1);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.2), std(0xffffff, { map: plazaTex, roughness: 0.95 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.011, -4.4);
  plaza.receiveShadow = true;
  scene.add(plaza);
  floor.push(plaza);

  // hall
  const H = HALL;
  const stone = std(0x8f8b83, { roughness: 0.95 });
  const wood = std(0x7a5634, { roughness: 0.7 });
  const pillarMat = std(TEMPLE.hall.pillarColor, { roughness: 0.6 });
  const wallMat = std(TEMPLE.hall.wallColor, { roughness: 0.95 });
  const roofMat = std(TEMPLE.hall.roofColor, { roughness: 0.8 });
  const trim = std(0x2d5b55, { roughness: 0.7 });
  const hall = new THREE.Group();
  scene.add(hall);
  const cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2, w = H.x1 - H.x0, d = H.z1 - H.z0;

  hall.add(box(w + 0.8, H.floorY, d + 0.8, stone, cx, H.floorY / 2, cz));
  const hallFloor = box(w, 0.02, d, wood, cx, H.floorY + 0.01, cz);
  hall.add(hallFloor);
  floor.push(hallFloor);
  // front step
  const step = box(4, H.floorY / 2, 0.5, stone, 0, H.floorY / 4, H.z1 + 0.65);
  hall.add(step);
  floor.push(step);

  const wallY = H.floorY + H.wallH / 2;
  hall.add(box(w, H.wallH, 0.3, wallMat, cx, wallY, H.z0));
  hall.add(box(0.3, H.wallH, d - 0.6, wallMat, H.x0, wallY, cz - 0.3));
  hall.add(box(0.3, H.wallH, d - 0.6, wallMat, H.x1, wallY, cz - 0.3));
  colliders.push({ x0: H.x0 - 0.5, x1: H.x1 + 0.5, z0: H.z0 - 1, z1: H.z0 + 0.25 });
  colliders.push({ x0: H.x0 - 0.5, x1: H.x0 + 0.25, z0: H.z0, z1: H.z1 - 0.6 });
  colliders.push({ x0: H.x1 - 0.25, x1: H.x1 + 0.5, z0: H.z0, z1: H.z1 - 0.6 });

  // timber band and lattice windows on side walls
  for (const x of [H.x0 + 0.17, H.x1 - 0.17]) {
    for (let z = H.z0 + 1.2; z < H.z1 - 1; z += 1.8) {
      hall.add(box(0.05, 1.2, 1.2, trim, x, H.floorY + 2.2, z));
    }
  }

  const pillarGeo = new THREE.CylinderGeometry(0.2, 0.24, H.wallH, 16);
  const frontXs = [-5.6, -3.4, 3.4, 5.6];
  for (const x of frontXs) {
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(x, wallY, H.z1 - 0.2);
    p.castShadow = true;
    hall.add(p);
    hall.add(box(0.6, 0.18, 0.6, stone, x, H.floorY + 0.09, H.z1 - 0.2));
    colliders.push({ x0: x - 0.32, x1: x + 0.32, z0: H.z1 - 0.52, z1: H.z1 + 0.12 });
  }
  // lintel, brackets and painted beam
  hall.add(box(w + 0.6, 0.45, 0.4, trim, cx, H.floorY + H.wallH + 0.1, H.z1 - 0.2));
  hall.add(box(w + 0.6, 0.18, 0.5, pillarMat, cx, H.floorY + H.wallH - 0.2, H.z1 - 0.2));

  // roof: overhanging slab + two pitched planes + ridge
  const roofY = H.floorY + H.wallH + 0.35;
  hall.add(box(w + 3, 0.25, d + 3, roofMat, cx, roofY, cz));
  for (const side of [-1, 1]) {
    const plane = box(w + 3.2, 0.25, d / 2 + 2.2, roofMat, cx, roofY + 1.1, cz + side * (d / 4 + 0.6));
    plane.rotation.x = side * -0.42;
    hall.add(plane);
  }
  hall.add(box(w + 3.4, 0.35, 0.45, roofMat, cx, roofY + 2.05, cz));
  // gilded roof ornament (ganjira)
  const ganjira = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0xd8a640, metalness: 0.9, roughness: 0.3 }));
  ganjira.position.set(cx, roofY + 2.65, cz);
  hall.add(ganjira);

  // signboard
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.9), new THREE.MeshBasicMaterial({ map: signboardTexture(TEMPLE.hall.signboard) }));
  sign.position.set(0, H.floorY + H.wallH + 0.15, H.z1 + 0.02);
  hall.add(sign);

  // hanging lanterns
  const lanternLit = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffb25a, emissiveIntensity: 1.4 });
  const lanternFrame = std(0x3a2a1e);
  for (let i = 0; i < 7; i++) {
    const l = makeLantern(lanternLit, lanternFrame);
    l.position.set(-4.8 + i * 1.6, H.floorY + H.wallH - 0.55, H.z1 - 0.6);
    hall.add(l);
  }
  const hallLights: THREE.PointLight[] = [];
  for (const x of [-3, 3]) {
    const pl = new THREE.PointLight(0xffc27a, 6, 12, 1.6);
    pl.position.set(x, H.floorY + 3.2, H.z1 - 2);
    hall.add(pl);
    hallLights.push(pl);
  }
  const altarLight = new THREE.SpotLight(0xffd9a0, 30, 14, 0.7, 0.6, 1.4);
  altarLight.position.set(0, H.floorY + 3.9, -9);
  altarLight.target.position.set(0, H.floorY + 1.5, -13);
  hall.add(altarLight, altarLight.target);

  // altar, backdrop painting and statues
  const altarZ = H.z0 + 1.4;
  hall.add(box(7.6, 0.9, 1.6, std(0x6b2219, { roughness: 0.55 }), 0, H.floorY + 0.45, altarZ));
  hall.add(box(7.8, 0.08, 1.7, std(0xc69a3e, { metalness: 0.6, roughness: 0.4 }), 0, H.floorY + 0.92, altarZ));
  colliders.push({ x0: -4.1, x1: 4.1, z0: H.z0, z1: altarZ + 1 });
  const wallPaint = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 3.9), std(0xffffff, { map: altarWallTexture(TEMPLE.statues), roughness: 0.9 }));
  wallPaint.position.set(0, H.floorY + 2.1, H.z0 + 0.16);
  hall.add(wallPaint);
  for (const def of TEMPLE.statues) {
    const s = makeStatue(def);
    s.position.set(def.x, H.floorY + 0.96, altarZ - 0.1);
    hall.add(s);
  }
  // butter lamps and offering bowls on the altar edge
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0xd2a447, metalness: 0.9, roughness: 0.3 });
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xffd38a, emissive: 0xffa040, emissiveIntensity: 2 });
  for (let i = 0; i < 7; i++) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.07, 14), bowlMat);
    bowl.position.set(-1.5 + i * 0.5, H.floorY + 0.99, altarZ + 0.62);
    hall.add(bowl);
  }
  for (const x of [-3.4, 3.4]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.22, 14), bowlMat);
    lamp.position.set(x, H.floorY + 1.07, altarZ + 0.55);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), flameMat);
    flame.position.set(x, H.floorY + 1.24, altarZ + 0.55);
    hall.add(lamp, flame);
  }

  // cushions (seats); the first four hold resident practitioners
  const cushions: Cushion[] = [];
  const cushionGeo = new THREE.CylinderGeometry(0.34, 0.36, 0.1, 20);
  const cushionMats = [std(0x7c2a24, { roughness: 1 }), std(0xb57a2a, { roughness: 1 })];
  let ci = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      const x = -3.75 + c * 1.5;
      const z = -10.6 + r * 1.35;
      const m = new THREE.Mesh(cushionGeo, cushionMats[(r + c) % 2]);
      m.position.set(x, H.floorY + 0.06, z);
      m.receiveShadow = m.castShadow = true;
      m.userData.cushion = ci;
      hall.add(m);
      cushions.push({ index: ci++, position: new THREE.Vector3(x, H.floorY, z), mesh: m });
    }
  }

  // incense burner (bronze, on legs) in front of the hall
  const bronze = new THREE.MeshStandardMaterial({ color: 0x6f5a3a, metalness: 0.8, roughness: 0.45 });
  const burner = new THREE.Group();
  burner.name = 'burner';
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bronze);
  bowl.position.y = 0.72;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 32), bronze);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.72;
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), std(0xa59d90));
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.68;
  burner.add(bowl, rim, ash);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 8), bronze);
    leg.position.set(Math.cos(a) * 0.25, 0.25, Math.sin(a) * 0.25);
    burner.add(leg);
  }
  burner.add(box(1.2, 0.08, 1.2, stone, 0, 0.04, 0));
  burner.position.copy(BURNER);
  burner.traverse((o) => { o.userData.burner = true; });
  scene.add(burner);
  colliders.push({ x0: BURNER.x - 0.65, x1: BURNER.x + 0.65, z0: BURNER.z - 0.65, z1: BURNER.z + 0.65 });

  // incense sticks + smoke
  const sticks: { mesh: THREE.Group; born: number }[] = [];
  const smokeTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.7)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const smokeMat = new THREE.SpriteMaterial({ map: smokeTex, color: 0xd9d6cf, transparent: true, depthWrite: false, opacity: 0.35 });
  const smoke: THREE.Sprite[] = [];
  for (let i = 0; i < 24; i++) {
    const sp = new THREE.Sprite(smokeMat.clone());
    sp.visible = false;
    sp.userData.t = i / 24;
    scene.add(sp);
    smoke.push(sp);
  }
  function addIncense() {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 6), std(0x8a3b2a));
    stick.position.y = 0.22;
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5a1a }));
    ember.position.y = 0.45;
    g.add(stick, ember);
    g.position.set(BURNER.x + (Math.random() - 0.5) * 0.4, 0.68, BURNER.z + (Math.random() - 0.5) * 0.4);
    g.rotation.z = (Math.random() - 0.5) * 0.15;
    scene.add(g);
    sticks.push({ mesh: g, born: performance.now() });
  }

  // offering box
  const offering = box(0.9, 0.7, 0.55, std(0x6b2219, { roughness: 0.5 }), 2.1, H.floorY + 0.35, H.z1 - 1.2);
  hall.add(offering);
  colliders.push({ x0: 1.6, x1: 2.6, z0: H.z1 - 1.5, z1: H.z1 - 0.9 });

  // stone lanterns along the path
  const stoneLit = new THREE.MeshStandardMaterial({ color: 0xffe6b8, emissive: 0xffb357, emissiveIntensity: 1.2 });
  for (const z of [1, 6, 11]) {
    for (const x of [-2.4, 2.4]) {
      const l = makeStoneLantern(stoneLit);
      l.position.set(x, 0, z);
      scene.add(l);
      colliders.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 });
    }
  }
  const pathLight = new THREE.PointLight(0xffb86b, 4, 14, 1.8);
  pathLight.position.set(0, 1.6, 4);
  scene.add(pathLight);

  // lotus pond
  const pond = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), new THREE.MeshStandardMaterial({ color: 0x35504f, metalness: 0.2, roughness: 0.08 }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-7.5, 0.02, 4.5);
  scene.add(pond);
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.18, 8, 40), stone);
  rim2.rotation.x = Math.PI / 2;
  rim2.position.set(-7.5, 0.08, 4.5);
  scene.add(rim2);
  colliders.push({ x0: -10.3, x1: -4.7, z0: 1.7, z1: 7.3 });
  const padMat = std(0x4f6e3a);
  const lotusMat = std(0xf0c3c8);
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 2;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.3 + rng() * 0.15, 16), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(-7.5 + Math.cos(a) * r, 0.03, 4.5 + Math.sin(a) * r);
    scene.add(pad);
    if (i % 3 === 0) {
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 8, 1, true), lotusMat);
      flower.position.copy(pad.position).setY(0.12);
      flower.rotation.x = Math.PI;
      scene.add(flower);
    }
  }

  // pines, rocks, hedges
  const treeSpots: [number, number][] = [];
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (9 + rng() * 9);
    const z = -18 + rng() * 36;
    treeSpots.push([x, z]);
  }
  for (let i = 0; i < 14; i++) treeSpots.push([-14 + rng() * 28, -18 - rng() * 6]);
  for (const [x, z] of treeSpots) {
    if (Math.hypot(x + 7.5, z - 4.5) < 3.5) continue;
    const tree = makePine(rng);
    tree.position.set(x, 0, z);
    scene.add(tree);
    colliders.push({ x0: x - 0.45, x1: x + 0.45, z0: z - 0.45, z1: z + 0.45 });
  }
  const rockMat = std(0x7b776e, { roughness: 1 });
  for (let i = 0; i < 18; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + rng() * 0.5, 0), rockMat);
    const side = i % 2 ? 1 : -1;
    rock.position.set(side * (4 + rng() * 4), 0.1, -2 + rng() * 16);
    rock.scale.y = 0.6;
    rock.castShadow = true;
    scene.add(rock);
  }
  const hedgeMat = std(0x3d5a37, { roughness: 1 });
  for (const x of [-4.2, 4.2]) {
    const hedge = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 7, 6, 12), hedgeMat);
    hedge.rotation.x = Math.PI / 2;
    hedge.position.set(x, 0.4, 9);
    hedge.scale.set(1, 1, 0.8);
    hedge.castShadow = true;
    scene.add(hedge);
    colliders.push({ x0: x - 0.55, x1: x + 0.55, z0: 5, z1: 13 });
  }

  // distant mountains
  const mountMat = new THREE.MeshStandardMaterial({ color: 0x6f7c86, roughness: 1, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI * 0.95 + (i / 11) * Math.PI * 0.9;
    const r = 110 + rng() * 40;
    const m = new THREE.Mesh(new THREE.ConeGeometry(28 + rng() * 22, 30 + rng() * 34, 6), mountMat);
    m.position.set(Math.cos(a) * r, 10, Math.sin(a) * r);
    scene.add(m);
  }

  // prayer flags across the back of the courtyard
  const polePairs: [number, number, number, number][] = [[-14, -2, -7.5, -6.5], [14, -2, 7.5, -6.5], [-11, 12, -6, 15]];
  const flags = polePairs.map(([ax, az, bx, bz]) => {
    for (const [x, z] of [[ax, az], [bx, bz]]) colliders.push({ x0: x - 0.15, x1: x + 0.15, z0: z - 0.15, z1: z + 0.15 });
    return makePrayerFlags(new THREE.Vector3(ax, 0, az), new THREE.Vector3(bx, 0, bz));
  });
  scene.add(...flags);

  function groundHeight(x: number, z: number) {
    if (x > H.x0 && x < H.x1 && z > H.z0 && z < H.z1 + 0.3) return H.floorY;
    if (Math.abs(x) < 2 && z >= H.z1 + 0.3 && z < H.z1 + 0.95) return H.floorY / 2;
    return 0;
  }
  function clampToBounds(p: THREE.Vector3) {
    p.x = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, p.x));
    p.z = Math.min(BOUNDS.z1, Math.max(BOUNDS.z0, p.z));
  }

  const dayTop = new THREE.Color(0x86b0d8), dayBottom = new THREE.Color(0xe9e4d4);
  const nightTop = new THREE.Color(0x070b18), nightBottom = new THREE.Color(0x1c2233);
  const dayFog = new THREE.Color(0xd8d5c8), nightFog = new THREE.Color(0x121725);
  let elapsed = 0;

  const world: World = {
    scene, floor, cushions, burner, colliders, groundHeight, clampToBounds, addIncense,
    daylight: 1,
    update(dt, now) {
      elapsed += dt;
      const clock = templeClock(now);
      const day = daylightAt(clock.dayFraction);
      world.daylight = day;
      skyU.top.value.copy(nightTop).lerp(dayTop, day);
      skyU.bottom.value.copy(nightBottom).lerp(dayBottom, day);
      (scene.fog as THREE.Fog).color.copy(nightFog).lerp(dayFog, day);
      (stars.material as THREE.PointsMaterial).opacity = (1 - day) * 0.9;
      const sunAngle = (clock.dayFraction - 0.25) * Math.PI * 2;
      sun.position.set(Math.cos(sunAngle) * -30, Math.max(6, Math.sin(sunAngle) * 40), 18);
      sun.intensity = 0.25 + day * 2.1;
      sun.color.setHex(day > 0.5 ? 0xfff1d8 : 0x9fb0d8);
      hemi.intensity = 0.25 + day * 0.95;
      scene.environmentIntensity = 0.2 + day * 0.4;
      const night = 1 - day;
      for (const l of hallLights) l.intensity = 4 + night * 10;
      pathLight.intensity = 1 + night * 9;
      altarLight.intensity = 20 + night * 20;
      lanternLit.emissiveIntensity = 0.8 + night * 1.6;
      stoneLit.emissiveIntensity = 0.5 + night * 2;

      for (const f of flags) {
        for (const flag of f.children) {
          if (flag.userData.sway !== undefined) flag.rotation.x = Math.sin(elapsed * 2 + flag.userData.sway) * 0.25;
        }
      }
      // incense burns for three minutes
      const life = 180_000;
      for (let i = sticks.length - 1; i >= 0; i--) {
        const age = performance.now() - sticks[i].born;
        if (age > life) {
          scene.remove(sticks[i].mesh);
          sticks.splice(i, 1);
        } else {
          sticks[i].mesh.scale.y = 1 - (age / life) * 0.6;
        }
      }
      const burning = sticks.length > 0;
      for (const sp of smoke) {
        sp.visible = burning;
        if (!burning) continue;
        sp.userData.t = (sp.userData.t + dt * 0.12) % 1;
        const t = sp.userData.t;
        sp.position.set(BURNER.x + Math.sin(t * 9 + elapsed) * 0.12 * t, 1.1 + t * 2.4, BURNER.z + Math.cos(t * 7) * 0.08 * t);
        sp.scale.setScalar(0.15 + t * 0.7);
        sp.material.opacity = 0.35 * (1 - t) * Math.min(1, sticks.length / 2 + 0.5);
      }
    },
  };
  return world;
}
