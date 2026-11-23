# README images

The images in `docs/` are rendered from the HTML files here with a headless
Chromium (Chrome or Edge; set `BROWSER` if it is not found). Run everything from
the repo root.

| Output | Source | Command |
| --- | --- | --- |
| `docs/banner.webp` | `banner.html` | frames, then encode (below) |
| `docs/thumbnail.jpg` (steambrew header) | `thumbnail.html` | `node tools/render-docs.mjs still docs/src/thumbnail.html docs/thumbnail.jpg 1920 1080` |
| `docs/library.jpg`, `game.jpg`, `store.jpg`, `category.jpg`, `points.jpg`, `app.jpg`, `wishlist.jpg`, `market.jpg`, `graphite.jpg` | `frame.html#<shot>` | `node tools/render-docs.mjs still "docs/src/frame.html#library" docs/library.jpg 1800 1060` |
| `docs/features.jpg` | `features.html` | `node tools/render-docs.mjs still docs/src/features.html docs/features.jpg 1800 760` |
| `docs/accents.jpg` | `accents.html` | `node tools/render-docs.mjs still docs/src/accents.html docs/accents.jpg 1800 1150` |
| `docs/splash.jpg` (Millennium splash) | top of `shots/game.jpg` | crop to 3.56 : 1, 1811×509 |

`shots/` holds the raw client screenshots (Graphite 2.0, Steam window at
1813×1009 CSS px, default accent). Store and community pages are Steam's native
browser view, which a capture of the main window does not include: they are
captured on their own and placed into the main window capture at the view's
bounds. Friends' avatars are blurred. The accent rows are real captures of the
wishlist with the accent changed live.

## Banner

Every animation in `banner.html` runs on the same 9 s period, so 180 frames at
20 fps loop seamlessly:

```powershell
node tools/render-docs.mjs frames docs/src/banner.html banner-frames 1280 560 20 9
```

Encode them as an animated WebP (Python with Pillow):

```python
from PIL import Image
import glob
frames = [Image.open(f).convert('RGB') for f in sorted(glob.glob('banner-frames/*.png'))]
frames[0].save('docs/banner.webp', save_all=True, append_images=frames[1:],
               duration=50, loop=0, quality=80, method=4)
```
