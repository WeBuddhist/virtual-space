# Sculpt-off brief: the Mahabodhi Buddha

You are a master sculptor of Buddhist images and an expert graphics programmer. Sculpt **the main gilded Buddha image in the sanctum of the Mahabodhi Temple, Bodh Gaya** as a signed-distance-field (SDF) program in TypeScript, as close to the real statue as you possibly can. It will be meshed, compressed and placed in a real-time 3D replica of the temple that pilgrims walk through, so it must be recognisable as *this* statue.

## The reference images

Numbered files, attached in this order:

- `01–03 clean-*`: a studio turnaround (front, the statue's right side, back) made from the real photographs by an image model. It is the cleanest guide to proportions and robe drape, but it is not a photo.
- `04–09 photo-*`: real photographs from the sanctum. **They are the ground truth**: when anything disagrees, follow them. The statue sits behind glass with a crystal-glitter halo and blue backdrop. Sculpt only the statue and its seat, not the shrine.
- `10–11 tripo-ai-model-*`: frames of an AI-generated 3D model of the statue, the statue's right and left sides. They are useful for 3D form from angles the photos lack, but they are less faithful than the photos.

## Coordinates and scale

- Units are metres. The figure sits at the origin and faces **+z**, with **+y** up. The statue's own right hand is on **−x**.
- Total height is about 1.15–1.2 m, from the bottom of the seat at y ≈ −0.12 to the top of the finial.
- Keep the head centre at `HEAD = [0, 0.93, 0.02]` from `../buddha.ts`. The face texture is projected from the front around that point.
- At runtime the eyes, brows, eyelines, urna and lips are **painted** onto material `face` with planar UVs: `faceUV` covers a 0.26 m square centred on the face. Mark the front of the face as `MAT.face`, as the baseline does. The renders you will see show the face **unpainted**, so sculpt the form: lids, nose, lips, chin and cheeks.

## Your output: one complete TypeScript module

```ts
import { blend, capsule, carve, cone, cylinder, displace, ellipsoid, mirrorX, paint, roundBox, rotateY, sphere, torus, union, type Shape, type V3 } from '../sdf.ts';
import { MAT, HEAD } from '../buddha.ts';
import type { Palette } from '../palette.ts';

export function sculpt(): { body: Shape; head: Shape } { … }
export const palette: Palette = { … };
```

- `body` is meshed at 8 mm cells (6 mm for the final). `head` covers the head and hair, and is meshed 2.2× finer. Put the neck join in both, overlapping.
- The available materials are the `MAT` keys: `gilt, robe, hair, face, lips, cloth, seat, jewel, white, crystal`. Assign each primitive its material id, and use `paint()` for regions.
- `palette` sets `{ color: 0xRRGGBB (sRGB), metallic: 0..1, roughness: 0..1 }` for any of those keys. Defaults are gold.
- Only import from `../sdf.ts`, `../buddha.ts` and `../palette.ts`. You may copy and adapt any helper from the baseline below into your module, such as `within`, `shell`, `capPoints` or `folds`. No I/O, no randomness without a fixed seed, no other imports.
- **Performance.** Meshing evaluates `d(p)` millions of times, so it must finish in under about 90 s.
  - Keep bounds tight: every primitive's bounds are used to skip work.
  - Group nearby primitives into `blend` / `union` clusters rather than one giant flat list.
  - Hundreds of small curls are fine when they sit in their own group.
  - A bake that times out or throws counts as a failed round.

## How you'll be judged

The judge will set your statue next to the real photographs, front, three-quarter, side and face, and ask which one *is* the Mahabodhi Buddha:
- proportions and silhouette
- the pose and both hands
- the drape and folds of the offered robe
- the face's form and serenity
- the hair curls, ushnisha and finial
- the seat
- materials and colours

Detail matters, but the overall likeness matters most.

Each round you get back CPU renders of your sculpt from the front, from three-quarter (the camera moves toward the statue's right), from the statue's right side, and a face close-up, plus stats. Compare them hard against the references. Briefly list the biggest differences, then output the **complete** revised module in a single ```ts block. Always output the whole module, never a diff.

## Baseline

`buddha.ts` below is the current hand-written statue: a parametric seated Buddha. Its renders are attached with the first message, and it is clearly not good enough: stiff tube limbs, a blobby robe and a weak face. Beat it decisively. You may start from it, or start over.
