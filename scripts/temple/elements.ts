// The Bodh Gaya elements Kimi builds, each in its own local frame: metres, +y up, the
// element's front facing +z, origin at the centre of its base. src/rooms/sites/bodhgaya/
// kimi/index.ts places each one in the site.

export interface Box { x: [number, number]; y: [number, number]; z: [number, number] }

export interface Element {
  id: string;
  title: string;
  /** the exported function's signature and what it must build */
  brief: string;
  /** arguments the bake calls `build` with, as a JS literal, for the preview */
  args: string;
  /** spaces that must stay empty (sanctum, walkways); checked on every bake */
  keepClear?: { name: string; box: Box }[];
  /** most triangles allowed (instances counted) */
  budget: number;
  /** reference photos, relative to reference/bodhgaya/ */
  refs: string[];
}

const W = 'web/';

export const ELEMENTS: Element[] = [
  {
    id: 'tower',
    title: 'The Mahabodhi temple tower (exterior)',
    args: '',
    budget: 350_000,
    brief: `\`export function build(): THREE.Group\` — the whole Mahabodhi temple above ground, as seen from outside: the lower storey, the terrace, the great pyramidal shikhara and the four corner towers.

Dimensions in this frame (the real temple, scaled to our site):
- Lower storey: a square block x ±7.3, z ±7.3, from y = 0 up to the terrace at y = 11. Its walls carry pilasters, mouldings and rows of niches with seated Buddha images. A parapet runs round the terrace.
- Shikhara: rises from the terrace, a straight-sided square pyramid about 10 m across at its foot (y = 11) narrowing to about 4.5 m at y ≈ 47, with a projecting central rib/offset on each face and about 9 horizontal tiers of chaitya-arch (gavaksha) niches holding Buddha figures, plus the recessed tiers and corner offsets you see in the photos.
- On the front (+z) face, high up (roughly y 14–22), the tall pointed-arch window.
- Crown: neck, a large ribbed amalaka, then the gilded stupa-shaped finial with its umbrella discs and spire, to about y = 55.
- Four corner towers on the terrace near its corners (centres about x ±5.5, z ±5.5), each a miniature of the main shikhara about 9–10 m tall with its own amalaka and finial.
- The east door is at the centre of the front face (z = +7.3). A separate porch (not yours) is built in front of it; build the front wall round the doorway.

Materials: sandstone/stucco for the body, 'dark' inside niche recesses and the window, 'gold' for the finials.`,
    keepClear: [
      { name: 'the sanctum (the shrine and the main image stand here)', box: { x: [-2.95, 2.95], y: [0.05, 6.95], z: [-3.15, 2.75] } },
      { name: 'the door passage from the front wall to the sanctum', box: { x: [-0.85, 0.85], y: [0.05, 3.35], z: [2.75, 7.6] } },
    ],
    refs: [
      `${W}tower/full-east-01.jpg`, `${W}tower/full-east-sunset-02.jpg`, `${W}tower/shikhara-warm-light-01.jpg`, `${W}tower/full-southeast-05.jpg`,
      `${W}tower/full-south-08.jpg`, `${W}tower/full-west-02.jpg`, `${W}tower/top-amalaka-finial-01.jpg`, `${W}tower/shikhara-mid-detail-01.jpg`,
      `${W}tower/corner-towers-base-01.jpg`, `${W}tower/niche-panel-buddhas-01.jpg`, `${W}tower/stone-model-12c-vam-01.jpg`, `${W}tower/full-north-09.jpg`,
    ],
  },
  {
    id: 'portico',
    title: 'The east entrance porch',
    args: '',
    budget: 80_000,
    brief: `\`export function build(): THREE.Group\` — the projecting entrance porch on the east face of the Mahabodhi temple. Its back (z = 0) is flush against the temple's front wall; it projects forward to about z = +4.2 and spans about x ±3.2, rising to about y = 9–10.

It frames the main doorway: a tall carved stone portal (jambs and lintel with bands of carving), the pointed-arch entrance, niches with Buddha images on its face, and the decorative upper storey seen in the photos. The doorway is at x = 0: walkers pass through it along the z axis into the temple.

Materials: sandstone/stucco, 'gold' for the gilded door frame, 'dark' for the opening's depth.`,
    keepClear: [
      { name: 'the walkway through the doorway', box: { x: [-0.85, 0.85], y: [0.05, 3.35], z: [-0.2, 4.6] } },
    ],
    refs: [
      `${W}facade/east-front-full-01.jpg`, `${W}facade/entrance-doorway-stone-frame-01.jpg`, `${W}facade/east-facade-base-01.jpg`, `${W}facade/portal-upper-carvings-01.jpg`,
      `${W}facade/portal-niches-buddhas-01.jpg`, `${W}facade/east-facade-arch-window-01.jpg`, `${W}facade/east-entrance-portal-01.jpg`, `${W}facade/facade-carvings-02.jpg`,
      `${W}facade/entrance-portal-inside-01.jpg`, `${W}facade/east-facade-upper-01.jpg`,
    ],
  },
  {
    id: 'railing',
    title: 'The Sunga stone railing',
    args: '{ length: 10 }',
    budget: 22_000,
    brief: `\`export function build(opts: { length: number }): THREE.Group\` — one straight run of the ancient Sunga-period stone railing (vedika) that encloses the temple and the Bodhi tree, running along x from -length/2 to +length/2, centred on z = 0. It is called for runs from 3 m to 45 m long, so it must be parametric: upright pillars about 1.4 m apart (one at each end), three lens-section crossbars (suchi) between each pair of pillars at about y 0.55, 1.05 and 1.55, and the rounded coping stone (ushnisha) along the top, about y 2.0–2.35. The pillars are about 0.3 m wide and carry the carved lotus medallions (a full lotus roundel in the middle, half-lotuses at top and bottom; some with figures); the crossbars carry lotus roundels too. Keep it within z ±0.35. Both faces may look alike.

Budget: the preview is 10 m; keep it under the triangle budget for 10 m, because about 130 m of railing is built. Reuse geometry (InstancedMesh or merged copies) for repeated pillars and bars.

Material: 'granite' (the grey-buff stone of the replica railing); you may use 'sandstone' for some pieces as in the photos.`,
    refs: [
      `${W}railing/railing-crossbars-medallions-01.jpg`, `${W}railing/medallion-lotus-gilded-01.jpg`, `${W}railing/railing-run-with-monk-01.jpg`, `${W}railing/railing-posts-crossbars-02.jpg`,
      `${W}railing/crossbar-medallion-closeup-01.jpg`, `${W}railing/pillar-original-museum-01.jpg`, `${W}railing/medallion-original-museum-01.jpg`, `${W}railing/pillar-elephant-medallion-01.jpg`,
      `${W}railing/original-pillar-vam-front-01.jpg`, `${W}railing/original-pillar-vam-03.jpg`, `${W}railing/railing-around-temple-wide-01.jpg`, 'exterior/005-part-of-the-railings.jpg',
    ],
  },
  {
    id: 'torana',
    title: 'The stone gateway (torana) on the east approach',
    args: '',
    budget: 40_000,
    brief: `\`export function build(): THREE.Group\` — the old stone gateway that frames the approach to the east entrance: two tall carved stone posts and the lintel/architraves across them, as in the photos. The paved path passes through it along z: the posts stand either side at about x ±3.5 (outer faces within x ±4.4), it rises to about y = 8.5–9, and its depth is within z ±0.8.

Materials: sandstone (carved posts and lintels).`,
    keepClear: [
      { name: 'the path through the gateway', box: { x: [-2.9, 2.9], y: [0.05, 5.6], z: [-0.9, 0.9] } },
    ],
    refs: [
      `${W}facade/east-front-gateway-01.jpg`, `${W}facade/torana-ancient-gateway-01.jpg`, `${W}facade/torana-lintel-detail-01.jpg`, `${W}facade/torana-post-detail-01.jpg`,
      `${W}facade/east-approach-path-01.jpg`, `${W}facade/east-front-full-01.jpg`, `${W}tower/full-east-03.jpg`,
    ],
  },
  {
    id: 'stupas',
    title: 'Votive stupas',
    args: '0',
    budget: 5_000,
    brief: `\`export const TYPES = 4;\` and \`export function build(type: number): THREE.Group\` — four kinds of the votive stupas that crowd the courtyard (type 0..3), each standing on y = 0 centred on the origin, with its front (+z) carrying a niche with a seated Buddha:
- 0: small (about 1.2 m tall) dark basalt stupa: square base, drum, dome, harmika, umbrella spire.
- 1: medium (about 2 m) Pala-period stupa on a moulded square plinth with Buddha niches on four sides and a tiered spire.
- 2: large (about 3.2 m) stupa with a tall stepped base, niches on all four sides (gilded Buddha in front), dome and tall tiered umbrella spire.
- 3: a squat, weathered stupa (about 1.5 m), broader dome, simpler.
Use 'basalt' for most, 'gold' for gilded niche figures where seen, 'sandstone' or 'stucco' for some lighter ones. The budget is per type: about 60 are placed. The renders show all four types side by side, 0 to 3 from left to right.`,
    refs: [
      `${W}stupas-carvings/votive-stupa-dark-stone-01.jpg`, `${W}stupas-carvings/votive-stupa-dark-stone-02.jpg`, `${W}stupas-carvings/votive-stupa-dark-stone-03.jpg`,
      `${W}stupas-carvings/votive-stupa-museum-full-01.jpg`, `${W}stupas-carvings/votive-stupa-large-01.jpg`, `${W}stupas-carvings/votive-stupas-row-01.jpg`,
      `${W}stupas-carvings/votive-stupas-cluster-01.jpg`, `${W}stupas-carvings/votive-stupas-field-01.jpg`, `${W}stupas-carvings/votive-stupa-black-01.jpg`,
      `${W}stupas-carvings/votive-stupa-pala-vam-01.jpg`, `${W}stupas-carvings/votive-stupa-pala-vam-02.jpg`, `${W}stupas-carvings/votive-stupa-buddha-niches-04.jpg`,
    ],
  },
  {
    id: 'animesh',
    title: 'The Animesh Lochana Chaitya',
    args: '',
    budget: 40_000,
    brief: `\`export function build(): THREE.Group\` — the Animesh Lochana Chaitya, the small shrine marking the place where the Buddha gazed at the Bodhi tree without blinking: an old brick and plaster shrine with a small shikhara-like tower, on a square footprint of about x ±2.4, z ±2.4, rising to about y = 9–10, with its doorway on the front (+z) and the standing Buddha image visible inside. Follow the photos for its real form, colours and weathering.

Materials: 'brick', 'stucco' or 'whitewash' as the photos show, 'dark' for the doorway, 'gold' for the image.`,
    refs: [
      `${W}grounds/animesh-lochana-chaitya-01.jpg`, `${W}grounds/animesh-lochana-chaitya-02.jpg`, 'exterior/animesh-lochan-chaitya.jpg', 'exterior/animesh-lochan-chaitya-2.jpg',
      `${W}grounds/white-shrine-towers-01.jpg`,
    ],
  },
  {
    id: 'jewelwalk',
    title: 'The Ratnachankrama (Jewel Walk)',
    args: '',
    budget: 40_000,
    brief: `\`export function build(): THREE.Group\` — the Ratnachankrama, the raised walk along the north side of the temple where the Buddha walked in meditation and lotuses sprang up at each step: a low platform along x from -8 to +8, z ±0.55, about 1 m high, with 18 carved stone lotus blossoms in a row along its top (about 0.88 m apart), and the moulded sides, as in the photos.

Materials: 'granite' or 'sandstone' for the platform, 'sandstone' for the lotuses (some devotees gild them: a little 'gold' leaf is fine).`,
    refs: [
      `${W}grounds/jewel-walk-chankramana-01.jpg`, `${W}grounds/chankramana-lotus-stones-01.jpg`, `${W}grounds/chankramana-lotus-stone-closeup-01.jpg`, `${W}grounds/chankramana-wall-niches-01.jpg`,
      'exterior/cankamana-mahabodhi-temple-complex.jpg', 'exterior/cankamana-mahabodhi-temple-complex-3.jpg',
    ],
  },
];
