// Dev-only statue viewer: /viewer.html?id=bodhgaya&view=front|face|side|back
// Side by side: /viewer.html?compare=bodhgaya,bodhgaya-kimi,bodhgaya-gemini,bodhgaya-claude
// Entries ending in .ply/.spz are Gaussian splats from /splats/. Raw image-to-3D output
// needs &splatRot=x90|x180 &splatYaw=-90 &splatScale=1.3 &splatY=0.53.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TEMPLE_IDS } from '../shared/rooms';
import { loadStatue } from './kit/statue';
import { Avatar, type Pose } from './avatar';
import type { BowStyle } from './rooms/types';

const params = new URLSearchParams(location.search);
const id = params.get('id') ?? 'bodhgaya';
const ids = params.get('compare')?.split(',').filter(Boolean) ?? [id];
const GAP = 1.7;
/** x of the i-th statue in a side-by-side row */
const slot = (i: number) => (i - (ids.length - 1) / 2) * GAP;
const wide = Math.max(1, ids.length * 0.7);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1310);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
if (ids.some((s) => /\.(ply|spz)$/.test(s))) scene.add(new SparkRenderer({ renderer }));
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.6, 0);

// sanctum-like light: two warm spots from above-front, a soft fill, a rim from behind
ids.forEach((_, i) => {
  for (const x of [-1.6, 1.6]) {
    const s = new THREE.SpotLight(0xffd29a, 26, 12, 0.5, 0.6, 1.2);
    s.position.set(slot(i) + x, 2.8, 2.6);
    s.target.position.set(slot(i), 0.8, 0);
    s.castShadow = ids.length === 1;
    scene.add(s, s.target);
  }
});
const rim = new THREE.DirectionalLight(0xffb070, 1.2);
rim.position.set(0, 2, -3);
scene.add(rim, new THREE.HemisphereLight(0xfff0dd, 0x2a1a10, 0.35));
const floor = new THREE.Mesh(new THREE.CircleGeometry(3 * wide, 48), new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.12;
floor.receiveShadow = true;
scene.add(floor);

const VIEWS: Record<string, [number, number, number, number]> = {
  front: [0, 0.75, 3.2, 0.6], face: [0, 0.95, 0.75, 0.92], side: [2.6, 0.9, 1.6, 0.6], back: [0, 1.2, -2.8, 0.6], high: [1.4, 2.2, 2.2, 0.55],
};
let focus = 0; // x of the statue the close views look at
function setView(name: string) {
  const [x, y, z, ty] = VIEWS[name] ?? VIEWS.front;
  // the overview views pull back to fit the whole row; the face view frames one statue
  const k = name === 'face' ? 1 : wide;
  const cx = name === 'face' ? focus : 0;
  camera.position.set(cx + x * k, y, z * k);
  controls.target.set(cx, ty, 0);
  controls.update();
  document.querySelectorAll('#ui [data-view]').forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.view === name)));
}

const ui = document.getElementById('ui')!;
for (const t of TEMPLE_IDS) {
  const b = document.createElement('button');
  b.textContent = t;
  b.setAttribute('aria-pressed', String(t === id));
  b.onclick = () => { params.set('id', t); location.search = params.toString(); };
  ui.append(b);
}
for (const v of Object.keys(VIEWS)) {
  const b = document.createElement('button');
  b.textContent = v;
  b.dataset.view = v;
  b.onclick = () => setView(v);
  ui.append(b);
}

const avatar = params.has('avatar') ? new Avatar() : null;
if (avatar) {
  scene.add(avatar.root);
  controls.target.set(0, 0.55, 0);
  camera.position.set(1.6, 1.0, 2.2);
  const poses: (Pose | BowStyle)[] = ['idle', 'walk', 'kneel', 'beads', 'palms', 'tibetan-prostration', 'five-point', 'east-asian-bow', 'standing-bow'];
  for (const p of poses) {
    const b = document.createElement('button');
    b.textContent = p;
    b.onclick = () => {
      if (p.includes('-')) { avatar.setPose('idle'); avatar.setBowStyle(p as BowStyle); avatar.setPose('bow'); }
      else avatar.setPose(p as Pose);
      avatar.speed = p === 'walk' ? 1 : 0;
    };
    ui.append(b);
  }
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => { avatar.update(clock.getDelta()); controls.update(); renderer.render(scene, camera); });
}
if (!avatar) {
  const info: string[] = ids.map((s) => s);
  ids.forEach((sid, i) => {
    if (ids.length > 1) {
      const b = document.createElement('button');
      b.textContent = `face: ${sid}`;
      b.onclick = () => { focus = slot(i); setView('face'); };
      ui.append(b);
    }
    if (/\.(ply|spz)$/.test(sid)) {
      const splat = new SplatMesh({ url: `/splats/${sid}` });
      const rot = params.get('splatRot') ?? '';
      const tilt = { x90: -Math.PI / 2, 'x-90': Math.PI / 2, x180: Math.PI }[rot] ?? 0;
      // tilt upright first, then turn to face +z (yaw in degrees, world axis)
      splat.rotation.order = 'YXZ';
      splat.rotation.set(tilt, THREE.MathUtils.degToRad(Number(params.get('splatYaw') ?? 0)), 0);
      // cleaned splats (splat_clean.py) are already in statue space; raw unit-cube output
      // needs &splatScale=1.3&splatY=0.53
      splat.scale.setScalar(Number(params.get('splatScale') ?? 1));
      splat.position.set(slot(i), Number(params.get('splatY') ?? -0.12), 0);
      scene.add(splat);
      info[i] = `${sid} · splat`;
      document.getElementById('info')!.textContent = info.join('   |   ');
      return;
    }
    loadStatue(sid, sid.startsWith('bodhgaya') || sid === 'tibetan' ? 'tibetan-painted' : 'gilt').then((statue) => {
      statue.position.x = slot(i);
      scene.add(statue);
      let tris = 0;
      statue.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) tris += (m.geometry.index?.count ?? 0) / 3; });
      info[i] = `${sid} · ${Math.round(tris / 1000)}k`;
      document.getElementById('info')!.textContent = info.join('   |   ');
    }).catch(() => { info[i] = `${sid} · missing`; document.getElementById('info')!.textContent = info.join('   |   '); });
  });
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
if (!avatar) {
  setView(params.get('view') ?? 'front');
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
}
