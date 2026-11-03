import * as THREE from 'three';
import type { StatueDef } from '../rooms/types';
import { box, std } from './materials';

/** altar backdrop: a calm thangka-style wall painting drawn at runtime */
export function altarWallTexture(statues: StatueDef[]) {
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

export function makeStatue(def: StatueDef) {
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

export function makePine(rng: () => number) {
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

export function makePrayerFlags(a: THREE.Vector3, b: THREE.Vector3) {
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

export function makeLantern(lit: THREE.Material, frame: THREE.Material) {
  const g = new THREE.Group();
  g.add(box(0.26, 0.36, 0.26, lit, 0, 0, 0));
  g.add(box(0.32, 0.04, 0.32, frame, 0, 0.2, 0));
  g.add(box(0.32, 0.04, 0.32, frame, 0, -0.2, 0));
  return g;
}

export function makeStoneLantern(lit: THREE.Material) {
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
