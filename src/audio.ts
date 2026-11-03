import { TEMPLE } from './temple';

// Every sound is synthesized so the MVP ships without third-party recordings.
// A temple can point `audio.chantSrc` at a real chant file to replace the drone.

export type Bus = 'ambient' | 'effects' | 'chant';

const saved = (() => {
  try { return JSON.parse(localStorage.getItem('ritro.audio') ?? '{}'); } catch { return {}; }
})();

export class AudioEngine {
  ctx?: AudioContext;
  private master?: GainNode;
  private buses = {} as Record<Bus, GainNode>;
  levels: Record<Bus, number> = { ambient: 0.6, effects: 0.8, chant: 0.7, ...saved.levels };
  background: boolean = saved.background ?? false;
  enabled = false;
  isDay = () => true;
  private chantStop?: () => void;
  chanting = false;
  private listeners = new Set<() => void>();

  onChange(fn: () => void) { this.listeners.add(fn); }
  private emit() {
    try { localStorage.setItem('ritro.audio', JSON.stringify({ levels: this.levels, background: this.background })); } catch { /* ignore */ }
    this.listeners.forEach((fn) => fn());
  }

  async enable() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio unsupported');
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      for (const bus of ['ambient', 'effects', 'chant'] as Bus[]) {
        const g = this.ctx.createGain();
        g.gain.value = this.levels[bus];
        g.connect(this.master);
        this.buses[bus] = g;
      }
      this.startAmbient();
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx || !this.enabled) return;
        if (document.hidden && !this.background) this.ctx.suspend();
        else this.ctx.resume();
      });
    }
    await this.ctx.resume();
    this.enabled = true;
    this.emit();
  }

  async disable() {
    this.enabled = false;
    this.stopChant();
    await this.ctx?.suspend();
    this.emit();
  }

  setLevel(bus: Bus, v: number) {
    this.levels[bus] = v;
    this.buses[bus]?.gain.setTargetAtTime(v, this.ctx!.currentTime, 0.05);
    this.emit();
  }

  setBackground(on: boolean) {
    this.background = on;
    this.emit();
  }

  get effectsAudible() { return this.enabled && this.levels.effects > 0; }

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

  private startAmbient() {
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
    const schedule = () => {
      window.setTimeout(() => {
        if (this.enabled) this.isDay() ? this.bird() : this.cricket();
        schedule();
      }, 3500 + Math.random() * 8000);
    };
    schedule();
  }

  private bird() {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    const base = 2400 + Math.random() * 1600;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.13;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.07);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g).connect(this.buses.ambient);
      o.start(t);
      o.stop(t + 0.12);
    }
  }

  private cricket() {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const t = t0 + i * 0.06;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 4600;
      g.gain.setValueAtTime(0.012, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      o.connect(g).connect(this.buses.ambient);
      o.start(t);
      o.stop(t + 0.05);
    }
  }

  /** hollow wood knock: two damped partials and a short noise click */
  moktak(when = 0) {
    if (!this.effectsAudible) return;
    const ctx = this.ctx!;
    const t = Math.max(ctx.currentTime, when);
    for (const [f, a, d] of [[690, 0.6, 0.16], [1180, 0.22, 0.08]] as const) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.94, t + d);
      g.gain.setValueAtTime(a, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(this.buses.effects);
      o.start(t);
      o.stop(t + d + 0.02);
    }
    this.click(t, 1900, 0.35, 0.02);
  }

  private click(t: number, freq: number, amp: number, dur: number) {
    const ctx = this.ctx!;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer(0.05);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(amp, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp).connect(g).connect(this.buses.effects);
    n.start(t);
    n.stop(t + dur + 0.01);
  }

  bead() {
    if (!this.effectsAudible) return;
    this.click(this.ctx!.currentTime, 2800 + Math.random() * 600, 0.25, 0.03);
  }

  /** singing bowl: inharmonic partials with slow beating */
  bowl() {
    if (!this.effectsAudible) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const f = 196;
    for (const [mult, amp, decay] of [[1, 0.18, 7], [2.76, 0.08, 4.5], [5.4, 0.035, 2.2]] as const) {
      for (const detune of [0, 1.3]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f * mult + detune;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp / 2, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        o.connect(g).connect(this.buses.effects);
        o.start(t);
        o.stop(t + decay);
      }
    }
  }

  /** personal or communal chanting; offset lets everyone hear the same moment */
  startChant(offsetSeconds = 0) {
    if (!this.enabled) return;
    this.stopChant();
    const ctx = this.ctx!;
    if (TEMPLE.audio.chantSrc) {
      const el = new Audio(TEMPLE.audio.chantSrc);
      el.crossOrigin = 'anonymous';
      el.loop = true;
      el.currentTime = offsetSeconds;
      const node = ctx.createMediaElementSource(el);
      node.connect(this.buses.chant);
      el.play().catch(() => this.stopChant());
      this.chantStop = () => { el.pause(); node.disconnect(); };
    } else {
      this.chantStop = this.chantDrone();
    }
    this.chanting = true;
    this.emit();
  }

  stopChant() {
    this.chantStop?.();
    this.chantStop = undefined;
    if (this.chanting) {
      this.chanting = false;
      this.emit();
    }
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
    let timer = 0;
    breathe();
    return () => {
      stopped = true;
      clearTimeout(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => { voices.forEach((o) => o.stop()); out.disconnect(); }, 2000);
    };
  }
}
