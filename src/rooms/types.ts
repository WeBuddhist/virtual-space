import type * as THREE from 'three';
import type { TempleId } from '../../shared/rooms';

export type Bilingual = { en: string; bo: string };
export type Tradition = 'pan' | 'vajrayana' | 'theravada' | 'mahayana';

/** a sound-making object a visitor can play from the instrument tray */
export type InstrumentId =
  | 'woodfish' | 'singing-bowl' | 'bell-dorje' | 'damaru' | 'nga-drum'
  | 'rolmo' | 'gong' | 'temple-bell' | 'dharma-drum';

/** how this tradition bows; the avatar has an animation for each */
export type BowStyle = 'tibetan-prostration' | 'five-point' | 'east-asian-bow' | 'standing-bow';

export interface StatueDef {
  id: string;
  name: Bilingual;
  role: Bilingual;
  /** x offset on the altar (hall-local, metres) */
  x: number;
  scale: number;
  /** robe/body tint; statues are gilded by default */
  tint: number;
  halo: number;
}

export interface Box2 { x0: number; x1: number; z0: number; z1: number }
export interface Cushion { index: number; position: THREE.Vector3; mesh: THREE.Mesh }

/** everything a temple's buildings contribute to the shared world */
export interface Site {
  /** meshes the visitor can click to walk on */
  floor: THREE.Object3D[];
  cushions: Cushion[];
  colliders: Box2[];
  burner: { object: THREE.Object3D; position: THREE.Vector3; stand: THREE.Vector3 };
  spawn: THREE.Vector3;
  /** world yaw the visitor faces on arrival (avatar forward is +z) */
  spawnYaw: number;
  bounds: Box2;
  groundHeight(x: number, z: number): number;
  /** night is 0 by day and 1 at night; drive lamps, flags, water… */
  update(dt: number, night: number, elapsed: number): void;
}

export interface SiteContext {
  scene: THREE.Scene;
  temple: TempleDef;
  rng: () => number;
}

export interface TempleDef {
  id: TempleId;
  tradition: Tradition;
  name: Bilingual;
  /** where it is, shown in the room picker */
  place: Bilingual;
  hall: {
    name: Bilingual;
    signboard: string;
    pillarColor: number;
    wallColor: number;
    roofColor: number;
  };
  statues: StatueDef[];
  instruments: InstrumentId[];
  bowStyles: BowStyle[];
  /** communal chanting times in the temple's local clock */
  services: { kind: 'dawn' | 'evening'; hour: number; minute: number }[];
  /** IANA zone for day/night and service times */
  timeZone: string;
  /** cushion indices held by resident practitioners */
  residents: number[];
  sky?: { dayTop: number; dayBottom: number; fog: number };
  buildSite(ctx: SiteContext): Site;
}
