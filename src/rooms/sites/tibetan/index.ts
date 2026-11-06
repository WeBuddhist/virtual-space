import * as THREE from 'three';
import type { OfferingSpot, Site, SiteContext } from '../../types';
import { buildAltar } from './altar';
import { buildGrounds } from './grounds';
import { buildHall } from './hall';
import {
  BENCH, BOUNDS, BURNER_AT, FY, HALL, KORA_X, KORA_Z0, KORA_Z1, PORCH, STEPS, TABLE,
} from './layout';
import { makeMats } from './mats';
import { buildSeating } from './seating';

// The Golden Temple (Padmasambhava Buddhist Vihara), Namdroling Monastery, Bylakuppe
// (see docs/rooms/tibetan/reference.md). Built at half real scale. Origin at the main
// doorway; +z runs from the forecourt through the hall to the three great images.

export function tibetanSite({ scene, temple, rng }: SiteContext): Site {
  const m = makeMats();
  const hall = buildHall(m);
  const altar = buildAltar(m);
  const grounds = buildGrounds(m, temple.hall.signboard, rng);
  scene.add(hall.group, altar.group, grounds.group);
  const seating = buildSeating(scene, m);

  // night: a warm glow from the doorway and over the hall from the chandeliers
  const doorGlow = new THREE.PointLight(0xffb870, 0, 14, 1.6);
  doorGlow.position.set(0, FY + 3, -1.6);
  const hallGlow = new THREE.PointLight(0xffd9a0, 0, 26, 1.2);
  hallGlow.position.set(0, FY + 9.5, 9);
  scene.add(doorGlow, hallGlow);

  const T = TABLE;
  const shrines: OfferingSpot[] = [{
    stand: new THREE.Vector3(0, FY, T.z0 - 1.1),
    yaw: 0,
    shower: new THREE.Vector3(0, FY, (T.z0 + T.z1) / 2),
    radius: 1.3,
    area: { x0: T.x0, x1: T.x1, z0: T.z0 - 0.6, z1: T.z1 },
    ledges: [altar.ledge],
    holder: new THREE.Vector3(0, FY + T.h + 0.09, (T.z0 + T.z1) / 2 + 0.12),
  }];

  const inHall = (x: number, z: number) => x > HALL.x0 && x < HALL.x1 && z > HALL.z0 - 0.6 && z < HALL.z1;
  const groundHeight = (x: number, z: number) => {
    if (inHall(x, z)) {
      const bx = Math.abs(x);
      const onBench = z > BENCH.z0 && z < BENCH.z1 && (Math.abs(bx - BENCH.x) < BENCH.w / 2 || Math.abs(bx - BENCH.x - 1.95) < BENCH.w / 2);
      return FY + (onBench ? BENCH.h : 0);
    }
    if (x > PORCH.x0 && x < PORCH.x1 && z >= PORCH.z0 && z <= PORCH.z1) return FY;
    if (x > STEPS.x0 && x < STEPS.x1 && z > STEPS.z0 && z < PORCH.z0) {
      return FY * Math.min(1, Math.ceil(((z - STEPS.z0) / (PORCH.z0 - STEPS.z0)) * 3) / 3);
    }
    return 0;
  };

  // clockwise round the temple, the building always on the right
  const path: THREE.Vector3[] = [];
  const corners = [
    new THREE.Vector3(KORA_X, 0, KORA_Z0), new THREE.Vector3(KORA_X, 0, KORA_Z1),
    new THREE.Vector3(-KORA_X, 0, KORA_Z1), new THREE.Vector3(-KORA_X, 0, KORA_Z0),
  ];
  for (let i = 0; i < 4; i++) {
    const a = corners[i], c = corners[(i + 1) % 4];
    const n = Math.max(1, Math.round(a.distanceTo(c) / 4));
    for (let j = 0; j < n; j++) path.push(a.clone().lerp(c, j / n));
  }
  // keep the front stretch clear of the incense burner and the porch steps
  for (const p of path) if (p.z === KORA_Z0 && Math.abs(p.x) < 1.2) p.z = KORA_Z0 - 0.2;
  for (const p of path) p.y = groundHeight(p.x, p.z);

  // dev only: ?at=x,z,yawDegrees starts the visitor elsewhere (for screenshots)
  const at = import.meta.env.DEV ? new URLSearchParams(location.search).get('at')?.split(',').map(Number) : undefined;
  const spawn = at ? new THREE.Vector3(at[0], 0, at[1]) : new THREE.Vector3(0, 0, -36);
  spawn.y = groundHeight(spawn.x, spawn.z);
  const spawnYaw = at ? THREE.MathUtils.degToRad(at[2] ?? 0) : 0;

  return {
    floor: [...hall.floor, ...grounds.floor],
    cushions: seating.cushions,
    colliders: [...hall.colliders, ...altar.colliders, ...grounds.colliders],
    burner: { object: grounds.burner, position: BURNER_AT.clone(), stand: BURNER_AT.clone().add(new THREE.Vector3(0, 0, -1.6)) },
    spawn,
    spawnYaw,
    bounds: BOUNDS,
    groundHeight,
    occluders: [hall.group],
    cameraSolids: hall.cameraSolids,
    shrines,
    kora: {
      path,
      // anywhere outside the hall is on the grounds the walk goes round
      inside: (p) => !inHall(p.x, p.z),
      // from inside the hall, out through the doors first
      entrance: [new THREE.Vector3(0, FY, 2), new THREE.Vector3(0, 0, -5.2)],
    },
    update(_dt, night, elapsed) {
      altar.update(night, elapsed);
      grounds.update(night, elapsed);
      doorGlow.intensity = night * 6;
      hallGlow.intensity = night * 5;
      // clerestory windows: daylight by day, dark glass at night
      m.window.emissiveIntensity = 0.9 * (1 - night) + 0.04;
      m.window.color.setScalar(1 - night * 0.85);
    },
  };
}

