import * as THREE from 'three';

export type Pose = 'idle' | 'walk' | 'kneel' | 'beads' | 'palms' | 'bow';

/** appearance knobs; phase 2 exposes these as the avatar picker */
export interface Look { robe: number; shirt: number; skin: number }
export const DEFAULT_LOOK: Look = { robe: 0x7a1f22, shirt: 0xd9a12b, skin: 0xd8a47c };

interface Rig {
  drop: number; pitch: number; head: number;
  armLX: number; armLZ: number; armRX: number; armRZ: number;
  legs: number; bob: number;
}
const NEUTRAL: Rig = { drop: 0, pitch: 0, head: 0, armLX: 0, armLZ: 0.12, armRX: 0, armRZ: -0.12, legs: 0, bob: 0 };

// prostration keyframes over one cycle (t in 0..1)
const BOW_KEYS: [number, Partial<Rig>][] = [
  [0.0, {}],
  [0.12, { armLX: -2.7, armLZ: -0.35, armRX: -2.7, armRZ: 0.35, head: 0.15 }],
  [0.3, { drop: 0.24, pitch: 0.35, legs: -1.4, armLX: -1.2, armLZ: -0.3, armRX: -1.2, armRZ: 0.3, head: 0.2 }],
  [0.5, { drop: 0.3, pitch: 1.3, legs: -1.45, armLX: -2.9, armLZ: 0.1, armRX: -2.9, armRZ: -0.1, head: 0.3 }],
  [0.68, { drop: 0.3, pitch: 1.3, legs: -1.45, armLX: -2.9, armLZ: 0.1, armRX: -2.9, armRZ: -0.1, head: 0.3 }],
  [0.84, { drop: 0.22, pitch: 0.3, legs: -1.3, armLX: -1.1, armLZ: -0.6, armRX: -1.1, armRZ: 0.6 }],
  [1.0, {}],
];
export const BOW_SECONDS = 4.2;
export const PALMS_SECONDS = 2.2;

const PALMS: Partial<Rig> = { armLX: -1.15, armLZ: -0.62, armRX: -1.15, armRZ: 0.62 };
const KNEEL: Partial<Rig> = { drop: 0.24, legs: -1.45, armLX: -0.55, armLZ: -0.25, armRX: -0.55, armRZ: 0.25 };
const BEADS: Partial<Rig> = { ...KNEEL, armRX: -1.35, armRZ: 0.45, head: 0.25 };

function ease(x: number) { return x * x * (3 - 2 * x); }

function sampleBow(t: number): Rig {
  for (let i = 0; i < BOW_KEYS.length - 1; i++) {
    const [t0, a] = BOW_KEYS[i];
    const [t1, b] = BOW_KEYS[i + 1];
    if (t >= t0 && t <= t1) {
      const k = ease((t - t0) / (t1 - t0));
      const out = { ...NEUTRAL };
      for (const key of Object.keys(NEUTRAL) as (keyof Rig)[]) {
        const va = a[key] ?? NEUTRAL[key];
        const vb = b[key] ?? NEUTRAL[key];
        out[key] = va + (vb - va) * k;
      }
      return out;
    }
  }
  return { ...NEUTRAL };
}

export class Avatar {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private head = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private skirt: THREE.Mesh;
  private rig: Rig = { ...NEUTRAL };
  private pose: Pose = 'idle';
  private poseTime = 0;
  private walkPhase = 0;
  speed = 0;

  constructor(look: Look = DEFAULT_LOOK) {
    const robe = new THREE.MeshStandardMaterial({ color: look.robe, roughness: 0.9 });
    const shirt = new THREE.MeshStandardMaterial({ color: look.shirt, roughness: 0.85 });
    const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x241a16, roughness: 0.5 });

    const hipY = 0.42;
    this.body.position.y = hipY;
    this.root.add(this.body);

    // torso: saffron shirt under a maroon wrap draped over the left shoulder
    const torso = new THREE.Mesh(
      new THREE.LatheGeometry([
        new THREE.Vector2(0, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.21, 0.18),
        new THREE.Vector2(0.18, 0.36), new THREE.Vector2(0.1, 0.42), new THREE.Vector2(0, 0.42),
      ], 20),
      shirt,
    );
    torso.scale.z = 0.8;
    this.body.add(torso);
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.215, 0.26, 20, 1, true, -0.4, Math.PI * 1.45), robe);
    wrap.material.side = THREE.DoubleSide;
    wrap.scale.z = 0.82;
    wrap.position.y = 0.13;
    this.body.add(wrap);
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.5, 0.33), robe);
    sash.position.set(-0.06, 0.24, 0);
    sash.rotation.z = -0.55;
    this.body.add(sash);

    // head: big, round, shaved
    this.head.position.y = 0.44;
    this.body.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 20), skin);
    skull.position.y = 0.2;
    skull.scale.set(1, 0.98, 0.95);
    this.head.add(skull);
    const scalp = new THREE.Mesh(new THREE.SphereGeometry(0.222, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshStandardMaterial({ color: 0x3a2b24, roughness: 1, transparent: true, opacity: 0.35 }));
    scalp.position.y = 0.2;
    scalp.rotation.x = -0.25;
    this.head.add(scalp);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skin);
      ear.scale.set(0.5, 1, 0.8);
      ear.position.set(side * 0.215, 0.19, 0);
      this.head.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), dark);
      eye.scale.set(1, 0.6, 0.6);
      eye.position.set(side * 0.075, 0.2, 0.2);
      this.head.add(eye);
    }

    // arms hang from shoulder pivots
    for (const [arm, side] of [[this.armL, 1], [this.armR, -1]] as const) {
      arm.position.set(side * 0.2, 0.36, 0);
      this.body.add(arm);
      const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.17, 4, 10), side === 1 ? robe : shirt);
      sleeve.position.y = -0.12;
      arm.add(sleeve);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), skin);
      hand.position.y = -0.27;
      arm.add(hand);
    }

    // legs and a robe skirt that hides them
    for (const [leg, side] of [[this.legL, 1], [this.legR, -1]] as const) {
      leg.position.set(side * 0.08, hipY, 0);
      this.root.add(leg);
      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 4, 10), robe);
      shin.position.y = -0.2;
      leg.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.15), dark);
      foot.position.set(0, -0.38, 0.03);
      leg.add(foot);
    }
    this.skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.34, 20, 1, true), robe);
    this.skirt.material = robe.clone();
    (this.skirt.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    this.skirt.position.y = hipY - 0.15;
    this.root.add(this.skirt);

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  get currentPose() { return this.pose; }

  setPose(pose: Pose) {
    if (pose === this.pose) return;
    this.pose = pose;
    this.poseTime = 0;
  }

  update(dt: number) {
    this.poseTime += dt;
    let target: Rig;
    switch (this.pose) {
      case 'walk': {
        this.walkPhase += dt * (6 + this.speed * 3);
        const s = Math.sin(this.walkPhase);
        target = { ...NEUTRAL, armLX: s * 0.5, armRX: -s * 0.5, bob: Math.abs(Math.cos(this.walkPhase)) * 0.03 };
        this.legL.rotation.x = -s * 0.55;
        this.legR.rotation.x = s * 0.55;
        break;
      }
      case 'palms': {
        const k = Math.min(1, this.poseTime / 0.5) * (this.poseTime > PALMS_SECONDS - 0.5 ? Math.max(0, (PALMS_SECONDS - this.poseTime) / 0.5) : 1);
        const nod = Math.sin(Math.min(1, Math.max(0, (this.poseTime - 0.6) / 1)) * Math.PI) * 0.35;
        target = { ...NEUTRAL, ...PALMS, head: nod, pitch: nod * 0.4 };
        for (const key of Object.keys(NEUTRAL) as (keyof Rig)[]) target[key] = NEUTRAL[key] + (target[key] - NEUTRAL[key]) * k;
        break;
      }
      case 'bow':
        target = sampleBow((this.poseTime % BOW_SECONDS) / BOW_SECONDS);
        break;
      case 'kneel':
        target = { ...NEUTRAL, ...KNEEL, bob: Math.sin(this.poseTime * 1.2) * 0.004 };
        break;
      case 'beads':
        target = { ...NEUTRAL, ...BEADS, armRX: BEADS.armRX! + Math.sin(this.poseTime * 4) * 0.06 };
        break;
      default:
        target = { ...NEUTRAL, bob: Math.sin(this.poseTime * 1.6) * 0.006 };
    }
    // the bow keyframes are already smooth; other poses ease toward their target
    const k = this.pose === 'bow' ? 1 : 1 - Math.exp(-dt * 10);
    for (const key of Object.keys(NEUTRAL) as (keyof Rig)[]) {
      this.rig[key] += (target[key] - this.rig[key]) * k;
    }
    const r = this.rig;
    this.body.position.y = 0.42 - r.drop + r.bob;
    this.body.rotation.x = r.pitch;
    this.head.rotation.x = r.head;
    this.armL.rotation.set(r.armLX, 0, r.armLZ);
    this.armR.rotation.set(r.armRX, 0, r.armRZ);
    if (this.pose !== 'walk') {
      this.legL.rotation.x += (r.legs - this.legL.rotation.x) * k;
      this.legR.rotation.x += (r.legs - this.legR.rotation.x) * k;
    }
    this.legL.position.y = this.legR.position.y = 0.42 - r.drop;
    this.skirt.position.y = 0.27 - r.drop * 0.9;
    this.skirt.scale.y = 1 - Math.min(0.6, r.drop * 1.8);
  }

  /** world position of the top of the head, for name tags */
  headTop(out: THREE.Vector3) {
    return this.head.getWorldPosition(out).add(new THREE.Vector3(0, 0.55, 0));
  }

  dispose() {
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => mat.dispose());
      }
    });
  }
}
