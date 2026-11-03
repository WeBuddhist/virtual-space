// English / Tibetan UI strings. Tibetan wording is a first draft and should be
// reviewed by a native reader before launch.

export type Lang = 'en' | 'bo';

const STRINGS = {
  title: { en: 'Ritrö — rest a while', bo: 'རི་ཁྲོད། ཅུང་ཙམ་ངལ་གསོ།' },
  openingHall: { en: 'Opening the hall', bo: 'ལྷ་ཁང་གི་སྒོ་འབྱེད་བཞིན་པ།' },
  restingTitle: { en: 'Resting for a moment', bo: 'ཅུང་ཙམ་ངལ་གསོ་བཞིན་པ།' },
  continueHere: { en: 'Continue resting here', bo: 'འདིར་མུ་མཐུད་ནས་ངལ་གསོ།' },
  enter: { en: 'Enter', bo: 'ནང་དུ་ཕེབས།' },

  hintDesktop: { en: 'Click the floor · drag to look around · wheel to zoom', bo: 'ས་ངོས་ལ་མནན་ནས་འགྲོ། · འཐེན་ནས་ཁོར་ཡུག་ལྟ། · འཁོར་ལོས་ཆེ་ཆུང་།' },
  hintTouch: { en: 'Tap to move · swipe to look around · pinch to zoom', bo: 'མནན་ནས་འགྲོ། · ཤུད་ནས་ལྟ། · སོར་མོ་གཉིས་ཀྱིས་ཆེ་ཆུང་།' },
  hintBowing: { en: 'Keep looking around while you wait, or stop', bo: 'སྒུག་རིང་ཁོར་ཡུག་ལ་ལྟ་ཆོག  ཡང་ན་མཚམས་འཇོག' },

  palms: { en: 'Palms', bo: 'ཐལ་མོ།' },
  palmsLong: { en: 'Palms-together greeting', bo: 'ཐལ་མོ་སྦྱར་ནས་འཚམས་འདྲི།' },
  bow: { en: 'Prostrate', bo: 'ཕྱག་འཚལ།' },
  stopBow: { en: 'Stop', bo: 'མཚམས་འཇོག' },
  moktak: { en: 'Wood fish', bo: 'ཤིང་ཉ།' },
  beads: { en: 'Mala', bo: 'ཕྲེང་བ།' },
  incense: { en: 'Offer incense', bo: 'སྤོས་འབུལ།' },

  listenChant: { en: 'Listen to chanting', bo: 'ཁ་འདོན་ཉན།' },
  stopChant: { en: 'Stop chanting', bo: 'ཁ་འདོན་མཚམས་འཇོག' },
  listeningTogether: { en: 'Listening together', bo: 'མཉམ་དུ་ཉན་བཞིན།' },
  dawnService: { en: 'Dawn prayers', bo: 'ཞོགས་པའི་ཆོས་སྤྱོད།' },
  eveningService: { en: 'Evening prayers', bo: 'དགོང་མོའི་ཆོས་སྤྱོད།' },

  soundOn: { en: 'Turn sound on', bo: 'སྒྲ་ཕྱེ།' },
  soundOff: { en: 'Turn sound off', bo: 'སྒྲ་བཀག' },
  settings: { en: 'Settings', bo: 'སྒྲིག་འགོད།' },
  mySounds: { en: 'What I hear', bo: 'ངས་ཐོས་པའི་སྒྲ།' },
  mySoundsSub: { en: 'Three sounds, to your own taste', bo: 'སྒྲ་རིགས་གསུམ་རང་འདོད་ལྟར།' },
  ambient: { en: 'Ambience', bo: 'ཁོར་ཡུག་གི་སྒྲ།' },
  ambientSub: { en: 'Wind and birdsong', bo: 'རླུང་དང་བྱ་སྐད།' },
  effects: { en: 'Effects', bo: 'བྱ་སྤྱོད་ཀྱི་སྒྲ།' },
  effectsSub: { en: 'My bowl, mala and wood fish', bo: 'ངའི་ཏིང་ཤགས། ཕྲེང་བ། ཤིང་ཉ།' },
  chanting: { en: 'Chanting', bo: 'ཁ་འདོན།' },
  chantingSub: { en: 'Personal listening only you hear', bo: 'རང་ཉིད་ཁོ་ནས་ཐོས་པའི་ཁ་འདོན།' },
  background: { en: 'Background playback', bo: 'རྒྱབ་ལྗོངས་སུ་གཏོང་།' },
  backgroundOn: { en: 'Your sounds continue in other tabs.', bo: 'ཤོག་ངོས་གཞན་དུའང་སྒྲ་མུ་མཐུད།' },
  backgroundOff: { en: 'All sounds pause when you switch tabs.', bo: 'ཤོག་ངོས་བརྗེས་ན་སྒྲ་ཚང་མ་མཚམས་འཇོག' },
  on: { en: 'On', bo: 'ཕྱེ།' },
  off: { en: 'Off', bo: 'བཀག' },
  language: { en: 'Language', bo: 'སྐད་ཡིག' },
  controls: { en: 'How to move', bo: 'འགུལ་སྟངས།' },
  controlsBody: {
    en: 'Click the floor · WASD · arrow keys to walk<br>Drag to look around · wheel to zoom<br>1 · E · Space prostrate/stop · 2 mala · 3 palms · 5 wood fish',
    bo: 'ས་ངོས་མནན། · WASD · མདའ་རྟགས་ཀྱིས་འགྲོ།<br>འཐེན་ནས་ལྟ། · འཁོར་ལོས་ཆེ་ཆུང་།<br>1 · E · Space ཕྱག་འཚལ། · 2 ཕྲེང་བ། · 3 ཐལ་མོ། · 5 ཤིང་ཉ།',
  },

  room: { en: 'Room', bo: 'ཁང་མིག' },
  rooms: { en: 'Temple rooms', bo: 'ལྷ་ཁང་གི་ཁང་མིག' },
  roomsSub: { en: 'Every room has the same temple.', bo: 'ཁང་མིག་ཚང་མར་ལྷ་ཁང་གཅིག་པ་ཡོད།' },
  current: { en: 'Current', bo: 'ད་ལྟ།' },
  full: { en: 'Full', bo: 'ཁེངས་ཟིན།' },
  checking: { en: 'Checking', bo: 'བརྟག་བཞིན།' },
  refresh: { en: 'Refresh counts', bo: 'གྲངས་ཀ་གསར་བཅོས།' },
  visitors: { en: 'Here together', bo: 'མཉམ་དུ་ཡོད་མཁན།' },
  me: { en: 'Me', bo: 'ང་།' },
  exit: { en: 'Leave the temple', bo: 'ལྷ་ཁང་ནས་ཕྱིར་ཐོན།' },
  close: { en: 'Close', bo: 'ཁ་རྒྱག' },
  connecting: { en: 'Connecting to the temple', bo: 'ལྷ་ཁང་ལ་མཐུད་བཞིན།' },
  offline: { en: 'Offline — you can still practise alone', bo: 'དྲ་ཐག་མེད། རང་གཅིག་པུས་ཉམས་ལེན་བྱེད་ཆོག' },
  roomFull: { en: 'This room is full. Pick another room.', bo: 'ཁང་མིག་འདི་ཁེངས་ཟིན། ཁང་མིག་གཞན་ཞིག་འདེམས།' },

  exitTitle: { en: 'Did you rest well?', bo: 'བདེ་བར་ངལ་གསོ་བྱུང་ངམ།' },
  exitBody: { en: 'Sound and connection have ended.<br>Come back whenever you want to rest.', bo: 'སྒྲ་དང་འབྲེལ་མཐུད་མཇུག་རྫོགས།<br>ངལ་གསོ་འདོད་དུས་ཡང་བསྐྱར་ཕེབས།' },
  stayAgain: { en: 'Stay again', bo: 'ཡང་བསྐྱར་སྡོད།' },

  beadsCount: { en: 'this round', bo: 'སྐོར་འདིར།' },
  firstRound: { en: 'First round', bo: 'སྐོར་དང་པོ།' },
  roundsDone: { en: '{n} rounds complete', bo: 'སྐོར་ {n} རྫོགས།' },
  beadsHelp: { en: 'Grab and sweep to turn', bo: 'བཟུང་ནས་ཤུད་དེ་བགྲང་།' },
  fold: { en: 'Fold', bo: 'བསྡུ།' },
  autoplay: { en: 'Autoplay', bo: 'རང་འགུལ།' },
  pause: { en: 'Pause', bo: 'མཚམས་འཇོག' },
  soundFirst: { en: 'Turn on sound at the top first.', bo: 'ཐོག་མར་སྟེང་གི་སྒྲ་ཕྱེ།' },

  incenseQueue: { en: 'Walking to the incense burner', bo: 'སྤོས་ཕོར་གྱི་རྩར་འགྲོ་བཞིན།' },
  incenseLit: { en: 'Your incense is burning quietly here', bo: 'ཁྱེད་ཀྱི་སྤོས་འདིར་ཞི་བག་ཏུ་འབར་བཞིན།' },
  noCushion: { en: 'No free cushion found. Look around and try again.', bo: 'གདན་སྟོང་པ་མ་རྙེད། ཡང་བསྐྱར་ཚོད་ལྟ།' },

  day: { en: 'Day', bo: 'ཉིན་མོ།' },
  night: { en: 'Night', bo: 'མཚན་མོ།' },
} satisfies Record<string, Record<Lang, string>>;

export type Key = keyof typeof STRINGS;

const saved = (() => {
  try { return localStorage.getItem('ritro.lang'); } catch { return null; }
})();
let lang: Lang = saved === 'bo' || saved === 'en' ? saved : navigator.language.startsWith('bo') ? 'bo' : 'en';
const listeners = new Set<() => void>();

export function getLang() { return lang; }
export function setLang(next: Lang) {
  lang = next;
  try { localStorage.setItem('ritro.lang', next); } catch { /* storage unavailable */ }
  applyDom();
  listeners.forEach((fn) => fn());
}
export function onLangChange(fn: () => void) { listeners.add(fn); }

export function t(key: Key, vars?: Record<string, string | number>) {
  let s: string = STRINGS[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
export function pick(b: { en: string; bo: string }) { return b[lang]; }

/** fill every [data-i18n] / [data-i18n-label] element in the document */
export function applyDom(root: ParentNode = document) {
  document.documentElement.lang = lang;
  document.title = t('title');
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18n as Key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((el) => {
    const s = t(el.dataset.i18nLabel as Key);
    el.setAttribute('aria-label', s);
    el.title = s;
  });
}
