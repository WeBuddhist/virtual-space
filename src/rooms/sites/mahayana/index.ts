import * as THREE from 'three';
import type { Box2, Cushion, OfferingSpot, Site, SiteContext } from '../../types';
import { BOUNDS, BURNER_AT, buildGrounds } from './grounds';
import { BACK, buildHall, FRONT, HALL_Y, PODIUM, STEPS, W } from './hall';
import { ALTAR, BUDDHA, buildShrine, FACE, OFFER_BOX_Z } from './shrine';

// Tōdai-ji Daibutsuden, Nara (see docs/rooms/mahayana/reference.md).
// Hall-centred: origin in the middle of the Great Buddha Hall at courtyard level;
// +x east, +z south. The hall faces south, down the courtyard to the Middle Gate.

export function mahayanaSite({ scene, rng }: SiteContext): Site {
  const params = new URLSearchParams(location.search);
  const hall = buildHall();
  // ?statue=mesh and ?view=x,z,yaw are for screenshots in development only
  const dev = import.meta.env.DEV;
  const shrine = buildShrine(rng, (dev && params.get('statue')) || 'splat');
  const grounds = buildGrounds(rng);
  scene.add(hall.group, shrine.group, grounds.group);

  // The hall is 57 × 50 m and 48 m tall: widen the sun's shadow box so its roof
  // shades the whole interior (the world's default box is 60 m round the origin).
  scene.traverse((o) => {
    const sun = o as THREE.DirectionalLight;
    if (!sun.isDirectionalLight || !sun.castShadow) return;
    Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 220 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.set(0, 0, 8);
  });

  const colliders: Box2[] = [...hall.colliders, ...shrine.colliders, ...grounds.colliders];

  // eighteen zabuton in rows before the altar, facing the Buddha; sitters look up at its face
  const cushions: Cushion[] = [];
  const geo = new THREE.BoxGeometry(0.75, 0.1, 0.8);
  const mats = [new THREE.MeshStandardMaterial({ color: 0x5b2a5e, roughness: 1 }), new THREE.MeshStandardMaterial({ color: 0x7a2a24, roughness: 1 })];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
    const p = new THREE.Vector3(-6.25 + c * 2.5, HALL_Y, 16.6 + r * 1.6);
    const m = new THREE.Mesh(geo, mats[r === 0 ? 0 : 1]);
    m.position.set(p.x, HALL_Y + 0.05, p.z);
    m.receiveShadow = true;
    m.userData.cushion = cushions.length;
    scene.add(m);
    cushions.push({ index: cushions.length, position: p, mesh: m, yaw: Math.PI, focus: FACE.clone() });
  }

  // offerings on the altar before the Buddha
  const shrines: OfferingSpot[] = [{
    stand: new THREE.Vector3(0, HALL_Y, OFFER_BOX_Z + 1.3), yaw: Math.PI,
    shower: new THREE.Vector3(0, 0, (ALTAR.z0 + ALTAR.z1) / 2), radius: 2.6,
    area: { x0: ALTAR.x0, x1: ALTAR.x1, z0: ALTAR.z0, z1: ALTAR.z1 + 0.4 },
    ledges: [ALTAR],
    holder: new THREE.Vector3(2.6, ALTAR.y + 0.09, (ALTAR.z0 + ALTAR.z1) / 2),
  }];

  // a circuit round the Buddha inside the hall, keeping it on the right
  const loop = [[0, 15.4], [-10, 15.4], [-17, 10], [-17, -3], [-17, -22], [0, -22.5], [17, -22], [17, -3], [17, 10], [10, 15.4]]
    .map(([x, z]) => new THREE.Vector3(x, 0, z));

  // ?view=x,z,yaw places the visitor (dev only, for screenshots of the hall and statue)
  const view = dev ? params.get('view')?.split(',').map(Number) : undefined;
  const spawn = view ? new THREE.Vector3(view[0], 0, view[1]) : new THREE.Vector3(2.5, 0, 62);
  const spawnYaw = view && view.length > 2 ? view[2] : Math.PI;

  return {
    floor: [...hall.floor, ...grounds.floor],
    cushions,
    colliders,
    burner: { object: grounds.burner, position: BURNER_AT.clone(), stand: BURNER_AT.clone().setY(0).add(new THREE.Vector3(0, 0, 2.4)) },
    spawn,
    spawnYaw,
    bounds: BOUNDS,
    groundHeight(x, z) {
      if (Math.abs(x) <= PODIUM.x && z >= PODIUM.z0 && z <= PODIUM.z1) return HALL_Y;
      if (Math.abs(x) <= STEPS.halfW && z > STEPS.z0 && z <= STEPS.z1) {
        const i = Math.min(2, Math.floor(((z - STEPS.z0) / (STEPS.z1 - STEPS.z0)) * 3));
        return (HALL_Y * (3 - i)) / 4;
      }
      return 0;
    },
    occluders: [hall.group],
    cameraSolids: [...hall.cameraSolids, ...grounds.cameraSolids],
    shrines,
    kora: {
      path: loop,
      inside: (p) => Math.abs(p.x) < W - 1 && p.z < FRONT - 1 && p.z > BACK + 1,
      entrance: [new THREE.Vector3(0, 0, STEPS.z1 + 1.5), new THREE.Vector3(0, 0, FRONT - 2.5)],
    },
    update(dt, night, elapsed) {
      hall.update(night);
      shrine.update(night, elapsed);
      grounds.update(dt, night, elapsed);
    },
  };
}

export { BUDDHA };
