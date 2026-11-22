// The cabinet's last resort: a still picture of the plate, for a device that cannot run three.js (no WebGL2, the module did
// not load, the renderer threw, the context was lost) and for ?plate=static. Same interface as the three.js renderer, so
// study.js treats it alike; the box simply does not move and the light cannot be moved over it.
//
// The pictures (./static/<ward>.<day|night>.webp, made by scripts/plate-fallback-shots.mjs) are the real plate at rest on a
// transparent ground, one per ward and light. Each covers the reference view box REF_W x REF_H camera-plane units. A canvas
// shows another box (view.js: its aspect, zoom and pan), so the picture is laid over the canvas as a CSS background sized and
// placed to the same camera-plane rectangle; the canvas itself stays empty and keeps every gesture, focus and transition.
// The files are bundled as ordinary assets (hashed, base-relative) and fetched only here, one ward and light at a time.
import {pictureLayout} from './static-layout.js';

export {pictureLayout};
// Lazy: each entry resolves to the asset's URL; nothing is requested until a picture is wanted.
const pictures = import.meta.glob('./static/*.webp', {query: '?url', import: 'default'});
const keyOf = (ward, night) => `./static/${ward}.${night ? 'night' : 'day'}.webp`;

const loaded = new Map(); // key → Promise of the picture's URL once it has decoded (null if it cannot load)
function load(key) {
  if (typeof Image === 'undefined') return Promise.resolve(null); // no DOM to show a picture in (not remembered)
  if (!loaded.has(key)) {
    loaded.set(key, (async () => {
      const entry = pictures[key];
      if (!entry) return null; // no such picture
      try {
        const url = /** @type {string} */ (await entry());
        // Decoded before it is laid down, so a change of cabinet never shows an empty box.
        await new Promise((resolve, reject) => { const img = new Image(); img.onload = resolve; img.onerror = reject; img.src = url; });
        return url;
      } catch (error) { console.warn('Static plate picture unavailable:', key, error); loaded.delete(key); return null; }
    })());
  }
  return loaded.get(key);
}

/**
 * @param {HTMLCanvasElement} canvas the cabinet's canvas; only its CSS background is touched
 * @param {() => void} [onReady] called when a picture that was not ready finishes loading
 * @param {boolean} [night] the light the first frame will have, so the right picture is fetched first
 */
export function createStaticPlate(canvas, onReady, night = false) {
  let ward = '', disposed = false;
  const asked = new Set();
  const urls = new Map(), settled = new Set(); // key → URL for the decoded pictures; keys that finished loading, found or not
  const want = (key, notify = true) => {
    if (urls.has(key)) return urls.get(key);
    if (!settled.has(key) && !asked.has(key)) {
      asked.add(key);
      void load(key).then(url => { if (disposed) return; settled.add(key); if (url) urls.set(key, url); if (notify) onReady?.(); });
    }
    return null;
  };
  /** Lays ward's picture over `target` (the canvas or a neighbour's). Returns false while the picture is still loading. */
  function paint(target, id, dark, zoom = 1, cx = 0, cy = 0) {
    const url = want(keyOf(id, dark)), width = target.clientWidth, height = target.clientHeight;
    if (!url || !width || !height) { target.style.backgroundImage = ''; return false; }
    const l = pictureLayout(width, height, zoom, cx, cy), s = target.style;
    s.backgroundImage = `url("${url}")`; s.backgroundRepeat = 'no-repeat';
    s.backgroundSize = `${l.width.toFixed(2)}px ${l.height.toFixed(2)}px`; s.backgroundPosition = `${l.left.toFixed(2)}px ${l.top.toFixed(2)}px`;
    return true;
  }
  return {
    kind: 'static',
    /** True until the current cabinet's picture has loaded (or failed to). */
    loading: () => !settled.has(keyOf(ward, night)),
    setWard(id) { ward = id; want(keyOf(id, night)); return true; },
    /** The pictures of the next cabinets, so a change finds them ready. */
    prefetch(ids) { for (const id of ids) want(keyOf(id, night), false); },
    paint,
    draw(f) {
      night = f.night; canvas.dataset.renderer = 'static';
      canvas.dataset.picture = paint(canvas, ward, night, f.zoom, f.panX, f.panY) ? ward : '';
    },
    poke: () => '',
    dispose() { disposed = true; canvas.style.backgroundImage = canvas.style.backgroundSize = canvas.style.backgroundPosition = canvas.style.backgroundRepeat = ''; delete canvas.dataset.picture; },
  };
}
