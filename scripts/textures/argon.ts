// Ask Gemini 4 Argon (text + vision) a question, optionally about local images.
//   node --experimental-strip-types scripts/textures/argon.ts "question" [image.jpg …]
// Used to write image prompts from a temple's reference doc and to critique generated
// images against it. Prints the answer to stdout.
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const MODEL = 'gemini-4-argon';
const [question, ...images] = process.argv.slice(2);
if (!question) throw new Error('usage: argon.ts "question" [image …]');
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('Set GEMINI_API_KEY');

const mime = (p: string) => ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[extname(p).toLowerCase()] ?? 'image/jpeg');
const parts = [
  { text: question },
  ...images.map((p) => ({ inlineData: { mimeType: mime(p), data: readFileSync(p).toString('base64') } })),
];
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
  body: JSON.stringify({ contents: [{ parts }] }),
});
const body = await res.json() as any;
if (!res.ok) throw new Error(`${res.status}: ${body.error?.message ?? 'request failed'}`);
console.log(body.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '');
