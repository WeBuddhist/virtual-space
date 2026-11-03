// Sculpt-off: a model sculpts the Mahabodhi Buddha as SDF code over several rounds,
// seeing CPU renders of each attempt next to the reference photos.
//   node --experimental-strip-types scripts/statues/sculptoff.ts kimi|gemini [--rounds=4]
// Writes scripts/statues/sculpts/<model>-r<N>.ts, renders under
// reference/bodhgaya/sculptoff/<model>-r<N>/, and the final statue to
// public/models/statues/bodhgaya-<model>.glb. Model-written code is baked in a child
// process under Node's permission model (read the repo, write only its render dir).
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const model = process.argv[2] as 'kimi' | 'gemini';
const rounds = Number(process.argv.find((a) => a.startsWith('--rounds='))?.slice(9) ?? 4);
if (model !== 'kimi' && model !== 'gemini') throw new Error('usage: sculptoff.ts kimi|gemini [--rounds=N]');

const ROOT = resolve('.');
const WORK = join(ROOT, 'reference/bodhgaya/sculptoff');
const REFS = join(WORK, 'refs');
const VIEWS = ['front', 'three-quarter', 'side', 'face'];

type Img = { name: string; data: string };
type Turn = { role: 'user' | 'assistant'; text: string; images: Img[] };
const jpg = (path: string): Img => ({ name: path.split('/').pop()!, data: readFileSync(path).toString('base64') });
// renders are PNG; send them as smaller JPEGs
const renderImg = (dir: string, v: string): Img => {
  const out = join(dir, `${v}.jpg`);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', join(dir, `${v}.png`), '--out', out], { stdio: 'ignore' });
  return { name: `render-${v}.jpg`, data: readFileSync(out).toString('base64') };
};

// ---- model calls (streamed, so long reasoning doesn't hit header timeouts) ----

async function* sse(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line.startsWith('data:')) yield line.slice(5).trim();
    }
  }
}

async function callKimi(system: string, turns: Turn[]): Promise<string> {
  const messages = [{ role: 'system', content: system }, ...turns.map((t) => ({
    role: t.role,
    content: t.role === 'assistant' ? t.text : [
      ...t.images.flatMap((im) => [{ type: 'text', text: im.name }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${im.data}` } }]),
      { type: 'text', text: t.text },
    ],
  }))];
  const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.MOONSHOT_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'kimi-k3.1-pro', messages, max_tokens: 64000, stream: true }),
  });
  if (!res.ok) throw new Error(`kimi ${res.status}: ${(await res.text()).slice(0, 500)}`);
  let text = '';
  for await (const data of sse(res)) {
    if (data === '[DONE]') break;
    text += JSON.parse(data).choices?.[0]?.delta?.content ?? '';
  }
  return text;
}

async function callGemini(system: string, turns: Turn[]): Promise<string> {
  const contents = turns.map((t) => ({
    role: t.role === 'assistant' ? 'model' : 'user',
    parts: t.role === 'assistant' ? [{ text: t.text }] : [
      ...t.images.flatMap((im) => [{ text: im.name }, { inlineData: { mimeType: 'image/jpeg', data: im.data } }]),
      { text: t.text },
    ],
  }));
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-4-argon:streamGenerateContent?alt=sse', {
    method: 'POST',
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY!, 'content-type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: 65536 } }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 500)}`);
  let text = '';
  for await (const data of sse(res)) {
    for (const p of JSON.parse(data).candidates?.[0]?.content?.parts ?? []) if (!p.thought && p.text) text += p.text;
  }
  return text;
}

const call = model === 'kimi' ? callKimi : callGemini;

// ---- the loop ----

const code = (reply: string) => {
  const blocks = [...reply.matchAll(/```(?:ts|typescript)\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  return blocks.sort((a, b) => b.length - a.length)[0];
};

function bake(mod: string, out: string, extra: string[] = []): { ok: boolean; log: string } {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true }); // the write grant only covers a directory that exists at startup
  const r = spawnSync(process.execPath, [
    '--experimental-strip-types', '--no-warnings', '--permission', `--allow-fs-read=${ROOT}`, `--allow-fs-write=${out}`,
    'scripts/statues/bake.ts', mod, out, ...extra,
  ], { encoding: 'utf8', timeout: 240_000, maxBuffer: 1 << 24 });
  const log = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  return { ok: r.status === 0 && existsSync(join(out, 'front.png')), log: r.error ? `${r.error.message}\n${log}` : log };
}

const system = [
  readFileSync('scripts/statues/sculpt-brief.md', 'utf8'),
  '\n## sdf.ts (the kit)\n```ts\n' + readFileSync('scripts/statues/sdf.ts', 'utf8') + '```',
  '\n## buddha.ts (the baseline)\n```ts\n' + readFileSync('scripts/statues/buddha.ts', 'utf8') + '```',
  '\n## palette.ts\n```ts\n' + readFileSync('scripts/statues/palette.ts', 'utf8') + '```',
].join('\n');

const refs = readdirSync(REFS).filter((f) => f.endsWith('.jpg')).sort().map((f) => jpg(join(REFS, f)));
const baseline = VIEWS.map((v) => renderImg(join(WORK, 'baseline'), v)).map((im) => ({ ...im, name: `baseline-${im.name}` }));
const turns: Turn[] = [{
  role: 'user', images: [...refs, ...baseline],
  text: `Reference images 01–11 are attached, followed by renders of the baseline statue. Study the references closely first (proportions, pose, hands, robe drape, face, curls, seat), then write your sculpt module. Round 1 of ${rounds}.`,
}];

let best: string | undefined;
for (let round = 1; round <= rounds; round++) {
  const t0 = Date.now();
  let reply = await call(system, turns);
  let src = code(reply);
  if (!src) {
    // one nudge if the model forgot the code block
    turns.push({ role: 'assistant', text: reply, images: [] }, { role: 'user', text: 'Output the complete module in a single ```ts block.', images: [] });
    reply = await call(system, turns);
    src = code(reply);
  }
  turns.push({ role: 'assistant', text: reply, images: [] });
  const name = `${model}-r${round}`;
  const mod = `scripts/statues/sculpts/${name}.ts`;
  writeFileSync(join(ROOT, 'reference/bodhgaya/sculptoff', `${name}-reply.md`), reply);
  if (!src) { console.log(`${name}: no code`); turns.push({ role: 'user', text: 'No ```ts block was found. Output the complete module.', images: [] }); continue; }
  writeFileSync(mod, `// Sculpt-off entry: ${model === 'kimi' ? 'Kimi K3.1 Pro' : 'Gemini 4 Argon'}, round ${round}.\n${src}`);
  const out = join(WORK, name);
  const { ok, log } = bake(mod, out);
  console.log(`${name}: ${ok ? 'baked' : 'FAILED'} in ${((Date.now() - t0) / 1000).toFixed(0)}s  ${log.split('\n').pop()?.slice(0, 200)}`);
  if (!ok) {
    turns.push({ role: 'user', images: [], text: `Round ${round} failed to bake:\n\`\`\`\n${log.slice(-3000)}\n\`\`\`\nFix it and output the complete module. Round ${round + 1} of ${rounds}.` });
    continue;
  }
  best = mod;
  if (round < rounds) {
    turns.push({
      role: 'user', images: VIEWS.map((v) => renderImg(out, v)),
      text: `Renders of your round ${round} sculpt: front, three-quarter, the statue's right side, face (unpainted). Stats: ${log.split('\n').pop()}\nCompare against references 01–11 hard. List the biggest differences (silhouette and proportions first), then output the complete revised module. Round ${round + 1} of ${rounds}.`,
    });
  }
}

if (!best) throw new Error('no round baked');
// final: the last good round, at full resolution, compressed for the web
const final = `scripts/statues/sculpts/${model}.ts`;
copyFileSync(best, final);
const out = join(WORK, `${model}-final`);
const { ok, log } = bake(final, out, ['--cell=0.006', '--glb']);
if (!ok) throw new Error(log);
execFileSync('npx', ['gltf-transform', 'meshopt', join(out, 'statue.glb'), `public/models/statues/bodhgaya-${model}.glb`, '--level', 'medium'], { stdio: 'ignore' });
console.log(`final: ${best} -> public/models/statues/bodhgaya-${model}.glb`);
