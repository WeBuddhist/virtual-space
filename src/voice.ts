import * as THREE from 'three';
import type { AudioEngine } from './audio';
import type { Net, RtcSignal, VoiceState } from './net';

// Proximity voice. Visitors with sound on listen; with the mic on they also speak.
// Each pair of nearby visitors where at least one is speaking holds a WebRTC peer
// connection (signaled through the room server); each voice plays from that
// visitor's position through an HRTF panner and fades out with distance.

/** connect to visitors within this distance (metres), drop them past DROP */
const CONNECT = 14;
const DROP = 20;
/** at most this many voice connections at once, nearest first */
const MAX_PEERS = 8;
/** voices fade from full at NEAR to silent at FAR */
const NEAR = 1.5;
const FAR = 13;
const SPEAKING_LEVEL = 0.035;

interface Peer {
  id: string;
  pc: RTCPeerConnection;
  /** the smaller id makes the offer */
  initiator: boolean;
  el?: HTMLAudioElement;
  source?: MediaStreamAudioSourceNode;
  panner?: PannerNode;
  fade?: GainNode;
  analyser?: AnalyserNode;
  buf?: Float32Array<ArrayBuffer>;
  level: number;
  pending: RTCIceCandidateInit[];
  failedAt?: number;
}

export interface VoiceHost {
  audio: AudioEngine;
  net(): Net | null;
  /** where each other visitor is now */
  positions(): Map<string, THREE.Vector3>;
  /** a microphone stream to use instead of the real one (tests) */
  fakeMic?(ctx: AudioContext): MediaStream;
}

export class Voice {
  /** my state as others see it */
  state: VoiceState = 0;
  micOn = false;
  /** my own mic level 0..1, for the speaking ring on my tag */
  myLevel = 0;
  onChange: () => void = () => {};
  private states = new Map<string, VoiceState>();
  private peers = new Map<string, Peer>();
  private mic: MediaStream | null = null;
  private micAnalyser?: AnalyserNode;
  private micBuf?: Float32Array<ArrayBuffer>;
  private ice: RTCIceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }];
  private iceLoaded = false;
  private retryAfter = new Map<string, number>();

  constructor(private host: VoiceHost) {}

  get supported() { return typeof RTCPeerConnection !== 'undefined' && !!navigator.mediaDevices?.getUserMedia; }

  /** sound on: listen to people nearby */
  setListening(on: boolean) {
    if (!on && this.micOn) this.setMic(false);
    this.publish(on ? (this.micOn ? 2 : 1) : 0);
    if (!on) this.closeAll();
    this.loadIce();
  }

  /** mic on or off; turning it on asks for microphone permission and turns sound on */
  async setMic(on: boolean): Promise<boolean> {
    if (on) {
      const ctx = this.host.audio.ctx;
      if (!ctx) return false;
      try {
        this.mic ??= this.host.fakeMic
          ? this.host.fakeMic(ctx)
          : await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch {
        return false;
      }
      this.mic.getAudioTracks().forEach((t) => (t.enabled = true));
      const src = ctx.createMediaStreamSource(this.mic);
      this.micAnalyser = ctx.createAnalyser();
      this.micAnalyser.fftSize = 512;
      this.micBuf = new Float32Array(this.micAnalyser.fftSize);
      src.connect(this.micAnalyser);
      this.micOn = true;
      for (const p of this.peers.values()) this.sendMic(p);
    } else {
      this.micOn = false;
      // stop the device so the browser's recording indicator goes away
      this.mic?.getTracks().forEach((t) => t.stop());
      this.mic = null;
      this.myLevel = 0;
      for (const p of this.peers.values()) p.pc.getTransceivers()[0]?.sender.replaceTrack(null).catch(() => {});
    }
    this.publish(this.host.audio.enabled ? (this.micOn ? 2 : 1) : 0);
    this.onChange();
    return true;
  }

  /** after (re)connecting: announce my state again and forget old connections */
  reset(visitors: { id: string; voice?: VoiceState }[]) {
    this.closeAll();
    this.states = new Map(visitors.map((v) => [v.id, v.voice ?? 0]));
    this.host.net()?.voice(this.state);
  }

  setState(id: string, state: VoiceState) {
    this.states.set(id, state);
    if (state === 0) this.close(id);
  }

  leave(id: string) {
    this.states.delete(id);
    this.close(id);
  }

  /** speaking level 0..1 of a nearby visitor */
  level(id: string) { return this.peers.get(id)?.level ?? 0; }
  speaking(id: string) { return this.level(id) > SPEAKING_LEVEL; }
  get selfSpeaking() { return this.micOn && this.myLevel > SPEAKING_LEVEL; }

  update(me: THREE.Vector3, camera: THREE.Camera) {
    const ctx = this.host.audio.ctx;
    if (this.micAnalyser && this.micBuf) this.myLevel = rms(this.micAnalyser, this.micBuf, this.myLevel);
    if (!ctx || this.state === 0) return;

    // the listener is the camera: voices pan as you turn your view
    const L = ctx.listener;
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const u = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const c = camera.position;
    if (L.positionX) {
      L.positionX.value = c.x; L.positionY.value = c.y; L.positionZ.value = c.z;
      L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z;
      L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z;
    } else {
      L.setPosition(c.x, c.y, c.z);
      L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z);
    }

    // who to be connected to: nearby visitors with sound on, where one of us speaks
    const net = this.host.net();
    const positions = this.host.positions();
    const now = performance.now();
    const wanted: { id: string; d: number }[] = [];
    for (const [id, p] of positions) {
      const theirs = this.states.get(id) ?? 0;
      if (theirs === 0 || (theirs < 2 && !this.micOn)) continue;
      const d = Math.hypot(p.x - me.x, p.z - me.z);
      if (d < (this.peers.has(id) ? DROP : CONNECT)) wanted.push({ id, d });
    }
    wanted.sort((a, b) => a.d - b.d);
    const keep = new Set(wanted.slice(0, MAX_PEERS).map((w) => w.id));
    for (const id of this.peers.keys()) if (!keep.has(id)) this.close(id);
    if (net?.selfId) {
      for (const id of keep) {
        if (this.peers.has(id) || (this.retryAfter.get(id) ?? 0) > now) continue;
        // the smaller id calls; the other side answers when the offer arrives
        if (net.selfId < id) this.open(id, true);
      }
    }

    for (const peer of this.peers.values()) {
      const p = positions.get(peer.id);
      if (!p || !peer.panner || !peer.fade) continue;
      const head = p.y + 1.0;
      if (peer.panner.positionX) {
        peer.panner.positionX.value = p.x; peer.panner.positionY.value = head; peer.panner.positionZ.value = p.z;
      } else {
        peer.panner.setPosition(p.x, head, p.z);
      }
      const d = Math.hypot(p.x - me.x, p.z - me.z);
      const g = THREE.MathUtils.clamp(1 - (d - NEAR) / (FAR - NEAR), 0, 1);
      peer.fade.gain.setTargetAtTime(g * g, ctx.currentTime, 0.1);
      if (peer.analyser && peer.buf) peer.level = rms(peer.analyser, peer.buf, peer.level);
      if (peer.pc.connectionState === 'failed' && !peer.failedAt) {
        peer.failedAt = now;
        this.close(peer.id);
        this.retryAfter.set(peer.id, now + 8000);
      }
    }
  }

  /** a relayed offer, answer or candidate from another visitor */
  async signal(from: string, data: RtcSignal) {
    if (this.state === 0) return;
    let peer = this.peers.get(from);
    if ('sdp' in data) {
      if (data.sdp.type === 'offer') {
        // a new call (or a fresh one after a failure) replaces any old connection
        if (peer) this.close(from);
        peer = this.open(from, false);
        await peer.pc.setRemoteDescription(data.sdp);
        const tr = peer.pc.getTransceivers()[0];
        if (tr) tr.direction = 'sendrecv';
        this.sendMic(peer);
        await peer.pc.setLocalDescription(await peer.pc.createAnswer());
        this.host.net()?.rtc(from, { sdp: peer.pc.localDescription!.toJSON() });
      } else if (peer?.initiator && peer.pc.signalingState === 'have-local-offer') {
        await peer.pc.setRemoteDescription(data.sdp);
      }
      for (const c of peer?.pending.splice(0) ?? []) await peer!.pc.addIceCandidate(c).catch(() => {});
    } else if (peer) {
      if (!peer.pc.remoteDescription) peer.pending.push(data.candidate ?? {});
      else await peer.pc.addIceCandidate(data.candidate ?? undefined).catch(() => {});
    }
  }

  private open(id: string, initiator: boolean): Peer {
    const pc = new RTCPeerConnection({ iceServers: this.ice });
    const peer: Peer = { id, pc, initiator, level: 0, pending: [] };
    this.peers.set(id, peer);
    pc.onicecandidate = (e) => this.host.net()?.rtc(id, { candidate: e.candidate ? e.candidate.toJSON() : null });
    pc.ontrack = (e) => this.attach(peer, e.streams[0] ?? new MediaStream([e.track]));
    if (initiator) {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
      this.sendMic(peer);
      pc.createOffer()
        .then((o) => pc.setLocalDescription(o))
        .then(() => this.host.net()?.rtc(id, { sdp: pc.localDescription!.toJSON() }))
        .catch(() => this.close(id));
    }
    return peer;
  }

  private sendMic(peer: Peer) {
    const track = this.micOn ? this.mic?.getAudioTracks()[0] ?? null : null;
    peer.pc.getTransceivers()[0]?.sender.replaceTrack(track).catch(() => {});
  }

  private attach(peer: Peer, stream: MediaStream) {
    const ctx = this.host.audio.ctx;
    const out = this.host.audio.input('voices');
    if (!ctx || !out || peer.source) return;
    // Chrome only feeds a remote WebRTC stream to Web Audio while a media element plays it
    peer.el = new Audio();
    peer.el.muted = true;
    peer.el.srcObject = stream;
    peer.el.play().catch(() => {});
    peer.source = ctx.createMediaStreamSource(stream);
    peer.analyser = ctx.createAnalyser();
    peer.analyser.fftSize = 512;
    peer.buf = new Float32Array(peer.analyser.fftSize);
    peer.panner = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: NEAR, rolloffFactor: 0.8, maxDistance: 40 });
    peer.fade = ctx.createGain();
    peer.fade.gain.value = 0;
    peer.source.connect(peer.analyser);
    peer.source.connect(peer.panner).connect(peer.fade).connect(out);
  }

  private close(id: string) {
    const p = this.peers.get(id);
    if (!p) return;
    this.peers.delete(id);
    p.pc.close();
    p.source?.disconnect();
    p.fade?.disconnect();
    if (p.el) { p.el.pause(); p.el.srcObject = null; }
  }

  private closeAll() { for (const id of [...this.peers.keys()]) this.close(id); }

  private publish(state: VoiceState) {
    if (state === this.state) return;
    this.state = state;
    this.host.net()?.voice(state);
    this.onChange();
  }

  private loadIce() {
    if (this.iceLoaded) return;
    this.iceLoaded = true;
    fetch('/ice').then((r) => (r.ok ? r.json() : null)).then((b) => { if (b?.iceServers?.length) this.ice = b.iceServers; }).catch(() => {});
  }
}

/** smoothed RMS level of an analyser's input */
function rms(a: AnalyserNode, buf: Float32Array<ArrayBuffer>, prev: number) {
  a.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += v * v;
  const r = Math.sqrt(sum / buf.length);
  return r > prev ? r : prev * 0.9 + r * 0.1;
}
