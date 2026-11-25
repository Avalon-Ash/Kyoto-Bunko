// The cabinet's picture: the three.js makie plate where the device can run it, a still picture of the plate where it cannot.
// It knows nothing of gestures or pages; study.js hands it a frame description and gets the camera matrix back for hit-testing.
//
// Which one draws:
//   three.js   the default. WebGL2 is taken from the canvas and plate/three-renderer.js is loaded on demand.
//   static     plate/static-plate.js: no WebGL2, three.js failed to load or start, a shader failed, or the context was lost.
//              ?plate=static forces it (for checking the fallback by hand); the canvas never asks for a GL context then.
// Until three.js can draw (module loading, first plate building, or shaders compiling) the canvas shows the still
// picture as a placeholder. data-renderer stays 'webgl' until the first live frame, or becomes 'static' on fallback.
import {multiply, lookAt, ortho} from './geometry.js';
import {viewBox, renderDpr} from './view.js';
import {createStaticPlate} from './plate/static-plate.js';
import {adjacentCabinet} from './collection';
import {EYE, TARGET, NEAR, FAR} from './plate/camera.js';

// Fixed home camera; the backdrop's cabinet keepout shares it.
const CAMERA_VIEW = lookAt(EYE, TARGET);
/** zoom/cx/cy default to the full frame; view.js keeps zoom 1 identical to the original framing. */
export function cameraMatrix(width, height, zoom = 1, cx = 0, cy = 0) {
  const v = viewBox(width / height, zoom, cx, cy);
  return multiply(ortho(v.left, v.right, v.bottom, v.top, NEAR, FAR), CAMERA_VIEW);
}

/**
 * @typedef {{time:number, moving:boolean, still:boolean, flat:boolean, night:boolean, ground:number, lift:number, opening:number,
 * px:number, py:number, zoom:number, panX:number, panY:number, presence?:number, offset?:number, kick?:number, years?:number|null, trails:{x:number, z:number, time:number}[]}} Frame
 * @param {HTMLCanvasElement} canvas
 * @param {string} wardId
 * @param {() => void} [onReady] called when the renderer's loading state changes or a cabinet picture is ready
 * @param {{static?: boolean, night?: boolean}} [options] static: use the still picture without trying WebGL (also what ?plate=static does);
 * night: the light of the first frame, which the still picture uses to fetch the right file first
 */
export function createRenderer(canvas, wardId, onReady, options = {}) {
  const forced = options.static || (typeof location !== 'undefined' && new URLSearchParams(location.search).get('plate') === 'static');
  let gl2 = null;
  if (!forced) { try { gl2 = canvas.getContext('webgl2', {alpha: true, antialias: true, stencil: true, powerPreference: 'low-power'}); } catch { gl2 = null; } }
  let ward = wardId, night = Boolean(options.night), draws = 0, loading = false, disposed = false, plate = null;
  const ready = () => { if (!disposed) onReady?.(); };
  /** The one place that says the renderer is still getting its first picture ready. */
  const pending = () => loading || Boolean(plate?.loading?.());
  /** The still picture laid under the canvas while three.js cannot draw yet; gone at the first frame three.js draws. */
  let placeholder = null;
  const dropPlaceholder = () => { placeholder?.dispose(); placeholder = null; };
  const clear = (w, h) => { gl2.bindFramebuffer(gl2.FRAMEBUFFER, null); gl2.viewport(0, 0, w, h); gl2.clearColor(0, 0, 0, 0); gl2.clear(gl2.COLOR_BUFFER_BIT | gl2.DEPTH_BUFFER_BIT); };
  /** The still picture: the canvas keeps its (empty) buffer and carries the picture as its CSS background. */
  const useStatic = () => {
    loading = false;
    dropPlaceholder();
    plate?.dispose();
    // A failed frame may have left pixels over the CSS background or left GL state from a render pass. This is the path taken when
    // three.js could not start, so the context may be unusable: the picture is shown whether or not the canvas could be cleared.
    try {
      if (gl2 && !gl2.isContextLost()) {
        gl2.disable(gl2.SCISSOR_TEST); gl2.colorMask(true, true, true, true); gl2.depthMask(true);
        clear(canvas.width, canvas.height);
      }
    } catch { /* nothing to clear */ }
    plate = createStaticPlate(canvas, ready, night);
    canvas.dataset.renderer = 'static';
    setMesh(ward);
  };
  const setMesh = id => {
    ward = id;
    if (loading) { canvas.dataset.plate = 'false'; return; }
    const source = plate;
    const isCurrent = () => !disposed && plate === source && ward === id;
    const apply = ok => {
      canvas.dataset.plate = String(ok);
      if (ok) source.prefetch?.([adjacentCabinet(id, -1).id, adjacentCabinet(id, 1).id]);
    };
    const wasPending = pending();
    const result = source?.setWard(id) ?? false;
    if (typeof result === 'boolean') {
      apply(result);
      if (wasPending && !pending()) ready();
      return;
    }
    canvas.dataset.plate = 'false';
    void result.then(ok => {
      if (ok !== undefined && isCurrent()) apply(ok);
    }).catch(error => {
      if (isCurrent()) fallback(error, 'build ward');
    });
  };
  /**
   * Every failure shows the still picture; the log says at which step it came (load, start, first ward, or later: a shader that failed to compile or link, a frame that threw).
   * @param {unknown} error
   * @param {string} step
   */
  const fallback = (error, step) => {
    if (disposed || plate?.kind === 'static') return;
    console.warn(`three.js plate unavailable (${step}), showing the still picture:`, error);
    useStatic(); ready();
  };
  if (!gl2) {
    useStatic();
  } else {
    loading = true;
    let step = 'load';
    // Loaded on demand: three.js is large and the home page may never need it.
    import('./plate/three-renderer.js').then(({createThreeRenderer}) => {
      if (disposed) return;
      loading = false;
      step = 'start';
      plate = createThreeRenderer(gl2, canvas, ready, error => fallback(error, step));
      step = 'first ward';
      setMesh(ward); ready();
      step = 'compile or draw';
    }).catch(error => fallback(error, step));
  }
  /** The canvas's drawing size for frame f (resized if needed), its camera matrix and the plate units one pixel covers. */
  const size = f => {
    const dpr = renderDpr(devicePixelRatio, f.zoom, canvas.clientWidth, canvas.clientHeight), w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return {w, h, projection: cameraMatrix(w, h, f.zoom, f.panX, f.panY), unitsPerPx: viewBox(w / h, f.zoom).halfW * 2 / w};
  };
  return {
    setMesh,
    /** True while the first live frame is in preparation, or the still picture has not arrived. */
    loading: pending,
    /** 'webgl' (preparing the first live frame), 'three' or 'static'. */
    mode: () => plate?.kind ?? (pending() ? 'webgl' : 'three'),
    /** A tap on a part of a plate in close-up; '' when there is no plate or nothing was met. */
    poke: (x, z, time) => plate?.poke(x, z, time) ?? '',
    /** The still picture of `id` on a neighbour's canvas. False when this renderer is not the still picture (the caller draws it itself). */
    paintNeighbour(target, id, night) {
      if (plate?.kind !== 'static') return false;
      // Clear any three.js snapshot above the CSS background.
      target.getContext('2d')?.clearRect(0, 0, target.width, target.height);
      plate.paint(target, id, night);
      return true;
    },
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
      night = f.night;
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
    dispose() {
      if (disposed) return;
      disposed = true;
      plate?.dispose();
      dropPlaceholder();
    },
  };
}
