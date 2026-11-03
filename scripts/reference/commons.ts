// Gathers reference photos of a temple from Wikimedia Commons into
// reference/<temple>/<section>/, with manifest.json and CREDITS.md. reference/ is
// gitignored: these photos are for modelling against, not for shipping.
//
//   node --experimental-strip-types scripts/reference/commons.ts bodhgaya

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

type Sources = Record<string, string[]>; // section -> Commons categories

const TEMPLES: Record<string, Sources> = {
  bodhgaya: {
    exterior: ['Exterior of the Mahabodhi Temple', 'Mahabodhi Temple'],
    interior: ['Interior of the Mahabodhi Temple, Bodh Gaya'],
    sculpture: ['Sculptures at the Mahabodhi Temple'],
    'bodhi-tree': ['Bodhi Tree'],
    grounds: ['Buddhapada Shrine, Mahabodhi Temple', 'Butter Lamp House in Bodh Gaya', 'Mucalinda Lake, Bodh Gaya'],
    history: ['History of the Mahabodhi Temple'],
  },
};

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'WeBuddhistSpace/0.1 (reference gathering; https://github.com/Webuddhist-tech/virtual-space)';
const PER_SECTION = 150;
const DEPTH = 2;
const WIDTH = 1600;
// subcategories that are about people, events or other places rather than the building
const SKIP = /people|festival|animals|replica|by year|by decade|videos|maps|logos/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<any> {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (attempt >= 3) throw new Error(`${res.status} for ${url}`);
    await sleep(2000 * (attempt + 1));
  }
}

async function members(category: string, type: 'file' | 'subcat'): Promise<string[]> {
  const out: string[] = [];
  let cont: string | undefined;
  do {
    const d = await api({ action: 'query', list: 'categorymembers', cmtitle: `Category:${category}`, cmtype: type, cmlimit: '500', ...(cont ? { cmcontinue: cont } : {}) });
    out.push(...d.query.categorymembers.map((m: { title: string }) => m.title));
    cont = d.continue?.cmcontinue;
  } while (cont);
  return out;
}

async function filesUnder(category: string, depth: number, seen: Set<string>): Promise<string[]> {
  if (seen.has(category)) return [];
  seen.add(category);
  const files = await members(category, 'file');
  if (depth > 0) {
    for (const sub of await members(category, 'subcat')) {
      const name = sub.replace(/^Category:/, '');
      if (!SKIP.test(name)) files.push(...(await filesUnder(name, depth - 1, seen)));
    }
  }
  return files;
}

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

type Entry = { file: string; section: string; title: string; author: string; license: string; licenseUrl: string; source: string; width: number; height: number; description: string };

async function info(titles: string[]): Promise<any[]> {
  const pages: any[] = [];
  for (let i = 0; i < titles.length; i += 40) {
    const d = await api({ action: 'query', titles: titles.slice(i, i + 40).join('|'), prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(WIDTH) });
    pages.push(...Object.values(d.query.pages));
  }
  return pages;
}

const slug = (s: string) => s.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

async function main() {
  const temple = process.argv[2];
  const sources = TEMPLES[temple];
  if (!sources) throw new Error(`usage: commons.ts <${Object.keys(TEMPLES).join('|')}>`);
  const root = join('reference', temple);
  const manifest: Entry[] = [];
  const taken = new Set<string>();
  const seen = new Set<string>();

  for (const [section, cats] of Object.entries(sources)) {
    const titles = [...new Set((await Promise.all(cats.map((c) => filesUnder(c, c === 'Mahabodhi Temple' ? 0 : DEPTH, seen)))).flat())].filter((t) => !taken.has(t));
    const pages = (await info(titles))
      .map((p) => ({ p, ii: p.imageinfo?.[0] }))
      .filter(({ ii }) => ii && /^image\/(jpeg|png)$/.test(ii.mime) && Math.min(ii.width, ii.height) >= 700)
      .sort((a, b) => b.ii.width * b.ii.height - a.ii.width * a.ii.height)
      .slice(0, PER_SECTION);
    await mkdir(join(root, section), { recursive: true });
    let n = 0;
    for (const { p, ii } of pages) {
      taken.add(p.title);
      const ext = ii.mime === 'image/png' ? 'png' : 'jpg';
      const file = join(section, `${slug(p.title)}.${ext}`);
      const dest = join(root, file);
      try {
        await access(dest);
      } catch {
        const res = await fetch(ii.thumburl ?? ii.url, { headers: { 'User-Agent': UA } });
        if (!res.ok) { console.warn(`skip ${p.title}: ${res.status}`); continue; }
        await writeFile(dest, Buffer.from(await res.arrayBuffer()));
        await sleep(150);
      }
      const m = ii.extmetadata ?? {};
      manifest.push({
        file, section, title: p.title.replace(/^File:/, ''),
        author: strip(m.Artist?.value) || 'unknown', license: m.LicenseShortName?.value ?? '', licenseUrl: m.LicenseUrl?.value ?? '',
        source: ii.descriptionurl, width: ii.width, height: ii.height, description: strip(m.ImageDescription?.value).slice(0, 400),
      });
      n++;
    }
    console.log(`${section}: ${n} of ${titles.length} candidates`);
  }

  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const credits = manifest.map((e) => `- \`${e.file}\` — [${e.title}](${e.source}) by ${e.author}, ${e.license}`).join('\n');
  await writeFile(join(root, 'CREDITS.md'), `# ${temple} reference photos\n\nFrom Wikimedia Commons. Reference for generation only; never shipped.\n\n${credits}\n`);
  console.log(`${manifest.length} photos -> ${root}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
