# WeBuddhist Space: freely licensed asset sources

Scouted 2026-11-03. This is research only: no asset files were downloaded into the project.

## How this was checked

**Accepted licences.** In order of preference:
1. CC0 / public domain.
2. CC BY (the exact attribution line is recorded here).

**Rejected licences:** CC BY-NC, ND, SA (ShareAlike), "editorial only", the Sketchfab Standard store licence, and anything unclear.

**How licences were verified.**
- Licence, polycount and file size come from each source's own API or page: the Sketchfab API, Smithsonian 3D API, Cleveland/Mia/V&A collection APIs, Poly Haven API, ambientCG API v2, Freesound and Wikimedia Commons pages, archive.org `/metadata/`, the itch.io upload lists, and GitHub trees.
- Search snippets were not trusted.
- Direct URLs were spot-checked with HTTP HEAD; all returned 200.

**"Login" means a login for us, at download time.** None of these licences needs the end user to log in. Once downloaded, every accepted asset can be served from our own public site.

**Labels used throughout:**
- "Tris" means triangles.
- "Web set" for a PBR texture means only base colour, OpenGL normal and ARM (AO/roughness/metal), which is what three.js `MeshStandardMaterial` needs.
- The project already has `@gltf-transform/cli` as a devDependency, so the optimisation commands below use it.

---

## 1. Rigged humanoid avatars and animations (top priority)

### 1.1 Candidates

| Candidate | Author | Licence | Download (login?) | Format | Size | Polycount | Shared skeleton? | Robe suitability | Quality note |
|---|---|---|---|---|---|---|---|---|---|
| **Mesh2Motion human rig + animation library** | Scott Petrovic / Mesh2Motion; base mesh by Quaternius | **CC0 1.0** (repo `LICENSE-CC0.MD`: "All 3d models, blend files, rigs, animations"). App code is MIT. | Raw GitHub, **no login**. Example: `https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/main/static/assets/human/animations/<clip>.glb` (list in 1.3). Also a web auto-rigger at mesh2motion.org. | GLB, one clip per file, 24 fps | `human/model.glb` 531 KB, `skeleton.glb` 18.7 KB, each clip about 55–95 KB | Low-poly base; exact tris not published | **Yes.** One UE-mannequin-style skeleton (`pelvis`, `spine_01..03`, `neck_01`, `head`, `clavicle_l`, `upperarm_l`, `lowerarm_l`, `hand_l` + fingers, `thigh_l`, `calf_l`, `foot_l`, `ball_l`). Every clip targets it. | No skirt bones or cloth. The web rigger can skin your own robed mesh to this skeleton. | The best fit for us. About 190 human clips including **Meditate, Sit_Ground_Idle, Sitting Enter/Idle/Exit, Fixing_Kneeling, Kneeling Tired, Greeting, Head Nod, Walk_Formal, Idle_Subtle/Listening**. It includes the Quaternius UAL clips. |
| **Quaternius Universal Animation Library (UAL1)** | Quaternius | **CC0** (pack page, checked 2026-11-03) | itch.io "name your price": `https://quaternius.itch.io/universal-animation-library`. Use "No thanks, just take me to the downloads"; **no login**. | FBX, glTF/GLB (v3.0 adds root-motion and in-place variants) | Standard (free) 15 MB, 45 clips. Pro: 41 MB, 120+ clips, paid ($9.99+). Source: .blend, $14.99+. Paid tiers are still CC0. | n/a | **Yes.** v2.0 (Jan 2026) moved to the same rig naming as Universal Base Characters and Modular Outfits. "Compatible with Mixamo" for retargeting. | Rig only, no cloth. | **Free tier:** Idle (normal/talking/torch), Walk (normal/**formal**), Jog, Sprint, Sitting (enter/idle/exit/talking), **Fixing Kneeling**, Crouch, Interact, Dance and others. **Pro only:** **Turn 90 L/R**, **Ground Sit enter/idle/exit**, Pickup Kneeling, Crying, Idle Look Around, Sitting Nodding. |
| **Quaternius Universal Animation Library 2** | Quaternius | **CC0** | `https://quaternius.itch.io/universal-animation-library-2`, **no login** | FBX, GLB | Standard 17 MB (42 free clips). Source $14.99+. | n/a | Same rig as UAL1 | n/a | Mostly combat, parkour and farming. Useful extras: **Idle_Fold Arms, Idle_Lantern, Yes/No, LayToIdle, Walk_Carry**. |
| **Quaternius Universal Base Characters** | Quaternius | **CC0** | `https://quaternius.itch.io/universal-base-characters`, **no login** | FBX, glTF, OBJ | Standard 122 MB (free). Source 600 MB ($19.99+). | about 13k tris each | **Yes**, the UAL rig | Base bodies only: underwear, no clothing. | The free tier has only 2 muscular "Superhero" bodies (male and female) and 5 hairstyles. The Regular and Teen proportions, which suit monks and lay people better, are in the paid Source tier. Realistic-stylised look. |
| **Quaternius Modular Character Outfits – Fantasy** | Quaternius | **CC0** | `https://quaternius.itch.io/modular-character-outfits-fantasy`, **no login** | FBX, glTF | Standard 280 MB (free). Source 724 MB ($20+). | game-ready, not listed | **Yes**, the UAL and Universal Base Characters rig | Free tier: Peasant and Ranger (tunic and trousers). Robed outfits such as Wizard and Noble are in the paid Source tier. | Peasant suits lay pilgrims. Its clothing topology is animation-friendly but has no skirt bones. |
| **KayKit Character Animations 1.1** + **KayKit Adventurers 2.0** | Kay Lousberg | **CC0** | `https://kaylousberg.itch.io/kaykit-character-animations` and `https://kaylousberg.itch.io/kaykit-adventurers`, **no login** | FBX, glTF/GLB | Animations free 14 MB (161 clips). Adventurers free 12 MB (5 characters). | Low-poly, one 1024 px gradient atlas | **Yes**, `Rig_Medium` is shared by all KayKit characters, plus a separate `Rig_Large`. | The Adventurers Mage wears a robe or skirt. No skirt bones. | Chibi style. The "Simulation" set has **waving, cheering, sitting, lying down**. Big heads and short limbs make prostrations and seated meditation look odd. |
| **RobotExpressive** (three.js example) | Tomás Laulhé (Quaternius); modified by Don McCurdy | **CC0 1.0** | `https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/models/gltf/RobotExpressive/RobotExpressive.glb`, **no login** | GLB | 464 KB | Low | Its own robot skeleton | None | A robot, not a person. 14 clips including Wave, Yes, No, Sitting, Standing, Idle, Walking, Running. Good only as a pipeline test. |
| **100Avatars R1–R3** (Open Source Avatars registry) | Polygonal Mind / ToxSam | **CC0** (per `projects.json`) | Arweave URLs in `github.com/ToxSam/open-source-avatars/data/avatars/*.json`, **no login** | VRM (glTF-based), FBX | about 0.3–2 MB each | Low | VRM humanoid standard. Retarget through `@pixiv/three-vrm`. | VRM spring bones could animate robes. | Novelty characters (fruit, monsters, mascots). Only "BaoSamurai" is remotely relevant, so none look like monks. A fallback only. |
| **Quaternius "Animated Wizard" (Poly Pizza re-host)** | Quaternius | Poly Pizza lists it as **CC BY 3.0**, although Quaternius' original packs are CC0 | `https://static.poly.pizza/7e77cc7a-eff9-4ebd-90a6-7728c265b092.glb` (1.17 MB, verified), **no login** | GLB | 1.17 MB | Low (about 2.5k shown on the page) | Its own legacy skeleton, not the UAL rig | It has a long robe, but the robe is rigid. | An older 2019-era style. Credit it if used: "Animated Wizard by Quaternius (https://poly.pizza/m/kttbFvCl2C), CC BY 3.0". |
| Kenney Animated Characters | Kenney | CC0 | kenney.nl download button, no login | FBX/GLB | n/a | Very low | Shared within a pack | None | Simple blocky style. The page lists no clip list. Not recommended. |

**Licence watch: Quaternius.** Quaternius published a new **Quaternius Asset License (QAL) v1.0** on 2026-08-28, at `https://quaternius.com/license.html`.
- **What QAL does:** it allows commercial use and needs no credit. It forbids redistributing the assets as assets.
- **Which packs it covers:** it applies to new releases, and is shown on the Bestiary pack. Every pack listed above still says **CC0** on its page as of 2026-11-03. QAL §7 says licence changes are not retroactive.
- **What to do:** download now and keep the itch.io page snapshot and `License.txt` with the files.
- **Mesh2Motion:** its copies are already published as CC0 in a public repo.

### 1.2 Recommendation (primary pick)

**Primary pick: adopt the Mesh2Motion human skeleton and its CC0 clip library as our single canonical rig.**
- Use Quaternius UAL1 Standard (CC0) as its upstream source and for any missing clips.
- Optionally buy UAL1 Pro ($9.99, still CC0) to get Turn 90 L/R and Ground Sit enter/exit.

**Why this pick:**
1. **One skeleton drives everyone.** Mesh2Motion clips, Quaternius UAL1/UAL2, Universal Base Characters and Modular Outfits all use (or were authored on) the same UE-mannequin-style humanoid. A monk, a nun and a lay visitor can all share one set of `AnimationClip`s. Three.js binds tracks by bone name, so no runtime retargeting is needed.
   - **To check on first download:** confirm the Quaternius v2 bone names match Mesh2Motion's `pelvis/spine_01/...` list. Mesh2Motion's base mesh is credited to Quaternius.
2. **It covers the devotional set better than anything else that is CC0.** Mesh2Motion has Meditate, Sit_Ground_Idle, Fixing_Kneeling, Kneeling Tired, Sitting_*, Greeting, Head Nod, Walk_Formal, Idle_Subtle and Idle_Listening.
3. **It is the smallest download.** Each clip is its own GLB of about 60 KB, so a room loads only the clips it uses. Quaternius ships one large GLB per pack.
4. **It needs no login and has unambiguous CC0** in a public Git repo, which also makes it reproducible from scripts.
5. **The web auto-rigger fits custom meshes to this skeleton.** Mesh2Motion can fit a robed monk mesh (modelled in Blender, or adapted from the current procedural avatar) to this exact skeleton and export a GLB with the chosen clips.

**Style choice:**
- **Stylised (recommended):** model bodies and robes in-house and auto-rig them with Mesh2Motion. Use the free Quaternius Peasant outfit for lay pilgrims.
- **More realistic:** Quaternius Universal Base Characters (Regular/Teen in the Source tier) plus Modular Outfits.
- **Chibi:** KayKit is the only coherent CC0 chibi family. It has a different skeleton (`Rig_Medium`), so it would need its own clip set.

### 1.3 Animation coverage on the recommended rig

Mesh2Motion clip URLs follow the pattern `https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/main/static/assets/human/animations/<file>`. All are CC0 and need no login.

| Need | Clip (file) | Loops? (manifest) | Duration | Notes |
|---|---|---|---|---|
| Idle | `idle-a.glb`, `idle-subtle.glb`, `idle-listening.glb` | subtle and listening: no | 2.54 s, 1.63 s | Several idles to vary the residents. |
| Walk | `walk.glb`, **`walk-formal.glb`** (procession), `walk-relaxed.glb` | yes | 1.63 s, 1.63 s, 1.38 s | Walk_Formal suits monks. |
| Run | `jog.glb`, `sprint.glb` | yes | 1.17 s | |
| Turn | none in Mesh2Motion. `strafe-left.glb` and `strafe-right.glb` exist. | | | **Gap.** Buy UAL1 Pro (Turn 90 L/R) or rotate the root procedurally while blending in a few walk frames. |
| Sit on a chair or bench | `sitting-enter.glb`, `sitting-idle.glb`, `sitting-exit.glb` | idle loops | 1.63 s / 2.04 s / 1.29 s | Exit doubles as stand-up. |
| Sit on the floor / meditate | **`meditate.glb`**, **`sit-ground-idle.glb`** | sit-ground: yes | 1.42 s, 2.96 s | Check visually whether Meditate is cross-legged. Ground Sit enter/exit is only in UAL1 Pro. |
| Kneel | **`fixing-kneeling.glb`**, `tired-kneeling.glb` | fixing: yes | 6.46 s, 0.75 s | Fixing_Kneeling has hand-work motion. Freeze a frame for a still kneel. |
| Stand up | `sitting-exit.glb`, `laytoidle.glb` | no | 1.29 s, 1.54 s | |
| Wave / greet | **`greeting.glb`** | no | 4.75 s | Check whether it is a wave. KayKit and RobotExpressive also have Wave. |
| Bow | **none found under CC0/CC-BY.** (`bow.glb` in Mesh2Motion is an archery bow.) | | | **Gap.** See below. |
| Prostration (full Tibetan or five-point) | **none found** | | | **Gap.** See below. |
| Extras | `head-nod.glb`, `clapping.glb`, `yes.glb`, `idle-foldarms.glb`, `idle-lantern.glb` (procession lamp), `walk-carry.glb` | | | |

**Filling the bow and prostration gap.** `src/avatar.ts` already authors `bow` poses procedurally (BowStyle `tibetan-prostration | five-point | east-asian-bow | standing-bow`, plus GASSHO and CROWN/THROAT hand positions). The cheapest route is to keep that authoring code and swap its 19 bone names for the canonical names. The mapping is:

- `hips`→`pelvis`
- `spine`→`spine_01`
- `chest`→`spine_03`
- `neck`→`neck_01`
- `head`→`head`
- `shoulderL`→`clavicle_l`
- `upperArmL`→`upperarm_l`
- `foreArmL`→`lowerarm_l`
- `handL`→`hand_l`
- `thighL`→`thigh_l`
- `shinL`→`calf_l`
- `footL`→`foot_l`
- The right side mirrors these.

The procedural bows and prostrations then become ordinary `AnimationClip`s on the shared skeleton. You will need to re-tune the Euler offsets for the new bind pose.

**Sources checked for bows and prostrations, none usable:**
- **Mixamo:** has bows and kneels, but uses Adobe terms, needs an Adobe login, and is not CC.
- **CMU mocap:** custom terms, contradicted by mirrors that label it CC BY-NC.
- **Bandai Namco motion dataset:** CC BY-NC.

### 1.4 Retargeting in Three.js r180

**1. Preferred: match the skeleton and avoid retargeting.**
- Rig every avatar mesh to the canonical skeleton, either in the Mesh2Motion web rigger or in Blender.
- Load clips with `GLTFLoader` and play them with one `AnimationMixer` per avatar instance.
- Clone skinned avatars with `SkeletonUtils.clone()` (from `three/examples/jsm/utils/SkeletonUtils.js`). A plain `.clone()` shares the skeleton between instances.
- Load each clip GLB once and share the `AnimationClip` objects across all players.

**2. When a clip comes from a different skeleton** (KayKit `Rig_Medium`, a VRM, or the current procedural rig): use `SkeletonUtils.retargetClip(target, source, clip, options)`.

Checked against the r180 source:
- `target`: the SkinnedMesh or Object3D that will play the clip.
- `source`: an object whose `.skeleton` has the clip applied.
- `options.names` maps **target bone name → source bone name**. You can pass `options.getBoneName(bone)` instead.
- `options.hip` is the source hip bone name; it defaults to `'hip'`, so set it to `'pelvis'`.
- Other options: `options.fps`, `options.trim`, `options.useFirstFramePosition`, `options.preserveBonePositions` (default true), `options.localOffsets` (per-bone `Matrix4`, to correct T-pose vs A-pose differences) and `options.hipInfluence` / `options.scale`.
- It bakes a new clip frame by frame through a temporary mixer.
- **Do this at build time, not on the client.** Write a small Node script (like `scripts/statues/build.ts`) that bakes the retargeted clips and writes them with `GLTFExporter`. Runtime retargeting costs CPU and needs both skeletons loaded.

Sketch (build-time):

```ts
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
const names = { pelvis: 'hips', spine_01: 'spine', spine_03: 'chest', neck_01: 'neck', head: 'head',
  clavicle_l: 'shoulderL', upperarm_l: 'upperArmL', lowerarm_l: 'foreArmL', hand_l: 'handL',
  thigh_l: 'thighL', calf_l: 'shinL', foot_l: 'footL', /* ...right side... */ };
const baked = SkeletonUtils.retargetClip(targetSkinnedMesh, sourceSkinnedMesh, sourceClip,
  { names, hip: 'hips', useFirstFramePosition: true, fps: 30 });
```

Here the target is the canonical rig and the source is the old procedural rig. Swap the map direction when going the other way.

**3. Blender alternative.** Import both armatures and use a retargeting add-on (Rokoko, or the free "Auto-Rig Pro: Remap"). Bake to the canonical rig and export glTF. This gives better control over foot contacts.

### 1.5 Robes on a standard skeleton

None of the CC0 rigs have skirt bones or cloth. For monastic robes (zen, kasaya, Tibetan shamthab skirt, Theravada civara):
- **Skin long skirts** to `pelvis` plus `thigh_l`/`thigh_r` with heavily blended weights (about 50/50 at the hem centre). This is what `src/avatar.ts` does today. It works for walking and standing, but the robe pinches when kneeling or sitting cross-legged.
- **Add 4 helper bones** (front/back/left/right skirt) as children of `pelvis` after import. Drive them each frame from the thigh rotations (for example front = average thigh pitch × 0.6). This is cheap, deterministic, and needs nothing over the network.
- **For seated poses** (meditate, sit-ground, kneel), swap in a separate "seated robe" mesh, or use a morph target on the skirt, rather than fighting the skinning.
- **VRM spring bones** (`@pixiv/three-vrm`) give secondary motion to sleeves and the shawl, but only if the project moves to VRM avatars. That is not recommended now.

### 1.6 Avatar sources excluded

| Source | Why excluded |
|---|---|
| Mixamo (Adobe) | Adobe terms, not CC. Needs an Adobe login. Raw files cannot be redistributed. |
| Ready Player Me | The service shut down on 2026-01-31 after Netflix acquired it. No new avatars can be made. |
| Avaturn, Avatar SDK / MetaPerson, Genies | Commercial or proprietary SDKs, not CC. |
| VRoid Hub sample models | VRoid-specific terms, not CC0/CC BY. (Avatars you make yourself in VRoid Studio are yours, but that is a tool, not an asset source.) |
| CMU Graphics Lab mocap | Custom "may include in products" notice. The 4TU FBX mirror says CC BY-NC 4.0. Unclear, so excluded. |
| Mesh2Motion variations "Sophia" | CC-SA 4.0 (ShareAlike). |
| Mesh2Motion variations "Sintel", "Jay", "Bunny" | Blender Studio, CC BY. Not needed, and they would need credit. |

---

## 2. Buddha statue scans and models

**General notes:**
- Every Sketchfab item downloads through the "Download 3D Model" button, which needs **a free Sketchfab login**. There is no anonymous direct URL. Formats offered are glTF, GLB, USDZ and the original upload.
- Sketchfab "CC Attribution" means CC BY 4.0.

**The main web problem is texture size, not polygons:**
- Cleveland uploads carry three **8192 px** maps (GLB 90–360 MB).
- Mia uploads carry **4096 px** maps (GLB 22–32 MB).
- Standard recipe:
  ```
  gltf-transform resize --width 2048 --height 2048
  gltf-transform webp   (or etc1s/uastc for KTX2)
  gltf-transform simplify --ratio <r> --error 0.001   (only above about 150k tris)
  gltf-transform meshopt
  ```
- Target: 50–150k tris and about 3–8 MB per main image.

### 2.1 Pala, seated Buddha in bhumisparsha (Bodh Gaya style)

| Name | Author | Licence | Page / download (login) | Formats & size | Polycount | Decimate? | Quality note |
|---|---|---|---|---|---|---|---|
| **1935.146 Buddha Calling on Earth to Witness** | Cleveland Museum of Art | **CC0** (Sketchfab, and `share_license_status: CC0` in the CMA API) | https://sketchfab.com/3d-models/1935146-buddha-calling-on-earth-to-witness-e33fc223cece454bb85f7c8756c3ac37, Sketchfab login. Record: https://clevelandart.org/art/1935.146 | GLB 118 MB, glTF 117 MB, USDZ 9.8 MB, source 166 MB | 69,324 tris / 34,662 verts. 3 × 8K maps. | No. Downsize the textures to 2K. | **Best pick.** A genuine 9th-c. Pala chlorite stele from Bihar, with a clear bhumisparsha mudra, bodhi-leaf crown and attendants. It is dark stone with a back slab, not a free-standing figure. |
| Sandstone Buddha from Burma at Ashmolean Museum | Nitesh Bhatia (niteshbhatia008) | **CC BY 4.0** | https://sketchfab.com/3d-models/sandstone-buddha-from-burma-at-ashmolean-museum-1a91e0af5d65424998dbf5d950109cea, Sketchfab login | GLB 2.3 MB | 23,972 tris. One 4K map. | No | An Arakan stele (1200–1400) in bhumisparsha, close to Pala style. A low-fidelity phone scan with broken edges. |

No other acceptable Indian bhumisparsha model was found.

### 2.2 Tibetan crowned Shakyamuni (Jowo) or Tibetan gilt bronze

| Name | Author | Licence | Page / download (login) | Formats & size | Polycount | Decimate? | Quality note |
|---|---|---|---|---|---|---|---|
| **Gilded Brass Buddha Sculpture with 3DF Zephyr** | JAdpp | **CC BY 4.0** | https://sketchfab.com/3d-models/gilded-brass-buddha-sculpture-with-3df-zephyr-db03da0457ff450481355a5dfab66d2a, Sketchfab login | GLB 161.5 MB, glTF 135 MB, USDZ 59 MB | 2,098,327 tris. 6 × 8K maps. | **Yes**, to about 100k, plus texture downsizing | V&A O74255, a gilded-copper Shakyamuni in bhumisparsha on a double lotus with a Tibetan inscription. The best Tibetan iconographic match. It is a student scan with **holes on the top of the head, the left side and the back**, and has no crown (not Jowo). |
| **Tibetan Amoghasiddhi Buddha, 13th C CE** | Minneapolis Institute of Art | **CC0** (Mia also lists it as Public Domain) | https://sketchfab.com/3d-models/tibetan-amoghasiddhi-buddha-13th-c-ce-a2c46e73a9294f32ab12520c6b87a079, Sketchfab login | GLB 32.4 MB, USDZ 6.1 MB | 64,000 tris. 3–4 × 4K maps. | No. Downsize the textures. | An excellent scan of a **crowned, jewelled** Tibetan gilt brass Buddha (Mia 31182). It is in abhaya mudra (Amoghasiddhi), not Shakyamuni, but it is the closest to a Jowo look. |
| Buddha Statue | Science Museum Group | **CC BY 4.0** | https://sketchfab.com/3d-models/buddha-statue-93c2236f3f0a4ea1a76cfa0fca24c581, Sketchfab login | GLB 8.2 MB | 116,805 tris. 2 × 2K maps. | No | A modern (2018) Tibetan-style Medicine Buddha. Clean and complete, but iconographically a Medicine Buddha (holding a bowl). |

No Jowo-style crowned Shakyamuni and no acceptable Nepalese gilt bronze was found.

### 2.3 Thai: Sukhothai or Phra Buddha Chinnarat

**No seated Sukhothai or Chinnarat-style model exists under CC0 or CC BY.** The best substitutes:

| Name | Author | Licence | Page / download (login) | Formats & size | Polycount | Decimate? | Quality note |
|---|---|---|---|---|---|---|---|
| **Seated Buddha, date unknown** | Minneapolis Institute of Art | **CC0** | https://sketchfab.com/3d-models/seated-buddha-date-unknown-c1c3d5a4878c42778eceded83673dea7, Sketchfab login | GLB 27.2 MB, USDZ 5.7 MB | 64,000 tris. 4 × 4K maps. | No. Downsize the textures. | Mia 12487, "Buddha subduing Mara": a late-19th-c. Thai (Rattanakosin) gilt bronze in **bhumisparsha** on a tiered throne. Complete and good. The closest to Chinnarat iconography. |
| Thai Buddha | laurashea | **CC BY 4.0** | https://sketchfab.com/3d-models/thai-buddha-cba029e262bd4f22a7ee4fcf064e22ee, Sketchfab login | GLB 284 MB | 6,000,000 tris. One 8K map. | **Yes, heavily** | A Sukhothai or Ayutthaya-period bronze from Sawankhalok (Mount Holyoke). It is a **Naga-protected Buddha in dhyana**, not bhumisparsha, and only 24 cm tall. |
| Enshrined Buddha, c. 1850 CE | Minneapolis Institute of Art | **CC0** | https://sketchfab.com/3d-models/enshrined-buddha-c-1850-ce-e6a846a1ab9149d3a0614c7b82bcc8eb, Sketchfab login | GLB 29 MB | 54,596 tris. PBR at 4K. | No | A Burmese Mandalay-style Buddha in bhumisparsha, lacquered and gilt. A Theravada fallback. |
| Walking Buddha | Minneapolis Institute of Art | **CC0** | https://sketchfab.com/3d-models/walking-buddha-de43d1860fe24ad0878c357d253df58b, Sketchfab login | GLB 30 MB | about 53k tris | No | Sukhothai type, but **walking**. Good as a secondary image. |

### 2.4 East Asian seated Vairocana or Amitabha

| Name | Author | Licence | Page / download (login) | Formats & size | Polycount | Decimate? | Quality note |
|---|---|---|---|---|---|---|---|
| **Rosehaugh Buddha** | Andy's Aerial Archaeology | **CC BY 4.0** | https://sketchfab.com/3d-models/rosehaugh-buddha-d433f8803f58446586c1ffe8b590e17d, Sketchfab login | GLB 17.7 MB, USDZ 14.2 MB | 400,000 tris. One 4K map. | **Yes**, to about 100k | National Museums Scotland A.1954.42: a Japanese bronze **Amida in the meditation mudra** with mandorla and pedestal, late 19th c. Complete. |
| Stone Seated Vairocana Buddha Statue | KOREA HERITAGE SERVICE [KHS] | **CC BY 4.0** | https://sketchfab.com/3d-models/stone-seated-vairocana-buddha-statue-f04d07e525f74f76810143f7040625a7, Sketchfab login | GLB 5.8 MB | 23,856 tris. 1K textures. | No (web-ready) | Late Unified Silla stone **Vairocana** with crown, halo and octagonal pedestal. The thumbnail was only a placeholder, so the **mudra and completeness are not visually confirmed**. |
| **1918.501 Amitabha Triad** | Cleveland Museum of Art | **CC0** | https://sketchfab.com/3d-models/1918501-amitabha-triad-40c2bc8689404868888c6dc0bd7ea2a3, Sketchfab login | GLB 92 MB | 82,583 tris. 8K maps. | No. Downsize the textures. | A Korean Joseon 15th-c. bronze: a seated Amitabha flanked by Ksitigarbha and Avalokiteshvara. Use as a group or crop. |
| 1973.85.a Seated Buddha (sculpture) | Cleveland Museum of Art | **CC0** | https://sketchfab.com/3d-models/197385a-seated-buddha-sculpture-c9e0d5000ca345ea9dacf35f25db57b2, Sketchfab login | GLB 137 MB | 150,622 tris | Optional | Heian gilt wood, possibly Yakushi or Amida, right hand in abhaya. The full set with mandorla is 407k tris and 362 MB. |
| Kamakura Buddha Statue | YuneeNZ | **CC BY 4.0** | https://sketchfab.com/3d-models/kamakura-buddha-statue-fc1d6ec8a19a4c428ecd8d65b5126dec, Sketchfab login | GLB 7 MB | 15,924 tris. 2K PBR. | No | **Hand-modelled** after the Kamakura Daibutsu (Amida, meditation mudra), not a scan. The lightest option. |

### 2.5 Fallbacks with other iconography (licences verified)

**Smithsonian "Cosmic Buddha"** (Freer Gallery)
- **What it is:** a 6th-c. Chinese Vairocana, standing, headless and handless.
- **Licence:** **CC0**.
- **Download:** direct, **no login**. Draco web GLB, 1.45 MB: `https://3d-api.si.edu/content/document/3d_package:d8c62be8-4ebc-11ea-b77f-2e728ce88125/cosmic-buddha-100k-2048_std_draco.glb`
- **Other sizes:** a 150k GLB of 10.7 MB, and a full-resolution zip of 1.57 GB.

**Smithsonian "Western Paradise of the Buddha Amitabha"** (Xiangtangshan relief, F1921.2)
- **Licence:** **CC0**.
- **Download:** direct, no login. Draco GLB, 2.5 MB: `https://3d-api.si.edu/content/document/3d_package:727b4bb6-ce87-40de-b07d-d492c1404221/resources/f1921_2-high_res-100k-2048_std_draco.glb`
- **Use:** a good relief for a wall.

**Other CC0:**
- danielpett "Seated figure of Buddha": Tang marble, Freer F1917.243, 300k tris, GLB 15.8 MB. Painted, arms damaged.
- Mia "3rd C CE Gandhara Buddha".
- Mia "Chinese Amoghasiddhi": a Yongle-era seated wood Buddha.

**Other CC BY:**
- Harvard Art Museums "1943.53.22": a Tang Tianlongshan seated Buddha, 1.8M tris, forearms missing.
- dluo "Gilt bronze statuette of Sakyamuni Buddha": 10th-c. Chinese, preaching mudra, 191k tris, GLB 19 MB.
- KHS "Gilt-bronze Seated Buddha": Korean, 45k tris, GLB 7 MB.

### 2.6 Statues rejected or blocked

| Item | Reason |
|---|---|
| British Museum official Sketchfab ("Buddha Preaching", Amaravati reliefs) | CC BY-NC-SA |
| Mia "Walking Shakyamuni Buddha, 15th C", "Stele of Maitreya", "Stele with Buddha and two Bodhisattvas", second "Enshrined Buddha", "Bodhisattva, one of a pair" | CC BY-SA (ShareAlike) |
| Mia "Dragon God with hidden Buddha" | Sketchfab Free Standard licence |
| danielpett "Buddha" (Gupta head) | Tagged CC0, but the description embeds a CC BY-NC-SA badge. Contradictory, so treated as unclear. |
| Asian Art Museum SF; nebulousflynn "Figure of Buddha, V&A", "Welcoming Descent of Amitabha" | Not downloadable |
| khoicyno2345 "Guimet-buddha-maravijaya" (CC BY) | The source of the scan is unclear |
| Michaels3dstuff "Amida Buddha statue" | A point cloud with 0 faces |
| sittipol_a "Golden Buddha…" series | AI-generated (Meshy) |
| Chawalit "Buddha Statue" (Kamphaeng Phet); michelle_feng_art "Thai Buddha Statue" | Head ruined or deformed, untextured |
| MyMiniFactory / Scan the World (e.g. #41685 "Buddha in the earth-touching gesture", #27157 National Museum of Denmark) | The pages return 403 to automated checks, so the licence could not be verified. One Scan the World Medicine Buddha appears as CC BY-NC-SA. **Check by hand in a browser.** These could unlock more Pala and Thai options. |
| Thingiverse, Printables | 403, licence unverified |
| Poly Pizza | No Buddha models |

---

## 3. CC0 PBR textures and HDRIs

**Licences and downloads:**
- **Poly Haven** (`polyhaven.com`, **CC0**, no login). Per-map JPG URLs follow the pattern `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/<res>/<id>/<id>_<map>_<res>.jpg`, with `<map>` one of `diff`, `nor_gl`, `arm`, `rough`, `ao`, `disp`. A glTF bundle is also offered.
- **ambientCG** (`ambientcg.com`, **CC0**, no login). Zip URL pattern: `https://ambientcg.com/get?file=<AssetId>_<1K|2K>-JPG.zip`. Spot-checked: Metal048A_1K returned 200 at 2.6 MB.
- The sizes listed below are the full download, which includes extra maps. The web set is about 60% of the Poly Haven total.
- For the web, ship 1K or 2K, re-encode to KTX2 or WebP, and keep only the colour, normal and ARM maps.

| Material | Pick | Source / licence | 1K URL (colour map, or zip) | 2K URL | Size (1K / 2K, all maps) | Note |
|---|---|---|---|---|---|---|
| **Gilded gold** | Metal 048 A (clean gold) | ambientCG, CC0 | https://ambientcg.com/get?file=Metal048A_1K-JPG.zip | https://ambientcg.com/get?file=Metal048A_2K-JPG.zip | 2.6 / 6.4 MB | Smooth gold for statue skin. |
| | Metal 048 C (impure / rough gold) | ambientCG, CC0 | https://ambientcg.com/get?file=Metal048C_1K-JPG.zip | https://ambientcg.com/get?file=Metal048C_2K-JPG.zip | 4.5 / 13.0 MB | Worn gilding for old bronzes and rails. Metal 042 A (shiny gold, 3.5 / 9.4 MB) is an alternative. |
| **Weathered sandstone** | Red Sandstone Wall | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/red_sandstone_wall/red_sandstone_wall_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/red_sandstone_wall/red_sandstone_wall_diff_2k.jpg | 3.0 / 11.2 MB | Crumbling red sandstone for Bodh Gaya and Indian railings. |
| | Sandstone Blocks 05 | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/sandstone_blocks_05/sandstone_blocks_05_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/sandstone_blocks_05/sandstone_blocks_05_diff_2k.jpg | 2.4 / 8.3 MB | Buff ashlar blocks. Large Sandstone Blocks 01 (2.2 / 8.7 MB) is an alternative. |
| **Granite** | Granite Tile | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/granite_tile/granite_tile_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/granite_tile/granite_tile_diff_2k.jpg | 3.1 / 12.4 MB | Polished floor tiles. |
| | Granite Wall | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/granite_wall/granite_wall_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/granite_wall/granite_wall_diff_2k.jpg | 3.4 / 12.7 MB | Rough granite masonry for plinths and stupa bases. |
| **Red lacquer wood** | Lacquered Cherry Wood | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/lacquered_cherry_wood/lacquered_cherry_wood_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/lacquered_cherry_wood/lacquered_cherry_wood_diff_2k.jpg (HEAD verified, 2.69 MB) | 2.1 / 9.6 MB | Glossy and reflective. Tint toward vermilion for East Asian pillars. |
| | Painted Wood 003 (old red paint) | ambientCG, CC0 | https://ambientcg.com/get?file=PaintedWood003_1K-JPG.zip | https://ambientcg.com/get?file=PaintedWood003_2K-JPG.zip | 7.9 / 28.9 MB | Weathered red paint for Tibetan window frames and doors. |
| **Plaster** | Red Plaster Weathered | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/red_plaster_weathered/red_plaster_weathered_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/red_plaster_weathered/red_plaster_weathered_diff_2k.jpg | 3.0 / 13.3 MB | Tibetan maroon walls. Tint for ochre or white-washed walls. |
| | White Plaster 02 | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/white_plaster_02/white_plaster_02_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/white_plaster_02/white_plaster_02_diff_2k.jpg | 1.9 / 9.5 MB | Clean white-wash for Thai vihara walls and Tibetan white walls. Yellow Plaster (1.4 / 5.2 MB) is an alternative. |
| **Terracotta roof tiles** | Clay Roof Tiles 02 | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/clay_roof_tiles_02/clay_roof_tiles_02_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/clay_roof_tiles_02/clay_roof_tiles_02_diff_2k.jpg | 3.1 / 11.4 MB | Barrel (Spanish-type) tiles. Reads close to East Asian round tiles. |
| | Roofing Tiles 013 A | ambientCG, CC0 | https://ambientcg.com/get?file=RoofingTiles013A_1K-JPG.zip (HEAD verified, 4.35 MB) | https://ambientcg.com/get?file=RoofingTiles013A_2K-JPG.zip | 4.3 / 11.9 MB | Clean clay tiling. |
| **Glazed roof tiles** | **No CC0 glazed tile set was found** on either site. | — | Use Clay Roof Tiles 02 / Roofing Tiles 013 A geometry, tinted green or yellow (Chinese/Korean) or orange (Thai), with roughness around 0.25 and a clearcoat (`MeshPhysicalMaterial.clearcoat`). | — | — | A procedural tint is lighter than another texture. |
| **Terracotta (floor)** | Terracotta Floor Tiles | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/terracotta_floor_tiles/terracotta_floor_tiles_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/terracotta_floor_tiles/terracotta_floor_tiles_diff_2k.jpg | 2.9 / 12.1 MB | Courtyard paving. |
| **Marble** | Marble 01 | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/marble_01/marble_01_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/marble_01/marble_01_diff_2k.jpg | 0.6 / 2.4 MB | Very light. Smooth white marble tiles. |
| | Marble 021 (bright, reflective) | ambientCG, CC0 | https://ambientcg.com/get?file=Marble021_1K-JPG.zip | https://ambientcg.com/get?file=Marble021_2K-JPG.zip | 4.1 / 11.4 MB | Thai ubosot floors and Chinnarat-style hall floors. Poly Haven Marble Tiles (3.6 / 12.8 MB) is an alternative. |
| **Brocade / textile** | Quatrefoil Jacquard Fabric (tagged brocade, damask, red) | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/quatrefoil_jacquard_fabric/quatrefoil_jacquard_fabric_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/quatrefoil_jacquard_fabric/quatrefoil_jacquard_fabric_diff_2k.jpg | 4.3 / 17.9 MB | Includes a metal map, so it reads as gold thread. For banners, altar cloths and thangka borders. |
| | Floral Jacquard | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/floral_jacquard/floral_jacquard_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/floral_jacquard/floral_jacquard_diff_2k.jpg | 6.8 / 29.3 MB | Dark floral brocade. Crepe Satin (gold sheen) and Velour Velvet (cushions) are alternatives. |
| **Grass** | Sparse Grass | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/sparse_grass/sparse_grass_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/sparse_grass/sparse_grass_diff_2k.jpg | 4.5 / 17.5 MB | Ground with soil showing. Tiles well. |
| | Grass 004 | ambientCG, CC0 | https://ambientcg.com/get?file=Grass004_1K-JPG.zip | https://ambientcg.com/get?file=Grass004_2K-JPG.zip | 11.0 / 39.9 MB | Dense lawn. The zip is heavy because it includes displacement. Leafy Grass (Poly Haven) is an alternative. |
| **Gravel** | Gravel Floor 02 | Poly Haven, CC0 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/gravel_floor_02/gravel_floor_02_diff_1k.jpg | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/gravel_floor_02/gravel_floor_02_diff_2k.jpg | 5.3 / 19.7 MB | Grey driveway gravel. |
| | Gravel 023 (bright, white) | ambientCG, CC0 | https://ambientcg.com/get?file=Gravel023_1K-JPG.zip | https://ambientcg.com/get?file=Gravel023_2K-JPG.zip | 9.9 / 31.4 MB | Light gravel for a Zen karesansui. There is no raked-pattern texture, so model the rake grooves as a normal map or geometry. |

### 3.1 HDRIs (Poly Haven, CC0, no login)

| HDRI | Mood / use | 1K | 2K |
|---|---|---|---|
| **chinese_garden** | Chinese garden, clear morning/afternoon. East Asian courtyards. | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/chinese_garden_1k.hdr (1.8 MB, HEAD verified) | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/chinese_garden_2k.hdr (7.0 MB) |
| **ninomaru_teien** | Japanese garden (Nijo), low sun, soft. Zen and Mahayana rooms. | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/ninomaru_teien_1k.hdr (1.9 MB) | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/ninomaru_teien_2k.hdr (7.4 MB) |
| xiequ_yuan | Summer Palace garden, Beijing, midday. | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/xiequ_yuan_1k.hdr (1.6 MB) | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/xiequ_yuan_2k.hdr (6.3 MB) |
| **drakensberg_solitary_mountain** | Clear mountain sky. A stand-in for a Himalayan site; no Himalayan HDRI exists on Poly Haven. | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/drakensberg_solitary_mountain_1k.hdr (1.5 MB) | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/drakensberg_solitary_mountain_2k.hdr (6.1 MB) |
| **kloofendal_48d_partly_cloudy_puresky** | Neutral sky with no ground. The safest general sky dome. | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr (1.4 MB) | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloofendal_48d_partly_cloudy_puresky_2k.hdr (5.5 MB) |
| kiara_1_dawn | Warm dawn, for the dawn service. | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kiara_1_dawn_1k.hdr (1.5 MB) | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kiara_1_dawn_2k.hdr (6.1 MB) |
| fouriesburg_mountain_cloudy | Overcast, low contrast, for monsoon weather. | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/fouriesburg_mountain_cloudy_1k.hdr (1.6 MB) | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/fouriesburg_mountain_cloudy_2k.hdr (6.1 MB) |
| clarens_night_02 | Night sky, for the evening service and lamps. | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/clarens_night_02_1k.hdr (1.7 MB) | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/clarens_night_02_2k.hdr (6.7 MB) |
| historic_cloister_passage | Indoor stone cloister with daylight. Lighting for interior halls. | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/historic_cloister_passage_1k.hdr (1.7 MB) | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/historic_cloister_passage_2k.hdr (6.6 MB) |

Use the 1K `.hdr` for `scene.environment` (PMREM). For a visible sky backdrop use 2K, or bake it to a smaller LDR or KTX2.

---

## 4. Audio (CC0 / CC BY)

**How audio was checked:**
- Licence, duration, format, sample rate and size come from each Freesound page, the Commons file API and wikitext, or the archive.org `/metadata/` record. A sample of URLs was HEAD-checked (200).
- **Nothing was listened to.** The quality notes come from the uploaders' descriptions, so every pick still needs a listening pass.

**Downloads and logins:**
- **Freesound originals need a free Freesound login.** The "HQ preview" MP3s (`cdn.freesound.org/previews/...-hq.mp3`, about 190 kbps) are under the same licence and need no login, but they are lossy.
- Commons and archive.org files download directly, with no login.

**Licence labels:** "PDM" is a recordist's own Public Domain Mark on archive.org (radio aporee). It is acceptable, but it is a mark, not a formal CC0 waiver.

**Loop column:**
- "Yes, with crossfade": a drone or ambience that loops after a 1–2 s equal-power crossfade.
- "One-shot": a single strike, played on demand.

### 4.1 Tibetan monastic chanting (Gyuto-style)

| Title | Author | Licence | Page | Download (login?) | Format · SR · duration · size | Loop | Note |
|---|---|---|---|---|---|---|---|
| **Samuel Corwin – 09 – Tibetan Monks Chanting at Gyuto Branch Monastery House No 422 McLeod Ganj** | Samuel Corwin | **CC BY 4.0** | https://commons.wikimedia.org/wiki/File:Samuel_Corwin_-_09_-_Tibetan_Monks_Chanting_at_Gyuto_Branch_Monastery_House_No_422_McLeod_Ganj.ogg | https://upload.wikimedia.org/wikipedia/commons/7/72/Samuel_Corwin_-_09_-_Tibetan_Monks_Chanting_at_Gyuto_Branch_Monastery_House_No_422_McLeod_Ganj.ogg (no login) | Ogg · 44.1 kHz · 4:48 · 4.48 MB | Yes, with crossfade | The only genuine Gyuto-lineage recording found. A lossy field recording. |
| ganze gompa monks | djgriffin | **CC0** | https://freesound.org/people/djgriffin/sounds/98845/ | Login. Preview: https://cdn.freesound.org/previews/98/98845_45941-hq.mp3 | WAV · 44.1/16 · 5:32 · 55.8 MB | Yes, with crossfade | Morning puja inside Ganze Gompa, Kham. The best CC0 option. |
| Ganze Gompa monks puja | djgriffin | CC BY 4.0 | https://freesound.org/people/djgriffin/sounds/98844/ | Login. Preview: https://cdn.freesound.org/previews/98/98844_45941-hq.mp3 | WAV · 44.1/16 · 3:37 · 36.5 MB | Yes | Same session. |

**More options:**
- Lenguaverde "Buddhist Monks calling to prayer" (Labrang): CC0, 5:02, https://freesound.org/people/Lenguaverde/sounds/401910/. Has Mandarin-speaking visitors in the background.
- djgriffin Tibetan nuns monlam, Bodh Gaya: CC0, 5:30, https://freesound.org/people/djgriffin/sounds/98846/
- lepolainyann Yunnan chant: CC0, 96/24, 1:50, https://freesound.org/people/lepolainyann/sounds/149093/

### 4.2 Dungchen (long horn)

| Title | Author | Licence | Page | Download | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|---|
| **Dungchen Festival Horns – Bhutan** | RTB45 | CC BY 4.0 | https://freesound.org/people/RTB45/sounds/192680/ | Login. Preview: https://cdn.freesound.org/previews/192/192680_2409224-hq.mp3 | WAV 44.1/16 · 3:42 · 37.3 MB | Partly: cut out the sustained blasts | Real dungchen at a Bumthang tsechu (festival). Crowd ambience. |
| buddhism_ceremony.wav | isohoo | **CC0** | https://freesound.org/people/isohoo/sounds/502672/ | Login. Preview: https://cdn.freesound.org/previews/502/502672_10829062-hq.mp3 | WAV 44.1/24 · 5:05 · 77 MB | Needs editing | Kathmandu ceremony. Horns at the start and end, mixed with cymbals and drums. |
| BR_075v2_Himalaya_BuddhistMonks.mp3 | kevp888 | CC BY 4.0 | https://freesound.org/people/kevp888/sounds/440228/ | Login. Preview: https://cdn.freesound.org/previews/440/440228_9034501-hq.mp3 | MP3 original · 4:35 · 6.3 MB | Yes (as a puja bed) | Chanting, drums, horns and bells together. Lossy original. |

### 4.3 Gyaling (Tibetan oboe)

| Title | Author | Licence | Page | Download | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|---|
| **Buddhist Monk plays traditional horn (Gyaling) inside a cave in Langmusi, China** | EduFigueres | CC BY 4.0 | https://freesound.org/people/EduFigueres/sounds/452429/ | Login. Preview: https://cdn.freesound.org/previews/452/452429_2454586-hq.mp3 | WAV 48/24 · 3:28 · 57.2 MB | Phrases only | Solo gyaling with strong cave reverb. |
| Bhutanese Temple Sounds | EnigmaSteel | **CC0** | https://freesound.org/people/EnigmaSteel/sounds/433626/ | Login. Preview: https://cdn.freesound.org/previews/433/433626_8185229-hq.mp3 | FLAC 44.1/16 · 2:08 · 11.8 MB | Phrases | Two monks playing jaling at Changangkha Lhakhang. Ripped from video, so probably compressed. |

### 4.4 Tibetan singing bowl

| Title | Author | Licence | Page | Download | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|---|
| **Tibetan bowl_center hit** | dersinnsspace | **CC0** | https://freesound.org/people/dersinnsspace/sounds/421829/ | Login. Preview: https://cdn.freesound.org/previews/421/421829_8224400-hq.mp3 | WAV 44.1/32 · 0:19 · 6.5 MB | One-shot | Struck. |
| singing bowl – single strike 6 | s-light | **CC0** | https://freesound.org/people/s-light/sounds/415141/ | Login. Preview: https://cdn.freesound.org/previews/415/415141_2154914-hq.mp3 | WAV 48/24 · 0:49 · 13.5 MB | One-shot | Soft mallet, long decay. Garuda1982 "Big Singing Bowl" (CC0, 0:43) is an alternative. |
| **Singing Bowl, long without reverb** | hollandm | **CC0** | https://freesound.org/people/hollandm/sounds/573805/ | Login. Preview: https://cdn.freesound.org/previews/573/573805_5309408-hq.mp3 | WAV 44.1/16 · 2:07 · 21.4 MB | Yes, with crossfade | Rubbed rim. Rattles edited out; EQ and compression applied. |
| Tibetan Singing Bowl 14 cm (Rub) | iainmccurdy | CC BY 4.0 | https://freesound.org/people/iainmccurdy/sounds/577859/ | Login. Preview: https://cdn.freesound.org/previews/577/577859_3655844-hq.mp3 | WAV 96/24 · 1:33 · 51 MB | Yes | The highest fidelity. |
| SingingBowl1.ogg | BambooBeast | Public domain | Commons | https://upload.wikimedia.org/wikipedia/commons/2/25/SingingBowl1.ogg (no login) | Ogg · 0:13 · 0.11 MB | One-shot | A tiny no-login fallback. |

### 4.5 Drilbu (hand bell)

| Title | Author | Licence | Page | Download | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|---|
| **01drilbu** | tenzin64 | **CC0** | https://freesound.org/people/tenzin64/sounds/516574/ | Login. Preview: https://cdn.freesound.org/previews/516/516574_11350634-hq.mp3 | MP3 original · 0:30 · 495 KB | One-shot / ring | A real dril-bu belonging to a teacher. Lossy original. |
| Ghanta-Leather-Mallet-2015-05-16 | the_very_Real_Horst | **CC0** | https://commons.wikimedia.org/wiki/File:274316_the-very-real-horst_ghanta-leather-mallet-2015-05-16.wav | https://upload.wikimedia.org/wikipedia/commons/c/cf/274316_the-very-real-horst_ghanta-leather-mallet-2015-05-16.wav (no login) | WAV 48/16 · 0:45 · 8.7 MB | Yes (sustained) | Ghanta rubbed with a leather mallet, so it sings like a bowl. |
| Bright Tibetan Bell Ding B Note – cleaner | steaq | CC0 | https://freesound.org/people/steaq/sounds/346328/ | Login | WAV · 0:15.5 · 2.6 MB | One-shot | Possibly not a true drilbu. |

### 4.6 Nga (frame drum): gap

No isolated, authentic nga recording was found. The best stopgaps:
- Garuda1982 "Tibetan Drum once": CC0, WAV 48/16, 0:03, 596 KB, one-shot, drum type not stated. https://freesound.org/people/Garuda1982/sounds/116317/ (preview https://cdn.freesound.org/previews/116/116317_2061858-hq.mp3)
- isohoo "monks_mantra.wav": CC0, 0:36, mantra with drum. https://freesound.org/people/isohoo/sounds/499682/
- The puja beds in 4.1 and 4.2 also contain nga.

### 4.7 Damaru: weak

None of these is the Tibetan chöd damaru; all are small Indian-style damaru.

| Title | Author | Licence | Page | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|
| MUSCPerc-Blue Snowball Microphone, CU_Damaroo, Rhythm_Nicholas Judy_TDC | designerschoice | CC BY 4.0 | https://freesound.org/people/designerschoice/sounds/814739/ (preview https://cdn.freesound.org/previews/814/814739_6951162-hq.mp3) | WAV 44.1/16 · 0:48 · 8.1 MB | Rhythm loop | USB-mic SFX. |
| Damaru & Conch.mp3 | baba108 | CC BY 3.0 | https://freesound.org/people/baba108/sounds/550446/ | MP3 · 0:27 · 637 KB | Partly | Includes a conch. Lossy. |
| One-Beat Damaru | pbimal | CC0 | https://freesound.org/people/pbimal/sounds/813255/ | OGG 48 mono · 0:02 · 53 KB | One-shot | Toy-sized, one string broken. |

### 4.8 Thai Pali chanting

| Title | Author | Licence | Page | Download | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|---|
| **Bhikkhu Pāṭimokkha Pali** | พระวินัยธร | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Bhikkhu_P%C4%81%E1%B9%ADimokkha_Pali.ogg | https://upload.wikimedia.org/wikipedia/commons/6/69/Bhikkhu_P%C4%81%E1%B9%ADimokkha_Pali.ogg (no login) | Ogg 44.1 · 34:27 · 17.1 MB | Yes | Uposatha recitation at Wat Khung Taphao, Uttaradit. Recorded by the uploader. |
| **Wat Phra Si Ratana Mahathat – Thailand** | RTB45 | CC BY 4.0 | https://freesound.org/people/RTB45/sounds/196383/ | Login. Preview: https://cdn.freesound.org/previews/196/196383_2409224-hq.mp3 | WAV 44.1/16 · 3:33 · 35.9 MB | Yes | Evening service **in front of the Phra Buddha Chinnarat**, Phitsanulok. An ideal match for a Chinnarat room. |
| Monk Chanting, Chiang Khong, Thailand (March 20, 2019) | marc.om | **CC0** | https://freesound.org/people/marc.om/sounds/806558/ | Login. Preview: https://cdn.freesound.org/previews/806/806558_5417386-hq.mp3 | M4A 48 mono · 10:00 · 4.6 MB | Yes | Single monk, low background. Lossy. |

Another option: razajac "Thai Chanting.flac" (CC0, 10:12, tinny PA system).

### 4.9 Thai gong / large temple gong

| Title | Author | Licence | Page | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|
| **Buddhist Golden Temple Gong** | Veridiansunrise | CC BY 4.0 | https://freesound.org/people/Veridiansunrise/sounds/350723/ (preview https://cdn.freesound.org/previews/350/350723_46808-hq.mp3) | WAV 44.1/32 mono · 0:32 · 5.4 MB | One-shot | Thai golden temple, Samut Prakan / Bangkok. |
| Temple Gong 2 | kerozenne | **CC0** | https://freesound.org/people/kerozenne/sounds/803159/ | WAV 96/24 · 0:44 · 24.3 MB | One-shot | Monks striking a gong in a Thai temple. The author says it is noisy. |
| Gong Tibetan Buddhist temple Ulaanbaatar Mongolia | Vortichez | CC BY 4.0 | https://freesound.org/people/Vortichez/sounds/432568/ | WAV 96/24 · 0:30 · 16.4 MB | One-shot | Gandan Monastery. |
| Chinese gong (finish session) | the_very_Real_Horst | CC0 | https://upload.wikimedia.org/wikipedia/commons/1/16/240382_the-very-real-horst_chinese-gong-finish-session-2014-06-10-29-143.wav (no login) | WAV 44.1/16 · 0:29 · 5.1 MB | One-shot | A no-login CC0 alternative. |

No verified Thai *khong wong* was found.

### 4.10 Wind chimes

| Title | Author | Licence | Page | Download | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|---|
| **Samak-san Temple – Night walk** | abyssence (radio aporee) | PDM 1.0 | https://archive.org/details/aporee_35500_40768 | https://archive.org/download/aporee_35500_40768/upload20170311160654.wav (no login) | WAV · 5:00 · 79.4 MB | Yes | Korean temple eave chimes in night wind, with distant vehicles. |
| Wind chimes 1 | giddster | **CC0** | https://freesound.org/people/giddster/sounds/437337/ | Login. Preview: https://cdn.freesound.org/previews/437/437337_1738686-hq.mp3 | WAV 44.1/32 · 1:29 · 30 MB | Yes, with crossfade | Indoors, generic chimes. |
| Windglockenspiel.Koshi.ogg | Membeth | **CC0** | https://commons.wikimedia.org/wiki/File:Windglockenspiel.Koshi.ogg | https://upload.wikimedia.org/wikipedia/commons/a/a6/Windglockenspiel.Koshi.ogg (no login) | Ogg · 0:58 · 1.42 MB | Yes | Koshi rod chime. |

### 4.11 Moktak / mokugyo (wooden fish)

| Title | Author | Licence | Page | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|
| **Mokugyo.wav** | jonopodmore | **CC0** | https://freesound.org/people/jonopodmore/sounds/607215/ (preview https://cdn.freesound.org/previews/607/607215_541139-hq.mp3) | WAV 44.1/24 · 0:02 · 477 KB | One-shot. Sequence it into the chant tempo. | A Kōya-san mokugyo recorded in a studio. |
| Mokugyo drum sounds | George_Papargyris | CC BY 4.0 | https://freesound.org/people/George_Papargyris/sounds/837177/ | WAV 96/32 · 0:03 · 2.6 MB | One-shot | A late Edo-era mokugyo. |
| Fischtrommel_Muyu.mp3 | the_very_Real_Horst | CC BY 4.0 | https://freesound.org/people/the_very_Real_Horst/sounds/205999/ | MP3 · 0:27 · 622 KB | Rhythm loop | Chinese muyu. |

### 4.12 Temple bronze bell (bonsho / beomjong)

| Title | Author | Licence | Page | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|
| **Temple Bell, Valley of the Temples** | Mista Bumpy | **CC0** | https://freesound.org/people/Mista%20Bumpy/sounds/232333/ (preview https://cdn.freesound.org/previews/232/232333_2313287-hq.mp3) | MP3 original · 1:30 · 1.4 MB | One-shot, long decay | A Japanese-cast bonsho at Byōdō-in, Oahu. Low-bitrate original. |
| **Large Hiroshima Peace Bell** | SDLx | CC BY 3.0 | https://freesound.org/people/SDLx/sounds/259997/ | AIFF 96/24 · 0:44 · 23.9 MB | One-shot | High fidelity. |
| BELLLrg_Temple_Japan_Tokyo_Zojo_Ji_Bell_Tower_VerdiMic_260101 | Echograin | CC BY 4.0 | https://freesound.org/people/Echograin/sounds/843521/ | WAV 96/32 · 0:32 · 23.7 MB | One-shot | Zōjō-ji temple bell. |
| Mii-dera evening bell | radio aporee | PDM | https://archive.org/download/aporee_31518_36212/54Miidera.mp3 (no login) | MP3 · 2:49 · 3.4 MB | One-shot | A famous bell, with ambience. |

**Korean beomjong:** sarena6487528 "Korean Bell.wav" (CC0, 0:27, https://freesound.org/people/sarena6487528/sounds/474949/). It has no description, so it is unverified that this is a beomjong.

**Chinese temple bell:** none found.

### 4.13 Dharma drum (large temple drum)

| Title | Author | Licence | Page | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|
| **Big Buddhist drum** | barryshamir | **CC0** | https://freesound.org/people/barryshamir/sounds/876700/ (preview https://cdn.freesound.org/previews/876/876700_14047045-hq.mp3) | WAV 44.1/24 · 1:31 · 23 MB | Rhythm sections | The big ceremonial drum by the giant Buddha in Ulaanbaatar. |
| 6_drums_luangprabang.WAV | LukeIRL | CC BY 4.0 | https://freesound.org/people/LukeIRL/sounds/176134/ | WAV 44.1/16 · 1:14 · 12.5 MB | Partly | A large drum calling evening prayers in Luang Prabang. |
| Wat Drumming – Luang Prabang Laos | RTB45 | CC BY 4.0 | https://freesound.org/people/RTB45/sounds/190528/ | WAV 44.1/16 · 4:19 · 43.6 MB | Yes | Novices drumming, with gongs. |

No Korean *beopgo* was found.

### 4.14 Heart Sutra chanting

| Title | Author | Licence | Page | Download | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|---|
| **Monks of Soji-ji** | Tenrai Fred Forsythe | CC BY 3.0 (Commons LicenseReview passed 2013-12-10) | https://commons.wikimedia.org/wiki/File:Monks_of_Soji-ji.webm | https://upload.wikimedia.org/wikipedia/commons/d/d6/Monks_of_Soji-ji.webm (no login) | WebM video · 2:41 · 47 MB | Partly | Monks chanting the Hannya Shingyō at Sōji-ji. **Extract the audio** (e.g. `ffmpeg -vn -c:a libopus`). |
| Bore Xinjing 般若心经 (Heart Sutra) in Mandarin recited by a Chinese Buddhist layperson | Nyarlathotep1001 | **CC0** | https://commons.wikimedia.org/wiki/File:Bore_Xinjing_%E8%88%AC%E8%8B%A5%E5%BF%83%E7%BB%8F_(Heart_Sutra)_in_Mandarin_recited_by_a_Chinese_Buddhist_layperson.ogg | https://upload.wikimedia.org/wikipedia/commons/5/5a/Bore_Xinjing_%E8%88%AC%E8%8B%A5%E5%BF%83%E7%BB%8F_%28Heart_Sutra%29_in_Mandarin_recited_by_a_Chinese_Buddhist_layperson.ogg (no login) | Ogg 48 · 2:13 · 1.16 MB | Yes | A solo lay voice. A second take exists. |
| Heart Sutra.oga | kennymiyoshi | CC BY 3.0 (YouTube licence template) | https://commons.wikimedia.org/wiki/File:Heart_Sutra.oga | https://upload.wikimedia.org/wikipedia/commons/e/e4/Heart_Sutra.oga | Ogg 44.1 · 3:45 · 7.2 MB | Yes | Head Priest Yodo Sasaki with parishioners. **Risk:** there is no LicenseReview and the source channel is now private, so the licence cannot be re-checked. |

### 4.15 Temple courtyard ambience with birds

| Title | Author | Licence | Page | Format · duration · size | Loop | Note |
|---|---|---|---|---|---|---|
| **AMB-LoManthang_Monastery Courtyard, Nepal.wav** | soundandmelodies | **CC0** | https://freesound.org/people/soundandmelodies/sounds/643514/ (preview https://cdn.freesound.org/previews/643/643514_10924423-hq.mp3) | WAV 44.1/16 mono · 1:04 · 5.4 MB | Yes, with crossfade | Wind, pigeons, sparrows and voices in Mustang. A Tibetan-culture match. |
| **20180705 – Sukhothai ancient temple evening ambiance 01.wav** | LG | CC BY 4.0 | https://freesound.org/people/LG/sounds/462781/ | WAV 48/24 · 2:05 · 34.3 MB | Yes | Sunset at Sukhothai with "birds singing everywhere". |
| Playing with bells in a buddhist temple.wav | fundamental_harmonics | CC BY 4.0 | https://freesound.org/people/fundamental_harmonics/sounds/437580/ | WAV 44.1/24 · 2:01 · 30.5 MB | Partly | Birds, crickets, a monk sweeping and bells (Chiang Rai). |

**More options:**
- Gakwonsa "Temple exterior.wav": CC0, 3:16. Chanting heard from outside, with cicadas.
- archive.org Gandan monastery prayer wheels: PDM, 7:32. https://archive.org/download/aporee_35436_40696/ambiancesonoreULANBATORGandanKhiiddansletempleprincipaldevantlegrandBouddhalesmoulinsaprierestournentenpermanence.mp3

### 4.16 Audio rejected or blocked

| Source / item | Reason |
|---|---|
| **BBC Sound Effects (RemArc licence)** | **Excluded.** The site's own licence text allows only "non-commercial, personal or research purposes" and formal education. Commercial, non-profit and government use need a paid licence (through Pro Sound Effects). Re-sharing is banned. |
| Freesound 217228 "Buddha Horns.wav" (Tergar Monastery) | CC BY-NC 4.0 |
| Commons Tibetan Singing Bowl hit flacs, Japanese rin, Small tibetan singing bowl, Chanting at Lingyin Temple, Buddhist prayer in Nepal, Intonning sutra in Ladakh, Hsuan Hua dharani clips, Maha Piritha, "Sound of Wind chime in slight breeze" | CC BY-SA (ShareAlike) |
| Commons "The Prayer of the Words of Truth.flac" | A YouTube rip credited to the 14th Dalai Lama, marked CC0 by the uploader. Unclear. |
| archive.org "Ellipsis Arts – Global Meditation" | A false Public Domain Mark on a commercial album |
| archive.org "windchimes-sound-effects" | Re-uploaded Pixabay material labelled CC0 |
| archive.org "long_temple_bell", "metta-sutta-ven-candavanna", "eve-chant" | Uploader-claimed licences with no traceable source |
| Freesound 344683 (nemaavla) | A home imitation, not authentic |
| Freesound 91740 "Gyuto Voice" | A single studio voice, not monastic |
| Kevin MacLeod "Himalayan Atmosphere" | Composed music, not a field recording |
| Commons "Bonsyou5599.ogg" (CC BY 2.1 JP) | The licence is OK, but the file is only 11 kHz. Fallback only. |
| Sonniss GDC bundles | Custom royalty-free licence: no standalone redistribution and no AI training. It does not say whether public-website use is allowed. Flagged; not used. |
| Pixabay audio | Pixabay Content License, not CC. Fallback only, and not searched. |

---

## 5. Attribution lines needed (CC BY picks)

These are needed only if the asset is actually used. They belong in an in-app credits screen.

**3D models**
- "Gilded Brass Buddha Sculpture with 3DF Zephyr" by JAdpp (https://sketchfab.com/3d-models/gilded-brass-buddha-sculpture-with-3df-zephyr-db03da0457ff450481355a5dfab66d2a) is licensed under CC BY 4.0.
- "Sandstone Buddha from Burma at Ashmolean Museum" by Nitesh Bhatia (https://sketchfab.com/3d-models/sandstone-buddha-from-burma-at-ashmolean-museum-1a91e0af5d65424998dbf5d950109cea) is licensed under CC BY 4.0.
- "Buddha Statue" by Science Museum Group (https://sketchfab.com/3d-models/buddha-statue-93c2236f3f0a4ea1a76cfa0fca24c581) is licensed under CC BY 4.0.
- "Thai Buddha" by laurashea (https://sketchfab.com/3d-models/thai-buddha-cba029e262bd4f22a7ee4fcf064e22ee) is licensed under CC BY 4.0.
- "Rosehaugh Buddha" by Andy's Aerial Archaeology (https://sketchfab.com/3d-models/rosehaugh-buddha-d433f8803f58446586c1ffe8b590e17d) is licensed under CC BY 4.0.
- "Stone Seated Vairocana Buddha Statue" by KOREA HERITAGE SERVICE [KHS] (https://sketchfab.com/3d-models/stone-seated-vairocana-buddha-statue-f04d07e525f74f76810143f7040625a7) is licensed under CC BY 4.0.
- "Kamakura Buddha Statue" by YuneeNZ (https://sketchfab.com/3d-models/kamakura-buddha-statue-fc1d6ec8a19a4c428ecd8d65b5126dec) is licensed under CC BY 4.0.
- "1943.53.22 (Model: CAEA, University of Chicago)" by Harvard Art Museums (https://sketchfab.com/3d-models/19435322-model-caea-university-of-chicago-047235675c0242bb90398a1f333042ed) is licensed under CC BY 4.0.
- "Animated Wizard" by Quaternius (https://poly.pizza/m/kttbFvCl2C) is licensed under CC BY 3.0. This applies only if the Poly Pizza copy is used.

**Audio**
- "Samuel Corwin – 09 – Tibetan Monks Chanting at Gyuto Branch Monastery House No 422 McLeod Ganj" by Samuel Corwin (https://commons.wikimedia.org/wiki/File:Samuel_Corwin_-_09_-_Tibetan_Monks_Chanting_at_Gyuto_Branch_Monastery_House_No_422_McLeod_Ganj.ogg), licensed under CC BY 4.0.
- "Ganze Gompa monks puja" by djgriffin (https://freesound.org/people/djgriffin/sounds/98844/), licensed under CC BY 4.0.
- "Dungchen Festival Horns - Bhutan.wav" by RTB45 (https://freesound.org/people/RTB45/sounds/192680/), licensed under CC BY 4.0.
- "BR_075v2_Himalaya_BuddhistMonks.mp3" by kevp888 (https://freesound.org/people/kevp888/sounds/440228/), licensed under CC BY 4.0.
- "Buddhist Monk plays traditional horn (Gyaling) inside a cave in Langmusi, China" by EduFigueres (https://freesound.org/people/EduFigueres/sounds/452429/), licensed under CC BY 4.0.
- "Tibetan Singing Bowl 14 cm (Rub).wav" by iainmccurdy (https://freesound.org/people/iainmccurdy/sounds/577859/), licensed under CC BY 4.0.
- "MUSCPerc-Blue Snowball Microphone, CU_Damaroo, Rhythm_Nicholas Judy_TDC" by designerschoice (https://freesound.org/people/designerschoice/sounds/814739/), licensed under CC BY 4.0.
- "Damaru & Conch.mp3" by baba108 (https://freesound.org/people/baba108/sounds/550446/), licensed under CC BY 3.0.
- "Bhikkhu Pāṭimokkha Pali" by พระวินัยธร (https://commons.wikimedia.org/wiki/File:Bhikkhu_P%C4%81%E1%B9%ADimokkha_Pali.ogg), licensed under CC BY 3.0.
- "Wat Phra Si Ratana Mahathat -Thailand.wav" by RTB45 (https://freesound.org/people/RTB45/sounds/196383/), licensed under CC BY 4.0.
- "Buddhist Golden Temple Gong" by Veridiansunrise (https://freesound.org/people/Veridiansunrise/sounds/350723/), licensed under CC BY 4.0.
- "Gong Tibetan Buddhist temple Ulaanbaatar Mongolia" by Vortichez (https://freesound.org/people/Vortichez/sounds/432568/), licensed under CC BY 4.0.
- "Mokugyo drum sounds" by George_Papargyris (https://freesound.org/people/George_Papargyris/sounds/837177/), licensed under CC BY 4.0.
- "Fischtrommel_Muyu.mp3" by the_very_Real_Horst (https://freesound.org/people/the_very_Real_Horst/sounds/205999/), licensed under CC BY 4.0.
- "Large Hiroshima Peace Bell" by SDLx (https://freesound.org/people/SDLx/sounds/259997/), licensed under CC BY 3.0.
- "BELLLrg_Temple_Japan_Tokyo_Zojo_Ji_Bell_Tower_VerdiMic_260101" by Echograin (https://freesound.org/people/Echograin/sounds/843521/), licensed under CC BY 4.0.
- "6_drums_luangprabang.WAV" by LukeIRL (https://freesound.org/people/LukeIRL/sounds/176134/), licensed under CC BY 4.0.
- "Wat Drumming - Luang Prabang Laos.wav" by RTB45 (https://freesound.org/people/RTB45/sounds/190528/), licensed under CC BY 4.0.
- "Monks of Soji-ji" by Tenrai Fred Forsythe (https://commons.wikimedia.org/wiki/File:Monks_of_Soji-ji.webm), licensed under CC BY 3.0.
- "Heart Sutra" (recitation by Yodo Sasaki) by kennymiyoshi (https://commons.wikimedia.org/wiki/File:Heart_Sutra.oga), licensed under CC BY 3.0.
- "20180705 - Sukhothai ancient temple evening ambiance 01.wav" by LG (https://freesound.org/people/LG/sounds/462781/), licensed under CC BY 4.0.
- "Playing with bells in a buddhist temple.wav" by fundamental_harmonics (https://freesound.org/people/fundamental_harmonics/sounds/437580/), licensed under CC BY 4.0.

CC0, public domain and PDM items need no credit. A courtesy credit for Poly Haven, ambientCG, Quaternius, Mesh2Motion, Kay Lousberg and the museums (Cleveland, Mia, Smithsonian) is still good practice.

---

## 6. Summary

**Avatars:**
- **Pick:** use the **Mesh2Motion human skeleton and its CC0 clip library** as the one shared rig. It has a UE-style skeleton with one GLB of about 60 KB per clip, raw-GitHub downloads and no login.
- **Upstream and extras:** **Quaternius UAL1/UAL2 (CC0)** feed the library. Buy UAL1 Pro ($9.99, still CC0) for Turn 90 and Ground Sit enter/exit.
- **Bodies:** rig custom robed monk and lay meshes to the same skeleton, with the Mesh2Motion auto-rigger or Blender. Quaternius Base Characters and Modular Outfits (CC0) fit the same rig family if a more realistic look is wanted.
- **Robes:** use blended skirt skinning plus procedural helper skirt bones.
- **Bows and prostrations** do not exist under any acceptable licence. Port the existing procedural PoseDefs in `src/avatar.ts` to the new bone names.
- **Retargeting:** prefer an identical skeleton and use `SkeletonUtils.clone()` per player. Use `SkeletonUtils.retargetClip` only at build time, with a `names` map and `hip: 'pelvis'`.

**Statues, best per tradition:**
- **Pala:** Cleveland 1935.146 "Buddha Calling on Earth to Witness". CC0, 69k tris, textures need downsizing.
- **Tibetan:** JAdpp's scan of the V&A gilt Shakyamuni (CC BY; decimate from 2.1M tris; has holes), or Mia's crowned Tibetan Amoghasiddhi (CC0, 64k tris; the crowned look, but a different Buddha).
- **Thai:** Mia 12487 Rattanakosin gilt bronze in bhumisparsha (CC0, 64k tris). **No Sukhothai or Chinnarat seated model exists under CC0/CC BY.**
- **East Asian:** Rosehaugh Amida (CC BY, decimate from 400k). Alternatives are the KHS stone Vairocana (CC BY, 24k tris, mudra unconfirmed) and the Cleveland Korean Amitabha Triad (CC0).

**Blocked by licence or login:**
- **Login needed:** every Sketchfab download needs a free login on our side; the licences themselves allow public serving. Freesound originals need a free login; previews do not.
- **Licence blocks:**
  - Mixamo (Adobe terms) and BBC Sound Effects (RemArc, non-commercial) are excluded.
  - The British Museum's Sketchfab account is NC-SA.
  - Several Mia models and many Commons audio files are BY-SA.
  - The Mesh2Motion "Sophia" variation is SA.
  - Ready Player Me is defunct.
- **Unverified:** Scan the World, Thingiverse and Printables could not be checked automatically (403) and need a manual look.
- **Watch:** Quaternius's new QAL licence. The current packs are still CC0, so download them and archive their licence pages.
- **Audio gaps:** an authentic nga, a Tibetan chöd damaru, a Korean beomjong and beopgo, a Chinese temple bell, a Thai khong wong, and a clean CC0 dungchen.
