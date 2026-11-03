# Ritrö · རི་ཁྲོད། — a virtual Tibetan temple

A quiet, multiplayer 3D temple in the browser, in English and Tibetan.
Phase 1 (this MVP) is a clean-room reconstruction of the interaction model of
[sansatemple.com](https://sansatemple.com). See [docs/reverse-engineering.md](docs/reverse-engineering.md)
for what was observed on that site and how.

## Run

```bash
npm install
npm run dev        # room server on :8787 + Vite on :5173
```

Open http://localhost:5173. Open a second tab to see another visitor.
`?room=room-07` picks a room, `?time=21:00` pins the temple clock (to preview night and prayer times).

## Deploy

One Node process serves the built site, `/rooms` and the `/presence` WebSocket, so it needs a host that
runs a long-lived server (Railway, Fly, Render, a VPS), not static-only hosting.

```bash
docker build -t ritro . && docker run -p 8787:8787 ritro
```

Target: `space.webuddhist.com`. DNS for webuddhist.com is on Cloudflare, so add a `CNAME space → <host domain>`
there. If the record is proxied, set SSL to Full; Cloudflare passes WebSockets through.

## What's in the MVP (parity with sansatemple)

| Feature | Status |
|---|---|
| Third-person child-monk avatar; click-to-walk, WASD/arrows, drag to orbit, wheel/pinch zoom | ✅ |
| Courtyard path → open-front hall with signboard, pillars, lanterns, painted altar wall | ✅ procedural |
| Central Buddha flanked by wisdom + compassion attendants (Manjushri, Avalokiteshvara) | ✅ procedural |
| Cushions to sit on; four resident practitioners kneeling | ✅ |
| Palms-together greeting, repeating prostrations (stop ends with a greeting) | ✅ |
| Wood fish overlay with tap + autoplay | ✅ |
| 108-bead mala overlay with bead/round counter | ✅ |
| Offer incense at the burner; smoke visible to everyone | ✅ (no queue yet) |
| 100 rooms × 100 visitors, room picker with live counts | ✅ |
| Presence: names, moves, poses and practices synced live | ✅ |
| Day/night by temple clock (06:00–18:00) | ✅ |
| Personal chanting + communal dawn (05:00) and evening (18:00) prayers | ✅ synthesized drone placeholder |
| Sound settings: ambient / effects / chanting volume, background playback | ✅ |
| Visitors list, exit screen, hidden-tab rest screen | ✅ |
| English ⇄ Tibetan UI | ✅ (Tibetan needs native review) |
| Incense queue, offering box/donations, visit-token resume, regional sharding | ⏳ not yet |

Keys: `1`/`E`/`Space` prostrate · `2` mala · `3` palms · `5` wood fish · `Esc` close.

## Layout

```
src/temple.ts    one temple definition: hall, statues, audio, service times, zone
src/world.ts     procedural scene + day/night
src/avatar.ts    avatar rig and poses (Look = appearance knobs for phase 2)
src/player.ts    input, camera, movement, collisions
src/net.ts       presence client
src/audio.ts     Web Audio synthesis (wind, birds, bowl, wood fish, mala, chant)
src/overlays.ts  mala and wood fish
src/i18n.ts      English / Tibetan strings
server/          WebSocket room server
```

## Phase 2: modular rooms and avatars

1. Turn `TEMPLE` into a registry: each room picks a temple definition (hall model, statues, soundscape).
2. Load hall/statue GLB models per temple, with the procedural ones as fallback.
3. Real chant recordings per temple (`audio.chantSrc`), plus per-room ambience.
4. Avatar picker: robe/shirt/skin colours, then models, saved per visitor and sent in `join`.
5. Server: persist room ⇄ temple mapping; move to Cloudflare Durable Objects for scale.

## Assets and content

No code, models, textures, fonts, wall art or audio from sansatemple.com are used.
Everything visible is generated in code; sounds are synthesized with Web Audio.
