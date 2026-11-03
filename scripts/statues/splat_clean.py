"""Clean an image-to-3D Gaussian splat and bake it into statue space.

    python scripts/statues/splat_clean.py in.ply out.ply --tilt 180 --yaw -90 --height 1.2

Drops near-transparent and isolated splats (floaters), turns the splat upright
(tilt about x, then yaw about y, in degrees) and scales it so it stands --height
metres tall, centred on x/z with its base at y = 0, facing +z. Needs numpy, scipy.
"""
import argparse

import numpy as np
from scipy.spatial import cKDTree

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('dst')
ap.add_argument('--tilt', type=float, default=0)
ap.add_argument('--yaw', type=float, default=0)
ap.add_argument('--height', type=float, default=1.2)
ap.add_argument('--min-opacity', type=float, default=0.06)
ap.add_argument('--outlier-sigma', type=float, default=3.0)
ap.add_argument('--deglare', action='store_true', help='drop cool near-white splats (glass reflections) in the front lower half')
a = ap.parse_args()

raw = open(a.src, 'rb').read()
end = raw.index(b'end_header\n') + len(b'end_header\n')
header = raw[:end].decode()
props = [l.split()[-1] for l in header.splitlines() if l.startswith('property')]
d = np.frombuffer(raw[end:], dtype='<f4').reshape(-1, len(props)).copy()
col = {p: i for i, p in enumerate(props)}
n0 = len(d)

# floaters: nearly transparent, or far from their neighbours
opacity = 1 / (1 + np.exp(-d[:, col['opacity']]))
d = d[opacity >= a.min_opacity]
xyz = d[:, [col['x'], col['y'], col['z']]]
dist, _ = cKDTree(xyz).query(xyz, k=9)
mean = dist[:, 1:].mean(1)
keep = mean < mean.mean() + a.outlier_sigma * mean.std()
d = d[keep]


def quat(axis, deg):
    h = np.radians(deg) / 2
    return np.array([np.cos(h), *(np.sin(h) * np.array(axis))])


def qmul(q, r):
    w1, x1, y1, z1 = q
    w2, x2, y2, z2 = r.T
    return np.stack([w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2, w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
                     w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2], 1)


def rotmat(q):
    w, x, y, z = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
                     [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
                     [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]])


# tilt about x first, then yaw about the world y axis
q = qmul(quat([0, 1, 0], a.yaw), quat([1, 0, 0], a.tilt)[None])[0]
xyz = d[:, [col['x'], col['y'], col['z']]] @ rotmat(q).T
lo, hi = np.percentile(xyz, 0.2, 0), np.percentile(xyz, 99.8, 0)
s = a.height / (hi[1] - lo[1])
xyz = (xyz - [(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2]) * s
d[:, [col['x'], col['y'], col['z']]] = xyz
if 'nx' in col:
    d[:, [col['nx'], col['ny'], col['nz']]] = d[:, [col['nx'], col['ny'], col['nz']]] @ rotmat(q).T
rot = [col[f'rot_{i}'] for i in range(4)]
r = d[:, rot]
d[:, rot] = qmul(q, r / np.linalg.norm(r, axis=1, keepdims=True))
for i in range(3):
    d[:, col[f'scale_{i}']] += np.log(s)

if a.deglare and 'f_dc_0' in col:
    # reflections in the shrine glass were baked in as cool white streaks over the
    # gold and saffron; the real surfaces there are warm, the halo sits behind the head
    rgb = np.clip(0.5 + 0.28209479 * d[:, [col['f_dc_0'], col['f_dc_1'], col['f_dc_2']]], 0, 1)
    mx, mn = rgb.max(1), rgb.min(1)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    cool = rgb[:, 2] >= rgb[:, 0] - 0.02
    region = (xyz[:, 1] < 0.6 * a.height) & (xyz[:, 2] > np.percentile(xyz[:, 2], 35))
    glare = region & cool & (sat < 0.35) & (mx > 0.55)
    d, xyz = d[~glare], xyz[~glare]
    print(f'deglare: dropped {glare.sum()} splats')

header = header.replace(f'element vertex {n0}', f'element vertex {len(d)}')
open(a.dst, 'wb').write(header.encode() + d.astype('<f4').tobytes())
print(f'{n0} -> {len(d)} splats; {a.height} m tall, {np.ptp(xyz[:, 0]):.2f} m wide, {np.ptp(xyz[:, 2]):.2f} m deep')
