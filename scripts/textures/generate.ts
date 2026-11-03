// Generate a temple's textures and skyline with Nano Banana Pro (Gemini image model).
//   GEMINI_API_KEY=… node --experimental-strip-types scripts/textures/generate.ts bodhgaya [name…]
// Writes public/textures/<temple>/<name>.jpg (compressed with macOS `sips`).
// The prompts live here so the set can be regenerated or extended.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MODEL = 'gemini-3-pro-image';
const TILE = 'Seamless tileable texture, orthographic and flat-on, even diffuse daylight with no cast shadows, no perspective, no vignette, no text, no watermark, edges that wrap cleanly. ';

interface Job { prompt: string; aspect: '1:1' | '21:9' | '16:9'; size: '1K' | '2K'; maxPx: number; quality: number }

const SETS: Record<string, Record<string, Job>> = {
  bodhgaya: {
    'tower-niches': {
      aspect: '1:1', size: '2K', maxPx: 1536, quality: 58,
      prompt: TILE + 'The carved surface of the Mahabodhi Temple tower in Bodh Gaya, India: warm golden-tan weathered sandstone and old brick stucco, ' +
        'three horizontal bands of deep horseshoe-shaped chaitya-arch niches (gavaksha), each niche holding a small seated Buddha figure in earth-touching gesture, ' +
        'narrow projecting mouldings between the bands, small pilasters between niches, crisp carved relief with dark recesses. Pala-era Indian temple architecture.',
    },
    stucco: {
      aspect: '1:1', size: '1K', maxPx: 1024, quality: 58,
      prompt: TILE + 'Plain weathered buff-ochre lime stucco over old brick on an ancient Indian temple wall, subtle hairline cracks, faint water stains, gentle tonal variation, warm sandstone colour.',
    },
    flagstones: {
      aspect: '1:1', size: '2K', maxPx: 1536, quality: 58,
      prompt: TILE + 'Top-down view of a temple courtyard paved with large rectangular pale sandstone flagstones in a running bond, warm beige and light grey, worn smooth by pilgrims\' bare feet, thin dark joints, a few marigold petals.',
    },
    marble: {
      aspect: '1:1', size: '2K', maxPx: 1536, quality: 58,
      prompt: TILE + 'Top-down view of a polished marble walkway of square slabs laid on the diagonal, alternating pale grey, rose-pink and cream Indian marble with soft veining, glossy, clean grout lines.',
    },
    railing: {
      aspect: '1:1', size: '1K', maxPx: 1024, quality: 58,
      prompt: TILE + 'Close flat view of ancient Sunga-period carved red sandstone railing surface: round lotus medallions and shallow floral relief on pinkish-buff sandstone, softly weathered.',
    },
    bark: {
      aspect: '1:1', size: '1K', maxPx: 1024, quality: 58,
      prompt: TILE + 'Bark of an old sacred fig (peepal, Ficus religiosa) tree trunk: smooth grey-brown bark with pale patches, vertical ridges and folds, lichen spots.',
    },
    foliage: {
      aspect: '1:1', size: '1K', maxPx: 768, quality: 58,
      prompt: TILE + 'Dense canopy foliage of mango and peepal trees seen up close: overlapping glossy green leaves in many shades, small gaps of deep shadow, soft dappled sunlight.',
    },
    lawn: {
      aspect: '1:1', size: '1K', maxPx: 1024, quality: 58,
      prompt: TILE + 'Top-down view of a short, well-kept lawn in Bihar, India, in the dry season: mixed green and yellowing grass blades, a few small fallen peepal leaves.',
    },
    skyline: {
      aspect: '21:9', size: '2K', maxPx: 3072, quality: 62,
      prompt: 'A wide 360-degree panoramic horizon seen from inside the sunken courtyard of the Mahabodhi Temple complex in Bodh Gaya, India, eye level, ' +
        'in soft hazy late-morning light: a ring of large peepal, mango and ashoka trees, behind them low town buildings and the curved roofs of Buddhist monasteries ' +
        '(Thai, Tibetan and Japanese styles), strings of five-colour prayer flags between trees. No main temple tower, no people, no text. The lower third is the tree line, ' +
        'the upper half is a clear pale blue sky fading to warm haze at the horizon and to plain light blue at the top edge. Even exposure, photographic, left and right edges continue seamlessly.',
    },
  },
};

async function generate(job: Job): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Set GEMINI_API_KEY');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: job.prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: job.aspect, imageSize: job.size } },
    }),
  });
  const body = await res.json() as any;
  if (!res.ok) throw new Error(`${res.status}: ${body.error?.message ?? 'request failed'}`);
  const part = body.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!part) throw new Error(`no image returned (${body.candidates?.[0]?.finishReason ?? 'unknown reason'})`);
  return Buffer.from(part.inlineData.data, 'base64');
}

const [temple, ...only] = process.argv.slice(2);
const set = SETS[temple];
if (!set) throw new Error(`unknown temple; choose one of ${Object.keys(SETS).join(', ')}`);
const outDir = join('public', 'textures', temple);
mkdirSync(outDir, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'textures-'));
const names = only.length ? only : Object.keys(set);
await Promise.all(names.map(async (name) => {
  const job = set[name];
  if (!job) { console.error(`skip unknown ${name}`); return; }
  try {
    const raw = join(work, `${name}.img`);
    writeFileSync(raw, await generate(job));
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(job.quality), '-Z', String(job.maxPx), raw, '--out', join(outDir, `${name}.jpg`)], { stdio: 'ignore' });
    console.log(`ok ${name}`);
  } catch (e) {
    console.error(`failed ${name}: ${(e as Error).message}`);
  }
}));
