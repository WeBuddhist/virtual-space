import * as THREE from 'three';
import type { Cushion } from '../../types';
import { BENCH, BUDDHA_FACE, FY, SEAT_ZS } from './layout';
import type { Mats } from './mats';
import { Batch, tiledPlane } from './util';

// The monks' rows (dukhang layout): long low benches with rug runners either side of the
// central aisle, the monks facing each other across it, a low painted table (choktse) in
// front of each place with texts wrapped in cloth, folded maroon shawls, green-headed nga
// drums at the row ends near the altar and a pair of long dungchen horns in the aisle.

export function buildSeating(scene: THREE.Scene, m: Mats) {
  const group = new THREE.Group();
  const b = new Batch();
  const cushions: Cushion[] = [];
  const len = BENCH.z1 - BENCH.z0, cz = (BENCH.z0 + BENCH.z1) / 2;
  const shawl = new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 0.95 });
  const saffron = new THREE.MeshStandardMaterial({ color: 0xf2a33a, roughness: 0.85 });
  const pecha = new THREE.MeshStandardMaterial({ color: 0xe0b52a, roughness: 0.8 });
  const cup = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.3 });
  const tableTop = new THREE.BoxGeometry(0.42, 0.06, 0.9);
  const tableBody = new THREE.BoxGeometry(0.36, 0.28, 0.82);
  const wheel = new THREE.CircleGeometry(0.1, 12);

  // inner rows (the seats) and outer rows (decoration); s is the side, -x or +x
  for (const s of [-1, 1]) {
    for (const [bx, tx] of [[BENCH.x, BENCH.x - 0.72], [BENCH.x + 1.95, BENCH.x + 1.95 - 0.72]] as const) {
      const x = s * bx;
      b.add(new THREE.BoxGeometry(BENCH.w, BENCH.h, len), m.darkWood, x, FY + BENCH.h / 2, cz, 0, 0, 0, true);
      b.add(tiledPlane(BENCH.w, len, 1, len / 0.8), m.rug, x, FY + BENCH.h + 0.004, cz, 0, -Math.PI / 2);
      // a low back rest on the outer edge
      b.add(new THREE.BoxGeometry(0.08, 0.32, len), m.darkWood, x + s * (BENCH.w / 2 - 0.04), FY + BENCH.h + 0.16, cz);
      for (const z of SEAT_ZS) {
        const t = s * tx;
        b.add(tableBody, m.darkRed, t, FY + 0.14, z);
        b.add(tableTop, m.wood, t, FY + 0.31, z);
        b.add(wheel, m.gold, t - s * 0.181, FY + 0.15, z, -s * Math.PI / 2);
        // a text wrapped in yellow cloth, a tea cup, a folded shawl on the seat
        b.add(new THREE.BoxGeometry(0.16, 0.06, 0.42), pecha, t, FY + 0.37, z - 0.1);
        b.add(new THREE.CylinderGeometry(0.035, 0.028, 0.07, 10), cup, t, FY + 0.375, z + 0.3);
        if (bx !== BENCH.x || SEAT_ZS.indexOf(z) % 3 === 1) {
          b.add(new THREE.BoxGeometry(0.34, 0.09, 0.36), (Math.round(z) % 2) ? shawl : saffron, x + s * 0.05, FY + BENCH.h + 0.05, z + 0.25, 0.2 * s);
        }
      }
    }
  }

  // the cushions on the inner benches, facing the aisle; sitters look up at the Buddha
  const cushionGeo = new THREE.BoxGeometry(0.62, 0.08, 0.62);
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0x8c2a22, roughness: 1 });
  for (const s of [-1, 1]) {
    for (const z of SEAT_ZS) {
      const p = new THREE.Vector3(s * BENCH.x, FY + BENCH.h, z);
      const mesh = new THREE.Mesh(cushionGeo, cushionMat);
      mesh.position.set(p.x, p.y + 0.04, p.z);
      mesh.receiveShadow = true;
      mesh.userData.cushion = cushions.length;
      group.add(mesh);
      // left bench (-x) faces +x across the aisle, the right one faces -x
      cushions.push({ index: cushions.length, position: p, mesh, yaw: -s * Math.PI / 2, focus: BUDDHA_FACE });
    }
  }
  // order the cushions so residents (seats 0, 2, 5, 9) spread over both sides
  cushions.sort((a, c) => (a.position.z - c.position.z) || (a.position.x - c.position.x));
  cushions.forEach((c, i) => { c.index = i; c.mesh.userData.cushion = i; });

  // nga drums: green heads in red frames on poles, at the row ends near the altar
  const drumHead = new THREE.MeshStandardMaterial({ color: 0x3e8e5a, roughness: 0.6 });
  for (const s of [-1, 1]) {
    const x = s * 3.4, z = 14.9, y = FY + 1.15;
    b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 24, 1, true), m.red, x, y, z, 0, 0, Math.PI / 2, true);
    for (const dx of [-0.1, 0.1]) b.add(new THREE.CircleGeometry(0.42, 24), drumHead, x + dx, y, z, dx > 0 ? Math.PI / 2 : -Math.PI / 2);
    b.add(new THREE.TorusGeometry(0.5, 0.035, 6, 24), m.darkRed, x, y, z, Math.PI / 2);
    b.add(new THREE.CylinderGeometry(0.03, 0.04, 1.65, 8), m.darkWood, x, FY + 0.8, z);
    b.add(new THREE.CylinderGeometry(0.22, 0.26, 0.08, 12), m.darkWood, x, FY + 0.04, z);
  }
  // dungchen pair resting in the aisle, bells toward the door
  const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.85, roughness: 0.35 });
  for (const s of [-1, 1]) {
    const x = s * 0.75, y = FY + 0.32;
    b.add(new THREE.CylinderGeometry(0.035, 0.09, 2.6, 12, 1, true), copper, x, y, 12.2, 0, Math.PI / 2);
    b.add(new THREE.CylinderGeometry(0.09, 0.26, 0.5, 16, 1, true), copper, x, y, 10.68, 0, Math.PI / 2);
    for (const z of [11.4, 12.4, 13.3]) b.add(new THREE.TorusGeometry(0.075, 0.02, 6, 12), m.gold, x, y, z);
    b.add(new THREE.BoxGeometry(0.08, 0.3, 0.08), m.darkWood, x, FY + 0.15, 13.2);
    b.add(new THREE.BoxGeometry(0.08, 0.3, 0.08), m.darkWood, x, FY + 0.15, 11.2);
  }
  b.build(group);
  scene.add(group);
  return { group, cushions };
}
