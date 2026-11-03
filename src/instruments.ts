import type { Bilingual, InstrumentId } from './rooms/types';

export interface InstrumentDef {
  id: InstrumentId;
  name: Bilingual;
  /** how the body reacts when struck: matches a keyframe set in style.css */
  motion: 'squish' | 'swing' | 'wobble' | 'shake' | 'thump';
  /** beat length for autoplay, ms */
  autoplayMs: number;
  /** singing bowl: circling the rim sustains the tone */
  rub?: boolean;
  /** SVG markup; `.inst-body` and `.inst-striker` animate on each strike */
  art: string;
}

const svg = (body: string, defs = '') =>
  `<svg viewBox="0 0 320 280" width="320" height="280" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;

const BRONZE = `<radialGradient id="g-bronze" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#f6d58b"/><stop offset=".45" stop-color="#c08a3c"/><stop offset="1" stop-color="#5e3a14"/></radialGradient>`;
const WOOD = `<radialGradient id="g-wood" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#d7884a"/><stop offset=".6" stop-color="#9a4f22"/><stop offset="1" stop-color="#5c2a10"/></radialGradient>`;
const SKIN = `<radialGradient id="g-skin" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#f4ead2"/><stop offset="1" stop-color="#cdb58c"/></radialGradient>`;
const RED = `<linearGradient id="g-red" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c23a2c"/><stop offset="1" stop-color="#7a1c14"/></linearGradient>`;

export const INSTRUMENTS: Record<InstrumentId, InstrumentDef> = {
  woodfish: {
    id: 'woodfish', motion: 'squish', autoplayMs: 640,
    name: { en: 'Wood fish', bo: 'ཤིང་ཉ།' },
    art: svg(`
      <g class="inst-body" style="transform-origin:150px 200px">
        <ellipse cx="150" cy="160" rx="96" ry="78" fill="url(#g-wood)"/>
        <path d="M196 98 q34 -36 60 -8 q-10 26 -40 26" fill="none" stroke="#7a3d18" stroke-width="13" stroke-linecap="round"/>
        <path d="M78 160 q72 26 144 0" fill="none" stroke="#2e1408" stroke-width="10" stroke-linecap="round"/>
        <ellipse cx="116" cy="124" rx="26" ry="13" fill="#fff" opacity=".18"/>
      </g>
      <g class="inst-striker" style="transform-origin:290px 200px">
        <rect x="190" y="196" width="100" height="11" rx="5.5" fill="#8a5a2e" transform="rotate(-18 190 201)"/>
        <circle cx="190" cy="202" r="18" fill="#b07a46"/>
      </g>`, WOOD),
  },
  'singing-bowl': {
    id: 'singing-bowl', motion: 'wobble', autoplayMs: 6000, rub: true,
    name: { en: 'Singing bowl', bo: 'ཁར་གཞོང་།' },
    art: svg(`
      <ellipse cx="160" cy="232" rx="92" ry="20" fill="url(#g-red)"/>
      <g class="inst-body" style="transform-origin:160px 220px">
        <path d="M70 128 Q74 226 160 228 Q246 226 250 128 Z" fill="url(#g-bronze)"/>
        <ellipse cx="160" cy="128" rx="90" ry="24" fill="#7a5222"/>
        <ellipse cx="160" cy="126" rx="84" ry="19" fill="#3d2810"/>
        <path d="M86 150 q74 30 148 0" fill="none" stroke="#f6d58b" stroke-opacity=".5" stroke-width="3"/>
        <ellipse cx="112" cy="168" rx="14" ry="30" fill="#fff" opacity=".15"/>
      </g>
      <g class="inst-striker" style="transform-origin:282px 96px">
        <rect x="236" y="42" width="18" height="110" rx="9" fill="#7a4a24" transform="rotate(32 245 97)"/>
        <rect x="236" y="42" width="18" height="34" rx="9" fill="#c9a77a" transform="rotate(32 245 97)"/>
      </g>`, BRONZE + RED),
  },
  'bell-dorje': {
    id: 'bell-dorje', motion: 'swing', autoplayMs: 2200,
    name: { en: 'Bell and vajra', bo: 'དྲིལ་བུ་དང་རྡོ་རྗེ།' },
    art: svg(`
      <g class="inst-body" style="transform-origin:130px 40px">
        <path d="M130 30 l10 14 l-10 14 l-10 -14 z" fill="#e7c36e"/>
        <path d="M116 44 q14 -12 28 0 M116 44 q14 12 28 0" fill="none" stroke="#c9963e" stroke-width="4"/>
        <rect x="124" y="58" width="12" height="38" rx="4" fill="#d6a84f"/>
        <ellipse cx="130" cy="100" rx="22" ry="9" fill="#b98a3a"/>
        <path d="M108 104 Q100 196 72 214 L188 214 Q160 196 152 104 Z" fill="url(#g-bronze)"/>
        <ellipse cx="130" cy="214" rx="58" ry="12" fill="#6b4517"/>
        <path d="M96 168 h68" stroke="#f6d58b" stroke-opacity=".55" stroke-width="3"/>
        <circle class="inst-striker" cx="130" cy="214" r="7" fill="#4a2e0e"/>
      </g>
      <g transform="translate(232 180) rotate(-28)">
        <ellipse cx="0" cy="0" rx="10" ry="10" fill="#e7c36e"/>
        <path d="M0 -10 q-20 -24 0 -58 q20 34 0 58 M0 10 q-20 24 0 58 q20 -34 0 -58" fill="url(#g-bronze)" stroke="#8a5e1e" stroke-width="2"/>
      </g>`, BRONZE),
  },
  damaru: {
    id: 'damaru', motion: 'shake', autoplayMs: 1400,
    name: { en: 'Damaru', bo: 'ཌ་མ་རུ།' },
    art: svg(`
      <g class="inst-body" style="transform-origin:160px 140px">
        <ellipse cx="96" cy="140" rx="30" ry="62" fill="url(#g-wood)"/>
        <ellipse cx="224" cy="140" rx="30" ry="62" fill="url(#g-wood)"/>
        <path d="M96 78 L160 126 L224 78 L224 202 L160 154 L96 202 Z" fill="#6b3216"/>
        <ellipse cx="88" cy="140" rx="24" ry="56" fill="url(#g-skin)"/>
        <ellipse cx="232" cy="140" rx="24" ry="56" fill="url(#g-skin)"/>
        <rect x="150" y="122" width="20" height="36" rx="4" fill="#c23a2c"/>
        <path d="M160 158 q-6 50 -40 86" stroke="#2b62b8" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path d="M164 158 q10 52 46 84" stroke="#e6c02b" stroke-width="8" fill="none" stroke-linecap="round"/>
      </g>
      <g class="inst-striker">
        <path d="M160 128 q-40 -40 -70 -20" stroke="#5a3b1e" stroke-width="2" fill="none"/>
        <circle cx="90" cy="108" r="8" fill="#e7c36e"/>
        <path d="M160 128 q40 -40 70 -20" stroke="#5a3b1e" stroke-width="2" fill="none"/>
        <circle cx="230" cy="108" r="8" fill="#e7c36e"/>
      </g>`, WOOD + SKIN),
  },
  'nga-drum': {
    id: 'nga-drum', motion: 'thump', autoplayMs: 900,
    name: { en: 'Nga drum', bo: 'རྔ་ཆེན།' },
    art: svg(`
      <rect x="150" y="196" width="20" height="62" fill="#7a2a1c"/>
      <path d="M110 262 h100" stroke="#5a1e14" stroke-width="12" stroke-linecap="round"/>
      <g class="inst-body" style="transform-origin:160px 120px">
        <ellipse cx="160" cy="120" rx="104" ry="104" fill="#2f6b4f"/>
        <ellipse cx="160" cy="120" rx="96" ry="96" fill="url(#g-skin)"/>
        <circle cx="160" cy="120" r="36" fill="none" stroke="#c23a2c" stroke-width="6"/>
        <path d="M160 84 a36 36 0 0 1 0 72 a18 18 0 0 1 0 -36 a18 18 0 0 0 0 -36" fill="#c23a2c"/>
        <path d="M160 156 a36 36 0 0 1 0 -72 a18 18 0 0 0 0 36 a18 18 0 0 1 0 36" fill="#2b62b8"/>
        <circle cx="160" cy="120" r="102" fill="none" stroke="#e6c02b" stroke-width="4" stroke-dasharray="6 10"/>
      </g>
      <g class="inst-striker" style="transform-origin:300px 250px">
        <path d="M300 250 Q250 200 236 112" stroke="#8a5a2e" stroke-width="9" fill="none" stroke-linecap="round"/>
        <circle cx="236" cy="108" r="12" fill="#c23a2c"/>
      </g>`, SKIN),
  },
  rolmo: {
    id: 'rolmo', motion: 'shake', autoplayMs: 2400,
    name: { en: 'Cymbals', bo: 'རོལ་མོ།' },
    art: svg(`
      <g class="inst-body" style="transform-origin:160px 140px">
        <g class="inst-striker" style="transform-origin:110px 140px">
          <ellipse cx="110" cy="140" rx="32" ry="94" fill="url(#g-bronze)"/>
          <ellipse cx="104" cy="140" rx="14" ry="30" fill="#8a5e1e"/>
          <path d="M98 140 q-40 0 -60 40" stroke="#c23a2c" stroke-width="7" fill="none"/>
        </g>
        <ellipse cx="210" cy="140" rx="32" ry="94" fill="url(#g-bronze)"/>
        <ellipse cx="216" cy="140" rx="14" ry="30" fill="#8a5e1e"/>
        <path d="M222 140 q40 0 60 40" stroke="#2b62b8" stroke-width="7" fill="none"/>
      </g>`, BRONZE),
  },
  gong: {
    id: 'gong', motion: 'wobble', autoplayMs: 4000,
    name: { en: 'Gong', bo: 'ཁར་རྔ།' },
    art: svg(`
      <path d="M40 30 h240 M60 30 v236 M260 30 v236" stroke="#7a2a1c" stroke-width="14" stroke-linecap="round"/>
      <path d="M140 30 v34 M180 30 v34" stroke="#3a2a1e" stroke-width="3"/>
      <g class="inst-body" style="transform-origin:160px 64px">
        <circle cx="160" cy="150" r="88" fill="url(#g-bronze)"/>
        <circle cx="160" cy="150" r="72" fill="none" stroke="#6b4517" stroke-width="4"/>
        <circle cx="160" cy="150" r="26" fill="#e7c36e" stroke="#8a5e1e" stroke-width="5"/>
        <ellipse cx="140" cy="128" rx="10" ry="6" fill="#fff" opacity=".35"/>
      </g>
      <g class="inst-striker" style="transform-origin:296px 256px">
        <path d="M296 256 L238 188" stroke="#8a5a2e" stroke-width="9" stroke-linecap="round"/>
        <circle cx="232" cy="182" r="16" fill="#c23a2c"/>
      </g>`, BRONZE),
  },
  'temple-bell': {
    id: 'temple-bell', motion: 'wobble', autoplayMs: 9000,
    name: { en: 'Temple bell', bo: 'ཅོང་ཆེན།' },
    art: svg(`
      <path d="M30 26 h260" stroke="#7a2a1c" stroke-width="16" stroke-linecap="round"/>
      <g class="inst-body" style="transform-origin:160px 34px">
        <path d="M152 34 h16 v18 h-16z" fill="#4c5a4e"/>
        <path d="M112 54 Q160 40 208 54 L216 222 Q160 236 104 222 Z" fill="#5f6f60"/>
        <path d="M112 54 Q160 40 208 54 L216 222 Q160 236 104 222 Z" fill="url(#g-bronze)" opacity=".45"/>
        <path d="M110 110 h100 M108 178 h104" stroke="#2f3a31" stroke-width="5"/>
        <circle cx="160" cy="200" r="13" fill="#2f3a31"/>
        <g fill="#a9b39e" opacity=".7"><circle cx="128" cy="78" r="5"/><circle cx="148" cy="78" r="5"/><circle cx="172" cy="78" r="5"/><circle cx="192" cy="78" r="5"/></g>
      </g>
      <g class="inst-striker" style="transform:translateX(0)">
        <path d="M232 40 v130 M300 40 v130" stroke="#3a2a1e" stroke-width="3"/>
        <rect x="222" y="164" width="96" height="26" rx="13" fill="url(#g-wood)"/>
      </g>`, BRONZE + WOOD),
  },
  'dharma-drum': {
    id: 'dharma-drum', motion: 'thump', autoplayMs: 800,
    name: { en: 'Dharma drum', bo: 'ཆོས་རྔ།' },
    art: svg(`
      <path d="M70 262 L110 196 M250 262 L210 196" stroke="#5a1e14" stroke-width="12" stroke-linecap="round"/>
      <g class="inst-body" style="transform-origin:160px 140px">
        <path d="M64 70 Q50 140 64 210 L256 210 Q270 140 256 70 Z" fill="url(#g-red)"/>
        <ellipse cx="160" cy="70" rx="96" ry="26" fill="url(#g-skin)"/>
        <ellipse cx="160" cy="70" rx="96" ry="26" fill="none" stroke="#e6c02b" stroke-width="4" stroke-dasharray="3 7"/>
        <path d="M60 140 h200" stroke="#e6c02b" stroke-width="3" opacity=".7"/>
        <circle cx="54" cy="140" r="9" fill="#e6c02b"/><circle cx="266" cy="140" r="9" fill="#e6c02b"/>
      </g>
      <g class="inst-striker" style="transform-origin:290px 30px">
        <path d="M290 30 L196 64" stroke="#8a5a2e" stroke-width="10" stroke-linecap="round"/>
      </g>`, SKIN + RED),
  },
};
