// Kimi K3.1 Pro builds one Bodh Gaya element as three.js code over several rounds,
// seeing CPU renders of each attempt next to the reference photos.
//   node --experimental-strip-types scripts/temple/kimi.ts <element-id> [--rounds=4]
// Rounds and renders go to reference/bodhgaya/temple/<id>/ (gitignored); the best round
// is written to src/rooms/sites/bodhgaya/kimi/<id>.ts. Model-written code is baked in a
// child Node process under the permission model (read the repo, write only its dir).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ELEMENTS } from './elements.ts';

const id = process.argv[2];
const rounds = Number(process.argv.find((a) => a.startsWith('--rounds='))?.slice(9) ?? 4);
const el = ELEMENTS.find((e) => e.id === id);
if (!el) throw new Error(`usage: kimi.ts <${ELEMENTS.map((e) => e.id).join('|')}> [--rounds=N]`);

const ROOT = resolve('.');
const WORK = join(ROOT, 'reference/bodhgaya/temple', id);
const KIT = join(ROOT, 'src/rooms/sites/bodhgaya/kimi/kit.ts');
const VIEWS = ['front', 'three-quarter', 'side', 'high', 'detail'];
const FIX_TRIES = 2;
mkdirSync(join(WORK, 'refs'), { recursive: true });
const log = (s: string) => console.log(`[${id}] ${s}`);

type Img = { name: string; data: string };
type Turn = { role: 'user' | 'assistant'; text: string; images: Img[] };

/** a JPEG at most 1024 px on its long side, cached */
function jpg(src: string, name: string): Img {
  const out = join(WORK, 'refs', name);
  if (!existsSync(out)) execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', '1024', src, '--out', out], { stdio: 'ignore' });
  return { name, data: readFileSync(out).toString('base64') };
}
const renderImg = (dir: string, v: string): Img => {
  const out = join(dir, `${v}.jpg`);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', join(dir, `${v}.png`), '--out', out], { stdio: 'ignore' });
  return { name: `render-${v}.jpg`, data: readFileSync(out).toString('base64') };
};

// ---- Kimi, streamed so long reasoning doesn't hit header timeouts ----

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

async function kimi(system: string, turns: Turn[]): Promise<string> {
  const messages = [{ role: 'system', content: system }, ...turns.map((t) => ({
    role: t.role,
    content: t.role === 'assistant' ? t.text : [
      ...t.images.flatMap((im) => [{ type: 'text', text: im.name }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${im.data}` } }]),
      { type: 'text', text: t.text },
    ],
  }))];
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.MOONSHOT_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'kimi-k3.1-pro', messages, max_tokens: 64000, stream: true }),
      });
      if (!res.ok) throw new Error(`kimi ${res.status}: ${(await res.text()).slice(0, 400)}`);
      let text = '';
      for await (const data of sse(res)) {
        if (data === '[DONE]') break;
        text += JSON.parse(data).choices?.[0]?.delta?.content ?? '';
      }
      if (text.trim()) return text;
      throw new Error('empty reply');
    } catch (e) {
      if (attempt >= 2) throw e;
      log(`kimi call failed (${(e as Error).message}); retrying`);
      await new Promise((r) => setTimeout(r, 15_000));
    }
  }
}

// ---- code handling and the sandboxed bake ----

const code = (reply: string) =>
  [...reply.matchAll(/```(?:ts|typescript)\s*\n([\s\S]*?)```/g)].map((m) => m[1]).sort((a, b) => b.length - a.length)[0];

/** point the module's kit import at the real file (for Node), or back at './kit' (for the app) */
const forNode = (src: string) => src.replace(/from\s+['"]\.\/kit(?:\.ts)?['"]/g, `from '${pathToFileURL(KIT).href}'`);
const forApp = (src: string) => src.replace(/from\s+['"](?:\.\/kit(?:\.ts)?|file:[^'"]*\/kit\.ts)['"]/g, "from './kit'");

function bake(mod: string, out: string): { ok: boolean; log: string; stats?: any } {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true }); // the write grant only covers a directory that exists at startup
  const r = spawnSync(process.execPath, [
    '--experimental-strip-types', '--no-warnings', '--permission', `--allow-fs-read=${ROOT}`, `--allow-fs-write=${out}`,
    'scripts/temple/bake.ts', id, mod, out,
  ], { encoding: 'utf8', timeout: 300_000, maxBuffer: 1 << 25 });
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  const ok = r.status === 0 && existsSync(join(out, 'front.png'));
  let stats;
  try { stats = JSON.parse(readFileSync(join(out, 'stats.json'), 'utf8')); } catch { /* failed */ }
  return { ok, log: r.error ? `${r.error.message}\n${text}` : text, stats };
}

/** current hand-made version of the element, for the model to beat */
function baseline() {
  const file = id === 'tower' || id === 'portico' ? 'tower.ts' : 'grounds.ts';
  return readFileSync(join(ROOT, 'src/rooms/sites/bodhgaya', file), 'utf8');
}

const system = [
  readFileSync('scripts/temple/brief.md', 'utf8'),
  `\n## Your element: ${el.title}\n\n${el.brief}\n\nTriangle budget: ${el.budget.toLocaleString('en')}.`,
  el.keepClear?.length ? `\nKeep-clear boxes (no geometry inside):\n${el.keepClear.map((k) => `- ${k.name}: x ${k.box.x.join('…')}, y ${k.box.y.join('…')}, z ${k.box.z.join('…')}`).join('\n')}` : '',
  '\n## kit.ts\n```ts\n' + readFileSync(KIT, 'utf8') + '```',
  `\n## The current hand-made version (${id === 'tower' || id === 'portico' ? 'tower.ts' : 'grounds.ts'}; site coordinates, +x east, not your frame)\n\`\`\`ts\n${baseline()}\`\`\``,
].join('\n');

const refs = el.refs
  .map((r, i) => ({ src: join(ROOT, 'reference/bodhgaya', r), name: `${String(i + 1).padStart(2, '0')}-${r.split('/').pop()}` }))
  .filter((r) => existsSync(r.src))
  .map((r) => jpg(r.src, r.name));
log(`${refs.length} reference photos, ${rounds} rounds`);

const turns: Turn[] = [{
  role: 'user', images: refs,
  text: `Reference photographs 01–${String(refs.length).padStart(2, '0')} of the real ${el.title} are attached. Study them closely first, then write the module. Round 1 of ${rounds}.`,
}];

let best: { round: number; src: string; score: number } | undefined;
for (let round = 1; round <= rounds; round++) {
  const t0 = Date.now();
  let baked: ReturnType<typeof bake> | undefined;
  let src: string | undefined;
  let bakedDir = '';
  // a round may spend a couple of quick retries on code that doesn't compile or run
  for (let attempt = 0; attempt <= FIX_TRIES; attempt++) {
    const reply = await kimi(system, turns);
    turns.push({ role: 'assistant', text: reply, images: [] });
    src = code(reply);
    const name = `r${round}${attempt ? `-fix${attempt}` : ''}`;
    writeFileSync(join(WORK, `${name}-reply.md`), reply);
    if (!src) {
      turns.push({ role: 'user', images: [], text: 'No ```ts block was found. Output the complete module in a single ```ts block.' });
      continue;
    }
    const modFile = join(WORK, `${name}.ts`);
    writeFileSync(modFile, forNode(src));
    bakedDir = join(WORK, name);
    baked = bake(modFile, bakedDir);
    if (baked.ok) break;
    log(`${name}: bake failed: ${baked.log.split('\n').find((l) => /Error|error/.test(l))?.slice(0, 160) ?? 'see log'}`);
    turns.push({ role: 'user', images: [], text: `That module failed to run:\n\`\`\`\n${baked.log.slice(-2500)}\n\`\`\`\nFix it and output the complete module.` });
  }
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  if (!baked?.ok || !src) { log(`round ${round}: FAILED after ${mins} min`); continue; }
  const s = baked.stats;
  const violations = Object.entries(s.keepClearViolations ?? {});
  log(`round ${round}: ${s.triangles} triangles (budget ${s.budget}), bounds ${JSON.stringify(s.bounds)}, ${violations.length ? 'KEEP-CLEAR VIOLATED' : 'clear'}, ${mins} min`);
  // prefer rounds that respect the rules; among those, the latest
  const score = round + (violations.length ? -100 : 0) + (s.overBudget ? -50 : 0);
  if (!best || score >= best.score) best = { round, src, score };
  if (round < rounds) {
    turns.push({
      role: 'user', images: VIEWS.map((v) => renderImg(bakedDir, v)),
      text: `Renders of your round ${round} build: ${VIEWS.join(', ')}. Stats: ${JSON.stringify(s)}.${violations.length ? ` KEEP-CLEAR VIOLATIONS (must be zero): ${violations.map(([k, n]) => `${n} triangles in ${k}`).join('; ')}.` : ''}${s.overBudget ? ` OVER BUDGET: ${s.triangles} > ${s.budget}.` : ''}\nCompare against the reference photographs hard. List the biggest differences (silhouette and proportions first), then output the complete revised module. Round ${round + 1} of ${rounds}.`,
    });
  }
}

if (!best) throw new Error('no round baked');
const header = `// @ts-nocheck: written by Kimi K3.1 Pro (scripts/temple/kimi.ts, ${id} round ${best.round}); regenerate rather than hand-edit.\n`;
writeFileSync(join(ROOT, 'src/rooms/sites/bodhgaya/kimi', `${id}.ts`), header + forApp(best.src));
log(`final: round ${best.round} -> src/rooms/sites/bodhgaya/kimi/${id}.ts`);
