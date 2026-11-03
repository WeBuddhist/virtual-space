import * as THREE from 'three';
import { box, noiseCanvas, signboardTexture, std, stoneTileTexture } from '../../kit/materials';
import { altarWallTexture, makeLantern, makePine, makePrayerFlags, makeStatue, makeStoneLantern } from '../../kit/props';
import type { Box2, Cushion, Site, SiteContext } from '../types';

// The original courtyard + open-front hall, parameterized by the temple's colors
// and statues. Temples without a bespoke site use this one.
const H = { x0: -6, x1: 6, z0: -14, z1: -6, floorY: 0.4, wallH: 4.2 };

export function genericSite({ scene, temple, rng }: SiteContext): Site {
  const floor: THREE.Object3D[] = [];
  const colliders: Box2[] = [];
  const burnerPos = new THREE.Vector3(0, 0, -3.4);

  // ground
  const grassTex = noiseCanvas(256, '#6f7350', ['#56603c', '#8a8458', '#4b5236', '#9a8f63']);
  grassTex.repeat.set(30, 30);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), std(0xffffff, { map: grassTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  floor.push(ground);

  const pathTex = stoneTileTexture();
  pathTex.repeat.set(1, 11);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 22), std(0xffffff, { map: pathTex, roughness: 0.95 }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.012, 5);
  path.receiveShadow = true;
  scene.add(path);
  floor.push(path);
  const plazaTex = stoneTileTexture();
  plazaTex.repeat.set(4, 1);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.2), std(0xffffff, { map: plazaTex, roughness: 0.95 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.011, -4.4);
  plaza.receiveShadow = true;
  scene.add(plaza);
  floor.push(plaza);

  // hall
  const stone = std(0x8f8b83, { roughness: 0.95 });
  const wood = std(0x7a5634, { roughness: 0.7 });
  const pillarMat = std(temple.hall.pillarColor, { roughness: 0.6 });
  const wallMat = std(temple.hall.wallColor, { roughness: 0.95 });
  const roofMat = std(temple.hall.roofColor, { roughness: 0.8 });
  const trim = std(0x2d5b55, { roughness: 0.7 });
  const hall = new THREE.Group();
  scene.add(hall);
  const cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2, w = H.x1 - H.x0, d = H.z1 - H.z0;

  hall.add(box(w + 0.8, H.floorY, d + 0.8, stone, cx, H.floorY / 2, cz));
  const hallFloor = box(w, 0.02, d, wood, cx, H.floorY + 0.01, cz);
  hall.add(hallFloor);
  floor.push(hallFloor);
  // front step
  const step = box(4, H.floorY / 2, 0.5, stone, 0, H.floorY / 4, H.z1 + 0.65);
  hall.add(step);
  floor.push(step);

  const wallY = H.floorY + H.wallH / 2;
  hall.add(box(w, H.wallH, 0.3, wallMat, cx, wallY, H.z0));
  hall.add(box(0.3, H.wallH, d - 0.6, wallMat, H.x0, wallY, cz - 0.3));
  hall.add(box(0.3, H.wallH, d - 0.6, wallMat, H.x1, wallY, cz - 0.3));
  colliders.push({ x0: H.x0 - 0.5, x1: H.x1 + 0.5, z0: H.z0 - 1, z1: H.z0 + 0.25 });
  colliders.push({ x0: H.x0 - 0.5, x1: H.x0 + 0.25, z0: H.z0, z1: H.z1 - 0.6 });
  colliders.push({ x0: H.x1 - 0.25, x1: H.x1 + 0.5, z0: H.z0, z1: H.z1 - 0.6 });

  // timber band and lattice windows on side walls
  for (const x of [H.x0 + 0.17, H.x1 - 0.17]) {
    for (let z = H.z0 + 1.2; z < H.z1 - 1; z += 1.8) {
      hall.add(box(0.05, 1.2, 1.2, trim, x, H.floorY + 2.2, z));
    }
  }

  const pillarGeo = new THREE.CylinderGeometry(0.2, 0.24, H.wallH, 16);
  const frontXs = [-5.6, -3.4, 3.4, 5.6];
  for (const x of frontXs) {
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(x, wallY, H.z1 - 0.2);
    p.castShadow = true;
    hall.add(p);
    hall.add(box(0.6, 0.18, 0.6, stone, x, H.floorY + 0.09, H.z1 - 0.2));
    colliders.push({ x0: x - 0.32, x1: x + 0.32, z0: H.z1 - 0.52, z1: H.z1 + 0.12 });
  }
  // lintel, brackets and painted beam
  hall.add(box(w + 0.6, 0.45, 0.4, trim, cx, H.floorY + H.wallH + 0.1, H.z1 - 0.2));
  hall.add(box(w + 0.6, 0.18, 0.5, pillarMat, cx, H.floorY + H.wallH - 0.2, H.z1 - 0.2));

  // roof: overhanging slab + two pitched planes + ridge
  const roofY = H.floorY + H.wallH + 0.35;
  hall.add(box(w + 3, 0.25, d + 3, roofMat, cx, roofY, cz));
  for (const side of [-1, 1]) {
    const plane = box(w + 3.2, 0.25, d / 2 + 2.2, roofMat, cx, roofY + 1.1, cz + side * (d / 4 + 0.6));
    plane.rotation.x = side * -0.42;
    hall.add(plane);
  }
  hall.add(box(w + 3.4, 0.35, 0.45, roofMat, cx, roofY + 2.05, cz));
  // gilded roof ornament (ganjira)
  const ganjira = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0xd8a640, metalness: 0.9, roughness: 0.3 }));
  ganjira.position.set(cx, roofY + 2.65, cz);
  hall.add(ganjira);

  // signboard
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.9), new THREE.MeshBasicMaterial({ map: signboardTexture(temple.hall.signboard) }));
  sign.position.set(0, H.floorY + H.wallH + 0.15, H.z1 + 0.02);
  hall.add(sign);

  // hanging lanterns
  const lanternLit = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffb25a, emissiveIntensity: 1.4 });
  const lanternFrame = std(0x3a2a1e);
  for (let i = 0; i < 7; i++) {
    const l = makeLantern(lanternLit, lanternFrame);
    l.position.set(-4.8 + i * 1.6, H.floorY + H.wallH - 0.55, H.z1 - 0.6);
    hall.add(l);
  }
  const hallLights: THREE.PointLight[] = [];
  for (const x of [-3, 3]) {
    const pl = new THREE.PointLight(0xffc27a, 6, 12, 1.6);
    pl.position.set(x, H.floorY + 3.2, H.z1 - 2);
    hall.add(pl);
    hallLights.push(pl);
  }
  const altarLight = new THREE.SpotLight(0xffd9a0, 30, 14, 0.7, 0.6, 1.4);
  altarLight.position.set(0, H.floorY + 3.9, -9);
  altarLight.target.position.set(0, H.floorY + 1.5, -13);
  hall.add(altarLight, altarLight.target);

  // altar, backdrop painting and statues
  const altarZ = H.z0 + 1.4;
  hall.add(box(7.6, 0.9, 1.6, std(0x6b2219, { roughness: 0.55 }), 0, H.floorY + 0.45, altarZ));
  hall.add(box(7.8, 0.08, 1.7, std(0xc69a3e, { metalness: 0.6, roughness: 0.4 }), 0, H.floorY + 0.92, altarZ));
  colliders.push({ x0: -4.1, x1: 4.1, z0: H.z0, z1: altarZ + 1 });
  const wallPaint = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 3.9), std(0xffffff, { map: altarWallTexture(temple.statues), roughness: 0.9 }));
  wallPaint.position.set(0, H.floorY + 2.1, H.z0 + 0.16);
  hall.add(wallPaint);
  for (const def of temple.statues) {
    const s = makeStatue(def);
    s.position.set(def.x, H.floorY + 0.96, altarZ - 0.1);
    hall.add(s);
  }
  // butter lamps and offering bowls on the altar edge
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0xd2a447, metalness: 0.9, roughness: 0.3 });
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xffd38a, emissive: 0xffa040, emissiveIntensity: 2 });
  for (let i = 0; i < 7; i++) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.07, 14), bowlMat);
    bowl.position.set(-1.5 + i * 0.5, H.floorY + 0.99, altarZ + 0.62);
    hall.add(bowl);
  }
  for (const x of [-3.4, 3.4]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.22, 14), bowlMat);
    lamp.position.set(x, H.floorY + 1.07, altarZ + 0.55);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), flameMat);
    flame.position.set(x, H.floorY + 1.24, altarZ + 0.55);
    hall.add(lamp, flame);
  }

  // cushions (seats); the first four hold resident practitioners
  const cushions: Cushion[] = [];
  const cushionGeo = new THREE.CylinderGeometry(0.34, 0.36, 0.1, 20);
  const cushionMats = [std(0x7c2a24, { roughness: 1 }), std(0xb57a2a, { roughness: 1 })];
  let ci = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      const x = -3.75 + c * 1.5;
      const z = -10.6 + r * 1.35;
      const m = new THREE.Mesh(cushionGeo, cushionMats[(r + c) % 2]);
      m.position.set(x, H.floorY + 0.06, z);
      m.receiveShadow = m.castShadow = true;
      m.userData.cushion = ci;
      hall.add(m);
      cushions.push({ index: ci++, position: new THREE.Vector3(x, H.floorY, z), mesh: m });
    }
  }

  // incense burner (bronze, on legs) in front of the hall
  const bronze = new THREE.MeshStandardMaterial({ color: 0x6f5a3a, metalness: 0.8, roughness: 0.45 });
  const burner = new THREE.Group();
  burner.name = 'burner';
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bronze);
  bowl.position.y = 0.72;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 32), bronze);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.72;
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), std(0xa59d90));
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.68;
  burner.add(bowl, rim, ash);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 8), bronze);
    leg.position.set(Math.cos(a) * 0.25, 0.25, Math.sin(a) * 0.25);
    burner.add(leg);
  }
  burner.add(box(1.2, 0.08, 1.2, stone, 0, 0.04, 0));
  burner.position.copy(burnerPos);
  burner.traverse((o) => { o.userData.burner = true; });
  scene.add(burner);
  colliders.push({ x0: burnerPos.x - 0.65, x1: burnerPos.x + 0.65, z0: burnerPos.z - 0.65, z1: burnerPos.z + 0.65 });


  // offering box
  const offering = box(0.9, 0.7, 0.55, std(0x6b2219, { roughness: 0.5 }), 2.1, H.floorY + 0.35, H.z1 - 1.2);
  hall.add(offering);
  colliders.push({ x0: 1.6, x1: 2.6, z0: H.z1 - 1.5, z1: H.z1 - 0.9 });

  // stone lanterns along the path
  const stoneLit = new THREE.MeshStandardMaterial({ color: 0xffe6b8, emissive: 0xffb357, emissiveIntensity: 1.2 });
  for (const z of [1, 6, 11]) {
    for (const x of [-2.4, 2.4]) {
      const l = makeStoneLantern(stoneLit);
      l.position.set(x, 0, z);
      scene.add(l);
      colliders.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 });
    }
  }
  const pathLight = new THREE.PointLight(0xffb86b, 4, 14, 1.8);
  pathLight.position.set(0, 1.6, 4);
  scene.add(pathLight);

  // lotus pond
  const pond = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), new THREE.MeshStandardMaterial({ color: 0x35504f, metalness: 0.2, roughness: 0.08 }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-7.5, 0.02, 4.5);
  scene.add(pond);
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.18, 8, 40), stone);
  rim2.rotation.x = Math.PI / 2;
  rim2.position.set(-7.5, 0.08, 4.5);
  scene.add(rim2);
  colliders.push({ x0: -10.3, x1: -4.7, z0: 1.7, z1: 7.3 });
  const padMat = std(0x4f6e3a);
  const lotusMat = std(0xf0c3c8);
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 2;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.3 + rng() * 0.15, 16), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(-7.5 + Math.cos(a) * r, 0.03, 4.5 + Math.sin(a) * r);
    scene.add(pad);
    if (i % 3 === 0) {
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 8, 1, true), lotusMat);
      flower.position.copy(pad.position).setY(0.12);
      flower.rotation.x = Math.PI;
      scene.add(flower);
    }
  }

  // pines, rocks, hedges
  const treeSpots: [number, number][] = [];
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (9 + rng() * 9);
    const z = -18 + rng() * 36;
    treeSpots.push([x, z]);
  }
  for (let i = 0; i < 14; i++) treeSpots.push([-14 + rng() * 28, -18 - rng() * 6]);
  for (const [x, z] of treeSpots) {
    if (Math.hypot(x + 7.5, z - 4.5) < 3.5) continue;
    const tree = makePine(rng);
    tree.position.set(x, 0, z);
    scene.add(tree);
    colliders.push({ x0: x - 0.45, x1: x + 0.45, z0: z - 0.45, z1: z + 0.45 });
  }
  const rockMat = std(0x7b776e, { roughness: 1 });
  for (let i = 0; i < 18; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + rng() * 0.5, 0), rockMat);
    const side = i % 2 ? 1 : -1;
    rock.position.set(side * (4 + rng() * 4), 0.1, -2 + rng() * 16);
    rock.scale.y = 0.6;
    rock.castShadow = true;
    scene.add(rock);
  }
  const hedgeMat = std(0x3d5a37, { roughness: 1 });
  for (const x of [-4.2, 4.2]) {
    const hedge = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 7, 6, 12), hedgeMat);
    hedge.rotation.x = Math.PI / 2;
    hedge.position.set(x, 0.4, 9);
    hedge.scale.set(1, 1, 0.8);
    hedge.castShadow = true;
    scene.add(hedge);
    colliders.push({ x0: x - 0.55, x1: x + 0.55, z0: 5, z1: 13 });
  }

  // distant mountains
  const mountMat = new THREE.MeshStandardMaterial({ color: 0x6f7c86, roughness: 1, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI * 0.95 + (i / 11) * Math.PI * 0.9;
    const r = 110 + rng() * 40;
    const m = new THREE.Mesh(new THREE.ConeGeometry(28 + rng() * 22, 30 + rng() * 34, 6), mountMat);
    m.position.set(Math.cos(a) * r, 10, Math.sin(a) * r);
    scene.add(m);
  }

  // prayer flags across the back of the courtyard
  const polePairs: [number, number, number, number][] = [[-14, -2, -7.5, -6.5], [14, -2, 7.5, -6.5], [-11, 12, -6, 15]];
  const flags = polePairs.map(([ax, az, bx, bz]) => {
    for (const [x, z] of [[ax, az], [bx, bz]]) colliders.push({ x0: x - 0.15, x1: x + 0.15, z0: z - 0.15, z1: z + 0.15 });
    return makePrayerFlags(new THREE.Vector3(ax, 0, az), new THREE.Vector3(bx, 0, bz));
  });
  scene.add(...flags);

  return {
    floor, cushions, colliders,
    burner: { object: burner, position: burnerPos, stand: new THREE.Vector3(0, 0, -2.4) },
    spawn: new THREE.Vector3(0, 0, 7),
    spawnYaw: Math.PI,
    bounds: { x0: -17, x1: 17, z0: -13.6, z1: 17 },
    groundHeight(x, z) {
      if (x > H.x0 && x < H.x1 && z > H.z0 && z < H.z1 + 0.3) return H.floorY;
      if (Math.abs(x) < 2 && z >= H.z1 + 0.3 && z < H.z1 + 0.95) return H.floorY / 2;
      return 0;
    },
    update(_dt, night, elapsed) {
      for (const l of hallLights) l.intensity = 4 + night * 10;
      pathLight.intensity = 1 + night * 9;
      altarLight.intensity = 20 + night * 20;
      lanternLit.emissiveIntensity = 0.8 + night * 1.6;
      stoneLit.emissiveIntensity = 0.5 + night * 2;
      for (const f of flags) {
        for (const flag of f.children) {
          if (flag.userData.sway !== undefined) flag.rotation.x = Math.sin(elapsed * 2 + flag.userData.sway) * 0.25;
        }
      }
    },
  };
}
