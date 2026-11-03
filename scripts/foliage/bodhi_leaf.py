"""Trace the Bodhi (Ficus religiosa) leaf from a photograph for the 3D trees.

    python scripts/foliage/bodhi_leaf.py reference/bodhgaya/leaf/0.jpg

Input: "A leaf of pipal" by Hari gurung77, CC BY-SA 4.0,
https://commons.wikimedia.org/wiki/File:A_leaf_of_pipal.jpg (one leaf hanging
against a plain blue sky, its drip tip running off the bottom of the frame).

Writes src/kit/peepal-leaf.ts (the outline, stalk at the origin, drip tip up +y,
total length 0.42) and public/textures/bodhgaya/bodhi-leaf.jpg (the photo warped
into the outline's bounding box, so uv = (x - minX, y - minY) / size maps it on).
Needs numpy and opencv-python.
"""
import sys

import cv2
import numpy as np

LENGTH = 0.42      # stalk to tip, in the units leafGeometry scales
TIP_SHARE = 0.38   # the drip tip is about 38% as long as the blade above it
TEX = 512

im = cv2.imread(sys.argv[1])
h, w = im.shape[:2]
b, g, r = [im[:, :, i].astype(int) for i in range(3)]
raw = ((g > b + 8) & (g > r + 8)).astype(np.uint8) * 255

# fill the pale veins (holes), drop the twig and specks, keep the leaf. The flood fill
# starts in a 1 px frame round the image so every background region is reached, even
# where the leaf, stalk and twig split the sky in two
framed = cv2.copyMakeBorder(raw, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
ff = np.zeros((h + 4, w + 4), np.uint8)
cv2.floodFill(framed, ff, (0, 0), 255)
mask = raw | cv2.bitwise_not(framed[1:-1, 1:-1])
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((11, 11), np.uint8))
n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
mask = (lab == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])).astype(np.uint8) * 255

# the stalk is the thin strand above the blade: cut it where the blade begins
widths = (mask > 0).sum(1)
rows = np.where(widths > 0.15 * widths.max())[0]
top, tail_start = rows[0], rows[-1]
stalk_cols = np.where(raw[max(0, top - 25):top].any(0))[0]
stalk_x = float(np.median(stalk_cols)) if len(stalk_cols) else float(np.mean(np.where(mask[top] > 0)[0]))
mask[:top] = 0

cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c = max(cs, key=cv2.contourArea)[:, 0, :].astype(float)

# the tip runs off the bottom edge: drop the points on the edge and extend the tail
# along its own direction to a point, so the tip is TIP_SHARE of the blade
on_edge = c[:, 1] >= h - 3
if on_edge.any():
    k = int(np.argmax(on_edge))
    c = np.roll(c, -k, axis=0)           # edge points first...
    on_edge = c[:, 1] >= h - 3
    j = int(np.argmin(on_edge))          # ...then the rest, ending back at the edge
    rest = c[j:]
    cols = lambda y: np.where(mask[int(y)] > 0)[0]
    y1, y2 = h - 4, h - 120
    m1, m2 = cols(y1).mean(), cols(y2).mean()
    d = np.array([m1 - m2, y1 - y2]); d /= np.linalg.norm(d)
    blade = tail_start - top
    have = (h - 4) - tail_start
    extra = max(0.0, TIP_SHARE * blade - have)
    tip = np.array([m1, y1]) + d * extra
    c = np.vstack([rest, tip])

# origin at the stalk on the blade's top edge; tip straight up (+y); length LENGTH
origin = np.array([stalk_x, float(top)])
far = c[np.argmax(np.linalg.norm(c - origin, axis=1))]
v = far - origin
ang = np.arctan2(v[0], v[1])             # image y is down
rot = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]])
s = LENGTH / np.linalg.norm(v)
def to_leaf(p):
    return (np.asarray(p) - origin) @ rot.T * s
pts = to_leaf(c)
if pts[:, 1].mean() < 0:                 # make sure the tip is +y
    pts[:, 1] *= -1
    flip_y = True
else:
    flip_y = False
eps = 0.0015 * LENGTH / 0.42
poly = cv2.approxPolyDP(pts.astype(np.float32).reshape(-1, 1, 2), eps, True)[:, 0, :]
# where the stalk was cut the outline is ragged: replace it with the shallow notch of
# the leaf's cordate base, the lobes just below where the stalk joins
near = np.linalg.norm(poly, axis=1) < 0.02 * LENGTH / 0.42
if near.any():
    k = int(np.argmax(near))
    poly = np.roll(poly, -k, axis=0)
    near = np.linalg.norm(poly, axis=1) < 0.02 * LENGTH / 0.42
    poly = np.vstack([[[0.0, 0.006 * LENGTH / 0.42]], poly[~near]])
lo, hi = poly.min(0), poly.max(0)

# texture: the photo in the outline's bounding box (tail beyond the frame repeats the edge)
size = hi - lo
# leaf (x, y) -> photo pixel: the inverse of to_leaf
def leaf_to_photo(x, y):
    yy = -y if flip_y else y
    return origin + np.array([x, yy]) @ (np.linalg.inv(rot.T) / s)
src = np.float32([leaf_to_photo(lo[0], hi[1]), leaf_to_photo(hi[0], hi[1]), leaf_to_photo(lo[0], lo[1])])
dst = np.float32([[0, 0], [TEX, 0], [0, TEX]])
M = cv2.getAffineTransform(src, dst)
# paint the sky out with leaf colour first, so edges never show a blue fringe
sky = cv2.dilate(cv2.bitwise_not(mask), np.ones((9, 9), np.uint8))
small = cv2.resize(im, (w // 4, h // 4), interpolation=cv2.INTER_AREA)
fill = cv2.inpaint(small, cv2.resize(sky, (w // 4, h // 4), interpolation=cv2.INTER_NEAREST), 6, cv2.INPAINT_TELEA)
leafy = np.where(sky[..., None] > 0, cv2.resize(fill, (w, h)), im)
tex = cv2.warpAffine(leafy, M, (TEX, TEX), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)
cv2.imwrite('public/textures/bodhgaya/bodhi-leaf.jpg', tex, [cv2.IMWRITE_JPEG_QUALITY, 85])

flat = ', '.join(f'{x:.4f}, {y:.4f}' for x, y in poly)
open('src/kit/peepal-leaf.ts', 'w').write(f"""// The Bodhi leaf (Ficus religiosa), traced from a photograph by scripts/foliage/bodhi_leaf.py:
// "A leaf of pipal" by Hari gurung77, CC BY-SA 4.0. Stalk at the origin, drip tip up +y,
// {len(poly)} points, {LENGTH} long; the texture bodhi-leaf.jpg covers [MIN, MAX].

export const PEEPAL_OUTLINE = [{flat}];
export const PEEPAL_MIN = [{lo[0]:.4f}, {lo[1]:.4f}];
export const PEEPAL_MAX = [{hi[0]:.4f}, {hi[1]:.4f}];
""")
print(f'{len(poly)} points, width {size[0]:.3f} x length {size[1]:.3f}; blade rows {top}..{tail_start}, tip extended')
