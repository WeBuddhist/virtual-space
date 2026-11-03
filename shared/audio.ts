// Per-temple audio, edited in the local audio studio (`npm run dev`, then /__studio)
// and stored at public/audio/<temple>/manifest.json next to the sound files.

export type Text2 = { en: string; bo: string };

export interface Track {
  /** file name inside public/audio/<temple>/ */
  src: string;
  title: Text2;
  credit: string;
  license: string;
  /** 0..1, multiplied with the listener's own volume for that channel */
  volume: number;
}

export interface AudioManifest {
  version: 1;
  /** looping background sounds (wind, birds, crowd); all play together */
  ambient: Track[];
  /** chanting a visitor can choose to listen to */
  chants: Track[];
  /** optional background music */
  music: Track[];
  /** recorded samples that replace the synthesized instrument sounds */
  instruments: Partial<Record<string, Track>>;
  /** which chant plays for everyone at the dawn and evening services */
  services: { dawn: string | null; evening: string | null };
}

export const EMPTY_MANIFEST: AudioManifest = {
  version: 1, ambient: [], chants: [], music: [], instruments: {}, services: { dawn: null, evening: null },
};

export const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.oga', '.wav', '.m4a', '.aac', '.webm', '.flac', '.opus'];

/** tolerant reader: fills gaps so older or hand-edited manifests still load */
export function normalizeManifest(raw: unknown): AudioManifest {
  const m = (raw && typeof raw === 'object' ? raw : {}) as Partial<AudioManifest>;
  const track = (t: any): Track | null =>
    t && typeof t.src === 'string'
      ? {
          src: t.src,
          title: { en: String(t.title?.en ?? t.src), bo: String(t.title?.bo ?? '') },
          credit: String(t.credit ?? ''),
          license: String(t.license ?? ''),
          volume: Number.isFinite(t.volume) ? Math.min(1, Math.max(0, t.volume)) : 0.8,
        }
      : null;
  const list = (a: unknown) => (Array.isArray(a) ? a.map(track).filter((t): t is Track => !!t) : []);
  const instruments: AudioManifest['instruments'] = {};
  for (const [k, v] of Object.entries(m.instruments ?? {})) {
    const t = track(v);
    if (t) instruments[k] = t;
  }
  return {
    version: 1,
    ambient: list(m.ambient),
    chants: list(m.chants),
    music: list(m.music),
    instruments,
    services: { dawn: m.services?.dawn ?? null, evening: m.services?.evening ?? null },
  };
}
