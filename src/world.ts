import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { std } from './kit/materials';
import { daylightAt, makeSky, makeStars } from './kit/sky';
import { templeClock } from './rooms/clock';
import type { Box2, Cushion, Site, TempleDef } from './rooms/types';

export type { Box2, Cushion };

export interface World {
  scene: THREE.Scene;
  site: Site;
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

/** shared environment (sky, sun, day/night, incense) around a temple's own site */
export function buildWorld(renderer: THREE.WebGLRenderer, temple: TempleDef): World {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(temple.sky?.fog ?? 0xd8d5c8, 30, 140);

  const rng = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

  const { sky, uniforms: skyU } = makeSky();
  scene.add(sky);
  const stars = makeStars();
  scene.add(stars);
  const hemi = new THREE.HemisphereLight(0xdfe8f5, 0x4a4436, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d8, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  const site = temple.buildSite({ scene, temple, rng });
  const BURNER = site.burner.position;

  // incense sticks + smoke over the site's burner
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
    g.position.set(BURNER.x + (Math.random() - 0.5) * 0.4, BURNER.y + 0.68, BURNER.z + (Math.random() - 0.5) * 0.4);
    g.rotation.z = (Math.random() - 0.5) * 0.15;
    scene.add(g);
    sticks.push({ mesh: g, born: performance.now() });
  }

  function clampToBounds(p: THREE.Vector3) {
    const b = site.bounds;
    p.x = Math.min(b.x1, Math.max(b.x0, p.x));
    p.z = Math.min(b.z1, Math.max(b.z0, p.z));
  }

  const dayTop = new THREE.Color(temple.sky?.dayTop ?? 0x86b0d8), dayBottom = new THREE.Color(temple.sky?.dayBottom ?? 0xe9e4d4);
  const nightTop = new THREE.Color(0x070b18), nightBottom = new THREE.Color(0x1c2233);
  const dayFog = new THREE.Color(temple.sky?.fog ?? 0xd8d5c8), nightFog = new THREE.Color(0x121725);
  let elapsed = 0;

  const world: World = {
    scene, site,
    floor: site.floor, cushions: site.cushions, burner: site.burner.object, colliders: site.colliders,
    groundHeight: (x, z) => site.groundHeight(x, z),
    clampToBounds, addIncense,
    daylight: 1,
    update(dt, now) {
      elapsed += dt;
      const clock = templeClock(temple, now);
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
      site.update(dt, 1 - day, elapsed);

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
        sp.position.set(BURNER.x + Math.sin(t * 9 + elapsed) * 0.12 * t, BURNER.y + 1.1 + t * 2.4, BURNER.z + Math.cos(t * 7) * 0.08 * t);
        sp.scale.setScalar(0.15 + t * 0.7);
        sp.material.opacity = 0.35 * (1 - t) * Math.min(1, sticks.length / 2 + 0.5);
      }
    },
  };
  return world;
}
