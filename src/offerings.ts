import * as THREE from 'three';
import type { FlowerId } from '../shared/offerings';
import type { Bilingual, OfferingSpot } from './rooms/types';

// Flower showers and incense at a temple's shrines. Flowers flutter down over the
// nearest shrine, come to rest on its ledges and floor, and fade after a while;
// incense burns in brass holders with a column of smoke.

interface FlowerDef {
  name: Bilingual;
  /** why it is offered, shown in the picker */
  meaning: Bilingual;
  /** 'petal': loose petals; 'bloom': whole small flowers */
  kind: 'petal' | 'bloom';
  /** size of one piece, metres */
  size: [number, number];
  colors: [string, string];
  centre?: string;
}

export const FLOWERS: Record<FlowerId, FlowerDef> = {
  lotus: {
    name: { en: 'Lotus', bo: 'པདྨ།' },
    meaning: { en: 'Purity: it rises clean from the mud, as the mind from confusion', bo: 'དག་པའི་རྟགས། འདམ་ནས་སྐྱེས་ཀྱང་འདམ་གྱིས་མ་གོས།' },
    kind: 'petal', size: [0.095, 0.058], colors: ['#fff4f6', '#e7799b'],
  },
  marigold: {
    name: { en: 'Marigold', bo: 'གསེར་མདོག་མེ་ཏོག' },
    meaning: { en: 'Offered by the basketful at Bodh Gaya every day', bo: 'རྡོ་རྗེ་གདན་དུ་ཉིན་རེར་འབུལ་བའི་མེ་ཏོག' },
    kind: 'bloom', size: [0.05, 0.05], colors: ['#ffb21a', '#e86a00'], centre: '#c24a00',
  },
  rose: {
    name: { en: 'Rose', bo: 'སེ་བ།' },
    meaning: { en: 'Devotion and the heart opening to the Three Jewels', bo: 'དད་པ་དང་སྙིང་ཁ་དཀོན་མཆོག་ལ་ཁ་ཕྱེ་བ།' },
    kind: 'petal', size: [0.058, 0.05], colors: ['#d8243a', '#8e0f22'],
  },
  jasmine: {
    name: { en: 'Jasmine', bo: 'སུ་མ་ན།' },
    meaning: { en: 'The fragrance of moral discipline, which carries even against the wind', bo: 'ཚུལ་ཁྲིམས་ཀྱི་དྲི་བཟང་།' },
    kind: 'bloom', size: [0.032, 0.032], colors: ['#ffffff', '#f3f1e6'], centre: '#e9d98a',
  },
  frangipani: {
    name: { en: 'Frangipani', bo: 'ཕྲང་གི་པ་ནི།' },
    meaning: { en: 'The temple flower of Sri Lanka and Thailand, offered at every shrine', bo: 'སེང་གེ་གླིང་དང་ཐེ་ལནྜའི་མཆོད་མེ་ཏོག' },
    kind: 'bloom', size: [0.065, 0.065], colors: ['#fffdf5', '#fff6dc'], centre: '#f5c21a',
  },
  mandarava: {
    name: { en: 'Mandarava', bo: 'མནྡཱ་ར་བ།' },
    meaning: { en: 'Heavenly flowers that rained down at the Buddha’s awakening', bo: 'སངས་རྒྱས་བྱང་ཆུབ་པའི་དུས་སུ་བབས་པའི་ལྷའི་མེ་ཏོག' },
    kind: 'petal', size: [0.075, 0.036], colors: ['#ff7a4d', '#c8201a'],
  },
};

/** draw one petal or bloom; also used for the swatches in the picker */
export function flowerCanvas(id: FlowerId, px = 128) {
  const f = FLOWERS[id];
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d')!;
  const m = px / 2;
  const petal = (len: number, wide: number, a: number, inner: string, outer: string) => {
    g.save();
    g.translate(m, m);
    g.rotate(a);
    const gr = g.createLinearGradient(0, 0, 0, -len);
    gr.addColorStop(0, inner);
    gr.addColorStop(1, outer);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(wide, -len * 0.25, wide * 0.9, -len * 0.85, 0, -len);
    g.bezierCurveTo(-wide * 0.9, -len * 0.85, -wide, -len * 0.25, 0, 0);
    g.fill();
    // a faint central vein
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = px / 128;
    g.beginPath();
    g.moveTo(0, -len * 0.08);
    g.lineTo(0, -len * 0.8);
    g.stroke();
    g.restore();
  };
  if (f.kind === 'petal') {
    // a single petal pointing up from the bottom centre
    g.translate(0, m * 0.92);
    petal(px * 0.88, px * 0.36, 0, f.colors[0], f.colors[1]);
  } else if (id === 'marigold') {
    for (let ring = 0; ring < 3; ring++) {
      const n = 22 - ring * 5;
      for (let i = 0; i < n; i++) petal(m * (0.95 - ring * 0.25), m * 0.16, (i / n) * Math.PI * 2 + ring * 0.3, f.colors[ring === 2 ? 1 : 0], f.colors[1]);
    }
    g.fillStyle = f.centre!;
    g.beginPath(); g.arc(m, m, m * 0.18, 0, Math.PI * 2); g.fill();
  } else {
    // five petals round a coloured centre
    const n = 5;
    for (let i = 0; i < n; i++) petal(m * 0.95, m * (id === 'jasmine' ? 0.32 : 0.5), (i / n) * Math.PI * 2 + (id === 'frangipani' ? 0.25 : 0), id === 'frangipani' ? f.centre! : f.colors[0], f.colors[1]);
    g.fillStyle = f.centre!;
    g.beginPath(); g.arc(m, m, m * 0.12, 0, Math.PI * 2); g.fill();
  }
  return c;
}

const CAPACITY = 600;
const LIE_SECONDS = 150;
const FADE_SECONDS = 5;
const REST = 0.028;

interface Piece {
  type: number;
  slot: number;
  p: THREE.Vector3;
  fall: number;
  sway: number;
  phase: number;
  spinAxis: THREE.Vector3;
  spin: number;
  angle: number;
  scale: number;
  floor: number;
  landed: number; // seconds since landing, or -1 while falling
  rest: THREE.Quaternion;
}

interface Stick { group: THREE.Group; born: number; holder: number }

export class Offerings {
  private meshes: THREE.InstancedMesh[] = [];
  private pieces: Piece[] = [];
  private nextSlot: number[] = [];
  private ids = Object.keys(FLOWERS) as FlowerId[];
  private sticks: Stick[] = [];
  private smoke: { sprites: THREE.Sprite[]; at: THREE.Vector3 }[] = [];
  private queue: { at: number; spawn: () => void }[] = [];
  private time = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();

  constructor(private scene: THREE.Scene, private groundHeight: (x: number, z: number) => number, readonly spots: OfferingSpot[]) {
    // a cupped quad: each piece curls up a little at the edges
    const geo = new THREE.PlaneGeometry(1, 1, 4, 4);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, (x * x * 0.35 + y * y * 0.15));
    }
    geo.computeVertexNormals();
    for (const id of this.ids) {
      const tex = new THREE.CanvasTexture(flowerCanvas(id));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.65 });
      const mesh = new THREE.InstancedMesh(geo, mat, CAPACITY);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      scene.add(mesh);
      this.meshes.push(mesh);
      this.nextSlot.push(0);
    }
    spots.forEach((s, i) => { if (s.holder) this.addHolder(s.holder, i); });
  }

  /** the shrine within reach of `p`, if any */
  nearest(p: THREE.Vector3, within = 14): OfferingSpot | null {
    let best: OfferingSpot | null = null, bd = within;
    for (const s of this.spots) {
      const d = Math.hypot(s.stand.x - p.x, s.stand.z - p.z);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  private surface(x: number, z: number, spot: OfferingSpot | undefined) {
    let y = this.groundHeight(x, z);
    for (const l of spot?.ledges ?? []) if (x > l.x0 && x < l.x1 && z > l.z0 && z < l.z1) y = Math.max(y, l.y);
    return y;
  }

  /** shower `flower` over the point `at` (a shrine's shower centre, or anywhere) */
  shower(flower: FlowerId, at: THREE.Vector3) {
    const type = this.ids.indexOf(flower);
    if (type < 0) return;
    const spot = this.spots.find((s) => s.shower.distanceTo(at) < 0.5);
    const radius = spot?.radius ?? 0.9;
    const def = FLOWERS[flower];
    const n = def.kind === 'petal' ? 160 : 90;
    for (let i = 0; i < n; i++) {
      this.queue.push({
        at: this.time + (i / n) * 2.4 + Math.random() * 0.2,
        spawn: () => {
          const a = Math.random() * Math.PI * 2, r = radius * Math.sqrt(Math.random());
          let x = at.x + Math.cos(a) * r, z = at.z + Math.sin(a) * r;
          const box = spot?.area;
          if (box) { x = THREE.MathUtils.clamp(x, box.x0, box.x1); z = THREE.MathUtils.clamp(z, box.z0, box.z1); }
          const floor = this.surface(x, z, spot);
          this.add(type, {
            p: new THREE.Vector3(x, floor + 2.2 + Math.random() * 1.2, z),
            fall: 0.45 + Math.random() * 0.35,
            sway: 0.15 + Math.random() * 0.25,
            phase: Math.random() * Math.PI * 2,
            spinAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
            spin: 2 + Math.random() * 4,
            angle: Math.random() * Math.PI * 2,
            scale: 0.8 + Math.random() * 0.45,
            floor,
          });
        },
      });
    }
    this.queue.sort((a, b) => a.at - b.at);
  }

  private add(type: number, p: Omit<Piece, 'type' | 'slot' | 'landed' | 'rest'>) {
    // a full buffer recycles the oldest piece of that flower
    const slot = this.nextSlot[type];
    this.nextSlot[type] = (slot + 1) % CAPACITY;
    const old = this.pieces.findIndex((x) => x.type === type && x.slot === slot);
    if (old >= 0) this.pieces.splice(old, 1);
    // at rest a piece lies face up, turned at random, slightly tilted
    const rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + (Math.random() - 0.5) * 0.3, 0, Math.random() * Math.PI * 2, 'XZY'));
    this.pieces.push({ ...p, type, slot, landed: -1, rest });
    this.meshes[type].count = Math.max(this.meshes[type].count, slot + 1);
  }

  private addHolder(top: THREE.Vector3, index: number) {
    const brass = new THREE.MeshStandardMaterial({ color: 0xc89a3c, metalness: 0.9, roughness: 0.32 });
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.0, -0.09), new THREE.Vector2(0.06, -0.09), new THREE.Vector2(0.05, -0.075), new THREE.Vector2(0.1, -0.05),
      new THREE.Vector2(0.115, -0.01), new THREE.Vector2(0.11, 0), new THREE.Vector2(0.1, -0.005),
    ], 28), brass);
    const sand = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshStandardMaterial({ color: 0x9a8d78, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = -0.012;
    g.add(bowl, sand);
    const below = top.y - 0.09 - this.groundHeight(top.x, top.z);
    if (below > 0.05) {
      // a turned pedestal down to the floor
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.08, below, 16), brass);
      stem.position.y = -0.09 - below / 2;
      g.add(stem);
    }
    g.position.copy(top);
    g.traverse((o) => { o.castShadow = true; });
    this.scene.add(g);
    const smokeTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d')!;
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,0.75)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const sprites: THREE.Sprite[] = [];
    for (let i = 0; i < 18; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0xdedad2, transparent: true, depthWrite: false, opacity: 0 }));
      sp.userData.t = i / 18;
      sp.visible = false;
      this.scene.add(sp);
      sprites.push(sp);
    }
    this.smoke[index] = { sprites, at: top.clone() };
  }

  /** light three sticks in the holder whose sand top is at `at` */
  incense(at: THREE.Vector3) {
    const holder = this.spots.findIndex((s) => s.holder && s.holder.distanceTo(at) < 0.3);
    if (holder < 0) return;
    const top = this.spots[holder].holder!;
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const stick = new THREE.Group();
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.32, 6), new THREE.MeshStandardMaterial({ color: 0x8a3b2a, roughness: 0.9 }));
      reed.position.y = 0.16;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0xc23a2c }));
      handle.position.y = -0.03;
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5a1a }));
      ember.position.y = 0.32;
      ember.name = 'ember';
      stick.add(reed, handle, ember);
      stick.position.set((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08);
      stick.rotation.set((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.25);
      g.add(stick);
    }
    g.position.copy(top).add(new THREE.Vector3(0, -0.012, 0));
    this.scene.add(g);
    this.sticks.push({ group: g, born: this.time, holder });
  }

  update(dt: number) {
    this.time += dt;
    while (this.queue.length && this.queue[0].at <= this.time) this.queue.shift()!.spawn();

    const touched = new Set<number>();
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const f = this.pieces[i];
      let scale = f.scale;
      if (f.landed < 0) {
        // flutter down: sway side to side, tumble, slow near the ground
        f.p.y -= f.fall * dt;
        f.p.x += Math.sin(this.time * 2.2 + f.phase) * f.sway * dt;
        f.p.z += Math.cos(this.time * 1.7 + f.phase) * f.sway * dt;
        f.angle += f.spin * dt;
        this.q.setFromAxisAngle(f.spinAxis, f.angle);
        // rest just above the surface: floors are slabs a couple of centimetres proud
        // of the ground height
        if (f.p.y <= f.floor + REST) {
          f.p.y = f.floor + REST + Math.random() * 0.006;
          f.landed = 0;
        }
      } else {
        f.landed += dt;
        this.q.copy(f.rest);
        const left = LIE_SECONDS + FADE_SECONDS - f.landed;
        if (left <= 0) { this.pieces.splice(i, 1); this.hide(f); touched.add(f.type); continue; }
        if (left < FADE_SECONDS) scale *= left / FADE_SECONDS;
      }
      const [w, h] = FLOWERS[this.ids[f.type]].size;
      this.m.compose(f.p, this.q, this.s.set(w * scale, h * scale, Math.min(w, h) * scale));
      this.meshes[f.type].setMatrixAt(f.slot, this.m);
      touched.add(f.type);
    }
    for (const t of touched) this.meshes[t].instanceMatrix.needsUpdate = true;

    // incense burns for three minutes; smoke rises while any stick in a holder burns
    const life = 180;
    const burning = new Set<number>();
    for (let i = this.sticks.length - 1; i >= 0; i--) {
      const st = this.sticks[i];
      const age = this.time - st.born;
      if (age > life) { this.scene.remove(st.group); this.sticks.splice(i, 1); continue; }
      st.group.scale.y = 1 - (age / life) * 0.7;
      burning.add(st.holder);
    }
    this.smoke.forEach((s, i) => {
      if (!s) return;
      const on = burning.has(i);
      for (const sp of s.sprites) {
        sp.visible = on;
        if (!on) continue;
        sp.userData.t = (sp.userData.t + dt * 0.1) % 1;
        const t = sp.userData.t as number;
        sp.position.set(s.at.x + Math.sin(t * 8 + this.time * 0.7) * 0.07 * t, s.at.y + 0.33 + t * 1.6, s.at.z + Math.cos(t * 6 + this.time * 0.5) * 0.05 * t);
        sp.scale.setScalar(0.05 + t * 0.45);
        (sp.material as THREE.SpriteMaterial).opacity = 0.32 * (1 - t) * Math.min(1, t * 6);
      }
    });
  }

  private hide(f: Piece) {
    this.m.makeScale(0, 0, 0);
    this.meshes[f.type].setMatrixAt(f.slot, this.m);
  }
}
