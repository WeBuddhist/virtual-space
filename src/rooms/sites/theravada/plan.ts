import * as THREE from 'three';

// Blocking for Wat Phra Si Rattana Mahathat (Wat Yai), Phitsanulok, in metres, after
// docs/rooms/theravada/reference.md §9. Origin at the centre of the viharn's west
// doorway on the ground; +x runs east down the nave to the Phra Buddha Chinnarat,
// +z is south, y is up. The hall faces west (−x), toward the Nan River.

/** the viharn and its porch stand on a plinth this high */
export const FLOOR = 0.45;

export const HALL = {
  /** inner faces of the walls */
  x0: 0, x1: 36, halfW: 7,
  wall: 0.6,
  /** inner wall height (to the aisle ceilings) and the nave ceiling */
  wallTop: FLOOR + 6.8,
  naveTop: FLOOR + 10.5,
  /** the two rows of black-and-gold columns */
  colZ: 3.5,
  colXs: [4, 8, 12, 16, 20, 24, 28, 32],
  door: { halfW: 1.1, h: 4.6 },
  sideDoors: { z: 3.4, halfW: 0.55, h: 3.5 },
};

export const PORCH = { x0: -5, x1: -HALL.wall, halfW: 5.2 };
export const STEPS = { x0: -6.3, x1: PORCH.x0, halfW: 2.7 };

/** the pedestal (chukchi) and the image on it */
export const PEDESTAL = { x0: 31.2, x1: 35.0, halfW: 2.7, top: FLOOR + 1.9 };
export const IMAGE = { x: 33.3, base: PEDESTAL.top, height: 3.7 };
/** where kneeling visitors look: the image's face */
export const IMAGE_FACE = new THREE.Vector3(IMAGE.x - 0.3, IMAGE.base + 2.9, 0);
/** the railing that keeps devotees back, and the offering table just beyond it */
export const RAIL_X = 27.4;
export const TABLE = { x0: 28.0, x1: 28.9, halfW: 1.7, top: FLOOR + 0.8 };

/** the kneeling carpet */
export const CARPET = { x0: 9, x1: 27, halfW: 3.1 };

/** the prang behind the hall, and the cloister (phra rabiang) square around it */
export const PRANG = { x: 54, z: 0, base: 14.5 };
export const CLOISTER = { x0: 37.2, x1: 68.4, halfW: 13.8, depth: 3.2 };

export const BURNER_AT = new THREE.Vector3(-12, 0, 4.2);

export const BOUNDS = { x0: -46, x1: 76, z0: -34, z1: 34 };

/** the viharn's outer wall line (porch excluded) */
export const OUTER = { x0: HALL.x0 - HALL.wall, x1: HALL.x1 + HALL.wall, halfW: HALL.halfW + HALL.wall };
