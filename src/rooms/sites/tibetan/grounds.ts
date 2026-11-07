import * as THREE from 'three';
import { noiseCanvas, signboardTexture, stoneTileTexture } from '../../../kit/materials';
import type { Box2 } from '../../types';
import { BURNER_AT, KORA_X, KORA_Z0, KORA_Z1 } from './layout';
import type { Mats } from './mats';
import { Batch, canvasTex, catenary, hippedRoof } from './util';

// The grounds before the Golden Temple: a straight paved approach between low lattice
// railings on red curbs and lamp posts, clipped lawns and hedges, tall columnar Araucaria
// pines and coconut palms, a round pond, the paved forecourt with the incense burner, the
// paved walk round the temple, an arcade of prayer wheels, the gold-roofed monastery gate
// and strings of five-colour prayer flags.

export function buildGrounds(m: Mats, signText: string, rng: () => number) {
  const group = new THREE.Group();
  const b = new Batch();
  const floor: THREE.Object3D[] = [];
  const colliders: Box2[] = [];

  // lawn
  const grassTex = noiseCanvas(256, '#5e9e3c', ['#4f8a32', '#6fae48', '#41752a', '#7cb956']);
  grassTex.repeat.set(70, 70);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  floor.push(ground);

  // paving: the forecourt, the approach and the walk round the temple
  const paveTex = stoneTileTexture();
  paveTex.repeat.set(1, 1);
  const pave = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, map: paveTex, roughness: 0.9 });
  const slab = (x0: number, x1: number, z0: number, z1: number, y = 0.012) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (x1 - x0)) / 4, (uv.getY(i) * (z1 - z0)) / 4);
    const mesh = new THREE.Mesh(g, pave);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    mesh.receiveShadow = true;
    group.add(mesh);
    floor.push(mesh);
  };
  slab(-12.6, 12.6, -12, -3.2);
  slab(-3, 3, -47, -12);
  slab(-KORA_X - 1.3, -KORA_X + 1.3, KORA_Z0, KORA_Z1 + 1.3, 0.011);
  slab(KORA_X - 1.3, KORA_X + 1.3, KORA_Z0, KORA_Z1 + 1.3, 0.011);
  slab(-KORA_X - 1.3, KORA_X + 1.3, KORA_Z1 - 1.3, KORA_Z1 + 1.3, 0.013);
  // the walk to the prayer-wheel arcade and along its wheels
  slab(-20.4, -4.6, -25, -23.2, 0.011);
  slab(-21.4, -19.8, -32.4, -14.6, 0.012);

  // railings: pale lattice panels on a red curb, lamp posts every six metres
  const lattice = canvasTex(256, 128, (g) => {
    g.clearRect(0, 0, 256, 128);
    g.strokeStyle = '#e6e8ea';
    g.lineWidth = 7;
    g.strokeRect(4, 4, 248, 120);
    g.lineWidth = 4;
    for (let x = -128; x < 384; x += 22) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 128, 128); g.stroke();
      g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 128, 0); g.stroke();
    }
  });
  lattice.wrapS = THREE.RepeatWrapping;
  const latticeMat = new THREE.MeshStandardMaterial({ map: lattice, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 });
  const lampPole = new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.5, metalness: 0.4 });
  const globes: THREE.Vector3[] = [];
  for (const s of [-1, 1]) {
    const x = s * 3.25;
    const z0 = -45, z1 = -12.4, len = z1 - z0;
    b.add(new THREE.BoxGeometry(0.28, 0.18, len), m.red, x, 0.09, (z0 + z1) / 2);
    const panel = new THREE.PlaneGeometry(len, 0.55);
    const uv = panel.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 1.6);
    b.add(panel, latticeMat, x, 0.47, (z0 + z1) / 2, Math.PI / 2);
    for (let z = z0; z <= z1 + 0.01; z += 1.6) b.add(new THREE.BoxGeometry(0.07, 0.62, 0.07), m.steel, x, 0.49, z);
    colliders.push({ x0: x - 0.16, x1: x + 0.16, z0, z1 });
    for (let z = z0 + 2; z < z1; z += 6) {
      const lx = s * 3.75;
      b.add(new THREE.CylinderGeometry(0.06, 0.09, 3.4, 8), lampPole, lx, 1.7, z);
      b.add(new THREE.CylinderGeometry(0.12, 0.16, 0.12, 10), lampPole, lx, 3.42, z);
      globes.push(new THREE.Vector3(lx, 3.65, z));
      colliders.push({ x0: lx - 0.15, x1: lx + 0.15, z0: z - 0.15, z1: z + 0.15 });
    }
  }
  const globeMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, emissive: 0xffdca0, emissiveIntensity: 0.05, roughness: 0.3 });
  for (const p of globes) b.add(new THREE.SphereGeometry(0.22, 12, 8), globeMat, p.x, p.y, p.z);

  // clipped hedges along the lawns, topiary cones, flowering shrubs
  const hedge = new THREE.MeshStandardMaterial({ color: 0x3f7a2c, roughness: 0.95 });
  const flowersMats = [0xe0457b, 0xd8303a, 0xf2a33a, 0xf4f0e6].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.7, 0.6, 30), hedge, s * 4.6, 0.3, -28);
    b.add(new THREE.BoxGeometry(8, 0.6, 0.7), hedge, s * 8.6, 0.3, -12.6);
    for (const z of [-40, -32, -24, -16]) {
      b.add(new THREE.ConeGeometry(0.75, 2.4, 12), hedge, s * 6.2, 1.2, z, 0, 0, 0, true);
      b.add(new THREE.CylinderGeometry(0.12, 0.15, 0.4, 8), m.darkWood, s * 6.2, 0.2, z);
    }
    for (let i = 0; i < 14; i++) {
      const x = s * (6 + rng() * 8), z = -44 + rng() * 26;
      const r = 0.45 + rng() * 0.45;
      b.add(new THREE.IcosahedronGeometry(r, 1), hedge, x, r * 0.8, z);
      b.add(new THREE.IcosahedronGeometry(r * 0.5, 0), flowersMats[i % 4], x + r * 0.3, r * 1.25, z - r * 0.3);
    }
    // flower beds against the temple front
    for (let x = 8.2; x < 12.4; x += 0.9) {
      b.add(new THREE.IcosahedronGeometry(0.42, 1), hedge, s * x, 0.35, -2.2);
      b.add(new THREE.IcosahedronGeometry(0.22, 0), flowersMats[Math.round(x) % 4], s * x, 0.7, -2.4);
    }
  }

  // Araucaria (Cook pines): tall narrow columns of tiered, drooping branch whorls
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x2f4f2a, roughness: 0.95 });
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 1 });
  const pines: [number, number, number][] = [[-9.5, -13.5, 15], [9.5, -13.5, 15.5], [-15.5, -22, 13], [15.5, -21, 14], [-16, 18, 14], [16.5, 20, 15], [-31, 2, 13], [25, 11, 14]];
  for (const [x, z, h] of pines) {
    b.add(new THREE.CylinderGeometry(0.12, 0.3, h, 8), bark, x, h / 2, z, 0, 0, 0, true);
    const tiers = Math.round(h / 0.9);
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const y = 2.5 + t * (h - 2.5);
      const r = 1.6 * (1 - t * 0.75) + 0.25;
      b.add(new THREE.ConeGeometry(r, 0.85, 9, 1, true), pineMat, x, y, z, i * 0.7, 0, 0, i % 3 === 0);
    }
    colliders.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4 });
  }
  // coconut palms
  const frond = new THREE.MeshStandardMaterial({ color: 0x4f7f2e, roughness: 0.9, side: THREE.DoubleSide });
  const palms: [number, number][] = [[-12, -19], [12.5, -18], [-20, -6], [21, -8], [-27, 14], [27, 22], [-6, 27], [7, 28]];
  for (const [x, z] of palms) {
    const h = 7 + rng() * 3, lean = (rng() - 0.5) * 0.5;
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.5, h * 0.5, 0), new THREE.Vector3(lean * 1.5, h, 0.2)];
    b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.16, 7), bark, x, 0, z, 0, 0, 0, true);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const leafGeo = new THREE.PlaneGeometry(0.5, 3.2, 1, 4);
      const p = leafGeo.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < p.count; k++) { const yy = p.getY(k) + 1.6; p.setZ(k, -0.12 * yy * yy); p.setX(k, p.getX(k) * (1 - yy / 3.4)); }
      leafGeo.translate(0, 1.6, 0);
      b.add(leafGeo, frond, x + lean * 1.5, h, z + 0.2, a, 1.1, 0, true);
    }
    colliders.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 });
  }

  // the round pond with a stone rim
  const pond = new THREE.Vector3(-17.5, 0, -8.5);
  b.add(new THREE.TorusGeometry(2.7, 0.22, 8, 40), m.stone, pond.x, 0.12, pond.z, 0, Math.PI / 2);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), new THREE.MeshStandardMaterial({ color: 0x3d5a4c, roughness: 0.05, metalness: 0.3 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(pond.x, 0.08, pond.z);
  group.add(water);
  colliders.push({ x0: pond.x - 2.9, x1: pond.x + 2.9, z0: pond.z - 2.9, z1: pond.z + 2.9 });

  // the prayer-wheel arcade: a cream colonnade with a red roof, wheels turned clockwise
  const wheelTex = canvasTex(512, 256, (g) => {
    g.fillStyle = '#7a1f2b';
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#d9a93a';
    g.fillRect(0, 0, 512, 34); g.fillRect(0, 222, 512, 34);
    g.fillStyle = '#1e4fa0';
    g.fillRect(0, 34, 512, 16); g.fillRect(0, 206, 512, 16);
    g.fillStyle = '#f2c230';
    g.font = '600 64px "Noto Serif Tibetan", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ།', 256, 130);
  });
  const wheelMat = new THREE.MeshStandardMaterial({ map: wheelTex, roughness: 0.5, metalness: 0.2 });
  const AR = { x: -22, z0: -32, z1: -15 };
  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.1, 24);
  for (let z = AR.z0 + 1.2; z < AR.z1 - 0.6; z += 1.5) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(AR.x + 0.4, 1.0, z);
    w.castShadow = true;
    group.add(w);
    wheels.push(w);
    b.add(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), m.red, AR.x + 0.4, 1.2, z);
  }
  for (let z = AR.z0; z <= AR.z1 + 0.01; z += 3.4) b.add(new THREE.BoxGeometry(0.4, 2.6, 0.4), m.cream, AR.x + 1.3, 1.3, z, 0, 0, 0, true);
  b.add(new THREE.BoxGeometry(0.3, 2.6, AR.z1 - AR.z0), m.cream, AR.x - 0.6, 1.3, (AR.z0 + AR.z1) / 2, 0, 0, 0, true);
  b.add(new THREE.BoxGeometry(2.6, 0.3, AR.z1 - AR.z0 + 0.6), m.maroon, AR.x + 0.35, 2.75, (AR.z0 + AR.z1) / 2, 0, 0, 0, true);
  b.add(hippedRoof(3.4, AR.z1 - AR.z0 + 1.2, 0.9, 0.2), m.roofGold, AR.x + 0.35, 2.9, (AR.z0 + AR.z1) / 2, Math.PI / 2 * 0, 0, 0, true);
  colliders.push({ x0: AR.x - 0.8, x1: AR.x + 0.95, z0: AR.z0, z1: AR.z1 });

  // the Big Bell pavilion
  const BB = new THREE.Vector3(21, 0, -27);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(new THREE.CylinderGeometry(0.14, 0.16, 3.2, 10), m.red, BB.x + sx * 1.3, 1.6, BB.z + sz * 1.3, 0, 0, 0, true);
  b.add(hippedRoof(3.8, 3.8, 1.5, 0.35), m.roofGold, BB.x, 3.2, BB.z, 0, 0, 0, true);
  const bronze = new THREE.MeshStandardMaterial({ color: 0x6f5a3a, metalness: 0.85, roughness: 0.4 });
  b.add(new THREE.LatheGeometry([[0, 1.2], [0.25, 1.15], [0.45, 0.9], [0.55, 0.3], [0.68, 0], [0.6, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 20), bronze, BB.x, 1.6, BB.z, 0, 0, 0, true);
  colliders.push({ x0: BB.x - 1.5, x1: BB.x + 1.5, z0: BB.z - 1.5, z1: BB.z + 1.5 });

  // the monastery gate: red and blue pillars, golden roofs with three finials, the name
  const GZ = -46;
  for (const x of [-4.4, -1.7, 1.7, 4.4]) {
    b.add(new THREE.BoxGeometry(0.55, 4.2, 0.55), Math.abs(x) < 2 ? m.red : m.blue, x, 2.1, GZ, 0, 0, 0, true);
    b.add(new THREE.BoxGeometry(0.75, 0.3, 0.75), m.white, x, 0.15, GZ);
    colliders.push({ x0: x - 0.35, x1: x + 0.35, z0: GZ - 0.35, z1: GZ + 0.35 });
  }
  b.add(new THREE.BoxGeometry(4.0, 1.1, 0.7), m.lintel, 0, 4.75, GZ);
  b.add(hippedRoof(5.6, 2.2, 1.3, 0.22), m.roofGold, 0, 5.3, GZ, 0, 0, 0, true);
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(3.0, 0.8, 0.6), m.lintel, s * 3.1, 3.9, GZ);
    b.add(hippedRoof(3.4, 1.8, 0.9, 0.15), m.roofGold, s * 3.1, 4.3, GZ, 0, 0, 0, true);
  }
  for (const x of [-1.6, 0, 1.6]) {
    b.add(new THREE.SphereGeometry(0.2, 10, 8), m.gold, x, 6.7 - Math.abs(x) * 0.2, GZ);
    b.add(new THREE.ConeGeometry(0.14, 0.6, 10), m.gold, x, 7.1 - Math.abs(x) * 0.2, GZ);
  }
  const signMat = new THREE.MeshBasicMaterial({ map: signboardTexture(signText) });
  for (const [z, ry] of [[GZ - 0.36, Math.PI], [GZ + 0.36, 0]] as const) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.75), signMat);
    sign.position.set(0, 4.75, z);
    sign.rotation.y = ry;
    group.add(sign);
  }

  // prayer flags: strings of five colours from the gate and between the pines
  const flagColors = [0x1e4fa0, 0xf4f1e8, 0xc0272d, 0x1e8c4e, 0xf2c230];
  const strings: [THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(-4.4, 6.2, GZ), new THREE.Vector3(-9.5, 9, -13.5)],
    [new THREE.Vector3(4.4, 6.2, GZ), new THREE.Vector3(9.5, 9, -13.5)],
    [new THREE.Vector3(-9.5, 8, -13.5), new THREE.Vector3(-15.5, 7.5, -22)],
    [new THREE.Vector3(9.5, 8, -13.5), new THREE.Vector3(15.5, 7.5, -21)],
    [new THREE.Vector3(-9.5, 10, -13.5), new THREE.Vector3(-0.1, 13.6, -0.7)],
    [new THREE.Vector3(9.5, 10, -13.5), new THREE.Vector3(0.1, 13.6, -0.7)],
  ];
  const flagGeo = new THREE.PlaneGeometry(0.34, 0.42);
  flagGeo.translate(0, -0.21, 0);
  let count = 0;
  const stringPts = strings.map(([a, c]) => catenary(a, c, a.distanceTo(c) * 0.06, Math.round(a.distanceTo(c) / 0.45)));
  for (const pts of stringPts) count += pts.length;
  const flags = new THREE.InstancedMesh(flagGeo, new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }), count);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  const flagBase: { p: THREE.Vector3; yaw: number; phase: number }[] = [];
  let k = 0;
  for (const pts of stringPts) {
    const a = pts[0], c = pts[pts.length - 1];
    const yaw = Math.atan2(c.x - a.x, c.z - a.z) + Math.PI / 2;
    pts.forEach((p, i) => {
      q.setFromEuler(new THREE.Euler(0, yaw, 0));
      mtx.compose(p, q, new THREE.Vector3(1, 1, 1));
      flags.setMatrixAt(k, mtx);
      flags.setColorAt(k, col.setHex(flagColors[i % 5]));
      flagBase.push({ p: p.clone(), yaw, phase: rng() * 10 });
      k++;
    });
  }
  group.add(flags);
  // darchor: tall poles with long vertical flags beside the forecourt
  for (const [x, z, c] of [[-12, -11, 0xc0272d], [12, -11, 0x1e4fa0], [-12.4, -4, 0xf2c230], [12.4, -4, 0x1e8c4e]] as const) {
    b.add(new THREE.CylinderGeometry(0.06, 0.08, 9, 8), m.darkWood, x, 4.5, z, 0, 0, 0, true);
    b.add(new THREE.ConeGeometry(0.15, 0.4, 8), m.gold, x, 9.1, z);
    const fm = new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide });
    b.add(new THREE.PlaneGeometry(0.7, 6), fm, x + Math.sign(x) * 0.36, 5.6, z, Math.PI / 2);
    colliders.push({ x0: x - 0.2, x1: x + 0.2, z0: z - 0.2, z1: z + 0.2 });
  }

  // the incense burner in the forecourt
  const burner = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08d3a, metalness: 0.85, roughness: 0.38 });
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.5, 0.75, 24), brass);
  bowl.position.y = 0.88;
  const lid = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.85, 8), brass);
  lid.position.y = 1.7;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), brass);
  finial.position.y = 2.2;
  burner.add(bowl, lid, finial);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.6, 8), brass);
    leg.position.set(Math.cos(a) * 0.42, 0.3, Math.sin(a) * 0.42);
    burner.add(leg);
  }
  burner.traverse((o) => { o.castShadow = true; o.userData.burner = true; });
  burner.position.copy(BURNER_AT);
  group.add(burner);
  colliders.push({ x0: BURNER_AT.x - 0.9, x1: BURNER_AT.x + 0.9, z0: BURNER_AT.z - 0.9, z1: BURNER_AT.z + 0.9 });

  // a ring of trees and low monastery buildings closing the view behind the temple
  const quarters = new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 0.95 });
  const tile = new THREE.MeshStandardMaterial({ color: 0xa8432e, roughness: 0.85, side: THREE.DoubleSide });
  for (const [x, z, w, d] of [[-26, 32, 18, 7], [0, 36, 20, 7], [26, 32, 18, 7], [-31, -16, 6, 14], [31, -16, 6, 14]] as const) {
    b.add(new THREE.BoxGeometry(w, 5, d), quarters, x, 2.5, z, 0, 0, 0, true);
    b.add(hippedRoof(w + 1, d + 1, 1.8, 0.15), tile, x, 5, z);
  }
  const tree = new THREE.MeshStandardMaterial({ color: 0x3c6b2c, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const x = Math.cos(a) * (40 + rng() * 6), z = 2 + Math.sin(a) * (44 + rng() * 6);
    if (Math.abs(x) < 16 && z < 0) continue;
    const r = 3 + rng() * 2.5;
    b.add(new THREE.CylinderGeometry(0.2, 0.3, 4, 6), bark, x, 2, z);
    b.add(new THREE.IcosahedronGeometry(r, 1), tree, x, 4 + r * 0.7, z, rng() * 3, 0, 0, true);
  }

  b.build(group);

  return {
    group, floor, colliders, burner,
    update(night: number, elapsed: number) {
      globeMat.emissiveIntensity = 0.05 + night * 2.2;
      // wheels turn clockwise seen from above (negative about +y)
      for (let i = 0; i < wheels.length; i++) wheels[i].rotation.y -= 0.004 + (i % 3) * 0.001;
      // the flags stir in the breeze
      for (let i = 0; i < flagBase.length; i++) {
        const f = flagBase[i];
        q.setFromEuler(new THREE.Euler(Math.sin(elapsed * 2.2 + f.phase) * 0.3, f.yaw, 0, 'YXZ'));
        mtx.compose(f.p, q, new THREE.Vector3(1, 1, 1));
        flags.setMatrixAt(i, mtx);
      }
      flags.instanceMatrix.needsUpdate = true;
    },
  };
}
