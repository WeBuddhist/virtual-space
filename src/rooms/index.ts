import { SEATING, TEMPLE_IDS, type TempleId } from '../../shared/rooms';
import { genericSite } from './sites/generic';
import type { TempleDef } from './types';

// The temple registry. Each entry is one kind of room; bespoke sites replace
// `genericSite` as each temple is researched and built (see the temple-room skill).

const ALL_INSTRUMENTS = ['singing-bowl', 'bell-dorje', 'damaru', 'nga-drum', 'rolmo', 'gong', 'temple-bell', 'woodfish', 'dharma-drum'] as const;

export const TEMPLES: Record<TempleId, TempleDef> = {
  bodhgaya: {
    id: 'bodhgaya',
    tradition: 'pan',
    name: { en: 'Bodh Gaya', bo: 'རྡོ་རྗེ་གདན།' },
    place: { en: 'Mahabodhi Temple · Bihar, India', bo: 'བྱང་ཆུབ་ཆེན་པོའི་མཆོད་ཁང་། རྒྱ་གར།' },
    hall: {
      name: { en: 'Mahabodhi Temple', bo: 'བྱང་ཆུབ་ཆེན་པོའི་མཆོད་ཁང་།' },
      signboard: 'བྱང་ཆུབ་ཆེན་པོའི་མཆོད་ཁང་',
      pillarColor: 0xb59a73, wallColor: 0xcdb48a, roofColor: 0x8d7652,
    },
    statues: [
      { id: 'shakyamuni', name: { en: 'Shakyamuni Buddha', bo: 'ཤཱཀྱ་ཐུབ་པ།' }, role: { en: 'Earth-touching Buddha', bo: 'ས་གནོན་གྱི་ཕྱག་རྒྱ།' }, x: 0, scale: 1.15, tint: 0xe2b443, halo: 0xc98a2e },
    ],
    instruments: [...ALL_INSTRUMENTS],
    bowStyles: ['tibetan-prostration', 'five-point', 'east-asian-bow', 'standing-bow'],
    services: [{ kind: 'dawn', hour: 5, minute: 0 }, { kind: 'evening', hour: 18, minute: 0 }],
    timeZone: 'Asia/Kolkata',
    residents: SEATING.bodhgaya.residents,
    sky: { dayTop: 0x8fb4d9, dayBottom: 0xf0e2c8, fog: 0xe3d8c2 },
    buildSite: genericSite,
  },
  tibetan: {
    id: 'tibetan',
    tradition: 'vajrayana',
    name: { en: 'Tibetan Temple', bo: 'བོད་ཀྱི་ལྷ་ཁང་།' },
    place: { en: 'Vajrayana', bo: 'རྡོ་རྗེ་ཐེག་པ།' },
    hall: {
      name: { en: 'Hall of Great Compassion', bo: 'ཐུགས་རྗེ་ཆེན་པོའི་ལྷ་ཁང་།' },
      signboard: 'ཐུགས་རྗེ་ཆེན་པོའི་ལྷ་ཁང་',
      pillarColor: 0x8a2a1c, wallColor: 0xe9e1cf, roofColor: 0x3c3a36,
    },
    statues: [
      { id: 'manjushri', name: { en: 'Manjushri', bo: 'འཇམ་དཔལ་དབྱངས།' }, role: { en: 'Attendant of wisdom', bo: 'ཤེས་རབ་ཀྱི་ཉེ་གནས།' }, x: -2.2, scale: 0.78, tint: 0xd8a640, halo: 0x5d8fb8 },
      { id: 'shakyamuni', name: { en: 'Shakyamuni Buddha', bo: 'ཤཱཀྱ་ཐུབ་པ།' }, role: { en: 'The Teacher', bo: 'སྟོན་པ།' }, x: 0, scale: 1, tint: 0xe0b04a, halo: 0xc9822e },
      { id: 'chenrezig', name: { en: 'Avalokiteshvara', bo: 'སྤྱན་རས་གཟིགས།' }, role: { en: 'Attendant of compassion', bo: 'ཐུགས་རྗེའི་ཉེ་གནས།' }, x: 2.2, scale: 0.78, tint: 0xf1e6d2, halo: 0x6ea37a },
    ],
    instruments: ['singing-bowl', 'bell-dorje', 'damaru', 'nga-drum', 'rolmo'],
    bowStyles: ['tibetan-prostration'],
    services: [{ kind: 'dawn', hour: 5, minute: 0 }, { kind: 'evening', hour: 18, minute: 0 }],
    timeZone: 'Asia/Kolkata',
    residents: SEATING.tibetan.residents,
    buildSite: genericSite,
  },
  theravada: {
    id: 'theravada',
    tradition: 'theravada',
    name: { en: 'Thai Temple', bo: 'ཐེ་ལནྜའི་ལྷ་ཁང་།' },
    place: { en: 'Theravada', bo: 'གནས་བརྟན་པ།' },
    hall: {
      name: { en: 'Ordination Hall', bo: 'བསྙེན་རྫོགས་ཁང་།' },
      signboard: 'ཐེ་ལནྜའི་ལྷ་ཁང་',
      pillarColor: 0xe6e0d4, wallColor: 0xf3eee4, roofColor: 0x8e2a1e,
    },
    statues: [
      { id: 'shakyamuni', name: { en: 'Buddha', bo: 'སངས་རྒྱས།' }, role: { en: 'Main image', bo: 'གཙོ་བོའི་སྐུ།' }, x: 0, scale: 1.1, tint: 0xe5b84a, halo: 0xd19a36 },
    ],
    instruments: ['gong', 'temple-bell', 'singing-bowl'],
    bowStyles: ['five-point'],
    services: [{ kind: 'dawn', hour: 5, minute: 0 }, { kind: 'evening', hour: 18, minute: 0 }],
    timeZone: 'Asia/Bangkok',
    residents: SEATING.theravada.residents,
    buildSite: genericSite,
  },
  mahayana: {
    id: 'mahayana',
    tradition: 'mahayana',
    name: { en: 'East Asian Temple', bo: 'ཐེག་ཆེན་ལྷ་ཁང་།' },
    place: { en: 'Mahayana', bo: 'ཐེག་པ་ཆེན་པོ།' },
    hall: {
      name: { en: 'Main Buddha Hall', bo: 'གཙོ་བོའི་ལྷ་ཁང་།' },
      signboard: 'ཐེག་ཆེན་ལྷ་ཁང་',
      pillarColor: 0x9b2d20, wallColor: 0xe8dcc4, roofColor: 0x34363a,
    },
    statues: [
      { id: 'shakyamuni', name: { en: 'Buddha', bo: 'སངས་རྒྱས།' }, role: { en: 'Main image', bo: 'གཙོ་བོའི་སྐུ།' }, x: 0, scale: 1.1, tint: 0xd9aa48, halo: 0xb8863a },
    ],
    instruments: ['woodfish', 'temple-bell', 'dharma-drum', 'singing-bowl'],
    bowStyles: ['east-asian-bow', 'standing-bow'],
    services: [{ kind: 'dawn', hour: 4, minute: 0 }, { kind: 'evening', hour: 18, minute: 0 }],
    timeZone: 'Asia/Seoul',
    residents: SEATING.mahayana.residents,
    buildSite: genericSite,
  },
};

export const TEMPLE_LIST = TEMPLE_IDS.map((id) => TEMPLES[id]);
