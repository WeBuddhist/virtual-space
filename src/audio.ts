import { EMPTY_MANIFEST, normalizeManifest, type AudioManifest, type Track } from '../shared/audio';
import type { InstrumentId } from './rooms/types';

/** instruments (and the sung bowl) with a shared real recording in /audio/instruments/ */
const SHARED_SAMPLES = ['singing-bowl', 'singing-bowl-rub', 'bell-dorje', 'damaru', 'nga-drum', 'rolmo', 'gong', 'temple-bell', 'woodfish', 'dharma-drum'];
/** the short drum and wood strokes were limited to keep their peaks; lift them to sit with the rest */
const SHARED_GAIN: Record<string, number> = { woodfish: 1.3, 'nga-drum': 1.15, 'dharma-drum': 1.1 };

// Sounds come from the temple's audio manifest (recordings added in the local
// audio studio). Anything not provided there is synthesized with Web Audio.

export type Bus = 'ambient' | 'effects' | 'chant' | 'music';
export const BUSES: Bus[] = ['ambient', 'effects', 'chant', 'music'];

const saved = (() => {
  try { return JSON.parse(localStorage.getItem('webuddhist.audio') ?? '{}'); } catch { return {}; }
})();

interface Playing { el: HTMLAudioElement; node: MediaElementAudioSourceNode; gain: GainNode }

export class AudioEngine {
  ctx?: AudioContext;
  private master?: GainNode;
  private buses = {} as Record<Bus, GainNode>;
  levels: Record<Bus, number> = { ambient: 0.6, effects: 0.8, chant: 0.7, music: 0.5, ...saved.levels };
  background: boolean = saved.background ?? false;
  enabled = false;
  isDay = () => true;
  manifest: AudioManifest = EMPTY_MANIFEST;
  private base = '';
  private samples = new Map<string, AudioBuffer>();
  private ambientPlaying: Playing[] = [];
  private synthAmbient?: () => void;
  private chantStop?: () => void;
  private musicPlaying?: Playing;
  chanting = false;
  chantIndex = 0;
  musicIndex: number | null = null;
  private listeners = new Set<() => void>();

  onChange(fn: () => void) { this.listeners.add(fn); }
  private emit() {
    try { localStorage.setItem('webuddhist.audio', JSON.stringify({ levels: this.levels, background: this.background })); } catch { /* ignore */ }
    this.listeners.forEach((fn) => fn());
  }

  /** load public/audio/<temple>/manifest.json; a missing manifest means synth only */
  async loadManifest(temple: string) {
    this.base = `/audio/${temple}/`;
    try {
      const res = await fetch(`${this.base}manifest.json`, { cache: 'no-cache' });
      this.manifest = res.ok ? normalizeManifest(await res.json()) : EMPTY_MANIFEST;
    } catch {
      this.manifest = EMPTY_MANIFEST;
    }
    if (this.ctx) await this.decodeSamples();
    this.emit();
  }

  /** seconds a communal service lasts: the service chant's length, else two minutes */
  serviceSeconds = 120;

  async enable() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio unsupported');
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      for (const bus of BUSES) {
        const g = this.ctx.createGain();
        g.gain.value = this.levels[bus];
        g.connect(this.master);
        this.buses[bus] = g;
      }
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx || !this.enabled) return;
        if (document.hidden && !this.background) this.ctx.suspend();
        else this.ctx.resume();
      });
      this.startAmbient();
      this.decodeSamples();
    }
    await this.ctx.resume();
    this.enabled = true;
    this.emit();
  }

  async disable() {
    this.enabled = false;
    this.stopChant();
    this.stopMusic();
    await this.ctx?.suspend();
    this.emit();
  }

  setLevel(bus: Bus, v: number) {
    this.levels[bus] = v;
    if (this.ctx) this.buses[bus]?.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    this.emit();
  }

  setBackground(on: boolean) {
    this.background = on;
    this.emit();
  }

  get effectsAudible() { return this.enabled && this.levels.effects > 0; }

  // ---- recorded tracks -----------------------------------------------------

  private playTrack(track: Track, bus: Bus, loop: boolean, offset = 0): Playing {
    const ctx = this.ctx!;
    const el = new Audio(this.base + encodeURIComponent(track.src));
    el.loop = loop;
    el.preload = 'auto';
    const node = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    gain.gain.value = track.volume;
    node.connect(gain).connect(this.buses[bus]);
    const start = () => {
      if (offset && Number.isFinite(el.duration)) el.currentTime = offset % el.duration;
      el.play().catch(() => {});
    };
    if (el.readyState >= 1) start();
    else el.addEventListener('loadedmetadata', start, { once: true });
    return { el, node, gain };
  }

  private stopTrack(p?: Playing) {
    if (!p) return;
    p.el.pause();
    p.node.disconnect();
    p.gain.disconnect();
  }

  private async decodeSamples() {
    if (!this.ctx) return;
    this.samples.clear();
    // a temple's own recording if its manifest has one, else the shared real recording
    // (see public/audio/instruments/SOURCES.md); the synthesized voice is the last resort
    const urls = new Map<string, string>(SHARED_SAMPLES.map((id) => [id, `/audio/instruments/${id}.mp3`]));
    for (const [id, t] of Object.entries(this.manifest.instruments)) if (t) urls.set(id, this.base + encodeURIComponent(t.src));
    await Promise.all([...urls].map(async ([id, url]) => {
      try {
        const res = await fetch(url);
        if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('audio')) return;
        this.samples.set(id, await this.ctx!.decodeAudioData(await res.arrayBuffer()));
      } catch { /* fall back to the synthesized instrument */ }
    }));
  }

  // ---- ambience ------------------------------------------------------------

  private startAmbient() {
    this.ambientPlaying.forEach((p) => this.stopTrack(p));
    this.ambientPlaying = [];
    this.synthAmbient?.();
    this.synthAmbient = undefined;
    if (this.manifest.ambient.length) {
      this.ambientPlaying = this.manifest.ambient.map((t) => this.playTrack(t, 'ambient', true));
    } else {
      this.synthAmbient = this.windAndBirds();
    }
  }

  private noiseBuffer(seconds: number, brown = false) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  private windAndBirds() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4, true);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const gust = ctx.createGain();
    gust.gain.value = 0.35;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.22;
    lfo.connect(lfoGain).connect(gust.gain);
    src.connect(lp).connect(gust).connect(this.buses.ambient);
    src.start();
    lfo.start();
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (this.enabled) this.isDay() ? this.bird() : this.cricket();
        schedule();
      }, 3500 + Math.random() * 8000);
    };
    schedule();
    return () => { clearTimeout(timer); src.stop(); lfo.stop(); gust.disconnect(); };
  }

  private bird() {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    const base = 2400 + Math.random() * 1600;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.13;
      this.tone(t, base, 0.05, 0.1, 'ambient', base * 1.45, 0.01);
    }
  }

  private cricket() {
    const t0 = this.ctx!.currentTime;
    for (let i = 0; i < 6; i++) this.tone(t0 + i * 0.06, 4600, 0.012, 0.04, 'ambient');
  }

  // ---- synthesis building blocks ----------------------------------------------

  /** one damped partial; `to` glides the pitch, `attack` softens the start */
  private tone(t: number, freq: number, amp: number, decay: number, bus: Bus = 'effects', to?: number, attack = 0.004, type: OscillatorType = 'sine') {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + Math.min(decay, 0.25));
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(this.buses[bus]);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  private noise(t: number, freq: number, q: number, amp: number, decay: number, type: BiquadFilterType = 'bandpass') {
    const ctx = this.ctx!;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer(Math.min(decay + 0.1, 6));
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(amp, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    n.connect(f).connect(g).connect(this.buses.effects);
    n.start(t);
    n.stop(t + decay + 0.05);
  }

  /** a struck metal body: inharmonic partials, each with a slow beat */
  private metal(t: number, base: number, partials: [number, number, number][], beat = 1.2) {
    for (const [mult, amp, decay] of partials) {
      for (const d of [0, beat]) this.tone(t, base * mult + d, amp / 2, decay, 'effects', undefined, 0.006);
    }
  }

  // ---- instruments -----------------------------------------------------------

  play(id: InstrumentId, velocity = 1) {
    if (!this.effectsAudible) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const sample = this.samples.get(id);
    if (sample) {
      const src = ctx.createBufferSource();
      src.buffer = sample;
      const g = ctx.createGain();
      const own = this.manifest.instruments[id];
      g.gain.value = (own?.volume ?? 0.8 * (SHARED_GAIN[id] ?? 1)) * velocity;
      src.connect(g).connect(this.buses.effects);
      src.start(t);
      return;
    }
    const v = velocity;
    switch (id) {
      case 'woodfish':
        this.tone(t, 690, 0.6 * v, 0.16, 'effects', 650);
        this.tone(t, 1180, 0.22 * v, 0.08);
        this.noise(t, 1900, 2, 0.35 * v, 0.02);
        break;
      case 'singing-bowl':
        this.metal(t, 196, [[1, 0.2 * v, 7], [2.76, 0.09 * v, 4.5], [5.4, 0.04 * v, 2.2]]);
        break;
      case 'bell-dorje': // drilbu: bright, shimmering, quick repeated strikes of the clapper
        for (let i = 0; i < 3; i++) {
          const ti = t + i * 0.085;
          const a = v * (i === 0 ? 1 : 0.55);
          this.metal(ti, 1320, [[1, 0.09 * a, 2.6], [2.32, 0.05 * a, 1.6], [3.9, 0.03 * a, 0.9], [5.1, 0.018 * a, 0.6]], 3.5);
        }
        break;
      case 'damaru': // two pellets hitting the skins in quick alternation
        for (let i = 0; i < 6; i++) {
          const ti = t + i * 0.075;
          this.tone(ti, i % 2 ? 330 : 280, 0.35 * v, 0.09, 'effects', 210);
          this.noise(ti, 2500, 1.5, 0.12 * v, 0.03);
        }
        break;
      case 'nga-drum': // large frame drum on a stand: deep, round thump
        this.tone(t, 92, 0.9 * v, 0.9, 'effects', 62);
        this.tone(t, 148, 0.25 * v, 0.35, 'effects', 120);
        this.noise(t, 600, 0.8, 0.25 * v, 0.07, 'lowpass');
        break;
      case 'rolmo': // flat cymbals clashed and left to ring
        this.noise(t, 5200, 0.7, 0.35 * v, 2.6);
        this.noise(t, 9000, 0.6, 0.16 * v, 1.8, 'highpass');
        this.metal(t, 410, [[1, 0.03 * v, 2], [2.9, 0.025 * v, 1.6], [4.7, 0.02 * v, 1.2]], 6);
        break;
      case 'gong': // Thai bossed gong: pitched centre, slow bloom
        this.tone(t, 128, 0.7 * v, 6, 'effects', 124, 0.03);
        this.tone(t, 256.5, 0.2 * v, 4, 'effects', undefined, 0.05);
        this.tone(t, 383, 0.08 * v, 2.5);
        this.noise(t, 300, 0.7, 0.18 * v, 0.12, 'lowpass');
        break;
      case 'temple-bell': // large bronze bell struck with a log: hum, strike tone, long beating tail
        this.metal(t, 72, [[1, 0.5 * v, 14], [2, 0.3 * v, 10], [2.42, 0.18 * v, 7], [3.1, 0.1 * v, 5], [4.6, 0.05 * v, 3]], 0.9);
        this.noise(t, 220, 0.6, 0.3 * v, 0.15, 'lowpass');
        break;
      case 'dharma-drum': // big barrel drum: boom with a skin slap
        this.tone(t, 64, 1 * v, 1.4, 'effects', 46);
        this.tone(t, 110, 0.3 * v, 0.4, 'effects', 80);
        this.noise(t, 900, 0.7, 0.3 * v, 0.06, 'lowpass');
        break;
    }
  }

  private rub?: { gains: GainNode[]; oscs: OscillatorNode[] };
  private rubLoop?: GainNode;
  /** rubbing the rim of a singing bowl: intensity 0..1 from the circling speed */
  bowlRub(intensity: number) {
    if (!this.effectsAudible) return;
    const ctx = this.ctx!;
    const sung = this.samples.get('singing-bowl-rub');
    if (sung) {
      // a real bowl sung with a mallet, looped, swelling with the circling
      if (!this.rubLoop) {
        const src = ctx.createBufferSource();
        src.buffer = sung;
        src.loop = true;
        this.rubLoop = ctx.createGain();
        this.rubLoop.gain.value = 0;
        src.connect(this.rubLoop).connect(this.buses.effects);
        src.start();
      }
      this.rubLoop.gain.setTargetAtTime(0.9 * Math.min(1, intensity), ctx.currentTime, 0.3);
      return;
    }
    if (!this.rub) {
      const parts: [number, number][] = [[196, 0.22], [196 * 2.76, 0.08], [196 * 5.4, 0.03]];
      const gains: GainNode[] = [], oscs: OscillatorNode[] = [];
      for (const [f, a] of parts) {
        for (const d of [0, 1.1]) {
          const o = ctx.createOscillator();
          o.frequency.value = f + d;
          const g = ctx.createGain();
          g.gain.value = 0;
          g.gain.setValueAtTime(0, ctx.currentTime);
          (g as GainNode & { peak?: number }).peak = a / 2;
          o.connect(g).connect(this.buses.effects);
          o.start();
          gains.push(g);
          oscs.push(o);
        }
      }
      this.rub = { gains, oscs };
    }
    for (const g of this.rub.gains) {
      g.gain.setTargetAtTime(((g as GainNode & { peak?: number }).peak ?? 0) * Math.min(1, intensity), ctx.currentTime, 0.25);
    }
  }

  bead() {
    if (!this.effectsAudible) return;
    this.noise(this.ctx!.currentTime, 2800 + Math.random() * 600, 2, 0.25, 0.03);
  }

  /** the bowl sound used when a prostration cycle begins */
  bowl() { this.play('singing-bowl', 0.8); }

  // ---- chanting and music ------------------------------------------------------

  /** personal or communal chanting; offset lets everyone hear the same moment */
  startChant(offsetSeconds = 0, index = this.chantIndex) {
    if (!this.enabled) return;
    this.stopChant(false);
    const track = this.manifest.chants[index];
    if (track) {
      this.chantIndex = index;
      const p = this.playTrack(track, 'chant', true, offsetSeconds);
      this.chantStop = () => this.stopTrack(p);
    } else {
      this.chantStop = this.chantDrone();
    }
    this.chanting = true;
    this.emit();
  }

  /** the manifest chant chosen for a service, by file name */
  serviceChantIndex(kind: 'dawn' | 'evening') {
    const src = this.manifest.services[kind];
    const i = this.manifest.chants.findIndex((c) => c.src === src);
    return i >= 0 ? i : 0;
  }

  stopChant(notify = true) {
    this.chantStop?.();
    this.chantStop = undefined;
    if (this.chanting) {
      this.chanting = false;
      if (notify) this.emit();
    }
  }

  startMusic(index: number) {
    if (!this.enabled || !this.manifest.music[index]) return;
    this.stopMusic(false);
    this.musicIndex = index;
    this.musicPlaying = this.playTrack(this.manifest.music[index], 'music', true);
    this.emit();
  }

  stopMusic(notify = true) {
    this.stopTrack(this.musicPlaying);
    this.musicPlaying = undefined;
    this.musicIndex = null;
    if (notify) this.emit();
  }

  /** placeholder "Om" drone: a breathing voice-like tone through vowel formants */
  private chantDrone() {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8);
    out.connect(this.buses.chant);
    const voices: OscillatorNode[] = [];
    const formants = [400, 780].map((f) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 6;
      bp.connect(out);
      return bp;
    });
    const mix = ctx.createGain();
    mix.gain.value = 0.6;
    formants.forEach((bp) => mix.connect(bp));
    for (const f of [98, 98.5, 146.8]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(mix);
      o.start();
      voices.push(o);
    }
    const sub = ctx.createOscillator();
    sub.frequency.value = 49;
    const subG = ctx.createGain();
    subG.gain.value = 0.25;
    sub.connect(subG).connect(out);
    sub.start();
    voices.push(sub);
    // each breath: open "o" then close to "m", ~7s per cycle
    let stopped = false;
    let timer = 0;
    const breathe = () => {
      if (stopped) return;
      const t = ctx.currentTime;
      mix.gain.cancelScheduledValues(t);
      mix.gain.setValueAtTime(0.05, t);
      mix.gain.linearRampToValueAtTime(0.7, t + 0.8);
      mix.gain.linearRampToValueAtTime(0.5, t + 4);
      mix.gain.linearRampToValueAtTime(0.05, t + 6.6);
      formants[0].frequency.setValueAtTime(420, t);
      formants[0].frequency.linearRampToValueAtTime(260, t + 4.5);
      formants[1].frequency.setValueAtTime(800, t);
      formants[1].frequency.linearRampToValueAtTime(320, t + 4.5);
      timer = window.setTimeout(breathe, 7000);
    };
    breathe();
    return () => {
      stopped = true;
      clearTimeout(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => { voices.forEach((o) => o.stop()); out.disconnect(); }, 2000);
    };
  }

  /** re-read the manifest, e.g. after the studio saved it */
  async reload(temple: string) {
    await this.loadManifest(temple);
    if (this.ctx) this.startAmbient();
  }
}
