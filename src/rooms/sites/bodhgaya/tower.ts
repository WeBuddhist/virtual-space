import * as THREE from 'three';
import { photo } from '../../../kit/textures';

const TEX = '/textures/bodhgaya/';

// The Mahabodhi tower: a straight-sided shikhara of buff sandstone-stucco covered in
// bands of chaitya-arch niches, with projecting central ribs, four corner towers and
// a gilded top (amalaka, kalasha, chattra). Origin: the east door; +x east.

export const TEMPLE = { x0: -14.6, x1: 0, z0: -7.3, z1: 7.3, baseH: 11 };
/** the sanctum (x0…x1) and the vestibule passage (x1…0) inside the lower storey */
export const SANCTUM = { x0: -10.5, x1: -4.5, halfW: 3, ceiling: 7, door: 0.9, doorH: 3.4 };

/** walls of the tower and porch, for collisions (the door and passage stay open) */
export const TOWER_COLLIDERS = [
  { x0: TEMPLE.x0 - 0.4, x1: TEMPLE.x1 + 0.2, z0: TEMPLE.z0 - 0.4, z1: -SANCTUM.halfW },
  { x0: TEMPLE.x0 - 0.4, x1: TEMPLE.x1 + 0.2, z0: SANCTUM.halfW, z1: TEMPLE.z1 + 0.4 },
  { x0: TEMPLE.x0 - 0.4, x1: SANCTUM.x0, z0: -SANCTUM.halfW, z1: SANCTUM.halfW },
  { x0: SANCTUM.x1, x1: 4, z0: -SANCTUM.halfW - 0.1, z1: -SANCTUM.door },
  { x0: SANCTUM.x1, x1: 4, z0: SANCTUM.door, z1: SANCTUM.halfW + 0.1 },
];
export const GOLD_TOP = new THREE.MeshStandardMaterial({ color: 0xd9a93c, metalness: 1, roughness: 0.25 });

/** niche bands: rows of horseshoe arches, each holding a tiny seated figure */
function nicheTexture(rows: number, cols: number) {
  const W = 1024, H = 1024;
  const make = (bump: boolean) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    g.fillStyle = bump ? '#808080' : '#c09a66';
    g.fillRect(0, 0, W, H);
    const rh = H / rows, cw = W / cols;
    for (let r = 0; r < rows; r++) {
      const y0 = r * rh;
      // moulding between bands
      g.fillStyle = bump ? '#e8e8e8' : '#d6b27a';
      g.fillRect(0, y0, W, rh * 0.12);
      g.fillStyle = bump ? '#202020' : '#6e5236';
      g.fillRect(0, y0 + rh * 0.12, W, rh * 0.03);
      for (let k = 0; k < cols; k++) {
        const cx = k * cw + cw / 2, top = y0 + rh * 0.22, bot = y0 + rh * 0.95, hw = cw * 0.32;
        // recessed niche with a horseshoe arch
        g.fillStyle = bump ? '#101010' : '#5a4128';
        g.beginPath();
        g.moveTo(cx - hw, bot);
        g.lineTo(cx - hw, top + hw);
        g.arc(cx, top + hw, hw, Math.PI, 0);
        g.lineTo(cx + hw, bot);
        g.closePath();
        g.fill();
        // gavaksha rim
        g.strokeStyle = bump ? '#f0f0f0' : '#d9b77f';
        g.lineWidth = cw * 0.05;
        g.beginPath();
        g.arc(cx, top + hw, hw * 1.12, Math.PI * 1.05, -Math.PI * 0.05);
        g.stroke();
        // seated figure in the niche
        g.fillStyle = bump ? '#c0c0c0' : '#b38b55';
        g.beginPath(); g.arc(cx, top + hw * 1.25, hw * 0.22, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(cx, bot - hw * 0.55, hw * 0.55, hw * 0.45, 0, Math.PI, 0); g.fill();
      }
    }
    // weathering
    if (!bump) {
      for (let i = 0; i < 2200; i++) {
        g.fillStyle = `rgba(${Math.random() > 0.5 ? '60,50,40' : '230,215,185'},${0.03 + Math.random() * 0.05})`;
        g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 14, 2 + Math.random() * 10);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (!bump) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: make(false), bump: make(true) };
}

/** a square frustum (no top/bottom) with per-face UVs repeating `bands` times up its height */
function frustum(bottom: number, top: number, height: number, bands: number, uRepeat = 1) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const hb = bottom / 2, ht = top / 2;
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  for (let f = 0; f < 4; f++) {
    const [ax, az] = corners[f], [bx, bz] = corners[(f + 1) % 4];
    const base = pos.length / 3;
    pos.push(ax * hb, 0, az * hb, bx * hb, 0, bz * hb, bx * ht, height, bz * ht, ax * ht, height, az * ht);
    const topU = (top / bottom) * uRepeat;
    const off = (uRepeat - topU) / 2;
    uv.push(0, 0, uRepeat, 0, off + topU, bands, off, bands);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** the crowning pieces: neck, ribbed amalaka, kalasha and umbrella mast */
function crown(scale: number) {
  const g = new THREE.Group();
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 2, 24), GOLD_TOP);
  neck.position.y = 1;
  const amalaka = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.55, 12, 36), GOLD_TOP);
  amalaka.rotation.x = Math.PI / 2;
  amalaka.position.y = 2.5;
  const ribs = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.1, 36, 1, true), GOLD_TOP);
  ribs.position.y = 2.5;
  const kalasha = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 14), GOLD_TOP);
  kalasha.position.y = 4.1;
  const mast = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4, 12), GOLD_TOP);
  mast.position.y = 6.6;
  g.add(neck, amalaka, ribs, kalasha, mast);
  for (let i = 0; i < 3; i++) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9 - i * 0.22, 0.9 - i * 0.22, 0.12, 20), GOLD_TOP);
    disc.position.y = 5.3 + i * 0.8;
    g.add(disc);
  }
  g.scale.setScalar(scale);
  return g;
}

export function buildTower() {
  const group = new THREE.Group();
  const T = TEMPLE;
  const cx = (T.x0 + T.x1) / 2;
  const tex = nicheTexture(6, 8);
  const stone = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex.map, bumpMap: tex.bump, bumpScale: 6, roughness: 0.95 });
  const plain = new THREE.MeshStandardMaterial({ color: 0xbf9d6c, roughness: 0.95 });
  // photo textures (scripts/textures): the niche photo holds three bands per tile
  photo(stone, TEX + 'tower-niches.jpg', { repeat: [1, 1 / 3], bump: 4 });
  photo(plain, TEX + 'stucco.jpg', { repeat: [3, 2], mirror: true, bump: 1.5 });

  // lower storey: solid masonry around a doorway, a vestibule and the sanctum
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, mat: THREE.Material = plain) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  };
  const S = SANCTUM;
  slab(T.x0, T.x1, T.z0, -S.halfW, 0, T.baseH); // north mass
  slab(T.x0, T.x1, S.halfW, T.z1, 0, T.baseH); // south mass
  slab(T.x0, S.x0, -S.halfW, S.halfW, 0, T.baseH); // west mass behind the shrine
  slab(S.x0, T.x1, -S.halfW, S.halfW, S.ceiling, T.baseH); // above the sanctum and vestibule
  // the vestibule: a narrow passage from the door to the sanctum
  const soot = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 1 });
  slab(S.x1, T.x1, -S.halfW, -S.door, 0, S.ceiling, soot);
  slab(S.x1, T.x1, S.door, S.halfW, 0, S.ceiling, soot);
  slab(S.x1, T.x1, -S.door, S.door, S.doorH, S.ceiling, soot);
  // dark, lamp-smoked lining inside the sanctum
  const lining = new THREE.Mesh(new THREE.BoxGeometry(S.x1 - S.x0 - 0.04, S.ceiling - 0.04, S.halfW * 2 - 0.04), new THREE.MeshStandardMaterial({ color: 0x3b322b, roughness: 1, side: THREE.BackSide }));
  lining.position.set((S.x0 + S.x1) / 2, S.ceiling / 2, 0);
  lining.receiveShadow = true;
  group.add(lining);
  const bandTex = nicheTexture(1, 8);
  const bandMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: bandTex.map, bumpMap: bandTex.bump, bumpScale: 3, roughness: 0.95 });
  bandTex.map.repeat.set(2, 1);
  bandTex.bump.repeat.set(2, 1);
  photo(bandMat, TEX + 'tower-niches.jpg', { repeat: [3.5, 1 / 3], bump: 4 });
  const band = new THREE.Mesh(new THREE.BoxGeometry(T.x1 - T.x0 + 0.3, 3.2, T.z1 - T.z0 + 0.3), bandMat);
  band.position.set(cx, 6.6, 0);
  group.add(band);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(T.x1 - T.x0 + 0.6, 0.6, T.z1 - T.z0 + 0.6), plain);
  parapet.position.set(cx, T.baseH + 0.3, 0);
  group.add(parapet);

  // main shikhara, with a projecting central rib on each face
  const H = 36;
  const main = new THREE.Mesh(frustum(10, 4.5, H, 9, 1.4), stone);
  main.position.set(cx, T.baseH, 0);
  main.castShadow = true;
  group.add(main);
  const rib = new THREE.Mesh(frustum(5.2, 2.4, H, 9, 0.7), stone);
  for (const [dx, dz] of [[0.55, 0], [-0.55, 0], [0, 0.55], [0, -0.55]]) {
    const r = rib.clone();
    r.position.set(cx + dx * 2.4, T.baseH, dz * 2.4);
    r.scale.set(dx ? 0.35 : 1, 1, dz ? 0.35 : 1);
    group.add(r);
  }
  // the tall arched window on the east face that lights the upper hall
  // a tall pointed-arch opening with a carved frame
  const arch = (w: number, h: number) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -h / 2);
    s.lineTo(w / 2, -h / 2);
    s.lineTo(w / 2, h / 2 - w * 0.7);
    s.quadraticCurveTo(w / 2, h / 2 - w * 0.15, 0, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2 - w * 0.15, -w / 2, h / 2 - w * 0.7);
    s.closePath();
    return new THREE.ShapeGeometry(s, 12);
  };
  const win = new THREE.Mesh(arch(1.6, 7), new THREE.MeshStandardMaterial({ color: 0x1e1610, roughness: 1 }));
  const frameMesh = new THREE.Mesh(arch(2.4, 8), plain);
  frameMesh.position.z = -0.04;
  win.add(frameMesh);
  // the east face leans back by atan(2.75 / H); 6 m up it sits 4.54 m from the axis
  win.position.set(cx + 5 - 2.75 * (6 / H) + 0.05, T.baseH + 6, 0);
  win.rotation.y = Math.PI / 2;
  win.rotateX(-Math.atan2(2.75, H));
  group.add(win);
  const top = crown(1);
  top.position.set(cx, T.baseH + H, 0);
  group.add(top);

  // four corner towers on the terrace
  for (const [x, z] of [[T.x0 + 1.8, T.z0 + 1.8], [T.x0 + 1.8, T.z1 - 1.8], [T.x1 - 1.8, T.z0 + 1.8], [T.x1 - 1.8, T.z1 - 1.8]]) {
    const t = new THREE.Mesh(frustum(3.2, 1.4, 9, 3, 0.6), stone);
    t.position.set(x, T.baseH + 0.6, z);
    t.castShadow = true;
    group.add(t);
    const c = crown(0.32);
    c.position.set(x, T.baseH + 9.6, z);
    group.add(c);
  }

  // east porch with its doorway
  const porchMat = photo(new THREE.MeshStandardMaterial({ color: 0xbfa985, roughness: 0.9 }), TEX + 'stucco.jpg', { mirror: true, bump: 1.5 });
  const piece = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), porchMat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  };
  piece(4, 6, 0.6, 2, 3, -2.7); // side walls
  piece(4, 6, 0.6, 2, 3, 2.7);
  piece(0.5, 6, 1.9, 3.8, 3, -1.8); // front piers either side of the door
  piece(0.5, 6, 1.9, 3.8, 3, 1.8);
  piece(4.4, 2.6, 6, 2, 7.3, 0); // lintel block and roof
  piece(4.8, 0.4, 6.4, 2, 8.8, 0);
  // gilded door frame
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.08, 8, 24, Math.PI), GOLD_TOP);
  frame.position.set(4.06, 3.4, 0);
  frame.rotation.y = Math.PI / 2;
  group.add(frame);
  // garland swags across the porch (marigolds)
  const marigold = new THREE.MeshStandardMaterial({ color: 0xf2a81d, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(4.15, 6, -2.6 + i * 1.73), new THREE.Vector3(4.2, 5.4, -1.73 + i * 1.73), new THREE.Vector3(4.15, 6, -0.87 + i * 1.73)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.08, 6), marigold));
  }

  // night: floodlights from the courtyard washing the east face
  const floods: THREE.SpotLight[] = [];
  for (const z of [-9, 9]) {
    const s = new THREE.SpotLight(0xffb35c, 0, 80, 0.5, 0.7, 1.2);
    s.position.set(14, 1, z);
    s.target.position.set(cx, 26, 0);
    group.add(s, s.target);
    floods.push(s);
  }
  return {
    group,
    update(night: number) {
      for (const s of floods) s.intensity = night * 2600;
      GOLD_TOP.emissive.setHex(0x5a3a08);
      GOLD_TOP.emissiveIntensity = night * 0.6;
    },
  };
}
