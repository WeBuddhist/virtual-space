import * as THREE from 'three';
import type { Avatar } from './avatar';
import type { Box2, Cushion, World } from './world';

const SPEED = 2.4;
const RADIUS = 0.22;

export interface PlayerEvents {
  onCushion(c: Cushion): void;
  onBurner(): void;
  onMoveStart(): void;
}

/** third-person controller: the camera orbits behind the avatar */
export class Player {
  yaw = Math.PI;            // avatar facing (+z local) → world yaw; PI faces the hall
  camYaw = 0;               // camera orbit angle around the avatar
  camPitch = 0.32;
  camDist = 3.6;
  target: THREE.Vector3 | null = null;
  private keys = new Set<string>();
  private marker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private ray = new THREE.Raycaster();
  private pointers = new Map<number, { x: number; y: number }>();
  private dragDist = 0;
  private pinchStart = 0;
  private arrive: (() => void) | null = null;
  enabled = true;

  constructor(
    readonly avatar: Avatar,
    readonly camera: THREE.PerspectiveCamera,
    readonly world: World,
    readonly el: HTMLElement,
    readonly events: PlayerEvents,
  ) {
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.22, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    world.scene.add(this.marker);
    this.camYaw = this.yaw + Math.PI;
    this.bind();
  }

  get position() { return this.avatar.root.position; }

  walkTo(p: THREE.Vector3, onArrive?: () => void) {
    this.target = p.clone();
    this.arrive = onArrive ?? null;
    this.marker.position.set(p.x, this.world.groundHeight(p.x, p.z) + 0.03, p.z);
    this.marker.visible = !onArrive;
    this.events.onMoveStart();
  }

  stop() {
    this.target = null;
    this.arrive = null;
    this.marker.visible = false;
  }

  private bind() {
    const el = this.el;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.dragDist = 0;
      if (this.pointers.size === 2) this.pinchStart = this.pinchDistance();
    });
    el.addEventListener('pointermove', (e) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const d = this.pinchDistance();
        if (this.pinchStart > 0) this.zoom((this.pinchStart - d) * 0.01);
        this.pinchStart = d;
        this.dragDist = 99;
        return;
      }
      this.dragDist += Math.abs(dx) + Math.abs(dy);
      if (this.dragDist > 4) {
        this.camYaw -= dx * 0.006;
        this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.004, 0.05, 1.2);
      }
    });
    const up = (e: PointerEvent) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0 && this.dragDist <= 4 && this.enabled) this.pick(e);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', (e) => this.pointers.delete(e.pointerId));
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(e.deltaY * 0.003); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.closest?.('input,textarea,dialog[open]')) return;
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  private pinchDistance() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private zoom(delta: number) {
    this.camDist = THREE.MathUtils.clamp(this.camDist + delta * this.camDist, 1.6, 9);
  }

  private pick(e: PointerEvent) {
    const rect = this.el.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const targets = [this.world.burner, ...this.world.cushions.map((c) => c.mesh), ...this.world.floor];
    const hit = this.ray.intersectObjects(targets, true)[0];
    if (!hit) return;
    if (hit.object.userData.burner) return this.events.onBurner();
    const ci = hit.object.userData.cushion;
    if (ci !== undefined) return this.events.onCushion(this.world.cushions[ci]);
    this.walkTo(hit.point);
  }

  private blocked(x: number, z: number, boxes: Box2[]) {
    for (const b of boxes) {
      if (x > b.x0 - RADIUS && x < b.x1 + RADIUS && z > b.z0 - RADIUS && z < b.z1 + RADIUS) return true;
    }
    return false;
  }

  /** returns true while the avatar is walking */
  update(dt: number): boolean {
    const pos = this.position;
    const move = new THREE.Vector3();
    if (this.enabled) {
      const k = this.keys;
      const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
      const side = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
      if (fwd || side) {
        if (this.target) this.stop();
        // camera-relative: forward is away from the camera
        const f = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
        const r = new THREE.Vector3(-f.z, 0, f.x);
        move.addScaledVector(f, fwd).addScaledVector(r, side).normalize();
        if (this.avatar.currentPose !== 'walk') this.events.onMoveStart();
      }
    }
    if (!move.lengthSq() && this.target) {
      const to = this.target.clone().sub(pos).setY(0);
      if (to.length() < 0.08) {
        const done = this.arrive;
        this.stop();
        done?.();
      } else {
        move.copy(to.normalize());
      }
    }
    let walking = false;
    if (move.lengthSq()) {
      const step = SPEED * Math.min(dt, 0.05);
      const nx = pos.x + move.x * step, nz = pos.z + move.z * step;
      // axis-separated sliding against obstacles
      if (!this.blocked(nx, pos.z, this.world.colliders)) pos.x = nx;
      if (!this.blocked(pos.x, nz, this.world.colliders)) pos.z = nz;
      this.world.clampToBounds(pos);
      const want = Math.atan2(move.x, move.z);
      const diff = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
      this.yaw += diff * Math.min(1, dt * 12);
      walking = true;
      if (this.target && this.blocked(pos.x + move.x * 0.05, pos.z + move.z * 0.05, this.world.colliders) && this.stuck(pos)) this.stop();
    }
    pos.y += (this.world.groundHeight(pos.x, pos.z) - pos.y) * Math.min(1, dt * 14);
    this.avatar.root.rotation.y = this.yaw;
    this.avatar.speed = walking ? 1 : 0;
    this.updateCamera(dt);
    this.marker.material.opacity = 0.45 + Math.sin(performance.now() / 200) * 0.25;
    return walking;
  }

  private last = new THREE.Vector3();
  private stuckFor = 0;
  private stuck(pos: THREE.Vector3) {
    this.stuckFor = pos.distanceToSquared(this.last) < 1e-6 ? this.stuckFor + 1 : 0;
    this.last.copy(pos);
    return this.stuckFor > 20;
  }

  /** place the camera behind the avatar immediately, without easing in */
  snapCamera() {
    this.updateCamera(Infinity);
  }

  private updateCamera(dt: number) {
    const p = this.position;
    const look = new THREE.Vector3(p.x, p.y + 0.9, p.z);
    const off = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch),
      Math.sin(this.camPitch),
      Math.cos(this.camYaw) * Math.cos(this.camPitch),
    ).multiplyScalar(this.camDist);
    const want = look.clone().add(off);
    want.y = Math.max(want.y, 0.3);
    this.camera.position.lerp(want, 1 - Math.exp(-dt * 10));
    this.camera.lookAt(look);
  }
}
