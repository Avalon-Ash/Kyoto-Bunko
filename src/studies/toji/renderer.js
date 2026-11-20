// The cabinet's picture: the three.js makie plate where the device can run it, a still picture of the plate where it cannot.
// It knows nothing of gestures or pages; study.js hands it a frame description and gets the camera matrix back for hit-testing.
//
// Which one draws:
//   three.js   the default. WebGL2 is taken from the canvas and plate/three-renderer.js is loaded on demand.
//   static     plate/static-plate.js: no WebGL2, the three.js module failed to load or start, or the context was lost.
//              ?plate=static forces it (for checking the fallback by hand); the canvas never asks for a GL context then.
// Either way the canvas reports it in data-renderer ('three' or 'static'; 'webgl' only while three.js is still loading).
// Until three.js can draw (its module is loading, or the first plate's shaders are compiling, which a cold cache makes
// 10-15 s) the canvas shows the still picture of the cabinet as a placeholder; data-renderer stays 'webgl' meanwhile.
import {multiply, lookAt, ortho} from './geometry.js';
import {viewBox, renderDpr} from './view.js';
import {createStaticPlate} from './plate/static-plate.js';
import {adjacentCabinet} from './collection';

// Fixed home camera; the backdrop's cabinet keepout shares it.
const EYE = [430, 720, 920], CAMERA_VIEW = lookAt(EYE, [0, 40, 0]);
/** zoom/cx/cy default to the full frame; view.js keeps zoom 1 identical to the original framing. */
export function cameraMatrix(width, height, zoom = 1, cx = 0, cy = 0) {
  const v = viewBox(width / height, zoom, cx, cy);
  return multiply(ortho(v.left, v.right, v.bottom, v.top, 1, 2200), CAMERA_VIEW);
}

/**
 * @typedef {{time:number, moving:boolean, still:boolean, flat:boolean, night:boolean, ground:number, lift:number, opening:number,
 * px:number, py:number, zoom:number, panX:number, panY:number, presence?:number, offset?:number, kick?:number, trails:{x:number, z:number, time:number}[]}} Frame
 * @param {HTMLCanvasElement} canvas
 * @param {string} wardId
 * @param {() => void} [onReady] called when something that was loading has loaded: the three.js module (or its failure, which
 * switches to the still picture) or, in static mode, the cabinet's picture
 * @param {{static?: boolean, night?: boolean}} [options] static: use the still picture without trying WebGL (also what ?plate=static does);
 * night: the light of the first frame, which the still picture uses to fetch the right file first
 */
export function createRenderer(canvas, wardId, onReady, options = {}) {
  const forced = options.static || (typeof location !== 'undefined' && new URLSearchParams(location.search).get('plate') === 'static');
  let gl2 = null;
  if (!forced) { try { gl2 = canvas.getContext('webgl2', {alpha: true, antialias: true, stencil: true, powerPreference: 'low-power'}); } catch { gl2 = null; } }
  let ward = wardId, draws = 0, loading = false, disposed = false, plate = null;
  const releases = [];
  const ready = () => { if (!disposed) onReady?.(); };
  /** The one place that says three.js cannot draw yet: its module is loading or its first plate is compiling. */
  const pending = () => loading || Boolean(plate?.loading?.());
  /** The still picture laid under the canvas while three.js cannot draw yet; gone at the first frame three.js draws. */
  let placeholder = null;
  const dropPlaceholder = () => { placeholder?.dispose(); placeholder = null; };
  releases.push(dropPlaceholder);
  /** The still picture: the canvas keeps its (empty) buffer and carries the picture as its CSS background. */
  const useStatic = () => {
    dropPlaceholder();
    plate = createStaticPlate(canvas, ready, Boolean(options.night)); releases.push(() => plate.dispose());
    canvas.dataset.renderer = 'static'; canvas.dataset.plate = 'true';
  };
  const setMesh = id => {
    ward = id;
    if (loading) { canvas.dataset.plate = 'false'; return; }
    const ok = Boolean(plate?.setWard(id));
    canvas.dataset.plate = String(ok);
    if (ok) plate.prefetch?.([adjacentCabinet(id, -1).id, adjacentCabinet(id, 1).id]);
  };
  if (!gl2) {
    useStatic(); setMesh(wardId);
  } else {
    loading = true;
    // Loaded on demand: three.js is large and the home page may never need it.
    import('./plate/three-renderer.js').then(({createThreeRenderer}) => {
      loading = false;
      if (disposed) return;
      try { plate = createThreeRenderer(gl2, canvas, ready); releases.push(() => plate.dispose()); }
      catch (error) { console.warn('three.js plate unavailable, showing the still picture:', error); plate = null; useStatic(); }
      setMesh(ward); ready();
    }).catch(error => {
      loading = false;
      if (disposed) return;
      console.warn('three.js plate unavailable, showing the still picture:', error);
      useStatic(); setMesh(ward); ready();
    });
  }
  /** The canvas's drawing size for frame f (resized if needed), its camera matrix and the plate units one pixel covers. */
  const size = f => {
    const dpr = renderDpr(devicePixelRatio, f.zoom, canvas.clientWidth, canvas.clientHeight), w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return {w, h, projection: cameraMatrix(w, h, f.zoom, f.panX, f.panY), unitsPerPx: viewBox(w / h, f.zoom).halfW * 2 / w};
  };
  const clear = (w, h) => { gl2.bindFramebuffer(gl2.FRAMEBUFFER, null); gl2.viewport(0, 0, w, h); gl2.clearColor(0, 0, 0, 0); gl2.clear(gl2.COLOR_BUFFER_BIT | gl2.DEPTH_BUFFER_BIT); };
  return {
    setMesh,
    /** True while three.js cannot draw yet (module loading, shaders compiling), or the still picture has not arrived. */
    loading: pending,
    /** 'webgl' (three.js cannot draw yet: loading or compiling), 'three' or 'static'. */
    mode: () => plate?.kind ?? (pending() ? 'webgl' : 'three'),
    /** A tap on a part of a plate in close-up; '' when there is no plate or nothing was met. */
    poke: (x, z, time) => plate?.poke(x, z, time) ?? '',
    /** The still picture of `id` on a neighbour's canvas. False when this renderer is not the still picture (the caller draws it itself). */
    paintNeighbour(target, id, night) { if (plate?.kind !== 'static') return false; plate.paint(target, id, night); return true; },
    /**
     * Draws the neighbouring cabinet `id` at rest into this canvas (the caller copies it out and draws its own cabinet again).
     * False when three.js cannot draw it yet: not drawing, or the neighbour not yet built and compiled by the prefetch.
     */
    drawNeighbour(id, f) {
      if (plate?.kind === 'static' || !plate?.drawNeighbour || pending()) return false;
      const {projection, unitsPerPx} = size(f);
      return plate.drawNeighbour(id, f, projection, unitsPerPx);
    },
    /** Draws one frame and returns the camera matrix it used. @param {Frame} f */
    draw(f) {
      canvas.dataset.renderedWard = ward; canvas.dataset.frames = String(++draws);
      if (plate?.kind === 'static') {
        const projection = cameraMatrix(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight), f.zoom, f.panX, f.panY);
        plate.draw(f);
        return projection;
      }
      const {w, h, projection, unitsPerPx} = size(f);
      if (pending()) {
        clear(w, h);
        placeholder ??= createStaticPlate(canvas, ready, f.night);
        placeholder.paint(canvas, ward, f.night, f.zoom, f.panX, f.panY);
        return projection;
      }
      dropPlaceholder();
      if (!plate) { clear(w, h); return projection; }
      plate.draw(f, projection, unitsPerPx);
      return projection;
    },
    dispose() { disposed = true; releases.splice(0).reverse().forEach(release => release()); },
  };
}
