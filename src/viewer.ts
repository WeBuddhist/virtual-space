// Dev-only statue viewer: /viewer.html?id=bodhgaya&view=front|face|side|back
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TEMPLE_IDS } from '../shared/rooms';
import { loadStatue } from './kit/statue';
import { Avatar, type Pose } from './avatar';
import type { BowStyle } from './rooms/types';

const params = new URLSearchParams(location.search);
const id = params.get('id') ?? 'bodhgaya';

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
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.6, 0);

// sanctum-like light: two warm spots from above-front, a soft fill, a rim from behind
for (const x of [-1.6, 1.6]) {
  const s = new THREE.SpotLight(0xffd29a, 26, 12, 0.5, 0.6, 1.2);
  s.position.set(x, 2.8, 2.6);
  s.target.position.set(0, 0.8, 0);
  s.castShadow = true;
  scene.add(s, s.target);
}
const rim = new THREE.DirectionalLight(0xffb070, 1.2);
rim.position.set(0, 2, -3);
scene.add(rim, new THREE.HemisphereLight(0xfff0dd, 0x2a1a10, 0.35));
const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.12;
floor.receiveShadow = true;
scene.add(floor);

const VIEWS: Record<string, [number, number, number, number]> = {
  front: [0, 0.75, 3.2, 0.6], face: [0, 0.95, 0.75, 0.92], side: [2.6, 0.9, 1.6, 0.6], back: [0, 1.2, -2.8, 0.6], high: [1.4, 2.2, 2.2, 0.55],
};
function setView(name: string) {
  const [x, y, z, ty] = VIEWS[name] ?? VIEWS.front;
  camera.position.set(x, y, z);
  controls.target.set(0, ty, 0);
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
if (!avatar) loadStatue(id, id === 'bodhgaya' || id === 'tibetan' ? 'tibetan-painted' : 'gilt').then((statue) => {
  scene.add(statue);
  let tris = 0;
  statue.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) tris += (m.geometry.index?.count ?? 0) / 3; });
  document.getElementById('info')!.textContent = `${id} · ${Math.round(tris / 1000)}k triangles`;
});

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
