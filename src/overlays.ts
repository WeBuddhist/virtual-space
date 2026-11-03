import { pick, t } from './i18n';
import { INSTRUMENTS, type InstrumentDef } from './instruments';
import type { InstrumentId } from './rooms/types';

const BEADS_PER_ROUND = 108;

/** a mala drawn as a vertical loop; sweeping it advances one bead at a time */
export class Mala {
  readonly el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private countEl: HTMLElement;
  private roundEl: HTMLElement;
  private offset = 0;
  private velocity = 0;
  private counted = 0;
  private dragging = false;
  private lastY = 0;
  private raf = 0;
  open = false;

  constructor(host: HTMLElement, private onBead: () => void, private onClose: () => void) {
    this.el = host;
    host.innerHTML = `
      <canvas class="mala-canvas" aria-hidden="true"></canvas>
      <div class="mala-count"><strong>0</strong><span> / ${BEADS_PER_ROUND}</span>
        <p class="mala-round" data-i18n="firstRound"></p>
        <p class="mala-help" data-i18n="beadsHelp"></p></div>
      <div class="overlay-bar"><button class="chip" data-act="close"><span>←</span> <span data-i18n="fold"></span></button></div>`;
    this.canvas = host.querySelector('canvas')!;
    this.countEl = host.querySelector('.mala-count strong')!;
    this.roundEl = host.querySelector('.mala-round')!;
    host.querySelector('[data-act=close]')!.addEventListener('click', () => this.onClose());
    this.canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastY = e.clientY;
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dy = e.clientY - this.lastY;
      this.lastY = e.clientY;
      this.velocity = dy / 26;
      this.advance(dy / 26);
    });
    const end = () => { this.dragging = false; };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    this.canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.advance(Math.sign(e.deltaY) * 0.5); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!this.open) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') this.advance(1);
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') this.advance(-1);
    });
  }

  show() {
    this.open = true;
    this.el.hidden = false;
    this.loop();
  }

  hide() {
    this.open = false;
    this.el.hidden = true;
    cancelAnimationFrame(this.raf);
  }

  private advance(d: number) {
    const before = Math.floor(this.offset);
    this.offset += d;
    const after = Math.floor(this.offset);
    if (after > before) {
      for (let i = before; i < after; i++) {
        this.counted++;
        this.onBead();
      }
      this.renderCount();
    }
  }

  renderCount() {
    const n = this.counted % BEADS_PER_ROUND;
    const rounds = Math.floor(this.counted / BEADS_PER_ROUND);
    this.countEl.textContent = String(n);
    this.roundEl.textContent = rounds > 0 ? t('roundsDone', { n: rounds }) : t('firstRound');
  }

  private loop = () => {
    if (!this.open) return;
    if (!this.dragging && Math.abs(this.velocity) > 0.01) {
      this.velocity *= 0.9;
      this.advance(this.velocity);
    }
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw() {
    const c = this.canvas;
    const dpr = Math.min(2, devicePixelRatio);
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    // stadium path: two straights joined by semicircles
    const r = Math.min(w * 0.09, 46);
    const straight = Math.min(h * 0.62, 420);
    const cx = w / 2, top = (h - straight) / 2 - 20;
    const per = Math.PI * r;
    const total = straight * 2 + per * 2;
    const visible = 40;
    const spacing = total / visible;
    const beads: { x: number; y: number; front: boolean; guru: boolean }[] = [];
    for (let i = 0; i < visible; i++) {
      let s = ((i - (this.offset % visible)) * spacing) % total;
      if (s < 0) s += total;
      let x: number, y: number, front: boolean;
      if (s < straight) { x = cx + r; y = top + s; front = true; }
      else if (s < straight + per) { const a = (s - straight) / r; x = cx + Math.cos(a) * r; y = top + straight + Math.sin(a) * r; front = a < Math.PI / 2; }
      else if (s < straight * 2 + per) { x = cx - r; y = top + straight - (s - straight - per); front = false; }
      else { const a = Math.PI + (s - straight * 2 - per) / r; x = cx + Math.cos(a) * r; y = top + Math.sin(a) * r; front = a > Math.PI * 1.5; }
      const beadIndex = Math.floor(this.offset) - Math.floor(this.offset % visible) + i;
      beads.push({ x, y, front, guru: ((beadIndex % BEADS_PER_ROUND) + BEADS_PER_ROUND) % BEADS_PER_ROUND === 0 });
    }
    beads.sort((a, b) => Number(a.front) - Number(b.front));
    for (const b of beads) {
      const size = (b.front ? 17 : 13) * (b.guru ? 1.35 : 1);
      const grad = g.createRadialGradient(b.x - size * 0.35, b.y - size * 0.35, size * 0.1, b.x, b.y, size);
      if (b.guru) {
        grad.addColorStop(0, '#f6d98a'); grad.addColorStop(1, '#8a5a12');
      } else {
        grad.addColorStop(0, b.front ? '#f2b98a' : '#c48a60');
        grad.addColorStop(0.7, b.front ? '#c2703c' : '#8e5230');
        grad.addColorStop(1, '#6b3518');
      }
      g.fillStyle = grad;
      g.beginPath();
      g.arc(b.x, b.y, size, 0, Math.PI * 2);
      g.fill();
    }
  }
}


/** the temple's instruments: tap to strike, keep a steady beat, or circle a bowl's rim */
export class InstrumentStage {
  readonly el: HTMLElement;
  private tray: HTMLElement;
  private art: HTMLButtonElement;
  private hint: HTMLElement;
  private autoBtn: HTMLButtonElement;
  private timer = 0;
  private current: InstrumentDef;
  private rubAngle: number | null = null;
  private rubSpeed = 0;
  private raf = 0;
  open = false;

  constructor(
    host: HTMLElement,
    private ids: InstrumentId[],
    private onStrike: (id: InstrumentId) => void,
    private onRub: (intensity: number) => void,
    private onClose: () => void,
  ) {
    this.el = host;
    this.current = INSTRUMENTS[ids[0]];
    host.innerHTML = `
      <div class="inst-tray" role="tablist"></div>
      <button class="inst-art"></button>
      <p class="inst-hint"></p>
      <div class="overlay-bar">
        <button class="chip" data-act="auto"><span class="ico">▷</span> <span class="lbl"></span></button>
        <button class="chip icon" data-act="close" data-i18n-label="close">✕</button>
      </div>`;
    this.tray = host.querySelector('.inst-tray')!;
    this.art = host.querySelector('.inst-art')!;
    this.hint = host.querySelector('.inst-hint')!;
    this.autoBtn = host.querySelector('[data-act=auto]')!;
    this.tray.hidden = ids.length < 2;
    this.art.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.current.rub) {
        this.art.setPointerCapture(e.pointerId);
        this.rubAngle = this.angle(e);
      }
      this.strike();
    });
    this.art.addEventListener('pointermove', (e) => {
      if (this.rubAngle === null) return;
      const a = this.angle(e);
      let d = a - this.rubAngle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.rubAngle = a;
      this.rubSpeed = Math.min(1, this.rubSpeed + Math.abs(d) * 0.6);
    });
    const endRub = () => { this.rubAngle = null; };
    this.art.addEventListener('pointerup', endRub);
    this.art.addEventListener('pointercancel', endRub);
    this.autoBtn.addEventListener('click', () => this.toggleAuto());
    host.querySelector('[data-act=close]')!.addEventListener('click', () => this.onClose());
    window.addEventListener('keydown', (e) => {
      if (this.open && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.strike(); }
    });
    this.render();
  }

  private angle(e: PointerEvent) {
    const r = this.art.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  }

  select(id: InstrumentId) {
    if (this.timer) this.toggleAuto();
    this.current = INSTRUMENTS[id];
    this.render();
  }

  strike() {
    this.onStrike(this.current.id);
    for (const sel of ['.inst-body', '.inst-striker']) {
      const el = this.art.querySelector<SVGElement>(sel);
      if (!el) continue;
      el.classList.remove('hit');
      void el.getBoundingClientRect();
      el.classList.add('hit');
    }
  }

  private toggleAuto() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = 0;
    } else {
      this.strike();
      this.timer = window.setInterval(() => this.strike(), this.current.autoplayMs);
    }
    this.renderAuto();
  }

  render() {
    this.tray.innerHTML = '';
    for (const id of this.ids) {
      const b = document.createElement('button');
      b.className = 'chip';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(id === this.current.id));
      b.textContent = pick(INSTRUMENTS[id].name);
      b.addEventListener('click', () => this.select(id));
      this.tray.append(b);
    }
    this.art.innerHTML = this.current.art;
    this.art.dataset.motion = this.current.motion;
    this.art.setAttribute('aria-label', pick(this.current.name));
    this.hint.textContent = this.current.rub ? t('bowlHint') : t('tapHint');
    this.renderAuto();
  }

  renderAuto() {
    this.autoBtn.querySelector('.ico')!.textContent = this.timer ? '❚❚' : '▷';
    this.autoBtn.querySelector('.lbl')!.textContent = this.timer ? t('pause') : t('autoplay');
  }

  private rubLoop = () => {
    if (!this.open) return;
    this.rubSpeed *= 0.94;
    this.onRub(this.current.rub ? this.rubSpeed : 0);
    this.raf = requestAnimationFrame(this.rubLoop);
  };

  show(id?: InstrumentId) {
    this.open = true;
    this.el.hidden = false;
    if (id && id !== this.current.id) this.select(id);
    cancelAnimationFrame(this.raf);
    this.rubLoop();
  }

  hide() {
    this.open = false;
    this.el.hidden = true;
    if (this.timer) this.toggleAuto();
    cancelAnimationFrame(this.raf);
    this.rubSpeed = 0;
    this.onRub(0);
  }
}
