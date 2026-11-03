import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import './style.css';
import { applyDom, getLang, onLangChange, pick, setLang, t, type Key } from './i18n';
import { ROOM_CAPACITY, TEMPLE_IDS, parseRoom, roomId, INSTANCES_PER_TEMPLE } from '../shared/rooms';
import { TEMPLES } from './rooms';
import { activeService, isDay } from './rooms/clock';
import type { BowStyle } from './rooms/types';
import { buildWorld, type Cushion } from './world';
import { Avatar, BOW_SECONDS, DEFAULT_LOOK, PALMS_SECONDS, type Pose } from './avatar';
import { Player } from './player';
import { Net, fetchRoomCounts, type NetPose, type ServerMsg, type Visitor } from './net';
import { AudioEngine, type Bus } from './audio';
import { InstrumentStage, Mala } from './overlays';

const NAMES = [
  { en: 'Quiet Cloud', bo: 'ཞི་བའི་སྤྲིན།' }, { en: 'Gentle Wind', bo: 'དལ་བའི་རླུང་།' },
  { en: 'Warm Sunlight', bo: 'དྲོ་བའི་ཉི་འོད།' }, { en: 'Still Lake', bo: 'གཡོ་མེད་མཚོ།' },
  { en: 'Snow Melody', bo: 'གངས་ཀྱི་དབྱངས།' }, { en: 'Soft Rain', bo: 'འཇམ་པའི་ཆར།' },
  { en: 'Morning Star', bo: 'ཐོ་རངས་སྐར་མ།' }, { en: 'Calm River', bo: 'ཞི་བའི་ཆུ་བོ།' },
  { en: 'Lotus Petal', bo: 'པདྨའི་འདབ་མ།' }, { en: 'Pine Shade', bo: 'ཐང་ཤིང་གི་གྲིབ།' },
  { en: 'Moonlit Path', bo: 'ཟླ་འོད་ལམ།' }, { en: 'Small Lamp', bo: 'མཆོད་མེ་ཆུང་ཆུང་།' },
  { en: 'Mountain Echo', bo: 'རི་ཡི་བྲག་ཅ།' }, { en: 'Clear Sky', bo: 'དྭངས་བའི་ནམ་མཁའ།' },
  { en: 'Drifting Leaf', bo: 'ལྡིང་བའི་ལོ་མ།' }, { en: 'Silent Bell', bo: 'ཅ་མེད་དྲིལ་བུ།' },
  { en: 'Golden Dawn', bo: 'གསེར་གྱི་ཐོ་རངས།' }, { en: 'Gentle Stream', bo: 'འཇམ་པའི་ཆུ་ཕྲན།' },
  { en: 'White Conch', bo: 'དུང་དཀར།' }, { en: 'Blue Poppy', bo: 'ཨུཏྤལ་སྔོན་པོ།' },
  { en: 'Evening Lamp', bo: 'དགོང་མོའི་མཆོད་མེ།' }, { en: 'Kind Heart', bo: 'སེམས་བཟང་།' },
  { en: 'Light Snow', bo: 'ཁ་བ་ཡང་པོ།' }, { en: 'Steady Breath', bo: 'དབུགས་བརྟན།' },
];
const RESIDENT_LOOKS = [{ name: 1, color: '#bdc5ad' }, { name: 9, color: '#cbbdab' }, { name: 7, color: '#b9c8c2' }, { name: 0, color: '#c8bd9c' }];

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const params = new URLSearchParams(location.search);
let room = params.get('room') ?? roomId('bodhgaya');
if (!parseRoom(room)) room = roomId('bodhgaya');
const temple = TEMPLES[parseRoom(room)!.temple];
const roomLabel = (id: string) => {
  const r = parseRoom(id)!;
  return `${pick(TEMPLES[r.temple].name)}, ${t('room')} ${r.n}`;
};

// ---- renderer and world -------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('world').append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);

applyDom();
$('temple-name').textContent = pick(temple.name);
$('temple-place').textContent = pick(temple.place);
$('loading-name').textContent = pick(temple.name);
await Promise.race([
  Promise.all([document.fonts.load('600 48px "Noto Serif Tibetan"'), document.fonts.load('16px "Noto Sans Tibetan"')]),
  new Promise((r) => setTimeout(r, 2500)),
]);

const world = buildWorld(renderer, temple);
const RESIDENTS = temple.residents.map((r, i) => ({ ...r, ...RESIDENT_LOOKS[i % RESIDENT_LOOKS.length] }));
const BURNER = world.site.burner.position;
const BURNER_STAND = world.site.burner.stand;
const scene = world.scene;
const me = new Avatar();
me.root.position.copy(world.site.spawn).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, Math.random()));
scene.add(me.root);

const audio = new AudioEngine();
audio.isDay = () => isDay(temple);
audio.loadManifest(temple.id);
// the local audio studio pushes manifest changes straight into an open temple
import.meta.hot?.on('audio-manifest', (d: { temple: string }) => { if (d.temple === temple.id) audio.reload(temple.id); });

// ---- practice state ------------------------------------------------------
type Mode = 'free' | 'palms' | 'bow' | 'kneel' | 'beads' | 'instrument';
let mode: Mode = 'free';
let seat: number | null = null;
let palmsTimer = 0;
let bowCycle = -1;
let bowTime = 0;
// each tradition bows its own way; the temple's first style is the default
let bowStyle = temple.bowStyles[0];
me.setBowStyle(bowStyle);
const bowSelect = $<HTMLSelectElement>('bow-select');
$('bow-row').hidden = temple.bowStyles.length < 2;
bowSelect.addEventListener('change', () => {
  bowStyle = bowSelect.value as BowStyle;
  me.setBowStyle(bowStyle);
  if (mode === 'bow') net?.act('bow', bowStyle);
});
function renderBowStyles() {
  bowSelect.replaceChildren(...temple.bowStyles.map((s) => new Option(t(s), s, false, s === bowStyle)));
}

const player = new Player(me, camera, world, renderer.domElement, {
  onCushion: (c) => requestSeat(c),
  onBurner: () => offerIncense(),
  onMoveStart: () => leavePractice(),
});
player.yaw = world.site.spawnYaw;
player.camYaw = player.yaw + Math.PI;
player.snapCamera();
if (import.meta.env.DEV) Object.assign(window, { __ritro: { player, me, world, camera } });

function leavePractice() {
  if (mode === 'bow') stopBow(false);
  if (mode === 'beads') closeOverlays();
  if (seat !== null) {
    seat = null;
    net?.stand();
  }
  if (mode !== 'instrument') mode = 'free';
  updateDock();
}

function startPalms() {
  if (mode === 'bow') return stopBow(true);
  mode = 'palms';
  me.setPose('palms');
  net?.act('hello');
  bubble(selfTagId, '🙏');
  clearTimeout(palmsTimer);
  palmsTimer = window.setTimeout(() => {
    if (mode === 'palms') {
      mode = seat !== null ? 'kneel' : 'free';
      me.setPose(seat !== null ? 'kneel' : 'idle');
    }
    updateDock();
  }, PALMS_SECONDS * 1000);
  updateDock();
}

function startBow() {
  player.stop();
  mode = 'bow';
  bowTime = 0;
  bowCycle = -1;
  me.setPose('bow');
  net?.act('bow', bowStyle);
  updateDock();
}

function stopBow(withPalms: boolean) {
  if (mode !== 'bow') return;
  mode = 'free';
  net?.act('stand');
  if (withPalms) startPalms();
  else me.setPose('idle');
  updateDock();
}

function requestSeat(c: Cushion) {
  if (RESIDENTS.some((r) => r.seat === c.index) || [...remotes.values()].some((r) => r.v.seat === c.index)) {
    return toast(t('noCushion'));
  }
  leavePractice();
  // walk over first; the seat is claimed on arrival so the walk itself doesn't release it
  // approach from the side the seat faces away from
  const yaw = c.yaw ?? Math.PI;
  const front = c.position.clone().add(new THREE.Vector3(-Math.sin(yaw) * 0.55, 0, -Math.cos(yaw) * 0.55));
  player.walkTo(front, () => player.walkTo(c.position, () => {
    if (net?.status === 'online') {
      pendingSeat = c;
      net.seat(c.index);
    } else {
      sit(c);
    }
  }));
}
let pendingSeat: Cushion | null = null;

function sit(c: Cushion) {
  seat = c.index;
  player.yaw = c.yaw ?? Math.PI;
  mode = 'kneel';
  me.setPose('kneel');
  updateDock();
}

function offerIncense() {
  leavePractice();
  toast(t('incenseQueue'));
  player.walkTo(BURNER_STAND, () => {
    player.yaw = Math.atan2(BURNER.x - me.root.position.x, BURNER.z - me.root.position.z);
    startPalms();
    setTimeout(() => {
      world.addIncense();
      net?.act('incense');
      audio.bowl();
      toast(t('incenseLit'));
    }, 1200);
  });
}

// ---- overlays ------------------------------------------------------------
const practiceLayer = $('practice-layer');
const mala = new Mala($('mala-host'), () => {
  audio.bead();
  beadPulse();
}, () => closeOverlays());
const instruments = new InstrumentStage($('woodfish-host'), temple.instruments, (id) => {
  if (!audio.enabled) toast(t('soundFirst'));
  audio.play(id);
}, (intensity) => audio.bowlRub(intensity), () => closeOverlays());

let lastBeadSent = 0;
function beadPulse() {
  const now = performance.now();
  if (now - lastBeadSent > 1500) {
    lastBeadSent = now;
    net?.act('bead');
  }
}

function openBeads() {
  if (mode === 'bow') stopBow(false);
  closeOverlays();
  mode = 'beads';
  me.setPose('beads');
  practiceLayer.hidden = false;
  mala.show();
  updateDock();
}

function openInstruments() {
  if (mode === 'bow') stopBow(false);
  closeOverlays();
  mode = 'instrument';
  practiceLayer.hidden = false;
  instruments.show();
  updateDock();
}

function closeOverlays() {
  const was = mode;
  mala.hide();
  instruments.hide();
  practiceLayer.hidden = true;
  if (was === 'beads' || was === 'instrument') {
    mode = seat !== null ? 'kneel' : 'free';
    me.setPose(seat !== null ? 'kneel' : 'idle');
  }
  updateDock();
}

// ---- dock and keys -------------------------------------------------------
document.querySelectorAll<HTMLButtonElement>('[data-practice]').forEach((b) => {
  b.addEventListener('click', () => {
    const p = b.dataset.practice;
    if (p === 'palms') startPalms();
    if (p === 'bow') (mode === 'bow' ? stopBow(true) : startBow());
    if (p === 'instrument') (mode === 'instrument' ? closeOverlays() : openInstruments());
    if (p === 'beads') (mode === 'beads' ? closeOverlays() : openBeads());
  });
});

function updateDock() {
  const active: Record<string, boolean> = { palms: mode === 'palms', bow: mode === 'bow', moktak: mode === 'instrument', beads: mode === 'beads' };
  document.querySelectorAll<HTMLButtonElement>('[data-practice]').forEach((b) => {
    const on = active[b.dataset.practice!];
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  const bowLabel = document.querySelector<HTMLElement>('.bow-label')!;
  bowLabel.dataset.i18n = mode === 'bow' ? 'stopBow' : 'bow';
  bowLabel.textContent = t(bowLabel.dataset.i18n as Key);
  const hint = $('hint');
  const coarse = matchMedia('(pointer: coarse)').matches;
  hint.dataset.i18n = mode === 'bow' ? 'hintBowing' : coarse ? 'hintTouch' : 'hintDesktop';
  hint.textContent = t(hint.dataset.i18n as Key);
}

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement)?.closest?.('input,dialog[open]')) return;
  if (e.key === 'Escape') return closeOverlays();
  if (mode === 'instrument' || mode === 'beads') {
    if (e.key === '2' && mode === 'beads') closeOverlays();
    if (e.key === '5' && mode === 'instrument') closeOverlays();
    return;
  }
  if (e.key === '1' || e.key === 'e' || e.key === ' ') { e.preventDefault(); mode === 'bow' ? stopBow(true) : startBow(); }
  if (e.key === '2') openBeads();
  if (e.key === '3') startPalms();
  if (e.key === '5') openInstruments();
});

// ---- toast ---------------------------------------------------------------
let toastTimer = 0;
function toast(msg: string) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 3200);
}

// ---- remote visitors -----------------------------------------------------
interface Remote { v: Visitor; avatar: Avatar; target: THREE.Vector3; yaw: number; bowing: boolean; palmsUntil: number }
const remotes = new Map<string, Remote>();
const tags = new Map<string, HTMLElement>();
const selfTagId = '__me';

function makeTag(id: string, nameIdx: number, color: string, isMe = false) {
  const el = document.createElement('div');
  el.className = 'tag' + (isMe ? ' me' : '');
  el.style.setProperty('--dot', color);
  el.dataset.name = String(nameIdx);
  el.innerHTML = `<i>${isMe ? t('me').replace('།', '') : ''}</i><span></span>`;
  el.querySelector('span')!.textContent = pick(NAMES[nameIdx % NAMES.length]);
  $('tags').append(el);
  tags.set(id, el);
  return el;
}
function bubble(id: string, emoji: string) {
  const el = tags.get(id);
  if (!el) return;
  const b = document.createElement('span');
  b.className = 'bubble';
  b.textContent = emoji;
  el.append(b);
  setTimeout(() => b.remove(), 2000);
}

let myName = Math.floor(Math.random() * NAMES.length);
let myColor = '#bdc5ad';
makeTag(selfTagId, myName, myColor, true);

// residents keep their seats in every room, in their own tradition's robes
const residentAvatars = RESIDENTS.map((r, i) => {
  const a = new Avatar({ ...DEFAULT_LOOK, ...(r.robe ? { robe: r.robe } : {}), ...(r.shirt ? { shirt: r.shirt } : {}) });
  const c = world.cushions[r.seat];
  a.root.position.copy(c.position);
  a.root.rotation.y = c.yaw ?? Math.PI;
  a.setBowStyle(temple.bowStyles[0]);
  a.setPose(r.pose ?? 'kneel');
  scene.add(a.root);
  makeTag(`resident:${i}`, r.name, r.color);
  return a;
});

function addRemote(v: Visitor) {
  if (v.id === net?.selfId || remotes.has(v.id)) return;
  const avatar = new Avatar();
  avatar.root.position.set(v.x, world.groundHeight(v.x, v.z), v.z);
  avatar.root.rotation.y = v.yaw;
  scene.add(avatar.root);
  remotes.set(v.id, { v, avatar, target: new THREE.Vector3(v.x, 0, v.z), yaw: v.yaw, bowing: false, palmsUntil: 0 });
  makeTag(v.id, v.name, v.color);
}
function removeRemote(id: string) {
  const r = remotes.get(id);
  if (!r) return;
  scene.remove(r.avatar.root);
  r.avatar.dispose();
  remotes.delete(id);
  tags.get(id)?.remove();
  tags.delete(id);
}

// ---- networking ----------------------------------------------------------
let net: Net | null = null;

function connect() {
  net?.close();
  for (const id of [...remotes.keys()]) removeRemote(id);
  net = new Net(room, { onMessage, onStatus });
  net.connect();
  $('room-number').textContent = String(parseRoom(room)!.n);
  const url = new URL(location.href);
  url.searchParams.set('room', room);
  history.replaceState(null, '', url);
}

function onStatus(s: Net['status']) {
  if (s === 'offline') toast(t('offline'));
  if (s === 'full') toast(t('roomFull'));
  renderCount();
}

function onMessage(m: ServerMsg) {
  switch (m.type) {
    case 'snapshot': {
      for (const id of [...remotes.keys()]) removeRemote(id);
      const self = m.visitors.find((v) => v.id === m.selfId);
      if (self) {
        myName = self.name;
        myColor = self.color;
        const tag = tags.get(selfTagId)!;
        tag.style.setProperty('--dot', myColor);
        tag.dataset.name = String(myName);
        tag.querySelector('span')!.textContent = pick(NAMES[myName % NAMES.length]);
      }
      m.visitors.forEach(addRemote);
      $('people-cap').textContent = String(m.capacity);
      break;
    }
    case 'join': addRemote(m.visitor); break;
    case 'leave': removeRemote(m.id); break;
    case 'move': {
      const r = remotes.get(m.id);
      if (!r) break;
      Object.assign(r.v, { x: m.x, z: m.z, yaw: m.yaw, pose: m.pose });
      r.target.set(m.x, 0, m.z);
      r.yaw = m.yaw;
      if (m.pose === 'walk') r.bowing = false;
      break;
    }
    case 'act': {
      const r = remotes.get(m.id);
      if (!r) break;
      if (m.act === 'hello') { r.palmsUntil = performance.now() + PALMS_SECONDS * 1000; r.bowing = false; bubble(m.id, '🙏'); }
      if (m.act === 'bow') { r.bowing = true; if (m.style) r.avatar.setBowStyle(m.style); }
      if (m.act === 'stand') r.bowing = false;
      if (m.act === 'incense') world.addIncense();
      if (m.act === 'bead') bubble(m.id, '📿');
      break;
    }
    case 'seat': {
      const r = remotes.get(m.id);
      if (r) r.v.seat = m.seat;
      break;
    }
    case 'seat-granted':
      if (pendingSeat?.index === m.seat) sit(pendingSeat);
      pendingSeat = null;
      break;
    case 'seat-unavailable':
      pendingSeat = null;
      toast(t('noCushion'));
      break;
  }
  renderCount();
}

function renderCount() {
  const n = net?.status === 'online' ? remotes.size + 1 : 1;
  $('people-count').textContent = String(n).padStart(2, '0');
}

function myNetPose(): NetPose {
  if (mode === 'kneel' || mode === 'bow') return 'kneel';
  if (mode === 'beads') return 'beads';
  return me.currentPose === 'walk' ? 'walk' : 'idle';
}

// ---- HUD -----------------------------------------------------------------
const soundBtn = $('btn-sound');
soundBtn.addEventListener('click', async () => {
  try {
    if (audio.enabled) await audio.disable();
    else await audio.enable();
  } catch {
    toast('Web Audio is not supported in this browser.');
  }
});
function renderSound() {
  soundBtn.classList.toggle('on', audio.enabled);
  soundBtn.dataset.i18nLabel = audio.enabled ? 'soundOff' : 'soundOn';
  soundBtn.setAttribute('aria-label', t(soundBtn.dataset.i18nLabel as Key));
  soundBtn.title = t(soundBtn.dataset.i18nLabel as Key);
  const chip = $('btn-chant');
  const svc = activeService(temple, audio.serviceSeconds);
  chip.classList.toggle('on', audio.chanting);
  chip.textContent = audio.chanting ? (communal ? t('listeningTogether') : t('stopChant')) : svc ? t(svc.kind === 'dawn' ? 'dawnService' : 'eveningService') : t('listenChant');
  document.querySelectorAll<HTMLInputElement>('[data-bus]').forEach((i) => { i.value = String(audio.levels[i.dataset.bus as Bus]); });
  const sw = $('bg-switch');
  sw.setAttribute('aria-checked', String(audio.background));
  sw.textContent = '';
  $('bg-desc').textContent = audio.background ? t('backgroundOn') : t('backgroundOff');
  // chant and music pickers come from the temple's audio manifest
  const chantSel = $<HTMLSelectElement>('chant-select');
  const chants = audio.manifest.chants;
  chantSel.replaceChildren(...(chants.length ? chants : [null]).map((c, i) => new Option(c ? pick(c.title) || c.src : t('synthChant'), String(i), false, i === audio.chantIndex)));
  chantSel.disabled = chants.length < 2;
  const musicSel = $<HTMLSelectElement>('music-select');
  $('music-row').hidden = !audio.manifest.music.length;
  musicSel.replaceChildren(new Option(t('none'), ''), ...audio.manifest.music.map((m, i) => new Option(pick(m.title) || m.src, String(i), false, i === audio.musicIndex)));
}
audio.onChange(renderSound);
$<HTMLSelectElement>('chant-select').addEventListener('change', (e) => {
  audio.chantIndex = Number((e.target as HTMLSelectElement).value);
  if (audio.chanting && !communal) audio.startChant(0);
});
$<HTMLSelectElement>('music-select').addEventListener('change', async (e) => {
  const v = (e.target as HTMLSelectElement).value;
  if (v === '') return audio.stopMusic();
  if (!audio.enabled) await audio.enable().catch(() => {});
  audio.startMusic(Number(v));
});

let communal = false;
$('btn-chant').addEventListener('click', async () => {
  if (audio.chanting) {
    communal = false;
    audio.stopChant();
    return;
  }
  if (!audio.enabled) await audio.enable().catch(() => {});
  const svc = activeService(temple, audio.serviceSeconds);
  communal = !!svc;
  audio.startChant(svc?.offset ?? 0, svc ? audio.serviceChantIndex(svc.kind) : audio.chantIndex);
});
// join or leave the communal service as its window opens and closes
setInterval(() => {
  const svc = activeService(temple, audio.serviceSeconds);
  if (svc && audio.enabled && !audio.chanting) { communal = true; audio.startChant(svc.offset, audio.serviceChantIndex(svc.kind)); }
  if (!svc && communal) { communal = false; audio.stopChant(); }
  $('orb').classList.toggle('night', !isDay(temple));
  $('orb').setAttribute('aria-label', isDay(temple) ? t('day') : t('night'));
}, 1000);

const langBtn = $('btn-lang');
langBtn.addEventListener('click', () => setLang(getLang() === 'en' ? 'bo' : 'en'));
document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang as 'en' | 'bo')));
function renderLang() {
  langBtn.textContent = getLang() === 'en' ? 'བོད' : 'EN';
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
  $('temple-name').textContent = pick(temple.name);
  $('temple-place').textContent = pick(temple.place);
  for (const [, el] of tags) {
    el.querySelector('span')!.textContent = pick(NAMES[Number(el.dataset.name) % NAMES.length]);
    if (el.classList.contains('me')) el.querySelector('i')!.textContent = t('me').replace('།', '');
  }
  mala.renderCount();
  instruments.render();
  renderBowStyles();
  updateDock();
  renderSound();
}
onLangChange(renderLang);

document.querySelectorAll<HTMLInputElement>('[data-bus]').forEach((i) => {
  i.addEventListener('input', () => audio.setLevel(i.dataset.bus as Bus, Number(i.value)));
});
$('bg-switch').addEventListener('click', () => audio.setBackground(!audio.background));

const dlgRooms = $<HTMLDialogElement>('dlg-rooms');
const dlgPeople = $<HTMLDialogElement>('dlg-people');
const dlgSettings = $<HTMLDialogElement>('dlg-settings');
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => (b.closest('dialog') as HTMLDialogElement).close()));
for (const d of [dlgRooms, dlgPeople, dlgSettings]) {
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
}
$('btn-settings').addEventListener('click', () => { renderSound(); dlgSettings.showModal(); });
$('btn-people').addEventListener('click', () => {
  const list = $('people-list');
  list.innerHTML = '';
  const entries: [number, string, boolean][] = [[myName, myColor, true], ...[...remotes.values()].map((r) => [r.v.name, r.v.color, false] as [number, string, boolean]), ...RESIDENTS.map((r) => [r.name, r.color, false] as [number, string, boolean])];
  for (const [name, color, isMe] of entries) {
    const li = document.createElement('li');
    li.innerHTML = '<i></i><span></span>';
    li.querySelector('i')!.style.setProperty('--dot', color);
    li.querySelector('span')!.textContent = pick(NAMES[name % NAMES.length]) + (isMe ? ` (${t('me')})` : '');
    list.append(li);
  }
  dlgPeople.showModal();
});

$('btn-room').addEventListener('click', () => { renderRooms(null); dlgRooms.showModal(); refreshRooms(); });
$('room-refresh').addEventListener('click', refreshRooms);
async function refreshRooms() { renderRooms(await fetchRoomCounts()); }
function renderRooms(counts: Record<string, number> | null) {
  $('room-current').textContent = `${t('current')}: ${roomLabel(room)}`;
  const grid = $('room-grid');
  grid.innerHTML = '';
  // the current temple first, then the others
  const order = [temple.id, ...TEMPLE_IDS.filter((id) => id !== temple.id)];
  for (const tid of order) {
    const def = TEMPLES[tid];
    const ids = Array.from({ length: INSTANCES_PER_TEMPLE }, (_, i) => roomId(tid, i + 1));
    const total = counts ? ids.reduce((sum, id) => sum + (counts[id] ?? 0), 0) : undefined;
    const section = document.createElement('section');
    section.className = 'temple-group';
    section.innerHTML = '<header><strong></strong><small></small></header><div class="room-grid-inner"></div>';
    section.querySelector('strong')!.textContent = pick(def.name);
    section.querySelector('small')!.textContent = pick(def.place);
    if (total !== undefined) section.querySelector('header')!.dataset.total = String(total);
    const inner = section.querySelector('.room-grid-inner')!;
    for (const id of ids) {
      const count = counts?.[id];
      const full = count !== undefined && count >= ROOM_CAPACITY;
      const b = document.createElement('button');
      b.setAttribute('aria-current', String(id === room));
      b.disabled = full && id !== room;
      b.innerHTML = '<strong></strong><small></small>';
      b.querySelector('strong')!.textContent = String(parseRoom(id)!.n);
      b.querySelector('small')!.textContent = count === undefined ? '…' : `${count}/${ROOM_CAPACITY}`;
      b.addEventListener('click', () => {
        dlgRooms.close();
        if (id === room) return;
        if (parseRoom(id)!.temple !== temple.id) {
          // a different temple needs its own world, so load it fresh
          const url = new URL(location.href);
          url.searchParams.set('room', id);
          location.assign(url);
          return;
        }
        room = id;
        leavePractice();
        connect();
      });
      inner.append(b);
    }
    grid.append(section);
  }
}

$('btn-exit').addEventListener('click', () => {
  net?.close();
  net = null;
  audio.disable();
  $('exit-name').textContent = pick(temple.name);
  $('exit-screen').hidden = false;
});
$('btn-stay').addEventListener('click', () => location.reload());

// resting: a hidden tab gives up its place after a while
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = performance.now();
  else if (net && performance.now() - hiddenAt > 120_000 && !audio.background) {
    net.close();
    net = null;
    $('rest').hidden = false;
  }
});
$('btn-resume').addEventListener('click', () => {
  $('rest').hidden = true;
  connect();
});

// ---- frame loop ----------------------------------------------------------
// a soft glow on lamps, flames and floodlit gold: gentle by day, stronger at night
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.1, 0.45, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const tmp = new THREE.Vector3();
const clock = new THREE.Clock();
let first = true;

// line-of-sight checks for name tags are spread out: each tag is re-checked a few times a second
const occlusionRay = new THREE.Raycaster();
const hiddenBehind = new Map<string, { at: number; hidden: boolean }>();
function occluded(id: string, head: THREE.Vector3, dist: number) {
  const occ = world.site.occluders;
  if (!occ?.length) return false;
  const now = performance.now();
  const prev = hiddenBehind.get(id);
  if (prev && now - prev.at < 250) return prev.hidden;
  occlusionRay.set(camera.position, head.clone().sub(camera.position).normalize());
  occlusionRay.far = dist - 0.3;
  const hidden = occlusionRay.intersectObjects(occ, true).length > 0;
  hiddenBehind.set(id, { at: now + Math.random() * 60, hidden });
  return hidden;
}

function placeTag(id: string, avatar: Avatar) {
  const el = tags.get(id);
  if (!el) return;
  avatar.headTop(tmp);
  const dist = tmp.distanceTo(camera.position);
  const blocked = dist < 28 && occluded(id, tmp.clone(), dist);
  tmp.project(camera);
  const visible = !blocked && tmp.z < 1 && dist < 28 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
  el.style.display = visible ? '' : 'none';
  if (!visible) return;
  const x = (tmp.x * 0.5 + 0.5) * innerWidth;
  const y = (-tmp.y * 0.5 + 0.5) * innerHeight;
  const s = THREE.MathUtils.clamp(5 / dist, 0.7, 1.1);
  el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${s})`;
}

function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const walking = player.update(dt);
  if (walking) {
    if (mode === 'palms' || mode === 'kneel') mode = 'free';
    me.setPose('walk');
  } else if (me.currentPose === 'walk') {
    me.setPose('idle');
  }
  if (mode === 'bow') {
    bowTime += dt;
    const cycle = Math.floor(bowTime / BOW_SECONDS[bowStyle]);
    if (cycle !== bowCycle) { bowCycle = cycle; audio.bowl(); }
  }
  me.update(dt);
  net?.move(me.root.position.x, me.root.position.z, player.yaw, myNetPose());

  const now = performance.now();
  for (const r of remotes.values()) {
    const p = r.avatar.root.position;
    const gap = Math.hypot(r.target.x - p.x, r.target.z - p.z);
    p.x += (r.target.x - p.x) * Math.min(1, dt * 8);
    p.z += (r.target.z - p.z) * Math.min(1, dt * 8);
    p.y = world.groundHeight(p.x, p.z);
    const dy = Math.atan2(Math.sin(r.yaw - r.avatar.root.rotation.y), Math.cos(r.yaw - r.avatar.root.rotation.y));
    r.avatar.root.rotation.y += dy * Math.min(1, dt * 10);
    let pose: Pose = 'idle';
    if (r.bowing) pose = 'bow';
    else if (now < r.palmsUntil) pose = 'palms';
    else if (gap > 0.05 || r.v.pose === 'walk' && gap > 0.02) pose = 'walk';
    else if (r.v.pose === 'kneel') pose = 'kneel';
    else if (r.v.pose === 'beads') pose = 'beads';
    r.avatar.setPose(pose);
    r.avatar.update(dt);
    placeTag(r.v.id, r.avatar);
  }
  residentAvatars.forEach((a, i) => { a.update(dt); placeTag(`resident:${i}`, a); });
  placeTag(selfTagId, me);

  $('btn-incense').hidden = mode === 'bow' || me.root.position.distanceTo(BURNER) > 3.6;
  world.update(dt, new Date());
  bloom.strength = 0.06 + (1 - world.daylight) * 0.32;
  composer.render();
  if (first) {
    first = false;
    $('loading').classList.add('fade');
    setTimeout(() => $('loading').remove(), 900);
  }
  requestAnimationFrame(frame);
}

$('btn-incense').addEventListener('click', offerIncense);
// the controls hint fades once the visitor has had time to read it
setTimeout(() => { $('hint').style.opacity = '0'; }, 9000);
renderLang();
connect();
frame();
