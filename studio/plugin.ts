// Local audio studio: a dev-server-only page at /__studio for adding sounds to
// each temple. Files land in public/audio/<temple>/ next to manifest.json, so
// committing and pushing them is all it takes to publish.
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { AUDIO_EXTENSIONS, EMPTY_MANIFEST, normalizeManifest } from '../shared/audio';
import { TEMPLE_IDS } from '../shared/rooms';

const ROOT = join(process.cwd(), 'public', 'audio');
const MAX_BYTES = 25 * 1024 * 1024; // Cloudflare's per-asset limit

function readBody(req: IncomingMessage, limit = MAX_BYTES): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) { reject(new Error('File is larger than 25 MB')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

/** a temple id from the allow-list, or null */
const templeOf = (url: URL) => {
  const t = url.searchParams.get('temple') ?? '';
  return (TEMPLE_IDS as readonly string[]).includes(t) ? t : null;
};

/** keep names simple and inside the temple folder */
function safeName(raw: string) {
  const name = basename(raw).normalize('NFC').replace(/[^\p{L}\p{N}._ -]/gu, '').replace(/\s+/g, '-').slice(0, 120);
  return name && !name.startsWith('.') && name !== 'manifest.json' ? name : null;
}

async function readManifest(temple: string) {
  try {
    return normalizeManifest(JSON.parse(await readFile(join(ROOT, temple, 'manifest.json'), 'utf8')));
  } catch {
    return EMPTY_MANIFEST;
  }
}

async function listFiles(temple: string) {
  try {
    const names = await readdir(join(ROOT, temple));
    const files = await Promise.all(names
      .filter((n) => AUDIO_EXTENSIONS.includes(extname(n).toLowerCase()))
      .map(async (n) => ({ name: n, bytes: (await stat(join(ROOT, temple, n))).size })));
    return files.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function audioStudio(): Plugin {
  return {
    name: 'webuddhist-audio-studio',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/__studio')) return next();
        try {
          if (url.pathname === '/__studio' || url.pathname === '/__studio/') {
            const html = await readFile(join(process.cwd(), 'studio', 'studio.html'), 'utf8');
            res.setHeader('content-type', 'text/html; charset=utf-8');
            res.end(await server.transformIndexHtml(req.url ?? '/__studio', html));
            return;
          }
          if (url.pathname === '/__studio/api/state' && req.method === 'GET') {
            const temples = await Promise.all(TEMPLE_IDS.map(async (id) => ({
              id, manifest: await readManifest(id), files: await listFiles(id),
            })));
            return send(res, 200, { temples });
          }
          const temple = templeOf(url);
          if (!temple) return send(res, 400, { error: 'Unknown temple' });
          const dir = join(ROOT, temple);

          if (url.pathname === '/__studio/api/upload' && req.method === 'POST') {
            const name = safeName(url.searchParams.get('name') ?? '');
            if (!name || !AUDIO_EXTENSIONS.includes(extname(name).toLowerCase())) {
              return send(res, 400, { error: `Use an audio file: ${AUDIO_EXTENSIONS.join(', ')}` });
            }
            const body = await readBody(req);
            await mkdir(dir, { recursive: true });
            await writeFile(join(dir, name), body);
            return send(res, 200, { name, bytes: body.length });
          }
          if (url.pathname === '/__studio/api/manifest' && req.method === 'PUT') {
            const manifest = normalizeManifest(JSON.parse((await readBody(req, 1024 * 1024)).toString('utf8')));
            await mkdir(dir, { recursive: true });
            await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
            server.ws.send({ type: 'custom', event: 'audio-manifest', data: { temple } });
            return send(res, 200, manifest);
          }
          if (url.pathname === '/__studio/api/file' && req.method === 'DELETE') {
            const name = safeName(url.searchParams.get('name') ?? '');
            if (!name) return send(res, 400, { error: 'Bad file name' });
            await rm(join(dir, name), { force: true });
            return send(res, 200, { deleted: name });
          }
          send(res, 404, { error: 'Not found' });
        } catch (err) {
          send(res, 500, { error: (err as Error).message });
        }
      });
    },
  };
}
