import * as THREE from 'three';
import './style.css';
import { applyDom, getLang, onLangChange, pick, setLang, t, type Key } from './i18n';
import { TEMPLE, activeService, isDay, roomId, roomNumber } from './temple';
import { buildWorld, BURNER, BURNER_STAND, SPAWN, type Cushion } from './world';
import { Avatar, BOW_SECONDS, PALMS_SECONDS, type Pose } from './avatar';
import { Player } from './player';
import { Net, fetchRoomCounts, type NetPose, type ServerMsg, type Visitor } from './net';
import { AudioEngine, type Bus } from './audio';
import { Mala, WoodFish } from './overlays';

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
const RESIDENTS = [
  { seat: 0, name: 1, color: '#bdc5ad' }, { seat: 2, name: 9, color: '#cbbdab' },
  { seat: 5, name: 7, color: '#b9c8c2' }, { seat: 9, name: 0, color: '#c8bd9c' },
];

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

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
$('temple-name').textContent = pick(TEMPLE.name);
$('loading-name').textContent = pick(TEMPLE.name);
await Promise.race([
  Promise.all([document.fonts.load('600 48px "Noto Serif Tibetan"'), document.fonts.load('16px "Noto Sans Tibetan"')]),
  new Promise((r) => setTimeout(r, 2500)),
]);

const world = buildWorld(renderer);
const scene = world.scene;
const me = new Avatar();
me.root.position.copy(SPAWN).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, Math.random()));
scene.add(me.root);

const audio = new AudioEngine();
audio.isDay = () => isDay();

// ---- practice state ------------------------------------------------------
type Mode = 'free' | 'palms' | 'bow' | 'kneel' | 'beads' | 'moktak';
let mode: Mode = 'free';
let seat: number | null = null;
let palmsTimer = 0;
let bowCycle = -1;
let bowTime = 0;

const player = new Player(me, camera, world, renderer.domElement, {
  onCushion: (c) => requestSeat(c),
  onBurner: () => offerIncense(),
  onMoveStart: () => leavePractice(),
});
player.yaw = Math.PI;
player.snapCamera();
if (import.meta.env.DEV) Object.assign(window, { __ritro: { player, me, world, camera } });

function leavePractice() {
  if (mode === 'bow') stopBow(false);
  if (mode === 'beads') closeOverlays();
  if (seat !== null) {
    seat = null;
    net?.stand();
  }
  if (mode !== 'moktak') mode = 'free';
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
  net?.act('bow');
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
  const front = c.position.clone().add(new THREE.Vector3(0, 0, 0.55));
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
  player.yaw = Math.PI;
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
const woodfish = new WoodFish($('woodfish-host'), () => {
  if (!audio.enabled) toast(t('soundFirst'));
  audio.moktak();
}, () => closeOverlays());

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

function openMoktak() {
  if (mode === 'bow') stopBow(false);
  closeOverlays();
  mode = 'moktak';
  practiceLayer.hidden = false;
  woodfish.show();
  updateDock();
}

function closeOverlays() {
  const was = mode;
  mala.hide();
  woodfish.hide();
  practiceLayer.hidden = true;
  if (was === 'beads' || was === 'moktak') {
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
    if (p === 'moktak') (mode === 'moktak' ? closeOverlays() : openMoktak());
    if (p === 'beads') (mode === 'beads' ? closeOverlays() : openBeads());
  });
});

function updateDock() {
  const active: Record<string, boolean> = { palms: mode === 'palms', bow: mode === 'bow', moktak: mode === 'moktak', beads: mode === 'beads' };
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
  if (mode === 'moktak' || mode === 'beads') {
    if (e.key === '2' && mode === 'beads') closeOverlays();
    if (e.key === '5' && mode === 'moktak') closeOverlays();
    return;
  }
  if (e.key === '1' || e.key === 'e' || e.key === ' ') { e.preventDefault(); mode === 'bow' ? stopBow(true) : startBow(); }
  if (e.key === '2') openBeads();
  if (e.key === '3') startPalms();
  if (e.key === '5') openMoktak();
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

// residents kneel on their cushions in every room
const residentAvatars = RESIDENTS.map((r, i) => {
  const a = new Avatar();
  const c = world.cushions[r.seat];
  a.root.position.copy(c.position);
  a.root.rotation.y = Math.PI;
  a.setPose('kneel');
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
const params = new URLSearchParams(location.search);
let room = params.get('room') ?? roomId(1);
if (!Number.isFinite(roomNumber(room))) room = roomId(1);
let net: Net | null = null;

function connect() {
  net?.close();
  for (const id of [...remotes.keys()]) removeRemote(id);
  net = new Net(room, { onMessage, onStatus });
  net.connect();
  $('room-number').textContent = String(roomNumber(room));
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
      if (m.act === 'bow') r.bowing = true;
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
  const svc = activeService();
  chip.classList.toggle('on', audio.chanting);
  chip.textContent = audio.chanting ? (communal ? t('listeningTogether') : t('stopChant')) : svc ? t(svc.kind === 'dawn' ? 'dawnService' : 'eveningService') : t('listenChant');
  document.querySelectorAll<HTMLInputElement>('[data-bus]').forEach((i) => { i.value = String(audio.levels[i.dataset.bus as Bus]); });
  const sw = $('bg-switch');
  sw.setAttribute('aria-checked', String(audio.background));
  sw.textContent = '';
  $('bg-desc').textContent = audio.background ? t('backgroundOn') : t('backgroundOff');
}
audio.onChange(renderSound);

let communal = false;
$('btn-chant').addEventListener('click', async () => {
  if (audio.chanting) {
    communal = false;
    audio.stopChant();
    return;
  }
  if (!audio.enabled) await audio.enable().catch(() => {});
  const svc = activeService();
  communal = !!svc;
  audio.startChant(svc?.offset ?? 0);
});
// join or leave the communal service as its window opens and closes
setInterval(() => {
  const svc = activeService();
  if (svc && audio.enabled && !audio.chanting) { communal = true; audio.startChant(svc.offset); }
  if (!svc && communal) { communal = false; audio.stopChant(); }
  $('orb').classList.toggle('night', !isDay());
  $('orb').setAttribute('aria-label', isDay() ? t('day') : t('night'));
}, 1000);

const langBtn = $('btn-lang');
langBtn.addEventListener('click', () => setLang(getLang() === 'en' ? 'bo' : 'en'));
document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang as 'en' | 'bo')));
function renderLang() {
  langBtn.textContent = getLang() === 'en' ? 'བོད' : 'EN';
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
  $('temple-name').textContent = pick(TEMPLE.name);
  for (const [, el] of tags) {
    el.querySelector('span')!.textContent = pick(NAMES[Number(el.dataset.name) % NAMES.length]);
    if (el.classList.contains('me')) el.querySelector('i')!.textContent = t('me').replace('།', '');
  }
  mala.renderCount();
  woodfish.renderAuto();
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
    li.querySelector('span')!.textContent = pick(NAMES[name % NAMES.length]) + (isMe ? ` · ${t('me')}` : '');
    list.append(li);
  }
  dlgPeople.showModal();
});

$('btn-room').addEventListener('click', () => { renderRooms(null); dlgRooms.showModal(); refreshRooms(); });
$('room-refresh').addEventListener('click', refreshRooms);
async function refreshRooms() { renderRooms(await fetchRoomCounts()); }
function renderRooms(counts: Record<string, number> | null) {
  $('room-current').textContent = `${t('current')} · ${t('room')} ${roomNumber(room)}`;
  const grid = $('room-grid');
  grid.innerHTML = '';
  for (let n = 1; n <= TEMPLE.roomCount; n++) {
    const id = roomId(n);
    const count = counts?.[id];
    const full = count !== undefined && count >= TEMPLE.capacity;
    const b = document.createElement('button');
    b.setAttribute('aria-current', String(id === room));
    b.disabled = full && id !== room;
    b.innerHTML = '<strong></strong><small></small>';
    b.querySelector('strong')!.textContent = `${t('room')} ${n}`;
    b.querySelector('small')!.textContent = count === undefined ? t('checking') : `${count} / ${TEMPLE.capacity}${full ? ` · ${t('full')}` : ''}`;
    b.addEventListener('click', () => {
      dlgRooms.close();
      if (id === room) return;
      room = id;
      leavePractice();
      connect();
    });
    grid.append(b);
  }
}

$('btn-exit').addEventListener('click', () => {
  net?.close();
  net = null;
  audio.disable();
  $('exit-name').textContent = pick(TEMPLE.name);
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
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const tmp = new THREE.Vector3();
const clock = new THREE.Clock();
let first = true;

function placeTag(id: string, avatar: Avatar) {
  const el = tags.get(id);
  if (!el) return;
  avatar.headTop(tmp);
  const dist = tmp.distanceTo(camera.position);
  tmp.project(camera);
  const visible = tmp.z < 1 && dist < 28 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
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
    const cycle = Math.floor(bowTime / BOW_SECONDS);
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
  renderer.render(scene, camera);
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
