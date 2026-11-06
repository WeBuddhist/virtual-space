import * as THREE from 'three';
import type { Cushion, OfferingSpot, Site, SiteContext } from '../../types';
import { buildGrounds } from './grounds';
import { BOUNDS, BURNER_AT, CLOISTER, FLOOR, IMAGE_FACE, OUTER, PORCH, PRANG, RAIL_X, STEPS, TABLE } from './plan';
import { buildShrine } from './shrine';
import { buildViharn } from './viharn';

// Wat Phra Si Rattana Mahathat ("Wat Yai"), Phitsanulok: the viharn of the Phra Buddha
// Chinnarat (see docs/rooms/theravada/reference.md). Origin at the west doorway;
// +x east down the nave to the image, +z south. The hall faces west.

const EAST = Math.PI / 2;

export function theravadaSite({ scene, rng }: SiteContext): Site {
  const viharn = buildViharn();
  const shrine = buildShrine(rng);
  const grounds = buildGrounds(rng);
  scene.add(viharn.group, shrine.group, grounds.group);

  // eighteen kneeling mats on the red carpet, three rows of six, facing the image
  const cushions: Cushion[] = [];
  const matGeo = new THREE.BoxGeometry(0.8, 0.04, 0.6);
  const matMat = new THREE.MeshStandardMaterial({ color: 0x9c2a1e, roughness: 0.95 });
  for (const x of [21.0, 22.6, 24.2]) {
    for (const z of [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]) {
      const m = new THREE.Mesh(matGeo, matMat);
      m.position.set(x, FLOOR + 0.035, z);
      m.receiveShadow = true;
      m.userData.cushion = cushions.length;
      scene.add(m);
      cushions.push({ index: cushions.length, position: new THREE.Vector3(x, FLOOR, z), mesh: m, yaw: EAST, focus: IMAGE_FACE.clone() });
    }
  }

  // offerings: on the table before the railing
  const T = TABLE;
  const shrines: OfferingSpot[] = [{
    stand: new THREE.Vector3(RAIL_X - 0.7, FLOOR, 0), yaw: EAST,
    shower: new THREE.Vector3((T.x0 + T.x1) / 2, FLOOR, 0), radius: 1.0,
    area: { x0: T.x0, x1: T.x1, z0: -T.halfW, z1: T.halfW },
    ledges: [{ x0: T.x0, x1: T.x1, z0: -T.halfW, z1: T.halfW, y: T.top }],
    holder: new THREE.Vector3(T.x0 + 0.3, T.top + 0.09, 0),
  }];

  // the floor of the porch and hall is raised on the plinth; two steps lead up
  const groundHeight = (x: number, z: number) => {
    const az = Math.abs(z);
    if (x >= PORCH.x0 && x < PORCH.x1 && az <= PORCH.halfW) return FLOOR;
    if (x >= PORCH.x1 && x <= OUTER.x1 && az <= OUTER.halfW) return FLOOR;
    if (x >= STEPS.x0 && x < STEPS.x1 && az <= STEPS.halfW) return x < STEPS.x0 + (STEPS.x1 - STEPS.x0) * 0.45 ? FLOOR / 3 : (2 * FLOOR) / 3;
    return 0;
  };

  // clockwise round the prang inside the cloister court, the prang on the right
  const kx0 = CLOISTER.x0 + 4.4, kx1 = CLOISTER.x1 - 4.4, kz = CLOISTER.halfW - 4.6;
  const path: THREE.Vector3[] = [];
  const corners = [[kx0, kz], [kx0, -kz], [kx1, -kz], [kx1, kz]];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
    const n = Math.max(2, Math.round(Math.hypot(bx - ax, bz - az) / 3));
    for (let k = 0; k < n; k++) path.push(new THREE.Vector3(ax + ((bx - ax) * k) / n, 0, az + ((bz - az) * k) / n));
  }

  // at night the gable and the prang are floodlit gold
  const floods: THREE.SpotLight[] = [];
  for (const [from, to, power] of [
    [new THREE.Vector3(-24, 0.6, 0), new THREE.Vector3(-1, 12.5, 0), 900],
    [new THREE.Vector3(PRANG.x - 14, 0.6, -9), new THREE.Vector3(PRANG.x, 20, PRANG.z), 1600],
    [new THREE.Vector3(PRANG.x + 12, 0.6, 9), new THREE.Vector3(PRANG.x, 20, PRANG.z), 1200],
  ] as const) {
    const f = new THREE.SpotLight(0xffd6a0, 0, 60, 0.32, 0.7, 1.5);
    f.position.copy(from);
    f.target.position.copy(to);
    f.userData.power = power;
    scene.add(f, f.target);
    floods.push(f);
  }
  const doorGlow = new THREE.PointLight(0xffc27a, 0, 10, 1.6);
  doorGlow.position.set(-2.5, FLOOR + 3, 0);
  scene.add(doorGlow);

  return {
    floor: [...viharn.floor, ...grounds.floor],
    cushions,
    colliders: [...viharn.colliders, ...shrine.colliders, ...grounds.colliders],
    burner: { object: grounds.burner, position: BURNER_AT.clone(), stand: BURNER_AT.clone().add(new THREE.Vector3(-1.5, 0, -0.4)) },
    spawn: new THREE.Vector3(-17, 0, 0),
    spawnYaw: EAST,
    bounds: BOUNDS,
    groundHeight,
    occluders: [...viharn.occluders, ...grounds.occluders],
    cameraSolids: [...viharn.cameraSolids, ...grounds.cameraSolids],
    shrines,
    kora: {
      path,
      inside: (p) => p.x > CLOISTER.x0 + 3.2 && p.x < CLOISTER.x1 - 3.2 && Math.abs(p.z) < CLOISTER.halfW - 3.2,
      entrance: [new THREE.Vector3(PRANG.x, 0, CLOISTER.halfW + 2.5), new THREE.Vector3(PRANG.x, 0, CLOISTER.halfW - 3.6)],
    },
    update(dt, night, elapsed) {
      void dt;
      viharn.update(night);
      shrine.update(elapsed, night);
      grounds.update(elapsed);
      doorGlow.intensity = night * 5;
      for (const f of floods) f.intensity = night * f.userData.power;
    },
  };
}
