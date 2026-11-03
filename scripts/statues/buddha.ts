// Parametric seated Buddha sculpted with SDFs. The figure faces +z, sits at the
// origin, and stands about 1.15 m tall; the site scales it. The statue's own
// right hand is on -x. The head is returned separately so it can be meshed at a
// finer resolution; the face gets UVs for a painted texture applied at runtime.
import {
  blend, capsule, carve, cone, cylinder, displace, ellipsoid, mirrorX, paint, roundBox, sphere, torus, union,
  type Shape, type V3,
} from './sdf.ts';

export const MAT = { gilt: 0, robe: 1, hair: 2, face: 3, lips: 4, cloth: 5, seat: 6, jewel: 7, white: 8, crystal: 9 } as const;

export interface BuddhaOptions {
  mudra: 'bhumisparsha' | 'dhyana' | 'abhaya-varada' | 'dharmachakra';
  /** one shoulder bare (Pala, Thai) or both covered (East Asian, Jowo) */
  robe: 'one-shoulder' | 'both';
  hair: 'curls' | 'smooth';
  ushnisha: 'bump' | 'flame' | 'jewel';
  crown: boolean;
  /** devotees' cloth robe over the left shoulder, torso and lap (Bodh Gaya, Jowo) */
  offeredRobe: boolean;
  /** 0.9 slender (Sukhothai) … 1.1 broad (Pala, Nara) */
  build: number;
  /** what the figure sits on */
  seat: 'none' | 'lotus' | 'cushion';
  /** a gold bead crowning the ushnisha (Bodh Gaya) */
  finial?: boolean;
  /** a bowl held in the lap by the left hand */
  almsBowl?: 'crystal' | 'dark';
}

/** centre of the head; the face texture is projected from the front around it */
export const HEAD: V3 = [0, 0.93, 0.02];
/** planar UVs for the face: 0.26 m square centred on the face */
export const faceUV = (p: V3): [number, number] => [(p[0] + 0.13) / 0.26, (p[1] - (HEAD[1] - 0.15)) / 0.26];
/** cushion UVs: u runs around the cushion, v up its side, so a border pattern wraps it */
export const seatUV = (p: V3): [number, number] => [(Math.atan2(p[2] - 0.05, p[0]) / Math.PI + 1) * 4, (p[1] + 0.12) / 0.13];

const folds = (freq: number, dir: V3) => (p: V3) => Math.sin((p[0] * dir[0] + p[1] * dir[1] + p[2] * dir[2]) * freq);

/** points spread evenly over a sphere cap (for hair curls) */
function capPoints(c: V3, r: number, minY: number, n: number): V3[] {
  const pts: V3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const total = n * 3;
  for (let i = 0; i < total && pts.length < n; i++) {
    const y = 1 - (i / (total - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const a = golden * i;
    const p: V3 = [c[0] + Math.cos(a) * rad * r, c[1] + y * r, c[2] + Math.sin(a) * rad * r];
    if (p[1] >= minY) pts.push(p);
  }
  return pts;
}

/** keep only the part of `s` where `region` is negative (a soft-edged intersection) */
function within(s: Shape, region: (p: V3) => number): Shape {
  return { ...s, d: (p) => Math.max(s.d(p), region(p)) };
}

/** a layer of thickness t lying on top of s */
const shell = (s: Shape, t: number, mat: number): Shape => ({ ...s, d: (p) => s.d(p) - t, m: () => mat });

export function seatedBuddha(o: BuddhaOptions): { body: Shape; head: Shape } {
  const b = o.build;
  const H = HEAD;

  // ---- legs in full lotus ----
  const legs = blend(0.05,
    ellipsoid([0, 0.12, 0.06], [0.5 * b, 0.12, 0.28], MAT.gilt),
    cone([-0.42 * b, 0.11, 0.16], [0.16, 0.16, 0.3], 0.1, 0.07, MAT.gilt), // right shin over the left
    cone([0.42 * b, 0.11, 0.16], [-0.14, 0.13, 0.27], 0.095, 0.07, MAT.gilt),
  );
  const feet = mirrorX(blend(0.02,
    ellipsoid([0.2, 0.235, 0.27], [0.085, 0.028, 0.048], MAT.gilt),
    sphere([0.27, 0.235, 0.27], 0.032, MAT.gilt),
  ));

  // ---- torso: broad shoulders, slim waist ----
  const torso = blend(0.07,
    ellipsoid([0, 0.29, 0], [0.24 * b, 0.14, 0.17], MAT.gilt),
    ellipsoid([0, 0.43, 0.01], [0.2 * b, 0.12, 0.145], MAT.gilt),
    ellipsoid([0, 0.6, 0], [0.265 * b, 0.165, 0.15], MAT.gilt),
    mirrorX(ellipsoid([0.2 * b, 0.675, -0.01], [0.1, 0.07, 0.1], MAT.gilt)),
    capsule([0, 0.7, 0], [0, 0.86, 0.015], 0.056, MAT.gilt),
  );

  // ---- arms and hands ----
  const sh = 0.26 * b;
  const arm = (a: V3, e: V3, w: V3) => blend(0.03, cone(a, e, 0.064, 0.05, MAT.gilt), cone(e, w, 0.05, 0.035, MAT.gilt));
  const hand = (wrist: V3, tip: V3, thumbDir: V3) => {
    const mid: V3 = [(wrist[0] + tip[0]) / 2, (wrist[1] + tip[1]) / 2, (wrist[2] + tip[2]) / 2];
    return blend(0.01,
      cone(wrist, mid, 0.036, 0.033, MAT.gilt),
      cone(mid, tip, 0.03, 0.016, MAT.gilt),
      cone(wrist, [wrist[0] + thumbDir[0], wrist[1] + thumbDir[1], wrist[2] + thumbDir[2]], 0.017, 0.013, MAT.gilt),
    );
  };
  const arms: Shape[] = [];
  if (o.mudra === 'bhumisparsha') {
    // right arm over the right knee, fingers reaching down to touch the earth
    arms.push(arm([-sh, 0.67, 0], [-0.34 * b, 0.42, 0.06], [-0.33 * b, 0.21, 0.28]));
    arms.push(hand([-0.33 * b, 0.21, 0.28], [-0.335 * b, 0.04, 0.34], [0.03, 0.0, 0.045]));
  } else if (o.mudra === 'abhaya-varada') {
    arms.push(arm([-sh, 0.67, 0], [-0.34 * b, 0.45, 0.06], [-0.27 * b, 0.62, 0.24]));
    arms.push(hand([-0.27 * b, 0.62, 0.24], [-0.27 * b, 0.8, 0.27], [0.045, 0.02, 0.01]));
  } else if (o.mudra === 'dharmachakra') {
    arms.push(arm([-sh, 0.67, 0], [-0.3 * b, 0.42, 0.06], [-0.07, 0.56, 0.22]));
    arms.push(hand([-0.07, 0.56, 0.22], [0.0, 0.62, 0.25], [0.03, 0.03, 0.02]));
  } else {
    arms.push(arm([-sh, 0.67, 0], [-0.31 * b, 0.42, 0.06], [-0.1, 0.25, 0.22]));
    arms.push(hand([-0.1, 0.25, 0.22], [0.08, 0.25, 0.24], [0.02, 0.02, 0.04]));
  }
  if (o.mudra === 'abhaya-varada') {
    arms.push(arm([sh, 0.67, 0], [0.33 * b, 0.42, 0.06], [0.3 * b, 0.3, 0.27]));
    arms.push(hand([0.3 * b, 0.3, 0.27], [0.3 * b, 0.25, 0.42], [-0.04, 0.02, 0.0]));
  } else if (o.mudra === 'dharmachakra') {
    arms.push(arm([sh, 0.67, 0], [0.3 * b, 0.42, 0.06], [0.07, 0.53, 0.22]));
    arms.push(hand([0.07, 0.53, 0.22], [0.0, 0.5, 0.26], [-0.03, 0.03, 0.02]));
  } else {
    // in the lap, palm up
    arms.push(arm([sh, 0.67, 0], [0.32 * b, 0.42, 0.05], [0.1, 0.25, 0.21]));
    arms.push(hand([0.1, 0.25, 0.21], [-0.07, 0.26, 0.24], [-0.01, 0.025, 0.045]));
  }

  const figure = blend(0.012, legs, feet, torso, ...arms);

  // ---- the carved monastic robe: a thin layer on the covered parts ----
  const hemY = (x: number) => {
    const t = Math.min(1, Math.max(0, (0.24 * b - x) / (0.48 * b)));
    return 0.77 + (0.43 - 0.77) * t;
  };
  const leftArm = arms[o.mudra === 'bhumisparsha' || o.mudra === 'dhyana' ? 2 : 2];
  const robeBase = o.robe === 'both' ? union(torso, legs, ...arms.filter((_, i) => i % 2 === 0)) : union(torso, legs, leftArm);
  const robeRegion = (p: V3) => {
    if (p[1] < 0.36) return -1; // lap and legs are always robed
    if (o.robe === 'both') return p[1] - 0.8;
    if (p[0] > 0.18 * b) return -1; // the left arm and shoulder
    return p[1] - hemY(p[0]); // below the diagonal hem
  };
  let robe = displace(within(shell(robeBase, 0.006, MAT.robe), robeRegion), 0.0025, folds(90, [0.7, 0.7, 0]));
  // folded sanghati end over the left shoulder
  const sanghati = displace(blend(0.025,
    ellipsoid([0.2 * b, 0.63, 0.06], [0.06, 0.13, 0.1], MAT.robe),
    capsule([0.2 * b, 0.76, -0.02], [0.19 * b, 0.5, 0.12], 0.03, MAT.robe),
  ), 0.003, folds(80, [0, 1, 0]));
  robe = union(robe, sanghati);

  const parts: Shape[] = [figure, robe];

  if (o.offeredRobe) {
    // devotees' brocade robe: over the left shoulder and torso and across the whole lap,
    // leaving the right shoulder and arm bare (photos of the Mahabodhi image)
    const clothRegion = (p: V3) => {
      if (p[1] < 0.33) return -1;
      if (p[0] > 0.12 * b) return p[1] - 0.8;
      return p[1] - (hemY(p[0]) - 0.03);
    };
    // a few broad, soft folds, like heavy satin
    const drape = (p: V3) => 0.6 * Math.sin(p[0] * 14 + p[1] * 22) + 0.4 * Math.sin(p[2] * 18 - p[0] * 9);
    parts.push(displace(within(shell(union(torso, legs, leftArm), 0.016, MAT.cloth), clothRegion), 0.004, drape));
  }

  if (o.almsBowl) {
    // a lidded round bowl resting on the left palm
    const mat = o.almsBowl === 'crystal' ? MAT.crystal : MAT.hair;
    parts.push(blend(0.006,
      ellipsoid([0.01, 0.315, 0.24], [0.058, 0.045, 0.058], mat),
      ellipsoid([0.01, 0.355, 0.24], [0.05, 0.016, 0.05], mat),
      sphere([0.01, 0.38, 0.24], 0.012, mat),
    ));
  }
  if (o.offeredRobe) {
    // the folded end of the offered robe: a flat band from the left shoulder down to the lap
    const flapRegion = (p: V3) => Math.max(Math.abs(p[0] - 0.13 * b) - 0.042, p[1] - 0.8, 0.3 - p[1], -p[2]);
    parts.push(displace(within(shell(union(torso, legs), 0.03, MAT.cloth), flapRegion), 0.002, folds(160, [1, 0, 0])));
  }

  if (o.seat === 'lotus') {
    const petals: Shape[] = [];
    for (let row = 0; row < 2; row++) {
      const n = 16 + row * 4;
      for (let i = 0; i < n; i++) {
        const a = ((i + row * 0.5) / n) * Math.PI * 2;
        const r = 0.5 * b + row * 0.06;
        petals.push(ellipsoid([Math.cos(a) * r, -0.04 - row * 0.07, Math.sin(a) * r * 0.75 + 0.06], [0.07, 0.06, 0.035], MAT.seat));
      }
    }
    parts.push(blend(0.02, cylinder([0, -0.05, 0.06], 0.52 * b, 0.12, 0.03, MAT.seat), ...petals));
  } else if (o.seat === 'cushion') {
    // a wide, plump patterned cushion (its pattern is painted at runtime on the "seat" material)
    parts.push(roundBox([0, -0.055, 0.05], [0.66 * b, 0.065, 0.42], 0.06, MAT.seat));
  }

  // ---- head ----
  let head: Shape = blend(0.03,
    ellipsoid(H, [0.112, 0.138, 0.122], MAT.gilt),
    ellipsoid([0, H[1] - 0.075, H[2] + 0.035], [0.074, 0.06, 0.08], MAT.gilt), // jaw and chin
    ellipsoid([0, H[1] - 0.02, H[2] + 0.06], [0.098, 0.07, 0.06], MAT.gilt), // cheeks
    capsule([0, H[1] - 0.2, 0], [0, H[1] - 0.1, 0.01], 0.056, MAT.gilt), // neck top, overlaps the body
  );
  head = blend(0.012, head, cone([0, H[1] + 0.025, H[2] + 0.113], [0, H[1] - 0.034, H[2] + 0.134], 0.011, 0.019, MAT.gilt)); // nose
  head = blend(0.008, head, mirrorX(capsule([0.015, H[1] + 0.034, H[2] + 0.113], [0.075, H[1] + 0.029, H[2] + 0.094], 0.007, MAT.gilt))); // brow ridge
  head = blend(0.006, head, mirrorX(ellipsoid([0.043, H[1] + 0.013, H[2] + 0.111], [0.026, 0.011, 0.011], MAT.gilt))); // heavy upper lids
  head = blend(0.005, head,
    ellipsoid([0, H[1] - 0.059, H[2] + 0.116], [0.025, 0.007, 0.01], MAT.gilt),
    ellipsoid([0, H[1] - 0.071, H[2] + 0.112], [0.022, 0.008, 0.01], MAT.gilt));
  // long ears with stretched lobes
  head = blend(0.015, head, mirrorX(blend(0.02,
    ellipsoid([0.118, H[1] + 0.005, H[2] - 0.01], [0.018, 0.045, 0.03], MAT.gilt),
    cone([0.12, H[1] - 0.03, H[2] - 0.005], [0.126, H[1] - 0.12, H[2] + 0.005], 0.018, 0.022, MAT.gilt),
  )));
  // the front of the face carries the painted texture
  head = paint(head, (p) => p[2] > H[2] + 0.04 && Math.abs(p[0]) < 0.112 && p[1] > H[1] - 0.13 && p[1] < H[1] + 0.11, MAT.face);

  const hairTop = H[1] + 0.035;
  const hairParts: Shape[] = [];
  const faceCut = ellipsoid([0, H[1] - 0.06, H[2] + 0.06], [0.2, 0.1, 0.12]);
  if (o.hair === 'curls') {
    const cap = carve(ellipsoid([H[0], H[1] + 0.012, H[2] - 0.005], [0.116, 0.135, 0.123], MAT.hair), faceCut, 0.01);
    const curls = capPoints([H[0], H[1] + 0.012, H[2] - 0.005], 0.122, hairTop, 300)
      .filter((p) => !(p[2] > H[2] + 0.07 && p[1] < H[1] + 0.07))
      .map((p) => sphere(p, 0.0105, MAT.hair));
    hairParts.push(blend(0.003, cap, ...curls));
  } else {
    hairParts.push(carve(ellipsoid([H[0], H[1] + 0.015, H[2] - 0.005], [0.117, 0.136, 0.124], MAT.hair), faceCut, 0.01));
  }
  const U: V3 = [0, H[1] + 0.155, H[2] - 0.01];
  if (o.ushnisha === 'flame') {
    hairParts.push(blend(0.02, sphere(U, 0.06, MAT.hair), cone([U[0], U[1] + 0.02, U[2]], [U[0], U[1] + 0.2, U[2]], 0.035, 0.004, MAT.gilt)));
  } else if (o.ushnisha === 'jewel') {
    hairParts.push(blend(0.02, sphere(U, 0.062, MAT.hair), sphere([U[0], U[1] + 0.07, U[2]], 0.025, MAT.jewel)));
  } else {
    const curls = o.hair === 'curls' ? capPoints(U, 0.07, U[1] - 0.035, 70).map((p) => sphere(p, 0.0105, MAT.hair)) : [];
    hairParts.push(blend(0.006, sphere(U, 0.068, MAT.hair), ...curls));
  }
  if (o.finial) hairParts.push(blend(0.008, sphere([U[0], U[1] + 0.085, U[2]], 0.022, MAT.gilt), cone([U[0], U[1] + 0.05, U[2]], [U[0], U[1] + 0.07, U[2]], 0.014, 0.01, MAT.gilt)));
  if (o.crown) {
    const ring = torus([0, H[1] + 0.07, H[2] - 0.005], 0.125, 0.012, MAT.gilt);
    const leaves = [-2, -1, 0, 1, 2].map((i) => {
      const a = i * 0.45;
      const c: V3 = [Math.sin(a) * 0.125, H[1] + 0.12, H[2] - 0.005 + Math.cos(a) * 0.125];
      return blend(0.01, ellipsoid(c, [0.032, 0.05, 0.012], MAT.gilt), sphere([c[0], c[1] + 0.005, c[2] + 0.01], 0.012, MAT.jewel));
    });
    hairParts.push(union(ring, ...leaves));
  }

  return { body: union(...parts), head: blend(0.004, head, ...hairParts) };
}
