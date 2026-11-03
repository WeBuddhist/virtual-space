"""Turn a statue turnaround into textured meshes with hosted image-to-3D models.

    python scripts/statues/image_to_3d.py bodhgaya trellis2|hunyuan21 [--seed N]

Reads reference/<temple>/statue-views/{front,back,left,right}.png (front is
required, the rest optional) and writes reference/<temple>/statue-3d/<model>.glb.
Runs on the Hugging Face Spaces of each model with the token in
~/.cache/huggingface/token (or HF_TOKEN). Needs: pip install gradio_client
"""
import os
import shutil
import sys
from pathlib import Path

from gradio_client import Client, handle_file

temple, model = sys.argv[1], sys.argv[2]
seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 1234
views = Path('reference') / temple / 'statue-views'
out = Path('reference') / temple / 'statue-3d'
out.mkdir(parents=True, exist_ok=True)
token = os.environ.get('HF_TOKEN') or (Path.home() / '.cache/huggingface/token').read_text().strip()


def view(name):
    p = views / f'{name}.png'
    return handle_file(str(p)) if p.exists() else None


def first_file(result):
    """gradio returns a path, a dict with 'value'/'path', or a tuple of those"""
    for r in result if isinstance(result, (list, tuple)) else [result]:
        if isinstance(r, dict):
            r = r.get('value') or r.get('path')
            if isinstance(r, dict):
                r = r.get('path')
        if isinstance(r, str) and r.endswith(('.glb', '.gltf')):
            return r
    raise RuntimeError(f'no mesh in result: {str(result)[:400]}')


if model == 'trellis2':
    c = Client('microsoft/TRELLIS.2', token=token, verbose=False)
    c.predict(api_name='/start_session')
    img = c.predict(view('front'), api_name='/preprocess_image')
    c.predict(handle_file(img) if isinstance(img, str) else img, seed, '1536', api_name='/image_to_3d')
    glb = first_file(c.predict(1_000_000, 4096, api_name='/extract_glb'))
elif model == 'hunyuan21':
    c = Client('tencent/Hunyuan3D-2.1', token=token, verbose=False)
    glb = first_file(c.predict(
        image=None, mv_image_front=view('front'), mv_image_back=view('back'),
        mv_image_left=view('left'), mv_image_right=view('right'),
        steps=50, guidance_scale=5.0, seed=seed, octree_resolution=384,
        check_box_rembg=True, num_chunks=8000, randomize_seed=False,
        api_name='/generation_all'))
else:
    raise SystemExit(f'unknown model {model}')

dest = out / f'{model}.glb'
shutil.copy(glb, dest)
print(f'{model}: {dest} ({dest.stat().st_size / 1e6:.1f} MB)')
