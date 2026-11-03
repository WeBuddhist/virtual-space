import * as THREE from 'three';
import type { Box2, Cushion, Site, SiteContext } from '../../types';
import { buildBodhi, TREE } from './bodhi';
import { BOUNDS, BURNER_AT, buildGrounds } from './grounds';
import { buildPilgrims } from './pilgrims';
import { buildShrine } from './shrine';
import { buildTower, SANCTUM, TOWER_COLLIDERS } from './tower';

// Mahabodhi Temple, Bodh Gaya (see docs/rooms/bodhgaya/reference.md).
// Origin at the east door; +x east, +z south; the temple faces east (+x).

export function bodhgayaSite({ scene, rng }: SiteContext): Site {
  const tower = buildTower();
  const shrine = buildShrine(rng);
  const bodhi = buildBodhi(rng);
  const grounds = buildGrounds(rng);
  scene.add(tower.group, shrine.group, bodhi.group, grounds.group);
  const pilgrims = buildPilgrims(scene, rng);

  const colliders: Box2[] = [...TOWER_COLLIDERS, shrine.collider, ...bodhi.colliders, ...grounds.colliders];

  // seats: three mats before the image, six facing the Bodhi tree, nine prostration boards
  const cushions: Cushion[] = [];
  const matGeo = new THREE.BoxGeometry(0.7, 0.04, 0.9);
  const mats = {
    shrine: new THREE.MeshStandardMaterial({ color: 0x8c2a22, roughness: 1 }),
    tree: new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 1 }),
    board: new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 1 }),
  };
  const seat = (p: THREE.Vector3, yaw: number, kind: keyof typeof mats) => {
    const m = new THREE.Mesh(matGeo, mats[kind]);
    m.position.set(p.x, kind === 'board' ? 0.08 : 0.02, p.z);
    m.rotation.y = yaw;
    m.receiveShadow = true;
    m.userData.cushion = cushions.length;
    scene.add(m);
    cushions.push({ index: cushions.length, position: p.clone(), mesh: m, yaw });
  };
  const WEST = -Math.PI / 2, NORTH = Math.PI, SOUTH = 0;
  for (const z of [-1.1, 0, 1.1]) seat(new THREE.Vector3(SANCTUM.x1 - 1.6, 0, z), WEST, 'shrine');
  for (const x of [TREE.x - 3, TREE.x, TREE.x + 3]) seat(new THREE.Vector3(x, 0, TREE.z - 6.6), SOUTH, 'tree');
  for (const x of [TREE.x - 3, TREE.x, TREE.x + 3]) seat(new THREE.Vector3(x, 0, TREE.z + 6.6), NORTH, 'tree');
  for (const b of grounds.boards) seat(new THREE.Vector3(b.x, 0, b.z + 0.55), NORTH, 'board');

  // a soft warm light in the courtyard at night, plus the sanctum glow spilling out of the door
  const doorGlow = new THREE.PointLight(0xffb870, 0, 12, 1.6);
  doorGlow.position.set(2, 2.2, 0);
  scene.add(doorGlow);

  return {
    floor: grounds.floor,
    cushions,
    colliders,
    burner: { object: grounds.burner, position: BURNER_AT.clone(), stand: BURNER_AT.clone().add(new THREE.Vector3(0, 0, -1.6)) },
    spawn: new THREE.Vector3(46, 0, 0),
    spawnYaw: WEST,
    bounds: BOUNDS,
    groundHeight: () => 0,
    occluders: [tower.group],
    update(dt, night, elapsed) {
      pilgrims.update(dt);
      tower.update(night);
      shrine.update(elapsed);
      bodhi.update(elapsed, dt);
      grounds.update(night, elapsed);
      doorGlow.intensity = 2 + night * 6;
      for (const f of [...bodhi.flags.flatMap((g) => g.children), ...grounds.flags]) {
        if (f.userData.sway !== undefined) f.rotation.x = Math.sin(elapsed * 2 + f.userData.sway) * 0.25;
      }
    },
  };
}
