import * as THREE from 'three';
import { canvasTex, photoMat } from './util';

// Shared materials for the Namdroling site (palette from reference §7).

export function makeMats() {
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a93a, metalness: 0.9, roughness: 0.3 });
  const roofGold = new THREE.MeshStandardMaterial({ color: 0xd6a632, metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide });
  const red = new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.5 });
  const darkRed = new THREE.MeshStandardMaterial({ color: 0x7a1a14, roughness: 0.6 });
  const maroon = new THREE.MeshStandardMaterial({ color: 0x5a2a26, roughness: 0.85 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xede2c0, roughness: 0.92 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.9 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x2f5da8, roughness: 0.7 });
  const deepBlue = new THREE.MeshStandardMaterial({ color: 0x1f3e8f, roughness: 0.6 });
  const teal = new THREE.MeshStandardMaterial({ color: 0x2e8c8a, roughness: 0.55 });
  const green = new THREE.MeshStandardMaterial({ color: 0x2f8f6b, roughness: 0.55 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3220, roughness: 0.6 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x2a1d18, roughness: 0.7 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.9, roughness: 0.25 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xdfe8ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false });
  const stone = new THREE.MeshStandardMaterial({ color: 0xbdb6a6, roughness: 0.85 });

  // photo textures (public/textures/tibetan, see scripts/textures/sets/tibetan.ts)
  const floor = photoMat('floor.jpg', 0x9a948c, { repeat: [2, 2.2], keepColor: true }, { roughness: 0.2, metalness: 0.1, envMapIntensity: 0.55 });
  const facade = photoMat('facade.jpg', 0xede2c0, { repeat: [1, 1] }, { roughness: 0.92 });
  const blueWall = photoMat('blue-wall.jpg', 0x2f5da8, {}, { roughness: 0.75 });
  const parapet = photoMat('parapet.jpg', 0x5a2a26, {}, { roughness: 0.8 });
  const lintel = photoMat('porch-lintel.jpg', 0x8a1e18, {}, { roughness: 0.65 });
  const altarBand = photoMat('altar-band.jpg', 0x1f3e8f, {}, { roughness: 0.5, metalness: 0.2 });
  const cases = photoMat('glass-cases.jpg', 0x8a6a40, {}, { roughness: 0.25, emissive: 0xffffff, emissiveIntensity: 0.0 });
  const brocade = photoMat('brocade.jpg', 0xc0272d, {}, { roughness: 0.6 });
  const dragon = photoMat('dragon-pillar.jpg', 0xb3261e, {}, { roughness: 0.45, metalness: 0.15 });
  const skyMural = photoMat('sky-mural.jpg', 0x3b6fb6, {}, { roughness: 0.85 });
  const sideMural = photoMat('side-mural.jpg', 0x6a7a5a, {}, { roughness: 0.85 });
  const shambu = photoMat('shambu.jpg', 0xc0272d, {}, { roughness: 0.75, side: THREE.DoubleSide });
  const rug = photoMat('rug.jpg', 0xb3261e, {}, { roughness: 0.95 });
  const thangka = photoMat('thangka.png', 0xb3261e, {}, { roughness: 0.7, transparent: true, alphaTest: 0.5 });
  const torana = photoMat('torana.png', 0xd9a93a, {}, { roughness: 0.35, metalness: 0.55, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const halo = photoMat('halo-round.png', 0xd9a93a, {}, { roughness: 0.35, metalness: 0.5, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });

  // glowing glass of the clerestory windows and lamps
  const window = new THREE.MeshStandardMaterial({ color: 0xcfe3f0, emissive: 0xdfeefa, emissiveIntensity: 0.9, roughness: 0.2 });
  const lampGlow = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd28a, emissiveIntensity: 1.2 });
  const flame = new THREE.MeshBasicMaterial({ color: 0xffb347 });

  // the painted ceiling grid: dark blue and red coffers ruled in gold
  const ceilingTex = canvasTex(512, 512, (g) => {
    g.fillStyle = '#1b2a4a';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * 128, y = j * 128;
      g.fillStyle = (i + j) % 2 ? '#7a1f1a' : '#1f3e6f';
      g.fillRect(x + 12, y + 12, 104, 104);
      g.strokeStyle = '#d9a93a';
      g.lineWidth = 3;
      g.strokeRect(x + 20, y + 20, 88, 88);
      g.fillStyle = '#2e8c8a';
      g.beginPath(); g.arc(x + 64, y + 64, 22, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d9a93a';
      g.beginPath(); g.arc(x + 64, y + 64, 9, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#c9963a';
    g.lineWidth = 8;
    for (let k = 0; k <= 512; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
  });
  ceilingTex.wrapS = ceilingTex.wrapT = THREE.RepeatWrapping;
  const ceiling = new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 0.8 });

  return {
    gold, roofGold, red, darkRed, maroon, cream, white, blue, deepBlue, teal, green, wood, darkWood, steel, glass, stone,
    floor, facade, blueWall, parapet, lintel, altarBand, cases, brocade, dragon, skyMural, sideMural, shambu, rug, thangka,
    torana, halo, window, lampGlow, flame, ceiling,
  };
}
export type Mats = ReturnType<typeof makeMats>;
