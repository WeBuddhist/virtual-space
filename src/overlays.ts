import { t } from './i18n';

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

/** wood fish with a mallet: tap to strike, or let it keep a steady beat */
export class WoodFish {
  readonly el: HTMLElement;
  private body: SVGGElement;
  private mallet: SVGGElement;
  private autoBtn: HTMLButtonElement;
  private timer = 0;
  open = false;

  constructor(host: HTMLElement, private onStrike: () => void, private onClose: () => void) {
    this.el = host;
    host.innerHTML = `
      <button class="woodfish" aria-label="">
        <svg viewBox="0 0 240 200" width="240" height="200">
          <defs>
            <radialGradient id="wf" cx="38%" cy="32%" r="75%">
              <stop offset="0" stop-color="#d7884a"/><stop offset=".6" stop-color="#9a4f22"/><stop offset="1" stop-color="#5c2a10"/>
            </radialGradient>
          </defs>
          <g class="wf-body">
            <ellipse cx="110" cy="118" rx="82" ry="66" fill="url(#wf)"/>
            <path d="M150 64 q30 -30 52 -6 q-8 22 -34 22" fill="none" stroke="#7a3d18" stroke-width="12" stroke-linecap="round"/>
            <path d="M48 118 q62 22 124 0" fill="none" stroke="#2e1408" stroke-width="9" stroke-linecap="round"/>
            <ellipse cx="80" cy="88" rx="22" ry="12" fill="#fff" opacity=".18"/>
          </g>
          <g class="wf-mallet">
            <rect x="150" y="150" width="78" height="10" rx="5" fill="#8a5a2e" transform="rotate(-18 150 155)"/>
            <circle cx="150" cy="156" r="15" fill="#b07a46"/>
          </g>
        </svg>
      </button>
      <div class="overlay-bar">
        <button class="chip" data-act="auto"><span class="ico">▷</span> <span class="lbl"></span></button>
        <button class="chip icon" data-act="close" data-i18n-label="close">✕</button>
      </div>`;
    this.body = host.querySelector('.wf-body')!;
    this.mallet = host.querySelector('.wf-mallet')!;
    this.autoBtn = host.querySelector('[data-act=auto]')!;
    host.querySelector('.woodfish')!.addEventListener('pointerdown', (e) => { e.preventDefault(); this.strike(); });
    this.autoBtn.addEventListener('click', () => this.toggleAuto());
    host.querySelector('[data-act=close]')!.addEventListener('click', () => this.onClose());
    window.addEventListener('keydown', (e) => {
      if (this.open && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.strike(); }
    });
    this.renderAuto();
  }

  strike() {
    this.onStrike();
    for (const [el, cls] of [[this.body, 'hit'], [this.mallet, 'hit']] as const) {
      el.classList.remove(cls);
      void el.getBoundingClientRect();
      el.classList.add(cls);
    }
  }

  private toggleAuto() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = 0;
    } else {
      this.strike();
      this.timer = window.setInterval(() => this.strike(), 640);
    }
    this.renderAuto();
  }

  renderAuto() {
    this.autoBtn.querySelector('.ico')!.textContent = this.timer ? '❚❚' : '▷';
    this.autoBtn.querySelector('.lbl')!.textContent = this.timer ? t('pause') : t('autoplay');
    this.el.querySelector('.woodfish')!.setAttribute('aria-label', t('moktak'));
  }

  show() {
    this.open = true;
    this.el.hidden = false;
  }

  hide() {
    this.open = false;
    this.el.hidden = true;
    if (this.timer) this.toggleAuto();
  }
}
