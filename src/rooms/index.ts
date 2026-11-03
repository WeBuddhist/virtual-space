import { SEATING, TEMPLE_IDS, type TempleId } from '../../shared/rooms';
import { bodhgayaSite } from './sites/bodhgaya';
import { genericSite } from './sites/generic';
import type { Resident, TempleDef } from './types';

const seated = (seats: number[]): Resident[] => seats.map((seat) => ({ seat }));

// The temple registry. Each entry is one kind of room; bespoke sites replace
// `genericSite` as each temple is researched and built (see the temple-room skill).

const ALL_INSTRUMENTS = ['singing-bowl', 'bell-dorje', 'damaru', 'nga-drum', 'rolmo', 'gong', 'temple-bell', 'woodfish', 'dharma-drum'] as const;

export const TEMPLES: Record<TempleId, TempleDef> = {
  bodhgaya: {
    id: 'bodhgaya',
    tradition: 'pan',
    name: { en: 'Bodh Gaya', bo: 'རྡོ་རྗེ་གདན།' },
    place: { en: 'Mahabodhi Temple, Bihar, India', bo: 'བྱང་ཆུབ་ཆེན་པོའི་མཆོད་ཁང་། རྒྱ་གར།' },
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
    // monks of several traditions: Theravada saffron, East Asian grey, Tibetan maroon prostrating
    residents: [
      { seat: 4, robe: 0xc98a3a, shirt: 0xd99a42, pose: 'kneel' },
      { seat: 7, robe: 0x6e6c66, shirt: 0x8d8b84, pose: 'kneel' },
      { seat: 10, robe: 0x7a1f2b, shirt: 0xd9a12b, pose: 'bow' },
      { seat: 13, robe: 0x7a1f2b, shirt: 0xd9a12b, pose: 'bow' },
    ],
    // open, clear sky over green lawns: a pale-blue haze far out
    sky: { dayTop: 0x8fb8e2, dayBottom: 0xe2ecf2, fog: 0xdce8ee, fogNear: 90, fogFar: 460 },
    buildSite: bodhgayaSite,
  },
  tibetan: {
    id: 'tibetan',
    tradition: 'vajrayana',
    name: { en: 'Namdroling', bo: 'རྣམ་གྲོལ་གླིང་།' },
    place: { en: 'Golden Temple, Bylakuppe, India', bo: 'གསེར་མདོག་ལྷ་ཁང་། བྱི་ལ་ཀུབ། རྒྱ་གར།' },
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
    residents: seated(SEATING.tibetan.residents),
    buildSite: genericSite,
  },
  theravada: {
    id: 'theravada',
    tradition: 'theravada',
    name: { en: 'Wat Phra Si Rattana Mahathat', bo: 'ཝ་ཐི་ཕྲ་སི་རཏྣ་མ་ཧཱ་ཐཱ་ཐི།' },
    place: { en: 'Phra Buddha Chinnarat, Phitsanulok, Thailand', bo: 'ཕི་ཙ་ནུ་ལོག ཐེ་ལནྜ།' },
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
    residents: seated(SEATING.theravada.residents),
    buildSite: genericSite,
  },
  mahayana: {
    id: 'mahayana',
    tradition: 'mahayana',
    name: { en: 'Tōdai-ji', bo: 'ཐོ་དའི་ཇི།' },
    place: { en: 'Great Buddha Hall, Nara, Japan', bo: 'སངས་རྒྱས་ཆེན་པོའི་ལྷ་ཁང་། ན་ར། རི་པིན།' },
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
    timeZone: 'Asia/Tokyo',
    residents: seated(SEATING.mahayana.residents),
    buildSite: genericSite,
  },
};

export const TEMPLE_LIST = TEMPLE_IDS.map((id) => TEMPLES[id]);
