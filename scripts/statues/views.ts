// Turn reference photos of a temple's main statue into a clean turnaround (front,
// left, right, back on white) with Nano Banana Pro, as input for image-to-3D models.
//   node --experimental-strip-types scripts/statues/views.ts bodhgaya [front|left|right|back …]
// Reads reference/<temple>/statue-refs.txt (one photo path per line), writes
// reference/<temple>/statue-views/<view>.png. The front is made first and passed
// along with the photos to the other views so they stay consistent.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const MODEL = 'gemini-3-pro-image';
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('Set GEMINI_API_KEY');

const SUBJECT: Record<string, string> = {
  bodhgaya: `the main gilded Buddha image in the sanctum of the Mahabodhi Temple, Bodh Gaya: a seated Buddha in the earth-touching gesture
(right hand over the right knee, fingers pointing down to the earth; left hand resting in the lap holding a clear crystal bowl), gilded skin,
deep blue hair curls with a gold finial on the ushnisha, painted dark eyebrows and eyes, red lips, a urna on the forehead, long earlobes,
wearing the bright orange-saffron cloth robe that devotees drape over the left shoulder, chest and lap, seated on its gilded throne cushion`,
};

const VIEW: Record<string, string> = {
  front: 'straight-on front view, camera level with the chest, the statue facing the camera exactly',
  left: "exact side profile from the statue's own LEFT side: the face points toward the RIGHT edge of the image; we see the left shoulder fully covered by the robe and the left hand holding the bowl in the lap, while the earth-touching right hand is hidden behind the body (this is the mirror direction of the right-side view)",
  right: "exact side profile from the statue's own RIGHT side: the face points toward the LEFT edge of the image; we see the bare right shoulder and the right arm reaching down over the knee to touch the earth",
  back: 'straight-on back view, camera directly behind the statue at chest height, showing the back of the head curls, shoulders, robe and seat',
};

const mime = (p: string) => (extname(p).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg');
const img = (p: string) => ({ inlineData: { mimeType: mime(p), data: readFileSync(p).toString('base64') } });

async function generate(prompt: string, images: string[]): Promise<Buffer> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, ...images.map(img)] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1', imageSize: '2K' } },
      }),
    });
    const body = (await res.json()) as any;
    const part = body.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (part) return Buffer.from(part.inlineData.data, 'base64');
    if (attempt >= 2) throw new Error(`${res.status}: ${body.error?.message ?? JSON.stringify(body).slice(0, 300)}`);
  }
}

const temple = process.argv[2];
if (!SUBJECT[temple]) throw new Error(`usage: views.ts <${Object.keys(SUBJECT).join('|')}> [views…]`);
const root = join('reference', temple);
const refs = readFileSync(join(root, 'statue-refs.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const out = join(root, 'statue-views');
mkdirSync(out, { recursive: true });
const wanted = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(VIEW);

for (const view of wanted) {
  const front = join(out, 'front.png');
  const useFront = view !== 'front' && existsSync(front);
  const prompt = `The attached photographs show ${SUBJECT[temple]}.
${useFront ? 'The FIRST attached image is a clean studio front view of this same statue already made; match it exactly (same proportions, face, robe drape, colours, seat).\n' : ''}
Make a faithful, photorealistic studio photograph of exactly this statue as a reference for 3D reconstruction:
- ${VIEW[view]}; orthographic-looking (long lens, no perspective distortion)
- the whole statue and its throne cushion in frame, centred, filling about 85% of the image height, nothing cropped
- isolated on a pure white seamless background: no glass case, no halo or blue backdrop, no flowers, lamps, offerings, people or text
- soft even diffuse lighting from all sides, no strong highlights or glare, true colours
- preserve every real detail from the photographs: facial features and expression, proportions, the curls, the robe folds and how it is draped, the hands, the bowl
Do not invent ornaments that are not in the photographs.`;
  const buf = await generate(prompt, useFront ? [front, ...refs] : refs);
  writeFileSync(join(out, `${view}.png`), buf);
  console.log(`${view}: ${(buf.length / 1e6).toFixed(1)} MB`);
}
