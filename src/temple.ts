// One temple = one room definition. The MVP ships a single temple; phase 2 turns this
// into a registry so each room can bring its own hall, statues and soundscape.

export type Bilingual = { en: string; bo: string };

export interface StatueDef {
  id: string;
  name: Bilingual;
  role: Bilingual;
  /** x offset on the altar (hall-local, metres) */
  x: number;
  scale: number;
  /** robe/body tint; statues are gilded by default */
  tint: number;
  halo: number;
}

export interface TempleDef {
  id: string;
  name: Bilingual;
  hall: {
    name: Bilingual;
    /** text painted on the signboard over the entrance */
    signboard: string;
    pillarColor: number;
    wallColor: number;
    roofColor: number;
  };
  statues: StatueDef[];
  audio: {
    /** optional recorded chant; a synthesized drone is used when missing */
    chantSrc: string | null;
    chantSeconds: number;
  };
  /** communal chanting times in the temple's local clock */
  services: { kind: 'dawn' | 'evening'; hour: number; minute: number }[];
  /** IANA zone used for day/night and service times (sansatemple uses KST) */
  timeZone: string;
  capacity: number;
  roomCount: number;
}

export const TEMPLE: TempleDef = {
  id: 'ritro',
  name: { en: 'Ritrö', bo: 'རི་ཁྲོད།' },
  hall: {
    name: { en: 'Hall of Great Compassion', bo: 'ཐུགས་རྗེ་ཆེན་པོའི་ལྷ་ཁང་།' },
    signboard: 'ཐུགས་རྗེ་ཆེན་པོའི་ལྷ་ཁང་',
    pillarColor: 0x8a2a1c,
    wallColor: 0xe9e1cf,
    roofColor: 0x3c3a36,
  },
  statues: [
    {
      id: 'manjushri',
      name: { en: 'Manjushri', bo: 'འཇམ་དཔལ་དབྱངས།' },
      role: { en: 'Attendant of wisdom', bo: 'ཤེས་རབ་ཀྱི་ཉེ་གནས།' },
      x: -2.2, scale: 0.78, tint: 0xd8a640, halo: 0x5d8fb8,
    },
    {
      id: 'shakyamuni',
      name: { en: 'Shakyamuni Buddha', bo: 'ཤཱཀྱ་ཐུབ་པ།' },
      role: { en: 'The Teacher', bo: 'སྟོན་པ།' },
      x: 0, scale: 1, tint: 0xe0b04a, halo: 0xc9822e,
    },
    {
      id: 'chenrezig',
      name: { en: 'Avalokiteshvara', bo: 'སྤྱན་རས་གཟིགས།' },
      role: { en: 'Attendant of compassion', bo: 'ཐུགས་རྗེའི་ཉེ་གནས།' },
      x: 2.2, scale: 0.78, tint: 0xf1e6d2, halo: 0x6ea37a,
    },
  ],
  audio: { chantSrc: null, chantSeconds: 120 },
  services: [
    { kind: 'dawn', hour: 5, minute: 0 },
    { kind: 'evening', hour: 18, minute: 0 },
  ],
  timeZone: 'Asia/Kolkata',
  capacity: 100,
  roomCount: 100,
};

export function roomId(n: number) {
  return n === 1 ? 'room' : `room-${String(n).padStart(2, '0')}`;
}
export function roomNumber(id: string) {
  if (id === 'room') return 1;
  const m = /^room-(\d{2,3})$/.exec(id);
  return m ? Number(m[1]) : NaN;
}

// `?time=21:30` pins the temple clock, for previewing night and service times
const pinned = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get('time') ?? '');

/** hours+minutes of "now" in the temple's zone */
export function templeClock(date = new Date()) {
  if (pinned) {
    const h = Number(pinned[1]) % 24, m = Number(pinned[2]), s = date.getSeconds();
    return { h, m, s, dayFraction: (h * 3600 + m * 60 + s) / 86400 };
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TEMPLE.timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const h = get('hour') % 24, m = get('minute'), s = get('second');
  return { h, m, s, dayFraction: (h * 3600 + m * 60 + s) / 86400 };
}

export function isDay(date = new Date()) {
  const { h } = templeClock(date);
  return h >= 6 && h < 18;
}

/** the communal service in progress, with how far into it we are */
export function activeService(date = new Date()) {
  const { h, m, s } = templeClock(date);
  const now = h * 3600 + m * 60 + s;
  for (const svc of TEMPLE.services) {
    const start = svc.hour * 3600 + svc.minute * 60;
    const offset = now - start;
    if (offset >= 0 && offset < TEMPLE.audio.chantSeconds) return { ...svc, offset };
  }
  return null;
}
