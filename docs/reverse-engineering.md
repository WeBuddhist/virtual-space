# sansatemple.com — reverse-engineering notes

Captured 2026-11-03 from the live site (`?room=maru-69&instance=0&region=apac`)
and its shipped bundles (`index-C6rPWc71.js`, `game-iJ7UN04i.js`,
`game-CXqKEmtK.css`). The bundles were parsed statically with REA
(`analyze_javascript_application`, Evidence `ev_1a47608110715b08aa41cebc4993d189b5ce8c84627cd677866e40b23d507e26`)
and with targeted text searches. Runtime facts come from the live page in a browser.

Legend: **[obs]** = observed in the page or bundle text, **[inf]** = inferred, **[unk]** = not established.

## Stack

| Layer | Finding |
|---|---|
| Build | Vite, one ~1 MB game chunk plus a tiny loader `index-*.js` [obs] |
| 3D | Three.js r180 (`window.__THREE__ === "180"`), a single WebGL canvas [obs] |
| UI | Vanilla DOM + CSS (no React/Next markers); custom font `SansaQuietUI-Core.woff2` [obs] |
| Assets | GLB models + PBR textures (color/normal/roughness) on a Cloudflare Worker CDN `sansa-assets…workers.dev/v/<hash>/assets/…` [obs] |
| Realtime | `wss://sansa-realtime…workers.dev/presence`, `binaryType="arraybuffer"`, binary wire format v3 with JSON fallback [obs]; Cloudflare Durable Objects per room [inf] |
| Other | Supabase publishable key in bundle (used only when no socket URL, `Sh=!ub&&…` → inactive) [obs]; GA4 + Cloudflare RUM analytics [obs] |

## Rooms / servers

- 100 rooms: `maru`, `maru-02` … `maru-100`, each `capacity` 100 [obs].
- URL params: `room`, `instance` (0–15, elastic sharding), `region` ∈ `apac|eur|nam|sam|oce|afr` [obs].
- Socket query: `room, protocol=2, wire=3, resume=1, entryIdle=1, [wake], [visit], [elastic, instance, region]` [obs].
- A `visitToken` (UUID) is saved and guarded by `navigator.locks` (`sansa:visit:<token>`) so one tab owns a visit; resuming reuses it [obs].
- Room picker dialog lists all servers with live `count / capacity`, "full", "stale" states [obs].
- Hidden-tab idle: after inactivity, the page shows "잠깐 쉬고 있어요" (resting) with a "continue here" button and drops the socket [obs].

## Protocol message types [obs]

Client → server: `move {x,z,yaw,pose}` (pose ∈ `kneel|walk|beads|dance`), `seat {requestId}`, `stand`,
`bow`, `bead`, `hello` (palms-together greeting), `incense`, `incense-join`, `incense-queue`, `sync`, `leave`, `room-switch`.

Server → client: `snapshot {room, selfId, visitors[], revision, instance, region, visitToken, incense…}`,
`delta`, `event`, `ack`, `seat-granted`, `seat-unavailable`, `position-corrected`,
`incense-result`, `incense-queue-result`, `incense-start`, `room-switch-denied`, `error`.

Moves are coalesced (only sent on change) and throttled through a move timer [obs].

## World [obs]

- Third-person camera behind a child-monk avatar (`monk.glb`, remote players use `monk-remote-lod.glb`).
- Scene: stone path ("산책길") → open-front hall "청연당 淸緣堂" with a signboard, timber pillars, lanterns, altar wall painting,
  Buddha (center) flanked by Mahasthamaprapta (wisdom) and Avalokiteshvara (compassion), pine trees, garden,
  lotus pond, offering box (복전함) and incense burner (향로).
- Floor cushions (방석) to sit on; 4 resident NPCs kneel on cushions ("고요한 산새", "느긋한 솔잎", "따스한 물결", "은은한 바람").
- Each visitor gets a random two-word calm name shown in a name pill above their head ("나" = me).
- Day/night switches by **KST** clock: day 06:00–18:00 [obs].

## Controls [obs]

Click floor / WASD / arrows to move · drag to orbit · wheel or pinch to zoom.
Keys: `1`/`E`/`Space` bow (toggle) · `2` beads · `3` palms-together greeting · `5` moktak.

## Practices (bottom dock) [obs]

| Button | Behaviour |
|---|---|
| 합장 Palms together | One-shot greeting animation, broadcast to others |
| 절하기 Bow | Repeating full bows; press again to stop; ends with a greeting |
| 목탁 Moktak | Overlay with a large moktak; tap to strike, autoplay toggle; sound only when effects are on |
| 염주 Beads | Overlay with a 108-bead mala; swipe/arrow/wheel to advance; counts beads and rounds (`n / 108`, "first round") |
| 향 올리기 Offer incense | Queue at the burner, walk there, light incense that keeps burning for others |

## Audio [obs]

- Master sound toggle (off by default; browsers need a gesture).
- Settings: three personal volumes — ambient (wind + birds), effects (my bell, beads, moktak), chanting; "background playback" switch.
- "염불 듣기" (listen to chanting): personal playback only you hear.
- Communal service: dawn 05:00 and evening 18:00 KST; chanting plays for everyone from a shared offset.
- Audio: Heart Sutra mp3, a CC BY 4.0 temple chant recording and a moktak sample (public-domain archive gongu.copyright.or.kr).

## Other UI [obs]

Top-left pill: exit · temple name · room number ▾ · `count/100`. Top-right: day/night orb · sound · settings; "listen to chanting" chip.
Dialogs: room picker, visitors list, settings, support (bank / KakaoPay), controls help, exit screen ("편안히 쉬어 가셨나요").

## Clean-room boundary

We do **not** copy the site's code, GLB models, textures, wall painting, font, name or audio.
The reconstruction reproduces the **layout, interaction model, feature set and protocol shape**
with original procedural geometry and our own Tibetan content and assets.
