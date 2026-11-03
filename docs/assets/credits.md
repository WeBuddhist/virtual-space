# Asset credits

Everything else in WeBuddhist Space is made in code (procedural geometry, sculpted
statues in `scripts/statues`, synthesized sound).

## Animation

- **Motion capture:** idle, formal walk and seated meditation clips from the
  [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app) human animation library
  (which includes Quaternius's Universal Animation Library), **CC0 1.0**. They are retargeted
  onto our avatar's skeleton by `scripts/mocap/build.ts` into `public/animations/mocap.json`.
  No credit is required; we give it gladly.
- **Bows and prostrations** (Tibetan full prostration, Thai five-point bow, East Asian kneeling
  bow, standing bow), palms together and the mala are hand-keyed in `src/avatar.ts`.

To rebuild the clips, download the `.glb` files listed in `scripts/mocap/build.ts` from
`static/assets/human` in the Mesh2Motion repository into a folder, then run
`npm run mocap -- <folder>`.
