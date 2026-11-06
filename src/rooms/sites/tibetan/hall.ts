import * as THREE from 'three';
import type { Box2 } from '../../types';
import { BLOCK, DOOR, FY, HALL, PORCH, STEPS, WALL, WINGS } from './layout';
import type { Mats } from './mats';
import { Batch, catenary, hippedRoof, tiledBox, tiledPlane } from './util';

// The Golden Temple building: the tall hall inside (mirror floor, red pillars wrapped in
// brocade, mural walls under clerestory windows, a painted ceiling hung with five-colour
// swags) and outside (cream block with a maroon parapet studded with gold discs, the red
// pillared porch, the blue tower with three tiers of golden roofs and the rainbow
// Dharma-wheel ring, low golden-roofed wings).

export function buildHall(m: Mats) {
  const group = new THREE.Group();
  const b = new Batch();
  const floor: THREE.Object3D[] = [];
  const colliders: Box2[] = [];
  const H = HALL;
  const W = H.x1 - H.x0, D = H.z1 - H.z0;
  const cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2;

  // ---- plinth, steps, floors ----
  b.add(tiledBox(BLOCK.x1 - BLOCK.x0, FY, BLOCK.z1 - PORCH.z0, 2), m.white, 0, FY / 2, (BLOCK.z1 + PORCH.z0) / 2);
  const stepH = FY / 3;
  for (let i = 0; i < 3; i++) {
    const z0 = STEPS.z0 + i * 0.4;
    b.add(new THREE.BoxGeometry(STEPS.x1 - STEPS.x0, stepH * (i + 1), STEPS.z1 - z0), m.white, 0, (stepH * (i + 1)) / 2, (z0 + STEPS.z1) / 2);
  }
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), m.floor);
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.position.set(cx, FY + 0.005, cz);
  hallFloor.receiveShadow = true;
  group.add(hallFloor);
  floor.push(hallFloor);
  const porchFloor = new THREE.Mesh(tiledPlane(PORCH.x1 - PORCH.x0 + 4, PORCH.z1 - PORCH.z0, 4, 1), m.floor);
  porchFloor.rotation.x = -Math.PI / 2;
  porchFloor.position.set(0, FY + 0.005, (PORCH.z0 + PORCH.z1) / 2);
  porchFloor.receiveShadow = true;
  group.add(porchFloor);
  floor.push(porchFloor);

  // ---- walls (exterior faces cream with Tibetan trapezoid windows) ----
  const wallH = BLOCK.h;
  const wy = FY + wallH / 2;
  for (const s of [-1, 1]) {
    b.add(tiledBox(WALL, wallH, BLOCK.z1 - BLOCK.z0, 4.2), m.facade, s * (H.x1 + WALL / 2), wy, (BLOCK.z0 + BLOCK.z1) / 2, 0, 0, 0, true);
    colliders.push({ x0: s > 0 ? H.x1 : BLOCK.x0, x1: s > 0 ? BLOCK.x1 : H.x0, z0: BLOCK.z0, z1: BLOCK.z1 });
  }
  b.add(tiledBox(BLOCK.x1 - BLOCK.x0, wallH, WALL, 4.2), m.facade, 0, wy, H.z1 + WALL / 2, 0, 0, 0, true);
  colliders.push({ x0: BLOCK.x0, x1: BLOCK.x1, z0: H.z1, z1: BLOCK.z1 });
  // front wall either side of the doorway, and above it
  const side = (BLOCK.x1 - DOOR.halfW);
  for (const s of [-1, 1]) {
    b.add(tiledBox(side, wallH, WALL, 4.2), m.facade, s * (DOOR.halfW + side / 2), wy, -WALL / 2, 0, 0, 0, true);
    colliders.push({ x0: s > 0 ? DOOR.halfW : BLOCK.x0, x1: s > 0 ? BLOCK.x1 : -DOOR.halfW, z0: -WALL - 0.05, z1: 0.05 });
  }
  b.add(new THREE.BoxGeometry(DOOR.halfW * 2, wallH - DOOR.h, WALL), m.cream, 0, FY + DOOR.h + (wallH - DOOR.h) / 2, -WALL / 2);
  // white base band and the maroon parapet with gold discs round the top
  const band = (len: number, h: number, y: number, x: number, z: number, ry: number, mat: THREE.Material, aspect: number) => {
    b.add(tiledPlane(len, h, Math.max(1, Math.round(len / (h * aspect))), 1), mat, x, y, z, ry);
  };
  const ph = 1.5, py = FY + wallH - ph / 2 - 0.1;
  const bw = BLOCK.x1 - BLOCK.x0, bd = BLOCK.z1 - BLOCK.z0, bz = (BLOCK.z0 + BLOCK.z1) / 2;
  band(bw, ph, py, 0, BLOCK.z0 - 0.02, Math.PI, m.parapet, 2.36);
  band(bw, ph, py, 0, BLOCK.z1 + 0.02, 0, m.parapet, 2.36);
  band(bd, ph, py, BLOCK.x1 + 0.02, bz, Math.PI / 2, m.parapet, 2.36);
  band(bd, ph, py, BLOCK.x0 - 0.02, bz, -Math.PI / 2, m.parapet, 2.36);
  // the parapet front faces -z: the plane's +z normal is turned to face out
  // flat roof slab
  b.add(new THREE.BoxGeometry(bw + 0.3, 0.3, bd + 0.3), m.maroon, 0, FY + wallH + 0.05, bz, 0, 0, 0, true);

  // ---- interior finishes ----
  // side walls: lineage murals below, a painted gallery beam, then clerestory windows
  // between thangka panels
  for (const s of [-1, 1]) {
    const x = s * (H.x1 - 0.02), ry = -s * Math.PI / 2;
    b.add(tiledPlane(D, 4.2, 3, 1), m.sideMural, x, FY + 0.3 + 2.1, cz, ry);
    b.add(tiledPlane(D, 0.9, 7, 1), m.lintel, x - s * 0.01, FY + 4.95, cz, ry);
    b.add(new THREE.BoxGeometry(0.5, 0.25, D), m.darkRed, x - s * 0.25, FY + 4.4, cz);
    b.add(tiledPlane(D, 6.6, 1, 1), m.cream, x, FY + 5.4 + 3.3, cz, ry);
    for (let z = 1.6; z < D - 1; z += 2.6) {
      b.add(new THREE.PlaneGeometry(1.5, 3.6), m.window, x - s * 0.02, FY + 8.2, z, ry);
      // ochre frame with blue glazing bars
      for (const dz of [-0.8, 0.8]) b.add(new THREE.BoxGeometry(0.14, 3.9, 0.16), m.gold, x - s * 0.05, FY + 8.2, z + dz);
      for (const dy of [-1.88, 1.88]) b.add(new THREE.BoxGeometry(0.14, 0.16, 1.76), m.gold, x - s * 0.05, FY + 8.2 + dy, z);
      b.add(new THREE.BoxGeometry(0.08, 0.07, 1.5), m.blue, x - s * 0.04, FY + 8.2, z);
      b.add(new THREE.BoxGeometry(0.08, 3.6, 0.07), m.blue, x - s * 0.04, FY + 8.2, z);
      if (z + 1.3 < D - 1) b.add(new THREE.PlaneGeometry(0.75, 1.0), m.thangka, x - s * 0.03, FY + 8.2, z + 1.3, ry);
    }
    // the side walls' upper edge: a pleated valance
    b.add(tiledPlane(D, 0.8, 8, 1), m.shambu, x - s * 0.03, FY + H.h - 0.4, cz, ry);
  }
  // back wall: blue sky mural with clouds (the altar covers the lower part)
  b.add(new THREE.PlaneGeometry(W, H.h), m.skyMural, cx, FY + H.h / 2, H.z1 - 0.02, Math.PI);
  b.add(tiledPlane(W, 1.1, 5, 1), m.shambu, cx, FY + H.h - 0.55, H.z1 - 0.06, Math.PI);
  // front wall, inside: dark red with a painted beam over the door
  for (const s of [-1, 1]) {
    b.add(new THREE.PlaneGeometry(H.x1 - DOOR.halfW, H.h), m.darkRed, s * (DOOR.halfW + (H.x1 - DOOR.halfW) / 2), FY + H.h / 2, 0.02);
    b.add(new THREE.PlaneGeometry(3.4, 2.6), m.sideMural, s * 5.2, FY + 2.4, 0.03);
  }
  b.add(new THREE.PlaneGeometry(DOOR.halfW * 2, H.h - DOOR.h), m.darkRed, 0, FY + DOOR.h + (H.h - DOOR.h) / 2, 0.02);
  b.add(tiledPlane(W, 1.0, 6, 1), m.lintel, cx, FY + DOOR.h + 0.6, 0.04);
  b.add(tiledPlane(W, 0.8, 8, 1), m.shambu, cx, FY + H.h - 0.4, 0.06);
  // ceiling: painted coffers
  b.add(tiledPlane(W, D, 4.5, 5), m.ceiling, cx, FY + H.h, cz, 0, Math.PI / 2);

  // nave pillars: red, the lower third wrapped in rainbow brocade, painted capitals
  const pillar = new THREE.CylinderGeometry(0.22, 0.24, H.h - 0.6, 14);
  const wrap = new THREE.CylinderGeometry(0.28, 0.28, 3.2, 14);
  const cap = new THREE.BoxGeometry(1.4, 0.35, 0.55);
  const capB = new THREE.BoxGeometry(0.7, 0.3, 0.5);
  for (const s of [-1, 1]) for (const z of [3, 7, 11, 15]) {
    const x = s * 5.7;
    b.add(pillar, m.red, x, FY + (H.h - 0.6) / 2, z, 0, 0, 0, true);
    b.add(wrap, m.brocade, x, FY + 1.6 + 0.4, z);
    b.add(cap, m.lintel, x, FY + H.h - 0.45, z, Math.PI / 2);
    b.add(capB, m.green, x, FY + H.h - 0.8, z, Math.PI / 2);
    colliders.push({ x0: x - 0.32, x1: x + 0.32, z0: z - 0.32, z1: z + 0.32 });
  }
  // long beams over the pillars
  for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.45, 0.5, D), m.lintel, s * 5.7, FY + H.h - 0.1, cz);

  // five-colour silk swags strung across the hall
  const silk = [0x1e4fa0, 0xf4f1e8, 0xc0272d, 0x1e8c4e, 0xf2c230].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, side: THREE.DoubleSide }));
  for (const z of [3, 7, 11]) {
    silk.forEach((mat, i) => {
      const pts = catenary(new THREE.Vector3(-8.8, FY + 11.4 - i * 0.05, z + i * 0.12), new THREE.Vector3(8.8, FY + 11.4 - i * 0.05, z + i * 0.12), 2.2 + i * 0.12);
      b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.07, 5), mat, 0, 0, 0);
    });
  }

  // doors: red leaves swung open, gold knobs, a striped brocade curtain over the opening
  for (const s of [-1, 1]) {
    const leaf = new THREE.BoxGeometry(DOOR.halfW, DOOR.h - 0.2, 0.12);
    b.add(leaf, m.red, s * (DOOR.halfW + 0.05), FY + (DOOR.h - 0.2) / 2, 0.9, s * Math.PI / 2.2);
    b.add(new THREE.SphereGeometry(0.1, 10, 8), m.gold, s * (DOOR.halfW - 0.1), FY + 2.2, 1.6);
  }
  b.add(new THREE.BoxGeometry(DOOR.halfW * 2 + 0.6, 0.35, 0.3), m.gold, 0, FY + DOOR.h + 0.15, -WALL - 0.05);
  for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.3, DOOR.h, 0.3), m.gold, s * (DOOR.halfW + 0.15), FY + DOOR.h / 2, -WALL - 0.05);
  b.add(tiledPlane(DOOR.halfW * 2, 0.9, 2, 1), m.shambu, 0, FY + DOOR.h - 0.45, -WALL - 0.22, Math.PI);

  // ---- porch: massive red columns under a deep painted lintel ----
  const col = new THREE.CylinderGeometry(0.34, 0.37, PORCH.h, 18);
  for (const x of [-5.1, -1.95, 1.95, 5.1]) {
    b.add(col, m.red, x, FY + PORCH.h / 2, PORCH.z0 + 0.5, 0, 0, 0, true);
    b.add(new THREE.BoxGeometry(1.6, 0.45, 0.8), m.lintel, x, FY + PORCH.h - 0.2, PORCH.z0 + 0.5);
    b.add(new THREE.BoxGeometry(0.9, 0.3, 0.7), m.green, x, FY + PORCH.h - 0.6, PORCH.z0 + 0.5);
    b.add(new THREE.BoxGeometry(0.9, 0.3, 0.9), m.white, x, FY + 0.15, PORCH.z0 + 0.5);
    colliders.push({ x0: x - 0.42, x1: x + 0.42, z0: PORCH.z0 + 0.08, z1: PORCH.z0 + 0.92 });
  }
  const pw = PORCH.x1 - PORCH.x0, pd = PORCH.z1 - PORCH.z0;
  b.add(new THREE.BoxGeometry(pw, 1.5, pd + 0.2), m.darkRed, 0, FY + PORCH.h + 0.75, (PORCH.z0 + PORCH.z1) / 2 - 0.1, 0, 0, 0, true);
  b.add(tiledPlane(pw, 1.5, 4, 1), m.lintel, 0, FY + PORCH.h + 0.75, PORCH.z0 - 0.22, Math.PI);
  for (const s of [-1, 1]) b.add(tiledPlane(pd, 1.5, 1, 1), m.lintel, s * (PORCH.x1 + 0.01), FY + PORCH.h + 0.75, (PORCH.z0 + PORCH.z1) / 2, s * Math.PI / 2);
  // porch underside and a golden eave on top
  b.add(new THREE.PlaneGeometry(pw, pd), m.lintel, 0, FY + PORCH.h - 0.01, (PORCH.z0 + PORCH.z1) / 2, 0, Math.PI / 2);
  b.add(hippedRoof(pw + 1.2, pd + 1.4, 1.0, 0.3), m.roofGold, 0, FY + PORCH.h + 1.5, (PORCH.z0 + PORCH.z1) / 2 - 0.2, 0, 0, 0, true);
  // the blue band with gold medallions over the doors
  b.add(tiledPlane(12, 1.3, 4, 1), m.altarBand, 0, FY + DOOR.h + 1.0, -WALL - 0.02, Math.PI);
  // the porch's side walls (painted) beside the columns
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.4, PORCH.h, pd), m.cream, s * (PORCH.x1 - 0.2), FY + PORCH.h / 2, (PORCH.z0 + PORCH.z1) / 2);
    b.add(new THREE.PlaneGeometry(pd - 0.4, 3.6), m.sideMural, s * (PORCH.x1 - 0.41), FY + 2.6, (PORCH.z0 + PORCH.z1) / 2, -s * Math.PI / 2);
    colliders.push({ x0: s > 0 ? PORCH.x1 - 0.4 : PORCH.x0, x1: s > 0 ? PORCH.x1 : PORCH.x0 + 0.4, z0: PORCH.z0, z1: PORCH.z1 });
  }

  // ---- the tower: blue walls, three tiers of golden roofs, the Dharma-wheel ring ----
  const T0 = FY + wallH + 0.2;
  const tz = 3.6;
  const tier = (hw: number, hd: number, y0: number, h: number, roofW: number, roofD: number, roofH: number) => {
    b.add(tiledBox(hw * 2, h, hd * 2, 3.4), m.blueWall, 0, y0 + h / 2, tz, 0, 0, 0, true);
    b.add(tiledPlane(hw * 2, 0.6, Math.round(hw * 2 / 1.4), 1), m.parapet, 0, y0 + h - 0.3, tz - hd - 0.02, Math.PI);
    b.add(new THREE.BoxGeometry(roofW - 0.6, 0.25, roofD - 0.6), m.gold, 0, y0 + h + 0.1, tz);
    b.add(hippedRoof(roofW, roofD, roofH, 0.45), m.roofGold, 0, y0 + h + 0.2, tz, 0, 0, 0, true);
    // ganjira and dragon-head finials at the eave corners
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.add(new THREE.ConeGeometry(0.12, 0.6, 8), m.gold, sx * (roofW / 2 + 0.05), y0 + h + 0.2 + 0.55, tz + sz * (roofD / 2 + 0.05));
    }
    return y0 + h + 0.2 + roofH;
  };
  const top1 = tier(5.2, 4.1, T0, 4.6, 12.6, 10.6, 1.7);
  void top1;
  const top2 = tier(3.6, 3.0, T0 + 4.6 + 1.5, 2.4, 9.4, 8.2, 1.4);
  void top2;
  const t3y = T0 + 4.6 + 1.5 + 2.4 + 1.2;
  const top3 = tier(2.3, 2.1, t3y, 1.7, 6.2, 5.8, 1.5);
  // gold ridge pavilion finial
  b.add(new THREE.SphereGeometry(0.35, 12, 8), m.gold, 0, top3 + 0.1, tz);
  b.add(new THREE.ConeGeometry(0.25, 1.2, 10), m.gold, 0, top3 + 0.8, tz);
  // the thangka of the Buddha in a gold frame on the tower's front
  b.add(new THREE.BoxGeometry(3.6, 4.0, 0.15), m.gold, 0, T0 + 2.2, tz - 4.1 - 0.08);
  b.add(new THREE.PlaneGeometry(3.2, 3.7), m.thangka, 0, T0 + 2.2, tz - 4.1 - 0.17, Math.PI);
  // tower window bays either side of the thangka
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(1.0, 1.6, 0.1), m.darkWood, s * 3.6, T0 + 2.6, tz - 4.1 - 0.05);
    b.add(new THREE.BoxGeometry(1.25, 0.25, 0.25), m.gold, s * 3.6, T0 + 3.5, tz - 4.1 - 0.1);
  }
  // the rainbow ring with eight gold spokes, standing over the top roof
  const ringR = 4.1;
  const ringC = new THREE.Vector3(0, top3 + 1.9, tz);
  const rainbow = [0xc0272d, 0xf28c1e, 0xf2c230, 0x1e8c4e, 0x1e4fa0].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.2 }));
  rainbow.forEach((mat, i) => b.add(new THREE.TorusGeometry(ringR - i * 0.15, 0.085, 6, 64, Math.PI * 1.12), mat, ringC.x, ringC.y, ringC.z, 0, 0, -Math.PI * 0.06, true));
  b.add(new THREE.TorusGeometry(ringR + 0.1, 0.06, 6, 64, Math.PI * 1.12), m.gold, ringC.x, ringC.y, ringC.z, 0, 0, -Math.PI * 0.06);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    if (a > Math.PI * 0.95) continue;
    const r0 = 1.3, r1 = ringR - 0.55;
    const len = r1 - r0;
    const mx = Math.cos(a) * (r0 + len / 2), my = Math.sin(a) * (r0 + len / 2);
    b.add(new THREE.CylinderGeometry(0.05, 0.05, len, 6), m.gold, ringC.x + mx, ringC.y + my, ringC.z, 0, 0, a - Math.PI / 2);
    b.add(new THREE.SphereGeometry(0.16, 8, 6), m.gold, ringC.x + Math.cos(a) * r1, ringC.y + Math.sin(a) * r1, ringC.z);
  }
  // gold deer either side of the wheel's base (simple couchant shapes)
  for (const s of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.35, 10, 8), m.gold, s * 1.9, top3 - 0.8, tz - 2.0);
    b.add(new THREE.SphereGeometry(0.2, 8, 6), m.gold, s * 1.65, top3 - 0.4, tz - 2.1);
  }

  // golden roof over the rear of the hall, with a small pavilion
  b.add(hippedRoof(14, 11, 2.2, 0.4), m.roofGold, 0, FY + wallH + 0.2, 14.5, 0, 0, 0, true);
  b.add(new THREE.CylinderGeometry(0.4, 0.5, 1.2, 10), m.gold, 0, FY + wallH + 2.9, 14.5);

  // victory banners (gyaltsen) at the corners of the block roof
  const banner = new THREE.CylinderGeometry(0.42, 0.36, 1.6, 14);
  const bannerTop = new THREE.ConeGeometry(0.46, 0.5, 14);
  for (const sx of [-1, 1]) for (const z of [BLOCK.z0 + 0.4, BLOCK.z1 - 0.4]) {
    const x = sx * (BLOCK.x1 - 0.4);
    b.add(banner, m.gold, x, FY + wallH + 1.0, z, 0, 0, 0, true);
    b.add(bannerTop, m.gold, x, FY + wallH + 2.05, z);
  }

  // ---- side wings: one storey, cream, golden hipped roofs ----
  for (const w of WINGS) {
    const ww = w.x1 - w.x0, wd = w.z1 - w.z0, wx = (w.x0 + w.x1) / 2, wz = (w.z0 + w.z1) / 2;
    const h = 4.4;
    b.add(tiledBox(ww, h, wd, 4.2), m.facade, wx, h / 2, wz, 0, 0, 0, true);
    b.add(tiledPlane(ww, 0.8, Math.round(ww / 1.9), 1), m.parapet, wx, h - 0.4, w.z0 - 0.02, Math.PI);
    b.add(hippedRoof(ww + 1.4, wd + 1.4, 1.7, 0.4), m.roofGold, wx, h, wz, 0, 0, 0, true);
    // a pillared verandah along the front
    for (let x = w.x0 + 0.8; x < w.x1 - 0.5; x += 2.2) b.add(new THREE.CylinderGeometry(0.16, 0.16, 3.4, 10), m.red, x, 1.7, w.z0 - 1.1);
    b.add(new THREE.BoxGeometry(ww, 0.35, 1.6), m.darkRed, wx, 3.55, w.z0 - 0.8);
    colliders.push({ x0: w.x0, x1: w.x1, z0: w.z0 - 1.3, z1: w.z1 });
  }

  const meshes = b.build(group);
  return {
    group, floor, colliders, meshes,
    /** walls for the camera (full height) and the roofs over hall and porch */
    cameraSolids: [
      ...colliders.filter((c) => c.x1 - c.x0 > 1 || c.z1 - c.z0 > 1),
      { x0: BLOCK.x0, x1: BLOCK.x1, z0: BLOCK.z0, z1: BLOCK.z1, y0: FY + HALL.h },
      { x0: PORCH.x0, x1: PORCH.x1, z0: PORCH.z0, z1: PORCH.z1, y0: FY + PORCH.h },
    ],
  };
}
