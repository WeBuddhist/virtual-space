// Generate a temple's textures and skyline with Nano Banana Pro (Gemini image model).
//   GEMINI_API_KEY=… node --experimental-strip-types scripts/textures/generate.ts bodhgaya [name…]
// Writes public/textures/<temple>/<name>.jpg (compressed with macOS `sips`).
// The prompts live here so the set can be regenerated or extended.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { Job } from './jobs.ts';
import { join } from 'node:path';

const MODEL = 'gemini-3-pro-image';


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
if (!/^[a-z]+$/.test(temple ?? '')) throw new Error('usage: generate.ts <temple> [name…]');
const set: Record<string, Job> = (await import(`./sets/${temple}.ts`)).jobs;
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
