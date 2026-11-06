import { SEATING, TEMPLE_IDS, type TempleId } from '../../shared/rooms';
import { bodhgayaSite } from './sites/bodhgaya';
import { mahayanaSite } from './sites/mahayana';
import { theravadaSite } from './sites/theravada';
import { tibetanSite } from './sites/tibetan';
import type { Resident, TempleDef } from './types';

const seated = (seats: number[]): Resident[] => seats.map((seat) => ({ seat }));

// The temple registry. Each entry is one kind of room; each points at its bespoke site
// under sites/<id>/ (see the temple-room skill).

const ALL_INSTRUMENTS = ['singing-bowl', 'bell-dorje', 'damaru', 'nga-drum', 'rolmo', 'gong', 'temple-bell', 'woodfish', 'dharma-drum'] as const;

export const TEMPLES: Record<TempleId, TempleDef> = {
  bodhgaya: {
    id: 'bodhgaya',
    tradition: 'pan',
    name: { en: 'Mahabodhi Temple', bo: 'བྱང་ཆུབ་ཆེན་པོའི་མཆོད་ཁང་།' },
    place: { en: 'Bodh Gaya, Bihar, India', bo: 'རྡོ་རྗེ་གདན། རྒྱ་གར།' },
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
    // Golden Temple (Padmasambhava Buddhist Vihara), Namdroling, Bylakuppe
    // (docs/rooms/tibetan/reference.md). Tibetan names marked (review) await a native speaker.
    name: { en: 'Namdroling Monastery', bo: 'རྣམ་གྲོལ་གླིང་།' },
    place: { en: 'Golden Temple, Bylakuppe, Karnataka, India', bo: 'གསེར་ཁང་། བྱི་ལ་ཀུབ། རྒྱ་གར།' }, // གསེར་ཁང་ (review)
    hall: {
      name: { en: 'Padmasambhava Buddhist Vihara (Golden Temple)', bo: 'པདྨ་འབྱུང་གནས་ཀྱི་ལྷ་ཁང་།' }, // (review)
      // the monastery's full name over the gate: Thegchog Namdrol Shedrub Dargye Ling
      signboard: 'ཐེག་མཆོག་རྣམ་གྲོལ་བཤད་སྒྲུབ་དར་རྒྱས་གླིང་',
      pillarColor: 0xb3261e, wallColor: 0xede2c0, roofColor: 0xd6a632,
    },
    // the three great gilded images, each about 18 m: Guru Rinpoche on the viewer's left,
    // Shakyamuni in the centre, Amitayus on the viewer's right. x is hall-local; facing the
    // altar (+z) the viewer's left is +x.
    statues: [
      { id: 'guru-rinpoche', name: { en: 'Guru Padmasambhava', bo: 'གུ་རུ་པདྨ་འབྱུང་གནས།' }, role: { en: 'Guru Rinpoche, the Lotus-Born', bo: 'གུ་རུ་རིན་པོ་ཆེ།' }, x: 5.75, scale: 0.95, tint: 0xd9a93a, halo: 0x2e8c8a },
      { id: 'shakyamuni', name: { en: 'Shakyamuni Buddha', bo: 'ཤཱཀྱ་ཐུབ་པ།' }, role: { en: 'The Teacher', bo: 'སྟོན་པ།' }, x: 0, scale: 1, tint: 0xd9a93a, halo: 0x2e8c8a },
      { id: 'amitayus', name: { en: 'Buddha Amitayus', bo: 'ཚེ་དཔག་མེད།' }, role: { en: 'Buddha of Long Life', bo: 'ཚེ་ལྷ།' }, x: -5.75, scale: 0.95, tint: 0xd9a93a, halo: 0x2e8c8a },
    ],
    instruments: ['bell-dorje', 'damaru', 'nga-drum', 'rolmo', 'singing-bowl'],
    bowStyles: ['tibetan-prostration', 'five-point'],
    services: [{ kind: 'dawn', hour: 5, minute: 0 }, { kind: 'evening', hour: 18, minute: 0 }],
    timeZone: 'Asia/Kolkata',
    // Namdroling monks in maroon robes and saffron shirts, on the benches facing the aisle
    residents: SEATING.tibetan.residents.map((seat, i) => ({ seat, robe: 0x7a1f2b, shirt: 0xf2a33a, pose: i % 2 ? 'beads' : 'kneel' })),
    // tropical blue sky with big cumulus over lawns and areca country
    sky: { dayTop: 0x5f9bd6, dayBottom: 0xe4eef4, fog: 0xd9e6ee, fogNear: 70, fogFar: 380 },
    buildSite: tibetanSite,
  },
  theravada: {
    id: 'theravada',
    tradition: 'theravada',
    name: { en: 'Wat Phra Si Rattana Mahathat', bo: 'ཝ་ཐི་ཕྲ་སི་རཏྣ་མ་ཧཱ་ཐཱ་ཐི།' },
    place: { en: 'Phra Buddha Chinnarat, Phitsanulok, Thailand', bo: 'ཕི་ཙ་ནུ་ལོག ཐེ་ལནྜ།' },
    hall: {
      // the image's viharn (not the ubosot); Tibetan to be reviewed by a native editor
      name: { en: 'Viharn of Phra Buddha Chinnarat', bo: 'སངས་རྒྱས་རྒྱལ་བའི་རྒྱལ་པོའི་ལྷ་ཁང་།' },
      signboard: 'ཐེ་ལནྜའི་ལྷ་ཁང་',
      pillarColor: 0xe6e0d4, wallColor: 0xf3eee4, roofColor: 0x8e2a1e,
    },
    statues: [
      { id: 'shakyamuni', name: { en: 'Phra Buddha Chinnarat', bo: 'སངས་རྒྱས་རྒྱལ་བའི་རྒྱལ་པོ།' }, role: { en: 'Main image', bo: 'གཙོ་བོའི་སྐུ།' }, x: 0, scale: 1.1, tint: 0xd9a83a, halo: 0xd19a36 },
    ],
    instruments: ['gong', 'temple-bell', 'singing-bowl'],
    bowStyles: ['five-point'],
    services: [{ kind: 'dawn', hour: 5, minute: 0 }, { kind: 'evening', hour: 18, minute: 0 }],
    timeZone: 'Asia/Bangkok',
    residents: seated(SEATING.theravada.residents),
    // hazy tropical sky over the river plain
    sky: { dayTop: 0x92b8d8, dayBottom: 0xdde8ee, fog: 0xd3dfe6, fogNear: 80, fogFar: 380 },
    buildSite: theravadaSite,
  },
  mahayana: {
    id: 'mahayana',
    tradition: 'mahayana',
    name: { en: 'Tōdai-ji', bo: 'ཐོ་དའི་ཇི།' },
    place: { en: 'Great Buddha Hall, Nara, Japan', bo: 'སངས་རྒྱས་ཆེན་པོའི་ལྷ་ཁང་། ན་ར། རི་པིན།' },
    hall: {
      // Daibutsuden; Tibetan rendering flagged for native review
      name: { en: 'Great Buddha Hall', bo: 'སངས་རྒྱས་ཆེན་པོའི་ལྷ་ཁང་།' },
      signboard: 'ཐེག་ཆེན་ལྷ་ཁང་',
      pillarColor: 0x8a4a34, wallColor: 0xece5d6, roofColor: 0x55585c,
    },
    statues: [
      // Rushana-butsu (Vairocana): dark bronze, gilded halo
      { id: 'vairocana', name: { en: 'Vairocana Buddha', bo: 'རྣམ་པར་སྣང་མཛད།' }, role: { en: 'Main image', bo: 'གཙོ་བོའི་སྐུ།' }, x: 0, scale: 1.1, tint: 0x2e2a22, halo: 0xc9a24a },
    ],
    instruments: ['temple-bell', 'singing-bowl', 'gong', 'dharma-drum', 'woodfish'],
    bowStyles: ['standing-bow', 'east-asian-bow'],
    // morning gongyō and the service at closing (times uncertain; see the reference)
    services: [{ kind: 'dawn', hour: 7, minute: 0 }, { kind: 'evening', hour: 17, minute: 30 }],
    timeZone: 'Asia/Tokyo',
    residents: seated(SEATING.mahayana.residents),
    // soft hazy Nara light; the hall is 57 m across, so the haze starts far out
    sky: { dayTop: 0x8fb4dc, dayBottom: 0xdde6ea, fog: 0xd6dfe2, fogNear: 110, fogFar: 560 },
    buildSite: mahayanaSite,
  },
};

export const TEMPLE_LIST = TEMPLE_IDS.map((id) => TEMPLES[id]);
