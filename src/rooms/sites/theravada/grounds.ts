import * as THREE from 'three';
import { canopy, limb, trunk, type Cluster } from '../../../kit/foliage';
import type { Box2 } from '../../types';
import { BURNER_AT, CLOISTER, OUTER, PRANG, STEPS } from './plan';
import { boxAt, canvasTex, finialGeometry, merged, quad, seatedBuddhaGeometry, tex } from './util';

// Around the viharn: open lawns and a pale paved forecourt on the west, white lidded
// urns and stone lions at the porch, the incense urn, a few shade trees; behind the
// hall, the cloister (phra rabiang) lined with seated gilded Buddhas and, rising from
// its court, the Khmer-style prang of Phra Si Rattana Mahathat: a dark weathered
// stucco body on a stepped base, its corncob top gilded, a trident at the tip.

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** paving with a fine grid of square slabs */
function pavingTexture() {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#9a9387';
    g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = 140 + Math.floor(Math.random() * 18);
      g.fillStyle = `rgb(${v + 14},${v + 8},${v - 4})`;
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    }
  });
}

/** a white bulbous urn with a pointed lid on a gilded base, as at the porch */
function urnGeometry() {
  return new THREE.LatheGeometry([
    new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.42, 0.0), new THREE.Vector2(0.42, 0.28), new THREE.Vector2(0.3, 0.32),
    new THREE.Vector2(0.24, 0.42), new THREE.Vector2(0.42, 0.62), new THREE.Vector2(0.5, 0.85), new THREE.Vector2(0.46, 1.08),
    new THREE.Vector2(0.3, 1.24), new THREE.Vector2(0.2, 1.3), new THREE.Vector2(0.26, 1.36), new THREE.Vector2(0.2, 1.5),
    new THREE.Vector2(0.08, 1.7), new THREE.Vector2(0.0, 1.82),
  ], 18);
}

/** a seated guardian lion (singha), stylized, about 1 m */
function lionGeometry() {
  const parts = [
    new THREE.BoxGeometry(0.7, 0.35, 0.6).translate(0, 0.175, 0),
    new THREE.SphereGeometry(0.3, 12, 8).scale(1, 1.3, 0.9).translate(0.05, 0.65, 0),
    new THREE.SphereGeometry(0.22, 12, 8).scale(1, 1, 1).translate(-0.12, 1.08, 0),
    new THREE.SphereGeometry(0.26, 12, 8).scale(0.7, 1.1, 1.2).translate(-0.04, 1.02, 0),
    new THREE.CylinderGeometry(0.06, 0.07, 0.4, 8).translate(-0.18, 0.55, 0.15),
    new THREE.CylinderGeometry(0.06, 0.07, 0.4, 8).translate(-0.18, 0.55, -0.15),
  ];
  return merged(parts, new THREE.MeshStandardMaterial()).geometry;
}

/** the prang: stepped redented base, a dark stucco tower body, a gilded corncob top */
function buildPrang() {
  const g = new THREE.Group();
  const stucco = tex('wall', { color: 0x55524d, roughness: 0.95 }, [3, 3]);
  const darkStucco = new THREE.MeshStandardMaterial({ color: 0x4e4b46, roughness: 0.95 });
  // the gilded corncob: rows of tall rounded gold tablets with dark gaps between
  const petals = canvasTex(512, 128, (c) => {
    c.fillStyle = '#2e2b27';
    c.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 16; i++) {
      const x = i * 32 + 3;
      c.fillStyle = '#e0b04a';
      c.beginPath();
      c.moveTo(x, 128); c.lineTo(x, 34); c.quadraticCurveTo(x + 13, -4, x + 26, 34); c.lineTo(x + 26, 128); c.closePath(); c.fill();
      c.fillStyle = 'rgba(120,80,20,.5)';
      c.fillRect(x + 18, 40, 6, 88);
    }
  });
  petals.repeat.set(2, 1);
  const gilt = new THREE.MeshStandardMaterial({ map: petals, metalness: 0.75, roughness: 0.38, emissive: 0x2a1a04, flatShading: true });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a83a, metalness: 1, roughness: 0.3 });
  const { x, z, base } = PRANG;
  const redented = (w: number, h: number, y: number, inset = 0.18) => [
    boxAt(w * (1 - 2 * inset), h, w, x, y + h / 2, z),
    boxAt(w, h, w * (1 - 2 * inset), x, y + h / 2, z),
    boxAt(w * (1 - inset), h, w * (1 - inset), x, y + h / 2, z),
  ];
  // the stepped base: three receding terraces
  const baseGeos: THREE.BufferGeometry[] = [];
  let y = 0;
  for (const [w, h] of [[base, 1.6], [base - 1.6, 1.5], [base - 3.0, 1.4]] as const) {
    baseGeos.push(...redented(w, h, y));
    baseGeos.push(...redented(w + 0.25, 0.18, y + h - 0.18));
    y += h;
  }
  // the west stair up to the shrine niche, with its little porch (mondop)
  baseGeos.push(boxAt(2.4, 4.5, 3.0, x - base / 2 - 0.4, 2.25, z));
  const stair: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) stair.push(boxAt(0.36, 0.45 * (i + 1), 1.8, x - base / 2 - 1.8 - (9 - i) * 0.36 + 0.36 * 3, 0.225 * (i + 1), z));
  g.add(merged(baseGeos, stucco), merged(stair, stucco));
  // the tower body, with tall niches on each face
  const bodyH = 9.5, bodyW = base - 4.4;
  const body = merged([
    ...redented(bodyW, bodyH, y, 0.2),
    ...[0.15, 0.55, 0.97].flatMap((k) => redented(bodyW + 0.35, 0.3, y + bodyH * k - 0.15, 0.2)),
  ], stucco);
  g.add(body);
  const niche: THREE.BufferGeometry[] = [];
  for (const [dx, dz, w, d] of [[-1, 0, 0.2, 2.0], [1, 0, 0.2, 2.0], [0, -1, 2.0, 0.2], [0, 1, 2.0, 0.2]] as const) {
    niche.push(boxAt(w, 3.2, d, x + (dx * bodyW) / 2, y + 2.2, z + (dz * bodyW) / 2));
  }
  g.add(merged(niche, new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 1 })));
  // pediments over the niches
  const ped = finialGeometry(2.4, 0.3);
  const pedGeos: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) {
    for (const flip of [0, Math.PI]) {
      const p = ped.clone().scale(0.8, 1, 1).rotateY(flip).translate(0.55 * (flip ? -1 : 1), y + bodyH - 2.6, 0);
      p.translate(0, 0, 0);
      p.rotateY((k * Math.PI) / 2 + Math.PI / 2);
      p.translate(x, 0, z);
      // push out to the face
      const a = (k * Math.PI) / 2;
      p.translate(Math.cos(a) * (bodyW / 2 + 0.15), 0, Math.sin(a) * (bodyW / 2 + 0.15));
      pedGeos.push(p);
    }
  }
  g.add(merged(pedGeos, darkStucco));
  y += bodyH;
  // the corncob top: diminishing cushion-like tiers in a bullet profile, each a
  // rounded, redented ring (12 facets), the lower ones weathered stucco, the rest gilded
  const tierGeosDark: THREE.BufferGeometry[] = [];
  const tierGeosGilt: THREE.BufferGeometry[] = [];
  const leafGeos: THREE.BufferGeometry[] = [];
  const leaf = new THREE.ConeGeometry(0.3, 0.9, 4).scale(1, 1, 0.25);
  const tiers = 9;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const r = (bodyW / 2) * 1.02 * Math.pow(1 - Math.pow(t, 2.4), 0.55) + 0.35;
    const r2 = (bodyW / 2) * 1.02 * Math.pow(1 - Math.pow((i + 1) / tiers, 2.4), 0.55) + 0.35;
    const h = 2.25 - t * 0.7;
    const ring = new THREE.LatheGeometry([
      new THREE.Vector2(r * 0.9, 0), new THREE.Vector2(r, h * 0.12), new THREE.Vector2(r * 1.02, h * 0.45),
      new THREE.Vector2(r * 0.97, h * 0.72), new THREE.Vector2(r2 * 0.92, h * 0.86), new THREE.Vector2(r2 * 0.9, h),
    ], 12).rotateY(Math.PI / 12).translate(x, y, z);
    (i < 3 ? tierGeosDark : tierGeosGilt).push(ring);
    // antefix leaves at the four corners and the four faces of each tier
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      leafGeos.push(leaf.clone().scale(1 - t * 0.5, 1 - t * 0.5, 1).rotateY(-a + Math.PI / 2).translate(x + Math.cos(a) * r * 0.98, y + h * 0.85 + 0.3, z + Math.sin(a) * r * 0.98));
    }
    y += h;
  }
  g.add(merged(tierGeosDark, darkStucco), merged(tierGeosGilt, gilt), merged(leafGeos, gold));
  // the cap and the trident finial (trisula)
  const fin: THREE.BufferGeometry[] = [];
  fin.push(new THREE.SphereGeometry(0.9, 16, 10).scale(1, 0.8, 1).translate(x, y + 0.5, z));
  fin.push(new THREE.CylinderGeometry(0.08, 0.12, 4.2, 8).translate(x, y + 2.8, z));
  for (const s of [-1, 0, 1]) {
    fin.push(new THREE.ConeGeometry(0.1, 1.1, 6).translate(x, y + 5.0 - Math.abs(s) * 0.4, z + s * 0.42));
    if (s) fin.push(new THREE.TorusGeometry(0.42, 0.05, 6, 12, Math.PI).rotateY(Math.PI / 2).rotateX(Math.PI).translate(x, y + 4.6, z));
  }
  g.add(merged(fin, gold));
  return { group: g, height: y + 5.5 };
}

export function buildGrounds(rng: () => number) {
  const group = new THREE.Group();
  const floor: THREE.Object3D[] = [];
  const colliders: Box2[] = [];
  const add = (o: THREE.Object3D) => { group.add(o); return o; };

  // lawn over everything, paving on the forecourt, round the hall and in the cloister
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(260, 200).rotateX(-Math.PI / 2), tex('lawn', { roughness: 1, color: 0x9fb48a }, [120, 92], true));
  lawn.position.set(15, 0, 0);
  lawn.receiveShadow = true;
  add(lawn);
  floor.push(lawn);
  const paveMat = new THREE.MeshStandardMaterial({ map: pavingTexture(), roughness: 0.9, color: 0xc4beb4 });
  paveMat.map!.repeat.set(1 / 4, 1 / 4);
  const pave = (x0: number, x1: number, z0: number, z1: number) => {
    const g = quad(V(x0, 0, z1), V(x1, 0, z1), V(x1, 0, z0), V(x0, 0, z0), 1);
    const m = new THREE.Mesh(g, paveMat);
    m.position.y = 0.012;
    m.receiveShadow = true;
    add(m);
    floor.push(m);
  };
  pave(-34, STEPS.x0, -9, 9); // forecourt
  pave(STEPS.x0, OUTER.x1, -13, -OUTER.halfW); // the side walks under the verandas
  pave(STEPS.x0, OUTER.x1, OUTER.halfW, 13);
  pave(-60, -34, -2, 2); // the approach from the river
  pave(CLOISTER.x0, CLOISTER.x1, -CLOISTER.halfW, CLOISTER.halfW); // the cloister court
  pave(PRANG.x - 2, PRANG.x + 2, CLOISTER.halfW, 20);
  pave(PRANG.x - 2, PRANG.x + 2, -20, -CLOISTER.halfW);

  // white urns on gilt bases and stone lions before the porch
  const urnMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.35 });
  const urnBase = new THREE.MeshStandardMaterial({ color: 0xd9a83a, metalness: 0.9, roughness: 0.3 });
  const urn = urnGeometry();
  const stone = new THREE.MeshStandardMaterial({ color: 0x8d8a83, roughness: 0.9 });
  const lion = lionGeometry();
  for (const s of [-1, 1]) {
    for (const [x, z] of [[-7.0, s * 5.0], [-18, s * 8.2]]) {
      const u = new THREE.Mesh(urn, urnMat);
      u.position.set(x, 0.42, z);
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.42, 1.0).translate(0, 0.21, 0), urnBase);
      b.position.set(x, 0, z);
      u.castShadow = b.castShadow = true;
      add(u); add(b);
      colliders.push({ x0: x - 0.55, x1: x + 0.55, z0: z - 0.55, z1: z + 0.55 });
    }
    const l = new THREE.Mesh(lion, stone);
    l.position.set(-6.9, 0, s * 3.2);
    l.castShadow = true;
    add(l);
    colliders.push({ x0: -7.3, x1: -6.5, z0: s * 3.2 - 0.4, z1: s * 3.2 + 0.4 });
  }

  // the incense urn on the forecourt: a bronze bowl of sand on a stand
  const burner = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: 0x5a4630, metalness: 0.8, roughness: 0.45 });
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.3, 0), new THREE.Vector2(0.45, 0.1), new THREE.Vector2(0.4, 0.3), new THREE.Vector2(0.62, 0.45),
    new THREE.Vector2(0.72, 0.62), new THREE.Vector2(0.7, 0.68), new THREE.Vector2(0.0, 0.66),
  ], 20), bronze);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(0.66, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb9ab8e, roughness: 1 }));
  sand.position.y = 0.64;
  bowl.castShadow = true;
  burner.add(bowl, sand);
  burner.position.copy(BURNER_AT);
  burner.traverse((o) => { o.userData.burner = true; });
  add(burner);
  colliders.push({ x0: BURNER_AT.x - 0.8, x1: BURNER_AT.x + 0.8, z0: BURNER_AT.z - 0.8, z1: BURNER_AT.z + 0.8 });

  // shade trees round the forecourt and the lawns
  const bark = new THREE.MeshStandardMaterial({ color: 0x5f5446, roughness: 0.95 });
  const clusters: Cluster[] = [];
  const trees: [number, number][] = [[-26, -15], [-30, 14], [-14, -17], [-12, 18], [10, -22], [24, 21], [72, -20], [72, 18], [44, -24], [58, 24]];
  for (const [x, z] of trees) {
    const t = new THREE.Group();
    const h = 3.4 + rng() * 1.8;
    t.add(trunk(h, 0.3 + rng() * 0.1, bark, 6, 0.5));
    const top = V(0, h, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + rng();
      const tip = V(Math.cos(a) * (1.5 + rng()), h + 1.5 + rng() * 1.5, Math.sin(a) * (1.5 + rng()));
      t.add(limb(top, tip, 0.18, 0.07, bark));
      clusters.push({ center: tip.clone().add(V(x, 0.4, z)), radius: 2.3 + rng() * 0.6, count: 320 });
    }
    clusters.push({ center: V(x, h + 2.4, z), radius: 2.7, count: 380 });
    t.position.set(x, 0, z);
    add(t);
    colliders.push({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5 });
  }
  const leaves = canopy(clusters, 'mango', rng, { size: 1.6, sun: 0x5f8f34, shade: 0x2a4a1c });
  add(leaves.mesh);

  // ---- the cloister -------------------------------------------------------------
  const C = CLOISTER;
  const plaster = tex('wall', { color: 0xf4f0e8, roughness: 0.92 }, [2, 2]);
  const tiles = tex('roof-tiles', { roughness: 0.5, side: THREE.DoubleSide, color: 0xc49482 }, [1, 1]);
  const border = tex('roof-border', { roughness: 0.55, side: THREE.DoubleSide }, [1, 1]);
  const red = new THREE.MeshStandardMaterial({ color: 0x6e1712, roughness: 0.55 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xd9a83a, metalness: 1, roughness: 0.28 });
  const wallGeos: THREE.BufferGeometry[] = [];
  const postGeos: THREE.BufferGeometry[] = [];
  const roofGeos: THREE.BufferGeometry[] = [];
  const borderGeos: THREE.BufferGeometry[] = [];
  const beamGeos: THREE.BufferGeometry[] = [];
  const benchGeos: THREE.BufferGeometry[] = [];
  const buddhaSpots: THREE.Matrix4[] = [];
  const GATE = 2.2; // half-width of the north and south gates
  const wallH = 3.8, ridge = 6.0, eave = 3.5;
  // one gallery run along a line: outer wall, bench of images, inner posts, gable roof
  // `along` is 'x' or 'z'; `out` is the outward normal sign along the other axis
  const gallery = (along: 'x' | 'z', c0: number, c1: number, line: number, out: number) => {
    const len = c1 - c0, mid = (c0 + c1) / 2;
    const inner = line - out * C.depth;
    const at = (a: number, b: number, y: number) => (along === 'x' ? V(a, y, b) : V(b, y, a));
    const box = (la: number, lb: number, h: number, a: number, b: number, y: number) => (along === 'x' ? boxAt(la, h, lb, a, y, b) : boxAt(lb, h, la, b, y, a));
    wallGeos.push(box(len, 0.4, wallH, mid, line, wallH / 2));
    benchGeos.push(box(len, 0.9, 0.7, mid, line - out * 0.65, 0.35));
    for (let a = c0 + 0.9; a < c1 - 0.5; a += 1.25) {
      const m = new THREE.Matrix4().compose(at(a, line - out * 0.75, 0.7), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, along === 'x' ? (out > 0 ? Math.PI : 0) : (out > 0 ? -Math.PI / 2 : Math.PI / 2), 0)), new THREE.Vector3(0.75, 0.75, 0.75));
      buddhaSpots.push(m);
    }
    for (let a = c0 + 0.2; a <= c1 - 0.1; a += 3) {
      postGeos.push(box(0.34, 0.34, eave - 0.1, a, inner, (eave - 0.1) / 2));
      const p = at(a, inner, 0);
      colliders.push({ x0: p.x - 0.25, x1: p.x + 0.25, z0: p.z - 0.25, z1: p.z + 0.25 });
    }
    beamGeos.push(box(len, 0.35, 0.28, mid, inner, eave - 0.1));
    // the gable roof over the gallery: ridge over the middle, eaves past both edges
    const rl = line - (out * C.depth) / 2;
    const e0 = line + out * 0.7, e1 = inner - out * 0.9;
    const q = (b0: number, y0: number, b1: number, y1: number, k0 = 0, k1 = 1) => {
      const yA = y0 + (y1 - y0) * k0, yB = y0 + (y1 - y0) * k1;
      const bA = b0 + (b1 - b0) * k0, bB = b0 + (b1 - b0) * k1;
      return quad(at(c0 - 0.4, bA, yA), at(c1 + 0.4, bA, yA), at(c1 + 0.4, bB, yB), at(c0 - 0.4, bB, yB), 1.6);
    };
    roofGeos.push(q(e0, eave, rl, ridge, 0.22, 1), q(e1, eave - 0.2, rl, ridge, 0.22, 1));
    borderGeos.push(q(e0, eave, rl, ridge, 0, 0.22), q(e1, eave - 0.2, rl, ridge, 0, 0.22));
    colliders.push(along === 'x'
      ? { x0: c0, x1: c1, z0: Math.min(line, line - out * 1.1), z1: Math.max(line, line - out * 1.1) }
      : { x0: Math.min(line, line - out * 1.1), x1: Math.max(line, line - out * 1.1), z0: c0, z1: c1 });
  };
  const hw = C.halfW;
  // north and south runs, each broken by a gate at the prang's axis
  for (const s of [-1, 1]) {
    gallery('x', C.x0, PRANG.x - GATE, s * hw, s);
    gallery('x', PRANG.x + GATE, C.x1, s * hw, s);
  }
  // east run, and the west runs either side of the viharn's east end
  gallery('z', -hw + 0.2, hw - 0.2, C.x1, 1);
  gallery('z', -hw + 0.2, -11.8, C.x0, -1);
  gallery('z', 11.8, hw - 0.2, C.x0, -1);
  add(merged(wallGeos, plaster));
  add(merged(postGeos, plaster));
  add(merged(roofGeos, tiles));
  add(merged(borderGeos, border));
  add(merged(beamGeos, red, false));
  add(merged(benchGeos, red, false));
  const sb = seatedBuddhaGeometry();
  const rows = new THREE.InstancedMesh(sb, goldM, buddhaSpots.length);
  buddhaSpots.forEach((m, i) => rows.setMatrixAt(i, m));
  add(rows);
  // the gates: a little gilded gable over each opening
  const gateGeos: THREE.BufferGeometry[] = [];
  const gateFin = finialGeometry(1.2, 0.12);
  for (const s of [-1, 1]) {
    gateGeos.push(boxAt(2 * GATE + 0.8, 0.5, 0.6, PRANG.x, wallH + 0.1, s * hw));
    gateGeos.push(gateFin.clone().translate(PRANG.x, wallH + 0.3, s * hw));
  }
  add(merged(gateGeos, goldM));

  // ---- the prang ----------------------------------------------------------------
  const prang = buildPrang();
  add(prang.group);
  const pb = PRANG.base / 2 + 0.2;
  colliders.push({ x0: PRANG.x - pb, x1: PRANG.x + pb, z0: PRANG.z - pb, z1: PRANG.z + pb });
  colliders.push({ x0: PRANG.x - pb - 4.2, x1: PRANG.x - pb, z0: PRANG.z - 1.6, z1: PRANG.z + 1.6 });

  return {
    group, floor, colliders, burner,
    occluders: [prang.group],
    cameraSolids: [
      { x0: PRANG.x - pb, x1: PRANG.x + pb, z0: -pb, z1: pb },
    ],
    update(elapsed: number) {
      leaves.uTime.value = elapsed;
    },
  };
}
