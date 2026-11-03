import * as THREE from 'three';
import { Avatar, DEFAULT_LOOK, type Look } from '../../../avatar';

// Ambient life: pilgrims of many traditions walking pradakshina (clockwise, the temple
// on their right) inside the railing, some pausing at the Vajrasana with palms joined,
// and a row of monks meditating on the lawn. They are scenery: no seats, no name tags.

const MAROON: Partial<Look> = { robe: 0x7a1f2b, shirt: 0xd9a12b };
const SAFFRON: Partial<Look> = { robe: 0xd4882c, shirt: 0xe39a3a };
const OCHRE: Partial<Look> = { robe: 0xb06a2a, shirt: 0xc27a34 };
const GREY: Partial<Look> = { robe: 0x6e6c66, shirt: 0x8d8b84 };
const WHITE: Partial<Look> = { robe: 0xf0ece2, shirt: 0xf6f3ec };
const SKINS = [0xd8a47c, 0xc68b5e, 0xe8c4a0, 0xa8714a, 0xdcae86];

/** the kora loop: east side southward, then west along the south, north behind the tree, east along the north */
const LOOP = [
  new THREE.Vector3(6.5, 0, -9),
  new THREE.Vector3(6.5, 0, 9.8),
  new THREE.Vector3(-19, 0, 9.8),
  new THREE.Vector3(-19, 0, -9),
];
/** where on the loop pilgrims may stop to pay respect, facing the Vajrasana */
const VAJRASANA_STOP = { at: new THREE.Vector3(-19, 0, 0), face: Math.PI / 2 };

const segLengths = LOOP.map((p, i) => p.distanceTo(LOOP[(i + 1) % LOOP.length]));
const TOTAL = segLengths.reduce((a, b) => a + b, 0);

/** position and heading at a distance along the loop */
function along(d: number, out: THREE.Vector3) {
  let s = ((d % TOTAL) + TOTAL) % TOTAL;
  for (let i = 0; i < LOOP.length; i++) {
    if (s <= segLengths[i]) {
      const a = LOOP[i], b = LOOP[(i + 1) % LOOP.length];
      out.copy(a).lerp(b, s / segLengths[i]);
      return Math.atan2(b.x - a.x, b.z - a.z);
    }
    s -= segLengths[i];
  }
  out.copy(LOOP[0]);
  return 0;
}

interface Walker { avatar: Avatar; d: number; speed: number; lane: number; pause: number; pausedHere: boolean; respectful: boolean }

export function buildPilgrims(scene: THREE.Scene, rng: () => number) {
  const walkers: Walker[] = [];
  const looks = [MAROON, MAROON, SAFFRON, WHITE, GREY, OCHRE, WHITE, MAROON, SAFFRON, WHITE];
  looks.forEach((look, i) => {
    const avatar = new Avatar({ ...DEFAULT_LOOK, ...look, skin: SKINS[i % SKINS.length] });
    avatar.setPose('walk');
    avatar.speed = 0.6;
    scene.add(avatar.root);
    walkers.push({
      avatar, d: (i / looks.length) * TOTAL + rng() * 3, speed: 0.75 + rng() * 0.3,
      lane: (rng() - 0.5) * 1.2, pause: 0, pausedHere: false, respectful: i % 3 === 0,
    });
  });

  // monks meditating in a row on the south lawn, facing the path
  const sitters: Avatar[] = [];
  for (let i = 0; i < 6; i++) {
    const a = new Avatar({ ...DEFAULT_LOOK, ...(i % 2 ? SAFFRON : OCHRE), skin: SKINS[(i + 2) % SKINS.length] });
    a.root.position.set(34 + i * 1.6, 0, 8.4);
    a.root.rotation.y = Math.PI; // facing north, toward the path
    a.setPose('kneel');
    scene.add(a.root);
    sitters.push(a);
  }

  const p = new THREE.Vector3(), side = new THREE.Vector3();
  return {
    update(dt: number) {
      for (const w of walkers) {
        if (w.pause > 0) {
          w.pause -= dt;
          if (w.pause <= 0) w.avatar.setPose('walk');
        } else {
          const before = w.d % TOTAL;
          w.d += w.speed * dt;
          // pay respect at the Vajrasana once per lap
          const stopD = segLengths[0] + segLengths[1] + LOOP[2].distanceTo(VAJRASANA_STOP.at);
          const after = w.d % TOTAL;
          if (w.respectful && before < stopD && after >= stopD) {
            w.pause = 4.5;
            w.avatar.setPose('palms');
            w.avatar.root.rotation.y = VAJRASANA_STOP.face;
          }
        }
        const yaw = along(w.d, p);
        // keep each pilgrim in their own lane across the path
        side.set(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(w.lane);
        w.avatar.root.position.copy(p).add(side);
        if (w.pause <= 0) {
          const cur = w.avatar.root.rotation.y;
          w.avatar.root.rotation.y = cur + Math.atan2(Math.sin(yaw - cur), Math.cos(yaw - cur)) * Math.min(1, dt * 5);
        }
        w.avatar.update(dt);
      }
      for (const s of sitters) s.update(dt);
    },
  };
}
