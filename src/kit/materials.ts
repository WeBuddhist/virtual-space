import * as THREE from 'three';

export function std(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts });
}

export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** cheap value noise for canvas textures */
export function noiseCanvas(size: number, base: string, speck: string[], density = 0.6) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * density * 0.02; i++) {
    g.fillStyle = speck[i % speck.length];
    g.globalAlpha = 0.08 + Math.random() * 0.12;
    const r = 1 + Math.random() * 6;
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function stoneTileTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6d6a63';
  g.fillRect(0, 0, 512, 512);
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -64 : 0;
    while (x < 512) {
      const w = 96 + Math.random() * 80;
      const shade = 90 + Math.floor(Math.random() * 30);
      g.fillStyle = `rgb(${shade},${shade - 3},${shade - 9})`;
      g.fillRect(x + 3, r * 128 + 3, w - 6, 122);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.035)`;
        g.fillRect(x + Math.random() * w, r * 128 + Math.random() * 128, 8 + Math.random() * 20, 4 + Math.random() * 10);
      }
      x += w;
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function signboardTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 220;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1d3b36';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#c9a24a';
  g.lineWidth = 14;
  g.strokeRect(10, 10, c.width - 20, c.height - 20);
  g.lineWidth = 3;
  g.strokeRect(30, 30, c.width - 60, c.height - 60);
  g.fillStyle = '#e8c766';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 96;
  do {
    g.font = `600 ${size}px "Noto Serif Tibetan", "Noto Sans Tibetan", serif`;
    size -= 4;
  } while (g.measureText(text).width > c.width - 120 && size > 30);
  g.fillText(text, c.width / 2, c.height / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
