import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import { canopy, limb, trunk, type Cluster } from '../../../kit/foliage';
import type { Box2 } from '../../types';
import { ATTHAROT, BODHI, BELL_TOWER, RUINS } from './plan';
import { boxAt, canvasTex, finialGeometry, merged, quad, tex } from './util';

// Beyond the cloister and round the compound: east of the prang, the Phra Attharot, a
// standing Buddha about 9.5 m tall with its right hand raised, white-faced and ochre-robed
// before a tall whitewashed backing wall, among the laterite and brick pillar stumps of the
// nine-bay viharn that once sheltered it; the three bodhi trees (Pho Sam Sao) on their
// raised ring south of the hall; a small whitewashed bell tower by the forecourt.

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** weathered brick: courses of red-brown with lichen-dark patches */
function brickTexture() {
  return canvasTex(256, 256, (c) => {
    c.fillStyle = '#6f3f2c';
    c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) {
      for (let x = (y / 16) % 2 ? -16 : 0; x < 256; x += 32) {
        const v = Math.floor(Math.random() * 40);
        c.fillStyle = `rgb(${132 - v},${74 - v / 2},${52 - v / 2})`;
        c.fillRect(x + 1, y + 1, 30, 14);
      }
    }
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(40,38,30,${0.08 + Math.random() * 0.15})`;
      c.beginPath(); c.ellipse(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 30, 6 + Math.random() * 20, 0, 0, Math.PI * 2); c.fill();
    }
  });
}

export function buildSurrounds(rng: () => number) {
  const group = new THREE.Group();
  const colliders: Box2[] = [];
  const floor: THREE.Object3D[] = [];
  const plaster = tex('wall', { color: 0xf6f3ec, roughness: 0.9 }, [2, 2]);
  const brickMap = brickTexture();
  const brick = new THREE.MeshStandardMaterial({ map: brickMap, roughness: 0.95 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a83a, metalness: 1, roughness: 0.3 });
  const red = new THREE.MeshStandardMaterial({ color: 0x6e1712, roughness: 0.55 });

  // ---- the ruined viharn and the Phra Attharot -------------------------------------------
  const A = ATTHAROT, R = RUINS;
  // the brick floor of the old hall, raised a little, its outline a low ragged wall
  const paveMat = new THREE.MeshStandardMaterial({ map: brickMap.clone(), roughness: 0.92, color: 0xb59a88 });
  paveMat.map!.repeat.set(10, 4);
  paveMat.map!.needsUpdate = true;
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(R.x1 - R.x0, 2 * R.halfW).rotateX(-Math.PI / 2), paveMat);
  hallFloor.position.set((R.x0 + R.x1) / 2, 0.02, 0);
  hallFloor.receiveShadow = true;
  group.add(hallFloor);
  floor.push(hallFloor);
  const brickGeos: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    for (let x = R.x0; x < R.x1; x += 2.2) {
      const h = 0.3 + rng() * 0.7;
      brickGeos.push(boxAt(2.1, h, 0.6, x + 1.1, h / 2, s * (R.halfW + 0.3)));
    }
  }
  brickGeos.push(boxAt(0.6, 0.5, 2 * R.halfW, R.x1 + 0.3, 0.25, 0));
  // two rows of great round pillars, broken off at different heights; laterite and brick
  const pillar = new THREE.CylinderGeometry(0.5, 0.56, 1, 12, 4);
  const pos = pillar.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.06;
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
  }
  pillar.computeVertexNormals();
  const pillarH = [5.2, 2.0, 4.1, 1.2, 3.4, 5.8, 2.6, 0.8, 4.6];
  let n = 0;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const x = R.x0 + 2.0 + i * ((R.x1 - R.x0 - 4) / 8);
      const h = pillarH[(i + (s > 0 ? 4 : 0)) % pillarH.length] * (0.85 + rng() * 0.3);
      brickGeos.push(pillar.clone().scale(1, h, 1).translate(x, h / 2, s * R.colZ));
      colliders.push({ x0: x - 0.55, x1: x + 0.55, z0: s * R.colZ - 0.55, z1: s * R.colZ + 0.55 });
      n++;
    }
  }
  const ruins = merged(brickGeos, brick);
  group.add(ruins);
  // the backing wall: a tall whitewashed slab with a pointed top, lower wings either side
  const back: THREE.BufferGeometry[] = [];
  const bw = 4.8, bh = 12.2, peak = 2.4, depth = 1.4;
  const shape = new THREE.Shape();
  shape.moveTo(-bw / 2, 0); shape.lineTo(bw / 2, 0); shape.lineTo(bw / 2, bh - peak); shape.lineTo(0, bh); shape.lineTo(-bw / 2, bh - peak); shape.closePath();
  const slab = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  slab.rotateY(Math.PI / 2).translate(A.x - depth, 0, 0);
  back.push(slab);
  for (const s of [-1, 1]) back.push(boxAt(depth + 0.4, 8.4, 1.2, A.x - depth / 2 + 0.2, 4.2, s * (bw / 2 + 0.6)));
  back.push(boxAt(2.4, 0.5, bw + 2.8, A.x + 0.6, 0.25, 0)); // the plinth the image stands on
  group.add(merged(back, plaster));
  colliders.push({ x0: A.x - depth, x1: A.x + 1.8, z0: -bw / 2 - 1.2, z1: bw / 2 + 1.2 });
  // the image: a splat from a Commons photograph (CC BY-SA 4.0), facing east down the ruins
  const image = new SplatMesh({ url: '/models/statues/theravada-attharot.spz' });
  image.position.set(A.x + 0.05, 0.5, 0);
  image.rotation.y = Math.PI / 2;
  group.add(image);
  const lamp = new THREE.SpotLight(0xffe2b0, 0, 40, 0.3, 0.6, 1.4);
  lamp.position.set(A.x + 16, 0.5, 0);
  lamp.target.position.set(A.x, 6, 0);
  group.add(lamp, lamp.target);

  // ---- the three bodhi trees on their raised ring ----------------------------------------
  const bark = new THREE.MeshStandardMaterial({ color: 0x7a7266, roughness: 0.95 });
  const clusters: Cluster[] = [];
  const ringGeos: THREE.BufferGeometry[] = [];
  for (const [x, z] of BODHI) {
    const t = new THREE.Group();
    const h = 4.2 + rng() * 1.2;
    t.add(trunk(h, 0.55 + rng() * 0.15, bark, 9, 0.9));
    const top = V(0, h, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + rng();
      const tip = V(Math.cos(a) * (2.4 + rng()), h + 2.2 + rng() * 2, Math.sin(a) * (2.4 + rng()));
      t.add(limb(top, tip, 0.3, 0.1, bark));
      clusters.push({ center: tip.clone().add(V(x, 0.6, z)), radius: 3.0 + rng() * 0.8, count: 380 });
    }
    clusters.push({ center: V(x, h + 4.0, z), radius: 3.6, count: 520 });
    t.position.set(x, 0.55, z);
    group.add(t);
    // a whitewashed ring wall round each trunk, wound with saffron cloth
    ringGeos.push(new THREE.CylinderGeometry(1.7, 1.8, 0.55, 20, 1).translate(x, 0.275, z));
    colliders.push({ x0: x - 1.8, x1: x + 1.8, z0: z - 1.8, z1: z + 1.8 });
  }
  group.add(merged(ringGeos, plaster));
  const sash = new THREE.MeshStandardMaterial({ color: 0xe0a020, roughness: 0.8 });
  const sashGeos = BODHI.map(([x, z]) => new THREE.TorusGeometry(0.62, 0.06, 6, 18).rotateX(Math.PI / 2).translate(x, 1.7, z));
  group.add(merged(sashGeos, sash, false));
  const leaves = canopy(clusters, 'peepal', rng, { size: 1.2, sun: 0x6f9a3a, shade: 0x2f4f1e });
  group.add(leaves.mesh);

  // ---- the bell tower (ho rakhang) --------------------------------------------------------
  const B = BELL_TOWER;
  const tower: THREE.BufferGeometry[] = [];
  tower.push(boxAt(3.2, 4.2, 3.2, B.x, 2.1, B.z)); // the solid lower storey
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tower.push(boxAt(0.45, 2.6, 0.45, B.x + dx * 1.3, 4.2 + 1.3, B.z + dz * 1.3));
  tower.push(boxAt(3.4, 0.25, 3.4, B.x, 4.25, B.z));
  group.add(merged(tower, plaster));
  colliders.push({ x0: B.x - 1.7, x1: B.x + 1.7, z0: B.z - 1.7, z1: B.z + 1.7 });
  const roofT = tex('roof-tiles', { roughness: 0.5, side: THREE.DoubleSide, color: 0xc49482 }, [1, 1]);
  const ry = 6.8, rt = 9.0;
  const roofGeos: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const c = Math.cos(a), s = Math.sin(a);
    const p = (u: number, v: number, y: number) => V(B.x + u * c - v * s, y, B.z + u * s + v * c);
    roofGeos.push(quad(p(2.3, -2.3, ry), p(2.3, 2.3, ry), p(0.25, 0.25, rt), p(0.25, -0.25, rt), 1.4));
  }
  group.add(merged(roofGeos, roofT));
  const fin = finialGeometry(1.4, 0.12).translate(B.x, rt - 0.1, B.z);
  const bell = new THREE.LatheGeometry([V2(0.0, 0.0), V2(0.42, 0.0), V2(0.38, 0.12), V2(0.3, 0.55), V2(0.26, 0.8), V2(0.12, 0.92), V2(0.0, 0.95)], 16).translate(B.x, 4.9, B.z);
  group.add(merged([fin, bell, boxAt(2.9, 0.12, 0.12, B.x, 6.0, B.z)], gold), merged([boxAt(3.0, 0.3, 3.0, B.x, 6.75, B.z)], red, false));

  return {
    group, colliders, floor,
    occluders: [ruins],
    // the camera keeps out of the backing wall and the bell tower's solid storey
    cameraSolids: [
      { x0: A.x - depth, x1: A.x, z0: -bw / 2 - 1.2, z1: bw / 2 + 1.2 },
      { x0: B.x - 1.6, x1: B.x + 1.6, z0: B.z - 1.6, z1: B.z + 1.6 },
    ],
    update(elapsed: number, night: number) {
      leaves.uTime.value = elapsed;
      lamp.intensity = night * 200;
    },
  };
}

function V2(x: number, y: number) {
  return new THREE.Vector2(x, y);
}
