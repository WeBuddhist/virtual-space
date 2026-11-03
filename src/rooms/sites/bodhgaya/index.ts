import * as THREE from 'three';
import type { Box2, Cushion, OfferingSpot, Site, SiteContext } from '../../types';
import { buildBodhi, TREE, VAJRASANA } from './bodhi';
import { BOUNDS, BURNER_AT, buildGrounds } from './grounds';
import { buildPilgrims } from './pilgrims';
import { buildShrine, IMAGE_FACE, LEDGE } from './shrine';
import { loadKimi, useKimi } from './kimi';
import { buildTower, SANCTUM, TOWER_COLLIDERS } from './tower';

// Mahabodhi Temple, Bodh Gaya (see docs/rooms/bodhgaya/reference.md).
// Origin at the east door; +x east, +z south; the temple faces east (+x).

export function bodhgayaSite({ scene, rng }: SiteContext): Site {
  const tower = buildTower();
  const shrine = buildShrine(rng);
  const bodhi = buildBodhi(rng);
  const grounds = buildGrounds(rng);
  scene.add(tower.group, shrine.group, bodhi.group, grounds.group);
  // the architecture as written by Kimi K3.1 Pro (?site=hand: the earlier hand-made one)
  if (useKimi()) loadKimi({ tower: tower.group, grounds: grounds.group, bodhi: bodhi.group }, grounds.stupaSpots).then((ids) => console.info('kimi site:', ids.join(', ') || 'no elements yet'));
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
  const seat = (p: THREE.Vector3, yaw: number, kind: keyof typeof mats, focus?: THREE.Vector3) => {
    const m = new THREE.Mesh(matGeo, mats[kind]);
    m.position.set(p.x, kind === 'board' ? 0.08 : 0.02, p.z);
    m.rotation.y = yaw;
    m.receiveShadow = true;
    m.userData.cushion = cushions.length;
    scene.add(m);
    cushions.push({ index: cushions.length, position: p.clone(), mesh: m, yaw, focus });
  };
  const WEST = -Math.PI / 2, NORTH = Math.PI, SOUTH = 0;
  // shrine cushions turn in toward the image; sitters look up at its face
  const toward = (p: THREE.Vector3, f: THREE.Vector3) => Math.atan2(f.x - p.x, f.z - p.z);
  for (const z of [-1.1, 0, 1.1]) {
    const p = new THREE.Vector3(SANCTUM.x1 - 1.6, 0, z);
    seat(p, toward(p, IMAGE_FACE), 'shrine', IMAGE_FACE);
  }
  const trunk = new THREE.Vector3(TREE.x, 2.4, TREE.z);
  for (const x of [TREE.x - 3, TREE.x, TREE.x + 3]) seat(new THREE.Vector3(x, 0, TREE.z - 6.6), SOUTH, 'tree', trunk);
  for (const x of [TREE.x - 3, TREE.x, TREE.x + 3]) seat(new THREE.Vector3(x, 0, TREE.z + 6.6), NORTH, 'tree', trunk);
  for (const b of grounds.boards) seat(new THREE.Vector3(b.x, 0, b.z + 0.55), NORTH, 'board');

  // offerings: before the image in the sanctum, and at the Vajrasana under the tree
  const V = VAJRASANA;
  const shrines: OfferingSpot[] = [
    {
      stand: new THREE.Vector3(LEDGE.x1 + 0.9, 0, 0), yaw: WEST,
      shower: new THREE.Vector3(LEDGE.x1 - 0.1, 0, 0), radius: 1.6,
      area: { x0: LEDGE.x0, x1: LEDGE.x1 + 1.3, z0: -2.1, z1: 2.1 },
      ledges: [LEDGE],
      holder: new THREE.Vector3((LEDGE.x0 + LEDGE.x1) / 2, LEDGE.y + 0.09, 1.55),
    },
    {
      stand: new THREE.Vector3(V.x, 0, V.z + 2.4), yaw: NORTH,
      shower: new THREE.Vector3(V.x, 0, V.z), radius: 1.3,
      area: { x0: V.x - 1.1, x1: V.x + 1.1, z0: V.z - 1.6, z1: V.z + 1.6 },
      ledges: [
        { x0: V.x - 0.95, x1: V.x + 0.95, z0: V.z - 1.45, z1: V.z + 1.45, y: 0.5 },
        { x0: V.x - 0.7, x1: V.x + 0.7, z0: V.z - 1.2, z1: V.z + 1.2, y: 0.67 },
      ],
      holder: new THREE.Vector3(V.x + 0.9, 0.8, V.z + 2.0),
    },
  ];

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
    shrines,
    update(dt, night, elapsed) {
      pilgrims.update(dt);
      tower.update(night);
      shrine.update(elapsed);
      bodhi.update(elapsed, dt);
      grounds.update(night, elapsed);
      doorGlow.intensity = 2 + night * 6;
      for (const f of grounds.flags) {
        if (f.userData.sway !== undefined) f.rotation.x = Math.sin(elapsed * 2 + f.userData.sway) * 0.25;
      }
    },
  };
}
