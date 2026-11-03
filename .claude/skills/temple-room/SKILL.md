---
name: temple-room
description: Add or rebuild a temple room in WeBuddhist Space so it looks like the real place — research the temple, write its TempleDef and bespoke site, model its recognizable main statue, set its instruments, bow styles and audio, then verify against the references. Use when the user asks for a new temple/room, or to make an existing room more realistic.
---

# Temple room

A room is one real temple recreated in Three.js. It must be **recognizable**: someone
who has been there should know it at a glance, above all from the main statue.

## 1. Research (agent)

Launch the `temple-researcher` agent (definition in `.claude/agents/temple-researcher.md`;
if that type is not registered in this session, use `general-purpose` and tell it to follow
that file). Give it the room id and the candidate temples plus the selection criteria:
interior and main statue well documented, statue clear and central, place well known.
Run several rooms' research in parallel. The output is `docs/rooms/<id>/reference.md`.

Read the reference before building. Pull out: the statue's five recognizability features,
the metre-scale blocking, the palette, the instruments and bow style, the time zone and
service times. Resolve open questions with the user only if they change the build.

## 2. Temple definition

Edit `src/rooms/index.ts` (`TEMPLES[id]`, typed by `src/rooms/types.ts`):

- `name`, `place`, `hall.name` in English and Tibetan (flag Tibetan for native review).
- `tradition`, `instruments` (ids from `InstrumentId`), `bowStyles` (`BowStyle`).
- `timeZone` (IANA) and `services` from the reference.
- `sky` colors from the palette.
- `buildSite`: point it at the bespoke site from step 3.
- If the cushion count or the residents change, update `SEATING` in `shared/rooms.ts`
  (the Worker validates seats with it).

## 3. Site

Create `src/rooms/sites/<id>.ts` exporting `(ctx: SiteContext) => Site`. Follow the
reference's blocking in metres; the visitor is about 1.1 m tall (a child-sized avatar).

- Build from `src/kit/` (materials, props, sky) and add kit pieces when a shape is
  reusable (roof forms, railings, stupas, lamps). Keep one-off geometry in the site file.
- **Statue first.** Put it on the main axis, lit by a spot light plus warm fill, with a
  clear sight line from the doorway and from the cushions. Model the five recognizability
  features before anything else. Use the statue builder in `src/kit/statue.ts`; if a
  freely licensed scan exists (`docs/assets/sources.md`), prefer it, decimated for the web.
- Return everything `Site` needs: walkable `floor` meshes, `cushions`, `colliders`,
  the incense `burner`, `spawn`/`spawnYaw` facing the main building, `bounds`,
  `groundHeight` for steps and plinths, and `update(dt, night, elapsed)` for lamps,
  flags, water and anything animated.
- Keep it light: share geometries and materials, instance repeated parts, and keep
  shadow-casting to large shapes.

## 4. Sound

Instruments and bow styles come from the TempleDef. Recordings are added by the user in
the local audio studio (`npm run studio`, saved under `public/audio/<id>/`). Do not add
third-party recordings yourself unless their license allows public use (CC0 or CC BY with
the credit filled in).

## 5. Verify

1. `npm run typecheck`, then `npm run dev` and open `/?room=<id>` (add `&time=21:00`
   for night).
2. Screenshot from the spawn point, the doorway, the cushions, and close to the statue.
   Compare each against the reference's photos: the statue's five features, proportions,
   palette, and the layout. Fix the largest mismatch first, then re-check.
3. Walk the whole site: no walking through walls, steps raise the avatar, the burner and
   cushions work, residents sit on cushions, and the frame rate holds.
4. Check Tibetan text renders (no tofu boxes) on the signboard and in the UI.
