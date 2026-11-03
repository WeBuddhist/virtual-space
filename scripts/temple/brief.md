# Brief: build a piece of the Mahabodhi Temple complex, Bodh Gaya, in three.js

You are a master of Indian temple architecture and an expert three.js programmer. You are building one element of a real-time 3D replica of the Mahabodhi Temple complex in Bodh Gaya, the place of the Buddha's awakening. Pilgrims from around the world walk through it in a web browser. The goal is that they **recognise the real place**: its massing, proportions, tiers, mouldings, niches, carvings and colours, as in the reference photographs attached.

## The output: one complete TypeScript module

```ts
import * as THREE from 'three';
// optional: import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat } from './kit';

export function build(/* the signature given in your element's brief */): THREE.Group { … }
```

- **Imports:** import only `three`, `three/examples/jsm/utils/BufferGeometryUtils.js` and `./kit`.
- **Materials:** come only from `mat(name)`, with these names:
  - **Stone and plaster:** `sandstone`, `stucco`, `brick`, `granite`, `basalt`, `marble`, `whitewash`, `pink-sandstone`.
  - **Metals:** `gold`, `brass`.
  - **Wood and cloth:** `wood`, `red-cloth`, `saffron-cloth`.
  - **Recesses:** `dark`, for niche backs, doorway depths and window openings.

  Each name is one shared material. The browser adds photo textures to the stone materials, so give them sensible UVs; three's built-in geometries already have them.
- **No textures, canvases, DOM, `fetch`, timers, randomness or I/O.** For variety, use a seeded deterministic generator written inside your module.
- **Geometry:**
  - **What to use:** any three.js geometry (Box, Cylinder, Lathe, Extrude with Shapes, Torus, Sphere, Cone, Tube, Polyhedron, or BufferGeometry you build yourself), groups, transforms, `InstancedMesh`, `mergeGeometries`.
  - **Repetition:** model carving as real relief, with recessed niches, projecting mouldings and lotus petals. Repeated features (niches, pillars, petals) should share geometry through instancing or merged clones.
- **The frame:** metres, +y up, the element's front faces +z, and the origin is the centre of the base on the ground (y = 0) unless your brief says otherwise. Keep to the dimensions in your brief: the element is placed into a fixed site layout.
- **Triangle budget:** stay under it (given in your brief; instances count fully). Spend triangles where the eye goes.
- **Keep-clear boxes**, if your brief lists any (doorways, the sanctum), must contain no geometry at all. The checker samples every triangle.
- **Plain modern TypeScript that Node can run with type stripping.**
  - **Not allowed:** `enum`, `namespace`, parameter properties, decorators, JSX.
  - **Exponents:** wrap unary minus before `**`, as in `(-x) ** 2`.
  - **Types:** use `import type` for type-only imports.
  - **Completeness:** the module must be complete and syntactically valid. Output it in a single ```ts block.

## What you get back each round

CPU renders of your build show plain shading, without textures. The front, three-quarter and side views are taken at eye level. "high" is a view from above at an angle. "detail" is a closer look at the lower front. You also get the stats: bounds, triangles, budget, materials and any keep-clear violations.

Compare these hard against the reference photographs: silhouette and proportions first, then the tiers and mouldings, then the niches and carving, then the materials. Briefly list the biggest differences, then output the **complete** revised module. Always send the whole module, never a diff.

The current hand-made version of this element is included below the element brief. It is crude; beat it decisively.
