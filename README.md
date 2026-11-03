# WeBuddhist Space · virtual temples in English and Tibetan

A quiet, multiplayer 3D temple in the browser, in English and Tibetan.
Phase 1 (this MVP) is a clean-room reconstruction of the interaction model of
[sansatemple.com](https://sansatemple.com). See [docs/reverse-engineering.md](docs/reverse-engineering.md)
for what was observed on that site and how.

## Run

```bash
npm install
npm run dev        # Worker (wrangler dev) on :8787 + Vite on :5173
```

Open http://localhost:5173. Open a second tab to see another visitor.
`?room=room-07` picks a room, `?time=21:00` pins the temple clock (to preview night and prayer times).

## Deploy (Cloudflare)

A single Worker (`worker/index.ts`, config in `wrangler.jsonc`) serves the built site, `/rooms`, and the
`/presence` WebSocket. Each room is a Durable Object with hibernating WebSockets, and a `Lobby` object keeps the room counts.

- **Production:** Cloudflare Workers Builds watches `main` on GitHub, runs `npm run build`, then `npx wrangler deploy`.
- **Domain:** `space.webuddhist.com` is declared as a custom domain in `wrangler.jsonc`, so deploying creates the DNS record.
- **Manual deploy:** `npx wrangler login`, then `npm run deploy`.

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
worker/          Cloudflare Worker + Durable Objects (rooms, lobby)
```

## Phase 2: modular rooms and avatars

1. Turn `TEMPLE` into a registry: each room picks a temple definition (hall model, statues, soundscape).
2. Load hall/statue GLB models per temple, with the procedural ones as fallback.
3. Real chant recordings per temple (`audio.chantSrc`), plus per-room ambience.
4. Avatar picker: robe/shirt/skin colours, then models, saved per visitor and sent in `join`.
5. Server: persist the room ⇄ temple mapping in the Lobby object.

## Assets and content

No code, models, textures, fonts, wall art or audio from sansatemple.com are used.
Everything visible is generated in code; sounds are synthesized with Web Audio.
