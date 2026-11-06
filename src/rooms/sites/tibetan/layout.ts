import * as THREE from 'three';

// Namdroling Golden Temple at half real scale (docs/rooms/tibetan/reference.md §9).
// Origin at the centre of the main doorway threshold; +z runs into the hall toward the
// altar. Facing the altar (+z) a visitor's right hand is world -x, so the reference's
// "viewer's left" (Guru Rinpoche) is world +x and "viewer's right" (Amitayus) is -x.

/** floor level of the porch and hall, on a plinth above the lawn */
export const FY = 0.45;
/** the hall's interior */
export const HALL = { x0: -9, x1: 9, z0: 0, z1: 20, h: 12 };
export const WALL = 0.5;
/** the main doorway in the front wall */
export const DOOR = { halfW: 1.8, h: 5.2 };
/** the pillared porch in front of the doors */
export const PORCH = { x0: -7.2, x1: 7.2, z0: -3.2, z1: 0, h: 7 };
/** steps up from the forecourt to the porch */
export const STEPS = { z0: -4.4, z1: -3.2, x0: -6, x1: 6 };

/** the altar platform across the back of the hall (front face at z0) */
export const ALTAR = { x0: -8.6, x1: 8.6, z0: 16.6, z1: 20, h: 2.5 };
/** glass and steel rail in front of the platform */
export const RAIL_Z = 16.25;
export const TOP = FY + ALTAR.h;

/** the three images: Guru Rinpoche (viewer's left), Shakyamuni, Amitayus (viewer's right) */
export const BUDDHA = { x: 0, z: 18.45 };
export const GURU = { x: 5.75, z: 18.6 };
export const AMITAYUS = { x: -5.75, z: 18.6 };
/** the Buddha's seated figure stands this tall, on a gilded throne this high */
export const BUDDHA_H = 4.3;
export const THRONE_H = 0.9;
/** where seated visitors look: the Buddha's face */
export const BUDDHA_FACE = new THREE.Vector3(0, TOP + THRONE_H + BUDDHA_H * 0.86, BUDDHA.z);

/** the lama's throne and the offering table on the axis below the altar */
export const THRONE = { z: 15.75 };
export const TABLE = { x0: -1.4, x1: 1.4, z0: 14.55, z1: 15.15, h: 0.55 };

/** monks' benches: seats face the central aisle; the aisle is |x| < 2.2 */
export const BENCH = { x: 2.65, z0: 3.4, z1: 14.2, w: 0.75, h: 0.2 };
export const SEAT_ZS = Array.from({ length: 9 }, (_, i) => 4 + i * 1.2);

/** the outer building block */
export const BLOCK = { x0: HALL.x0 - WALL, x1: HALL.x1 + WALL, z0: -WALL, z1: HALL.z1 + WALL, h: 12.8 };
/** the low side wings with golden roofs either side of the front */
export const WINGS = [{ x0: 12.6, x1: 24, z0: -2, z1: 6.5 }, { x0: -24, x1: -12.6, z0: -2, z1: 6.5 }];

export const BURNER_AT = new THREE.Vector3(0, 0, -8.2);
export const BOUNDS = { x0: -34, x1: 34, z0: -50, z1: 30 };
/** the clockwise path round the temple (the building always on the right) */
export const KORA_X = 11.2;
export const KORA_Z0 = -5.6;
export const KORA_Z1 = 23.4;
