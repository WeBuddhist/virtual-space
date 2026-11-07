import * as THREE from 'three';
import type { Box2 } from '../../types';
import { CARPET, FLOOR, HALL, OUTER, PORCH, STEPS } from './plan';
import { boxAt, canvasTex, cutout, finialGeometry, merged, panel, quad, tex } from './util';

// The great viharn of Phra Buddha Chinnarat: a long, low hall on a white plinth,
// its three-tier roof of orange glazed tiles with green borders sweeping down almost
// to head height over open side verandas, the roof stepping down toward the west
// front, a carved gilt gable with chofa and naga bargeboards, a low hipped porch on
// four white columns with gilded lotus capitals, and the mother-of-pearl doors.
// Inside: a dim nave between two rows of black-and-gold lacquer columns, a dark red
// coffered ceiling, crystal chandeliers, murals above the windows, glossy encaustic
// tiles, and the red kneeling carpet.

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** roof tiers in the cross-section (z from the ridge line, y up), for the main section */
// four thin tiers stacked like scales, each lapping over the one below (Watyai 31, panoramio
// photos on Commons), the lowest sweeping out past the wall to about 5 m
const TIERS = [
  { zTop: 0, yTop: 15.6, zBot: 3.7, yBot: 12.2 },
  { zTop: 3.4, yTop: 12.5, zBot: 5.7, yBot: 10.2 },
  { zTop: 5.4, yTop: 10.5, zBot: 7.7, yBot: 8.0 },
  { zTop: 7.4, yTop: 8.3, zBot: 10.2, yBot: 5.0 },
];
/** the roof sections, west to east; the front one sits lower (the roof telescopes) */
const SECTIONS = [
  { x0: -1.3, x1: 3.6, dy: -0.9, westGable: true, eastGable: false },
  { x0: 3.6, x1: 37.3, dy: 0, westGable: true, eastGable: true },
];
/** exterior wall height (the front section's lowest tier passes just above it) */
const WALL_OUT = 6.9;

/** height of the lowest tier above the ground at distance z from the ridge */
function tierDAt(z: number, dy: number) {
  const t = TIERS[3];
  return t.yTop + dy - ((z - t.zTop) / (t.zBot - t.zTop)) * (t.yTop - t.yBot);
}

export function buildViharn() {
  const group = new THREE.Group();
  const floor: THREE.Object3D[] = [];
  const colliders: Box2[] = [];
  const W = HALL.wall, hw = HALL.halfW;

  // ---- materials -----------------------------------------------------------
  const plaster = tex('wall', { color: 0xf1ede4, roughness: 0.92 }, [2, 2]);
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0xdedbd2, roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a83a, metalness: 0.9, roughness: 0.3 });
  const lacquerRed = new THREE.MeshStandardMaterial({ color: 0x5c1612, roughness: 0.55 });
  const tiles = tex('roof-tiles', { roughness: 0.5, side: THREE.DoubleSide, color: 0xc49482 }, [1, 1]);
  const border = tex('roof-border', { roughness: 0.55, side: THREE.DoubleSide }, [1, 1]);
  const columnMat = tex('column', { roughness: 0.38, metalness: 0.15 }, [1, 4]);
  const ceilingMat = tex('ceiling', { roughness: 0.7, side: THREE.DoubleSide }, [9, 1]);
  const aisleCeil = tex('ceiling', { roughness: 0.7, side: THREE.DoubleSide }, [9, 1]);
  const muralMat = tex('mural', { roughness: 0.9 }, [6, 1], true);
  const floorMat = tex('floor', { roughness: 0.22, metalness: 0.1, color: 0x6a6460 }, [18, 7]);
  const carpetMat = tex('carpet', { roughness: 1 }, [9, 3]);
  const pearl = tex('door-pearl', { roughness: 0.35, metalness: 0.2 });
  const gableMat = cutout('gable', { metalness: 0.6, roughness: 0.38 });
  const bargeMat = cutout('bargeboard', { metalness: 0.7, roughness: 0.32 });

  // ---- plinth, steps, floors -------------------------------------------------
  group.add(merged([
    boxAt(OUTER.x1 - OUTER.x0 + 0.6, FLOOR, 2 * (OUTER.halfW + 0.3), (OUTER.x0 + OUTER.x1) / 2, FLOOR / 2, 0),
    boxAt(PORCH.x1 - PORCH.x0 + 0.1, FLOOR, 2 * PORCH.halfW, (PORCH.x0 + PORCH.x1) / 2, FLOOR / 2, 0),
    boxAt(STEPS.x1 - STEPS.x0, FLOOR / 3, 2 * STEPS.halfW, (STEPS.x0 + STEPS.x1) / 2, FLOOR / 6, 0),
    boxAt((STEPS.x1 - STEPS.x0) * 0.55, (2 * FLOOR) / 3, 2 * STEPS.halfW, STEPS.x1 - (STEPS.x1 - STEPS.x0) * 0.275, FLOOR / 3, 0),
  ], plinthMat, false));
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(HALL.x1 - HALL.x0 + W, 2 * hw).rotateX(-Math.PI / 2), floorMat);
  hallFloor.position.set((HALL.x0 + HALL.x1 - W) / 2, FLOOR + 0.003, 0);
  hallFloor.receiveShadow = true;
  const porchFloor = new THREE.Mesh(new THREE.PlaneGeometry(PORCH.x1 - PORCH.x0, 2 * PORCH.halfW).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xcfc6b6, roughness: 0.45 }));
  porchFloor.position.set((PORCH.x0 + PORCH.x1) / 2, FLOOR + 0.003, 0);
  porchFloor.receiveShadow = true;
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(CARPET.x1 - CARPET.x0, 2 * CARPET.halfW).rotateX(-Math.PI / 2), carpetMat);
  carpet.position.set((CARPET.x0 + CARPET.x1) / 2, FLOOR + 0.012, 0);
  carpet.receiveShadow = true;
  group.add(hallFloor, porchFloor, carpet);
  floor.push(hallFloor, porchFloor, carpet);

  // ---- walls ------------------------------------------------------------------
  const wallGeos: THREE.BufferGeometry[] = [];
  const winXs = [6, 10, 14, 18, 22, 26, 30];
  const sill = FLOOR + 1.3, lintel = FLOOR + 4.1, winHalf = 0.55;
  for (const s of [-1, 1]) {
    const zc = s * (hw + W / 2);
    // below the windows, above them, and the piers between
    wallGeos.push(boxAt(OUTER.x1 - OUTER.x0, sill, W, (OUTER.x0 + OUTER.x1) / 2, sill / 2, zc));
    wallGeos.push(boxAt(OUTER.x1 - OUTER.x0, WALL_OUT - lintel, W, (OUTER.x0 + OUTER.x1) / 2, (WALL_OUT + lintel) / 2, zc));
    const edges = [OUTER.x0, ...winXs.flatMap((x) => [x - winHalf, x + winHalf]), OUTER.x1];
    for (let i = 0; i < edges.length; i += 2) {
      wallGeos.push(boxAt(edges[i + 1] - edges[i], lintel - sill, W, (edges[i] + edges[i + 1]) / 2, (sill + lintel) / 2, zc));
    }
    colliders.push({ x0: OUTER.x0, x1: OUTER.x1, z0: s < 0 ? -OUTER.halfW : hw, z1: s < 0 ? -hw : OUTER.halfW });
  }
  // west front, with the great doorway; the east wall behind the image
  const dh = HALL.door.halfW;
  wallGeos.push(boxAt(W, WALL_OUT, hw - dh, -W / 2, WALL_OUT / 2, -(hw + dh) / 2));
  wallGeos.push(boxAt(W, WALL_OUT, hw - dh, -W / 2, WALL_OUT / 2, (hw + dh) / 2));
  wallGeos.push(boxAt(W, WALL_OUT - FLOOR - HALL.door.h, 2 * dh, -W / 2, (WALL_OUT + FLOOR + HALL.door.h) / 2, 0));
  wallGeos.push(boxAt(W, WALL_OUT, 2 * OUTER.halfW, HALL.x1 + W / 2, WALL_OUT / 2, 0));
  const walls = merged(wallGeos, plaster);
  // slit windows along the outer face, and pilasters with gilt lotus-bud capitals
  const slitGeos: THREE.BufferGeometry[] = [];
  const pilGeos: THREE.BufferGeometry[] = [];
  const pilCaps: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    for (let x = 4; x <= 32; x += 4) {
      pilGeos.push(boxAt(0.5, WALL_OUT - 0.6, 0.18, x, (WALL_OUT - 0.6) / 2, s * (OUTER.halfW + 0.09)));
      pilCaps.push(new THREE.SphereGeometry(0.34, 10, 8).scale(1, 1.3, 0.6).translate(x, WALL_OUT - 0.5, s * (OUTER.halfW + 0.12)));
    }
    for (const x of winXs) {
      // the window seen from outside: plaster mullions leave five tall slits
      for (let k = -2; k <= 2; k++) slitGeos.push(boxAt(0.12, lintel - sill, 0.2, x + k * 0.22, (sill + lintel) / 2, s * (OUTER.halfW - 0.1)));
    }
  }
  group.add(merged(slitGeos, plaster), merged(pilGeos, plaster), merged(pilCaps, gold, false));
  group.add(walls);
  colliders.push(
    { x0: -W, x1: 0, z0: -hw, z1: -dh },
    { x0: -W, x1: 0, z0: dh, z1: hw },
    { x0: HALL.x1, x1: OUTER.x1, z0: -OUTER.halfW, z1: OUTER.halfW },
  );

  // windows: daylight in the opening; inside, the two black-lacquer leaves stand open, folded
  // flat against the wall either side, gilt with lai rot nam like the columns
  const shutterMat = tex('column', { roughness: 0.4, metalness: 0.25, color: 0xd8c8a8 }, [0.5, 1.2]);
  const daylightMat = new THREE.MeshBasicMaterial({ color: 0xb8c4cc });
  const lightGeos: THREE.BufferGeometry[] = [];
  const shutterGeos: THREE.BufferGeometry[] = [];
  const liningGeos: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    for (const x of winXs) {
      const g = panel(2 * winHalf, lintel - sill, s < 0 ? 'z+' : 'z-');
      g.translate(x, (sill + lintel) / 2, s * (hw + W * 0.7));
      lightGeos.push(g);
      for (const side of [-1, 1]) {
        const leaf = panel(winHalf - 0.04, lintel - sill - 0.06, s < 0 ? 'z+' : 'z-');
        leaf.translate(x + side * (winHalf * 1.5 + 0.03), (sill + lintel) / 2, s * (hw - 0.05));
        shutterGeos.push(leaf);
      }
    }
    // the inner wall below the murals: dark red lacquer sown with small gilt flowers
    const edges = [0, ...winXs.flatMap((x) => [x - winHalf, x + winHalf]), HALL.x1];
    for (let i = 0; i < edges.length; i += 2) {
      const l = panel(edges[i + 1] - edges[i], lintel + 0.22 - (FLOOR + 0.9), s < 0 ? 'z+' : 'z-');
      l.translate((edges[i] + edges[i + 1]) / 2, (lintel + 0.22 + FLOOR + 0.9) / 2, s * (hw - 0.012));
      liningGeos.push(l);
    }
    // window reveals, lacquered too
    for (const x of winXs) {
      liningGeos.push(boxAt(2 * winHalf, 0.02, W, x, sill + 0.01, s * (hw + W / 2)));
      liningGeos.push(boxAt(2 * winHalf, 0.02, W, x, lintel - 0.01, s * (hw + W / 2)));
      for (const side of [-1, 1]) liningGeos.push(boxAt(0.02, lintel - sill, W, x + side * (winHalf - 0.01), (sill + lintel) / 2, s * (hw + W / 2)));
    }
  }
  const windowLight = merged(lightGeos, daylightMat, false);
  windowLight.receiveShadow = false;
  const lining = tex('backdrop', { roughness: 0.5, metalness: 0.15, color: 0x9a5040 }, [1.6, 1.6]);
  group.add(windowLight, merged(shutterGeos, shutterMat, false), merged(liningGeos, lining, false));

  // murals in a band above the windows, the length of both side walls
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(panel(HALL.x1 - 1, HALL.wallTop - (lintel + 0.35), s < 0 ? 'z+' : 'z-'), muralMat);
    m.position.set(HALL.x1 / 2, (HALL.wallTop + lintel + 0.35) / 2, s * (hw - 0.01));
    m.receiveShadow = true;
    group.add(m);
  }
  // a gilt rail under the murals and a dark red dado
  const trimGeos: THREE.BufferGeometry[] = [];
  const dadoGeos: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    trimGeos.push(boxAt(HALL.x1, 0.12, 0.06, HALL.x1 / 2, lintel + 0.28, s * (hw - 0.03)));
    trimGeos.push(boxAt(HALL.x1, 0.1, 0.06, HALL.x1 / 2, HALL.wallTop - 0.05, s * (hw - 0.03)));
    dadoGeos.push(boxAt(HALL.x1, 0.9, 0.04, HALL.x1 / 2, FLOOR + 0.45, s * (hw - 0.02)));
  }
  group.add(merged(trimGeos, gold, false), merged(dadoGeos, lacquerRed, false));

  // ---- doors -------------------------------------------------------------------
  // the great door stands open, its mother-of-pearl leaves folded back into the hall
  for (const s of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(dh - 0.05, HALL.door.h - 0.05, 0.08), pearl);
    leaf.rotation.y = Math.PI / 2;
    leaf.position.set((dh - 0.05) / 2 + 0.05, FLOOR + HALL.door.h / 2, s * (dh - 0.04));
    group.add(leaf);
  }
  // the two side portals keep their inlaid doors shut
  const sd = HALL.sideDoors;
  for (const s of [-1, 1]) {
    for (const k of [-1, 1]) {
      const leaf = new THREE.Mesh(panel(sd.halfW, sd.h, 'x-'), pearl);
      leaf.position.set(-W - 0.012, FLOOR + sd.h / 2, s * sd.z + (k * sd.halfW) / 2);
      if (k > 0) leaf.scale.x = -1;
      group.add(leaf);
    }
  }
  // gilded frames and pointed pediments over all three doorways
  const frameGeos: THREE.BufferGeometry[] = [];
  const pedGeos: THREE.BufferGeometry[] = [];
  for (const [zc, half, h] of [[0, dh, HALL.door.h], [-sd.z, sd.halfW, sd.h], [sd.z, sd.halfW, sd.h]] as const) {
    frameGeos.push(boxAt(0.12, h + 0.25, 0.22, -W - 0.06, FLOOR + (h + 0.25) / 2, zc - half - 0.11));
    frameGeos.push(boxAt(0.12, h + 0.25, 0.22, -W - 0.06, FLOOR + (h + 0.25) / 2, zc + half + 0.11));
    frameGeos.push(boxAt(0.14, 0.3, 2 * half + 0.6, -W - 0.07, FLOOR + h + 0.15, zc));
    const ped = panel(2 * half + 1.0, (2 * half + 1.0) * 0.75, 'x-');
    ped.translate(-W - 0.09, FLOOR + h + 0.3 + (2 * half + 1.0) * 0.37, zc);
    pedGeos.push(ped);
  }
  group.add(merged(frameGeos, gold), merged(pedGeos, gableMat, false));

  // ---- porch -------------------------------------------------------------------
  const PR = { front: -5.8, eave: 5.4, top: 8.6, topHalf: 3.0, half: 6.2, back: -W };
  const colGeo = new THREE.CylinderGeometry(0.3, 0.33, PR.eave - FLOOR - 0.5, 20);
  const capGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.3, 0), new THREE.Vector2(0.36, 0.08), new THREE.Vector2(0.42, 0.22), new THREE.Vector2(0.44, 0.38),
    new THREE.Vector2(0.38, 0.48), new THREE.Vector2(0.4, 0.52),
  ], 20);
  const porchCols: THREE.BufferGeometry[] = [];
  const porchCaps: THREE.BufferGeometry[] = [];
  for (const z of [-4.5, -1.9, 1.9, 4.5]) {
    porchCols.push(colGeo.clone().translate(-4.6, FLOOR + (PR.eave - FLOOR - 0.5) / 2, z));
    porchCaps.push(capGeo.clone().translate(-4.6, PR.eave - 0.52, z));
    colliders.push({ x0: -4.95, x1: -4.25, z0: z - 0.35, z1: z + 0.35 });
  }
  group.add(merged(porchCols, plaster), merged(porchCaps, gold));
  // architrave over the porch columns, painted red with gilt edges
  group.add(merged([boxAt(0.5, 0.35, 2 * PR.half - 0.6, -4.6, PR.eave - 0.02, 0)], lacquerRed));
  group.add(merged([boxAt(0.54, 0.06, 2 * PR.half - 0.55, -4.6, PR.eave + 0.15, 0), boxAt(0.54, 0.06, 2 * PR.half - 0.55, -4.6, PR.eave - 0.18, 0)], gold, false));
  // porch side walls (low, with the sides open above) and their colliders
  for (const s of [-1, 1]) {
    group.add(merged([boxAt(PORCH.x1 - PORCH.x0, 1.0, 0.3, (PORCH.x0 + PORCH.x1) / 2, FLOOR + 0.5, s * (PORCH.halfW - 0.15))], plaster));
    colliders.push({ x0: PORCH.x0, x1: PORCH.x1, z0: s < 0 ? -PORCH.halfW : PORCH.halfW - 0.3, z1: s < 0 ? -PORCH.halfW + 0.3 : PORCH.halfW });
    colliders.push({ x0: PORCH.x0 - 0.2, x1: PORCH.x0 + 0.1, z0: s < 0 ? -PORCH.halfW : STEPS.halfW, z1: s < 0 ? -STEPS.halfW : PORCH.halfW });
  }
  // the hipped porch roof: a front apron with its eave level across the facade
  const porchRoof = [
    quad(V(PR.front, PR.eave, PR.half), V(PR.front, PR.eave, -PR.half), V(-2.4, PR.top, -PR.topHalf), V(-2.4, PR.top, PR.topHalf), 1.6),
    quad(V(PR.front, PR.eave, -PR.half), V(PR.back, PR.eave, -PR.half), V(PR.back, PR.top, -PR.topHalf), V(-2.4, PR.top, -PR.topHalf), 1.6),
    quad(V(PR.back, PR.eave, PR.half), V(PR.front, PR.eave, PR.half), V(-2.4, PR.top, PR.topHalf), V(PR.back, PR.top, PR.topHalf), 1.6),
    quad(V(-2.4, PR.top, PR.topHalf), V(-2.4, PR.top, -PR.topHalf), V(PR.back, PR.top, -PR.topHalf), V(PR.back, PR.top, PR.topHalf), 1.6),
  ];
  group.add(merged(porchRoof, tiles));
  const bw = 0.55; // green border band
  const slopeK = bw / Math.hypot(PR.top - PR.eave, -2.4 - PR.front);
  const lerpV = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);
  {
    const a = V(PR.front - 0.02, PR.eave - 0.01, PR.half + 0.02), b = V(PR.front - 0.02, PR.eave - 0.01, -PR.half - 0.02);
    const c = V(-2.4, PR.top, -PR.topHalf), d = V(-2.4, PR.top, PR.topHalf);
    const sa = V(PR.back, PR.eave - 0.01, -PR.half - 0.02), sd2 = V(PR.back, PR.eave - 0.01, PR.half + 0.02);
    group.add(merged([
      quad(a, b, lerpV(b, c, slopeK).add(V(-0.01, 0.01, 0)), lerpV(a, d, slopeK).add(V(-0.01, 0.01, 0)), 1.2),
      quad(b, sa, lerpV(sa, V(PR.back, PR.top, -PR.topHalf), slopeK * 1.2), lerpV(b, c, slopeK * 1.2), 1.2),
      quad(sd2, a, lerpV(a, d, slopeK * 1.2), lerpV(sd2, V(PR.back, PR.top, PR.topHalf), slopeK * 1.2), 1.2),
    ], border));
  }
  // porch ceiling, red with gilt rosettes
  const porchCeil = new THREE.Mesh(new THREE.PlaneGeometry(PR.back - PR.front - 0.4, 2 * PR.half - 0.4).rotateX(Math.PI / 2), ceilingMat);
  porchCeil.position.set((PR.front + PR.back) / 2 + 0.2, PR.eave - 0.2, 0);
  group.add(porchCeil);

  // ---- roof -------------------------------------------------------------------
  const tileGeos: THREE.BufferGeometry[] = [];
  const borderGeos: THREE.BufferGeometry[] = [];
  const backGeos: THREE.BufferGeometry[] = [];
  const goldGeos: THREE.BufferGeometry[] = [];
  const gablePanels: THREE.BufferGeometry[] = [];
  const bargeGeos: THREE.BufferGeometry[] = [];
  const lukFak: THREE.BufferGeometry[] = [];
  const chofa = finialGeometry(2.2, 0.14);
  const hangHong = finialGeometry(0.9, 0.1);
  const BW = 0.6; // border width
  for (const sec of SECTIONS) {
    const x0 = sec.x0, x1 = sec.x1, dy = sec.dy;
    for (const t of TIERS) {
      const yT = t.yTop + dy, yB = t.yBot + dy;
      const len = Math.hypot(t.zBot - t.zTop, yT - yB);
      const k = BW / len;
      for (const s of [-1, 1]) {
        const P = (x: number, u: number) => V(x, yB + (yT - yB) * u, s * (t.zBot + (t.zTop - t.zBot) * u));
        const order = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => (s > 0 ? quad(a, b, c, d, 1.6) : quad(b, a, d, c, 1.6));
        // the tiled field, a green band along the eave, and green strips up both gable edges
        tileGeos.push(order(P(x0 + BW, k), P(x1 - BW, k), P(x1 - BW, 1), P(x0 + BW, 1)));
        borderGeos.push(order(P(x0, 0), P(x1, 0), P(x1, k), P(x0, k)));
        borderGeos.push(order(P(x0, k), P(x0 + BW, k), P(x0 + BW, 1), P(x0, 1)));
        borderGeos.push(order(P(x1 - BW, k), P(x1, k), P(x1, 1), P(x1 - BW, 1)));
        // a red fascia along the eave
        const fascia = boxAt(x1 - x0, 0.22, 0.08, (x0 + x1) / 2, yB - 0.08, s * (t.zBot + 0.02));
        backGeos.push(fascia);
        // hang hong (upturned naga heads) at the ends of each tier's gable edge
        for (const [xe, west] of [[x0, true], [x1, false]] as const) {
          if ((west && !sec.westGable) || (!west && !sec.eastGable)) continue;
          const f = hangHong.clone();
          f.rotateY(Math.PI / 2);
          if (s < 0) f.rotateY(Math.PI);
          f.translate(xe - (west ? 0.05 : -0.05), yB - 0.05, s * (t.zBot - 0.15));
          goldGeos.push(f);
        }
      }
      // naga bargeboards along the lower tiers' gable edges (tier A has them in its gable carving)
      if (t !== TIERS[0]) {
        for (const [xe, west] of [[x0, true], [x1, false]] as const) {
          if ((west && !sec.westGable) || (!west && !sec.eastGable)) continue;
          for (const s of [-1, 1]) {
            const top = V(xe - (west ? 0.06 : -0.06), yT + 0.35, s * t.zTop);
            const bot = V(xe - (west ? 0.06 : -0.06), yB + 0.35, s * t.zBot);
            const hgt = 0.8;
            const g = quad(V(top.x, top.y - hgt / 2, top.z), V(bot.x, bot.y - hgt / 2, bot.z), V(bot.x, bot.y + hgt / 2, bot.z), V(top.x, top.y + hgt / 2, top.z));
            bargeGeos.push(g);
          }
        }
      }
    }
    // gable ends: the carved gilt gable in tier A, a panel band below it, chofa on top
    for (const [xe, west] of [[x0, true], [x1, false]] as const) {
      if ((west && !sec.westGable) || (!west && !sec.eastGable)) continue;
      const out = west ? -1 : 1;
      const A = TIERS[0], B = TIERS[1];
      const xi = xe - out * 0.35; // set back under the overhang
      // the dark red gable wall, filling the stepped outline of the four tiers
      const outline: [number, number][] = [[OUTER.halfW, WALL_OUT + dy - 0.2]];
      for (let i = TIERS.length - 1; i >= 0; i--) outline.push([TIERS[i].zTop + (i ? 0.15 : 0), TIERS[i].yTop + dy - (i ? 0.2 : 0.35)]);
      const shape = new THREE.Shape();
      shape.moveTo(-outline[0][0], outline[0][1]);
      for (const [z, y] of outline.slice(1)) shape.lineTo(-z, y);
      for (const [z, y] of outline.slice(0, -1).reverse()) shape.lineTo(z, y);
      const gw0 = new THREE.ShapeGeometry(shape);
      gw0.rotateY(west ? -Math.PI / 2 : Math.PI / 2);
      gw0.translate(xi, 0, 0);
      backGeos.push(gw0);
      // the gilded carving, stretched over the triangle with its bargeboards overhanging
      // (it spans the top two tiers, as the great gilt gable of the real front does)
      const gw = 2 * B.zBot + 2.0, gh = A.yTop - B.yBot + 1.6;
      const gp = panel(gw, gh, west ? 'x-' : 'x+');
      gp.translate(xi + out * 0.1, B.yBot + dy - 0.55 + gh / 2, 0);
      gablePanels.push(gp);
      // a row of red-and-gold panels (luk fak) across the band below
      const lf = panel(2 * TIERS[2].zBot - 3.6, 0.8, west ? 'x-' : 'x+');
      lf.translate(xi + out * 0.05, B.yBot + dy - 0.75, 0);
      lukFak.push(lf);
      // chofa: the slender gilded bird-beak finial at the peak
      // seen in profile from the side, its beak curling out over the gable
      const c = chofa.clone();
      if (west) c.rotateY(Math.PI);
      c.translate(xe - out * 0.1, A.yTop + dy - 0.25, 0);
      goldGeos.push(c);
    }
    // ridge cap
    goldGeos.push(boxAt(x1 - x0, 0.22, 0.32, (x0 + x1) / 2, TIERS[0].yTop + dy + 0.02, 0));
  }
  const tileMesh = merged(tileGeos, tiles);
  const borderMesh = merged(borderGeos, border);
  const backing = merged(backGeos, new THREE.MeshStandardMaterial({ color: 0x5a1a14, roughness: 0.7, side: THREE.DoubleSide }));
  group.add(tileMesh, borderMesh, backing, merged(goldGeos, gold), merged(gablePanels, gableMat, false), merged(bargeGeos, bargeMat, false));
  const lukTex = canvasTex(1024, 128, (g) => {
    g.fillStyle = '#7e1a16';
    g.fillRect(0, 0, 1024, 128);
    for (let i = 0; i < 8; i++) {
      const x = 12 + i * 126;
      g.fillStyle = '#c9962c';
      g.fillRect(x, 14, 114, 100);
      g.fillStyle = '#23356a';
      g.fillRect(x + 8, 22, 98, 84);
      // a gilt deity figure in each panel
      g.fillStyle = '#c9962c';
      g.beginPath(); g.ellipse(x + 57, 82, 22, 20, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x + 57, 56, 10, 16, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(x + 51, 42); g.lineTo(x + 57, 24); g.lineTo(x + 63, 42); g.fill();
    }
  });
  lukTex.wrapS = THREE.ClampToEdgeWrapping;
  group.add(merged(lukFak, new THREE.MeshStandardMaterial({ map: lukTex, metalness: 0.4, roughness: 0.45 }), false));

  // no veranda: the lowest tier rides on the wall and oversails it, carried on carved brackets
  // (khan thuai) springing from the pilasters; a dark red frieze closes the gap above the wall
  const bracketGeos: THREE.BufferGeometry[] = [];
  const friezeGeos: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    for (let x = 0; x <= 36; x += 4) {
      const dy = x < SECTIONS[1].x0 ? SECTIONS[0].dy : 0;
      // a gilt triangular bracket: its back on the pilaster, its top under the eave
      const z0 = OUTER.halfW + 0.12, zEnd = 9.2, yTop = tierDAt(zEnd, dy) - 0.1, yWall = tierDAt(z0, dy) - 0.15;
      const sh = new THREE.Shape();
      sh.moveTo(0, yWall - 2.6); sh.lineTo(0, yWall); sh.lineTo(zEnd - z0, yTop); sh.quadraticCurveTo(0.5, yTop - 0.6, 0, yWall - 2.6);
      const b = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false, curveSegments: 6 });
      b.translate(0, 0, -0.07).rotateY((-s * Math.PI) / 2); // the shape's x runs out from the wall
      b.translate(x, 0, s * z0);
      bracketGeos.push(b);
    }
    for (const sec of SECTIONS) {
      const top = tierDAt(OUTER.halfW, sec.dy);
      if (top > WALL_OUT + 0.02) friezeGeos.push(boxAt(sec.x1 - sec.x0, top - WALL_OUT + 0.1, 0.3, (sec.x0 + sec.x1) / 2, (top + WALL_OUT) / 2 - 0.05, s * (OUTER.halfW - 0.15)));
    }
  }
  group.add(merged(bracketGeos, gold, false), merged(friezeGeos, lacquerRed, false));

  // ---- interior ----------------------------------------------------------------
  // black-and-gold lacquer columns with gilded lotus-bud capitals
  const colH = HALL.naveTop - FLOOR - 1.1;
  const shaft = new THREE.CylinderGeometry(0.34, 0.37, colH, 24, 1, true);
  const cols = new THREE.InstancedMesh(shaft, columnMat, HALL.colXs.length * 2);
  const lotus = new THREE.LatheGeometry([
    new THREE.Vector2(0.34, 0), new THREE.Vector2(0.44, 0.12), new THREE.Vector2(0.55, 0.38), new THREE.Vector2(0.56, 0.62),
    new THREE.Vector2(0.46, 0.86), new THREE.Vector2(0.4, 0.95), new THREE.Vector2(0.42, 1.1),
  ], 20);
  const colGold: THREE.BufferGeometry[] = [];
  const mtx = new THREE.Matrix4();
  let n = 0;
  for (const z of [-HALL.colZ, HALL.colZ]) {
    for (const x of HALL.colXs) {
      mtx.makeTranslation(x, FLOOR + colH / 2, z);
      cols.setMatrixAt(n++, mtx);
      colGold.push(lotus.clone().translate(x, FLOOR + colH, z));
      colGold.push(new THREE.CylinderGeometry(0.4, 0.42, 0.18, 24).translate(x, FLOOR + 0.09, z));
      colGold.push(new THREE.TorusGeometry(0.36, 0.035, 6, 24).rotateX(Math.PI / 2).translate(x, FLOOR + 2.2, z));
      colGold.push(new THREE.TorusGeometry(0.35, 0.035, 6, 24).rotateX(Math.PI / 2).translate(x, FLOOR + colH - 1.4, z));
      colliders.push({ x0: x - 0.42, x1: x + 0.42, z0: z - 0.42, z1: z + 0.42 });
    }
  }
  cols.castShadow = cols.receiveShadow = true;
  group.add(cols, merged(colGold, gold));

  // ceilings: the high nave between the column rows, the lower aisles beside it
  const naveCeil = new THREE.Mesh(new THREE.PlaneGeometry(HALL.x1, 2 * HALL.colZ).rotateX(Math.PI / 2), ceilingMat);
  naveCeil.position.set(HALL.x1 / 2, HALL.naveTop, 0);
  group.add(naveCeil);
  for (const s of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(HALL.x1, hw - HALL.colZ).rotateX(Math.PI / 2), aisleCeil);
    a.position.set(HALL.x1 / 2, HALL.wallTop, s * (HALL.colZ + hw) / 2);
    group.add(a);
  }
  // dark red beams: the clerestory fascia over each column row, tie beams across the nave
  const beamGeos: THREE.BufferGeometry[] = [];
  const beamGold: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    beamGeos.push(boxAt(HALL.x1, HALL.naveTop - HALL.wallTop, 0.5, HALL.x1 / 2, (HALL.naveTop + HALL.wallTop) / 2, s * HALL.colZ));
    beamGold.push(boxAt(HALL.x1, 0.1, 0.54, HALL.x1 / 2, HALL.wallTop + 0.05, s * HALL.colZ));
    beamGold.push(boxAt(HALL.x1, 0.08, 0.54, HALL.x1 / 2, HALL.naveTop - 0.5, s * HALL.colZ));
  }
  for (const x of HALL.colXs) {
    beamGeos.push(boxAt(0.4, 0.55, 2 * HALL.colZ, x, HALL.naveTop - 0.3, 0));
    beamGold.push(boxAt(0.44, 0.06, 2 * HALL.colZ, x, HALL.naveTop - 0.58, 0));
    for (const s of [-1, 1]) beamGeos.push(boxAt(0.3, 0.4, hw - HALL.colZ, x, HALL.wallTop - 0.2, s * (hw + HALL.colZ) / 2));
  }
  group.add(merged(beamGeos, new THREE.MeshStandardMaterial({ color: 0x4a120e, roughness: 0.6 })), merged(beamGold, gold, false));
  // the gable wall above the door inside, dark red
  group.add(merged([boxAt(0.05, HALL.naveTop - HALL.door.h - FLOOR, 2 * hw, 0.03, (HALL.naveTop + HALL.door.h + FLOOR) / 2, 0)], new THREE.MeshStandardMaterial({ color: 0x4a120e, roughness: 0.7 }), false));

  // crystal chandeliers down the nave and the aisles
  const crystal = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 1.4, roughness: 0.15, metalness: 0.3 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9962c, metalness: 0.9, roughness: 0.35 });
  const drops: THREE.BufferGeometry[] = [];
  const frames: THREE.BufferGeometry[] = [];
  const drop = new THREE.OctahedronGeometry(0.06, 0).scale(1, 1.8, 1);
  const chandelier = (x: number, y: number, z: number, size: number, ceil: number) => {
    frames.push(new THREE.CylinderGeometry(0.015, 0.015, ceil - y, 4).translate(x, (ceil + y) / 2, z));
    for (let tier = 0; tier < 3; tier++) {
      const r = size * (1 - tier * 0.3), yy = y - tier * size * 0.35, count = 10 - tier * 3;
      frames.push(new THREE.TorusGeometry(r, 0.02, 4, 16).rotateX(Math.PI / 2).translate(x, yy, z));
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + tier * 0.3;
        drops.push(drop.clone().translate(x + Math.cos(a) * r, yy - 0.12, z + Math.sin(a) * r));
        drops.push(drop.clone().scale(0.7, 0.7, 0.7).translate(x + Math.cos(a) * r, yy - 0.3, z + Math.sin(a) * r));
      }
    }
    drops.push(drop.clone().scale(1.6, 2, 1.6).translate(x, y - size * 1.1, z));
  };
  for (const x of [6, 14, 22]) chandelier(x, FLOOR + 7.4, 0, 0.75, HALL.naveTop);
  for (const s of [-1, 1]) for (const x of [10, 18, 26]) chandelier(x, FLOOR + 5.2, s * 5.3, 0.5, HALL.wallTop);
  const crystalMesh = merged(drops, crystal, false);
  group.add(crystalMesh, merged(frames, brass, false));
  const naveLights: THREE.PointLight[] = [];
  for (const x of [8, 20]) {
    const l = new THREE.PointLight(0xffd29a, 14, 22, 1.4);
    l.position.set(x, FLOOR + 6.6, 0);
    group.add(l);
    naveLights.push(l);
  }

  // the viharn's volume, for the orbit camera: walls, the roof over the aisles and
  // nave, and the low eaves outside
  const cameraSolids = [
    { x0: OUTER.x0, x1: OUTER.x1, z0: -OUTER.halfW, z1: -hw },
    { x0: OUTER.x0, x1: OUTER.x1, z0: hw, z1: OUTER.halfW },
    { x0: HALL.x1, x1: OUTER.x1, z0: -hw, z1: hw },
    { x0: OUTER.x0, x1: 0, z0: -hw, z1: -dh },
    { x0: OUTER.x0, x1: 0, z0: dh, z1: hw },
    { x0: OUTER.x0, x1: OUTER.x1, z0: -hw, z1: -HALL.colZ, y0: HALL.wallTop },
    { x0: OUTER.x0, x1: OUTER.x1, z0: HALL.colZ, z1: hw, y0: HALL.wallTop },
    { x0: OUTER.x0, x1: OUTER.x1, z0: -HALL.colZ, z1: HALL.colZ, y0: HALL.naveTop },
    { x0: PORCH.x0 - 0.8, x1: PORCH.x1, z0: -PR.half, z1: PR.half, y0: PR.eave - 0.25 },
  ];

  return {
    group, floor, colliders, cameraSolids,
    occluders: [walls, tileMesh],
    update(night: number) {
      // windows glow with daylight by day and go dark blue at night; lamps brighten at night
      daylightMat.color.setRGB(0.87 - night * 0.8, 0.91 - night * 0.82, 0.94 - night * 0.76);
      for (const l of naveLights) l.intensity = 12 + night * 10;
      crystal.emissiveIntensity = 1.2 + night * 0.8;
    },
  };
}
