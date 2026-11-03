// Compress a Gaussian splat (.ply) to .spz with Spark's encoder for the web.
//   node --experimental-strip-types scripts/statues/spz.ts in.ply out.spz
import { readFileSync, writeFileSync } from 'node:fs';
import { transcodeSpz } from '@sparkjsdev/spark';

const [src, dst] = process.argv.slice(2);
if (!src || !dst) throw new Error('usage: spz.ts in.ply out.spz');
// the image-to-3D splats carry base colour only, so no spherical harmonics
const { fileBytes } = await transcodeSpz({ inputs: [{ fileBytes: new Uint8Array(readFileSync(src)), pathOrUrl: src }], maxSh: 0 });
writeFileSync(dst, fileBytes);
console.log(`${src} -> ${dst}: ${(fileBytes.length / 1e6).toFixed(2)} MB`);
