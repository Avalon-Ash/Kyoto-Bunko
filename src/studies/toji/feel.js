// The feel of the bunko (study.js): timings (ms), distances (px) and coefficients in one table. Expressions read only this table; tune feel here.
// Values that depend on each other are written as one derived from the other (chain-2 F2); scripts/feel.test.mjs checks the rest.

/** Resting relief lift on the embedded home; the idle breathing swings from here up to full lift (1). */
const LIFT_EMBEDDED = .88;
/** How long the demonstration ages the lid (ms), and the short rest after it before the sweep ends (s). */
const DEMO_AGE_MS = 6500, DEMO_TAIL_SEC = .5;

export const FEEL = Object.freeze({
  // Cabinet track & switching
  trackSpacingRatio: .82, // Neighbour offset along the track as a fraction of canvas width
  neighbourOpacity: .9, // Peak opacity of neighbour cabinet previews during drag and slide
  neighbourFadePx: 60, // Drag distance (px) over which neighbour previews fade in to neighbourOpacity
  settleMs: 350, // Delay (ms) after settle before snapshotting neighbours; must stay below the longest slide (slideBaseMs + slideExtraMs): scripts/feel.test.mjs
  trackPullMax: 1.25, // Max normalised pull shown on the track light past switchDistance (interaction.js)
  armedVibrateMs: 10, // Haptic tick duration (ms) when a drag crosses the cabinet switch threshold
  armedScale: .985, // The box checks for an instant (CSS scale) when a drag crosses the cabinet switch threshold
  switchFadeMs: 180, // Fade-switch duration (ms) when neighbours are unavailable or on the standalone study page
  switchFadeMinPx: 100, // Minimum horizontal travel (px) for the embedded fallback fade-switch
  switchFadeWidthRatio: .35, // Horizontal travel for the embedded fallback fade-switch as a fraction of canvas width
  switchFadeStudyPx: 28, // Horizontal travel (px) for the standalone study page fade-switch
  slideBaseMs: 240, // Base duration (ms) of a track slide switch; total is up to slideBaseMs + slideExtraMs (~460 ms, near bunko.css .track>b .5s)
  slideExtraMs: 220, // Additional slide duration (ms) scaled by the remaining distance fraction
  returnMs: 180, // Spring-back duration (ms) when a cabinet drag is released below switchDistance

  // Lid & reading
  unrollMs: 420, // Pause (ms) in the unrolling state after lid opening completes (OPEN_DURATION in interaction.js) before entering reading

  // Frame loop, relief lift & easing
  idleFps: 30, // Frame rate cap (fps) while idle autoplay is running
  dtMaxMs: 50, // Upper clamp (ms) on per-frame elapsed time
  dtDefaultMs: 16, // Fallback per-frame delta (ms, ~60 fps) on the first tick
  liftFlat: .025, // Minimal relief lift in flat comparison mode
  liftStill: .82, // Fixed relief lift when reduced motion is active or when snapshotting neighbours
  liftEmbedded: LIFT_EMBEDDED, // Resting relief lift on the embedded home, and the midpoint of the idle breathing
  liftRest: .55, // Resting relief lift on the standalone study page
  lightEaseMs: 170, // Exponential smoothing time constant (ms) for relief lift and light position
  zoomEaseMs: 110, // Exponential smoothing time constant (ms) for zoom and pan
  easeSnapEpsilon: .0005, // Convergence snap threshold for normalised values (lift, light px/py, zoom)
  panSnapEpsilon: .05, // Convergence snap threshold (camera-plane units) for panX/panY

  // Idle sweep, demo & patina aging
  sweepFreqX: 1.25, // Horizontal angular frequency (rad/s) of the idle and demo light sweep
  sweepAmpX: .9, // Horizontal amplitude of the idle and demo light sweep in normalised light coordinates
  sweepFreqY: .9, // Vertical angular frequency (rad/s) of the idle and demo light sweep
  sweepAmpY: .7, // Vertical amplitude of the idle and demo light sweep in normalised light coordinates
  sweepTrailScaleX: .63, // Trail X scale applied to the swept light position
  sweepTrailScaleY: .45, // Trail Y scale applied to the swept light position
  demoDurationSec: DEMO_AGE_MS / 1000 + DEMO_TAIL_SEC, // Total length (s) of the demonstration sweep: the ageing, then a short rest
  demoAgeMs: DEMO_AGE_MS, // Duration (ms) for the demo patina age to progress from 0 to HATSUNE_YEARS
  idleAgeFreq: .16, // Angular frequency (rad/s) of the unattended patina breathing cycle
  idleLiftFreq: .7, // Angular frequency (rad/s) of the unattended relief lift breathing
  idleLiftAmp: 1 - LIFT_EMBEDDED, // Amplitude of the unattended relief lift breathing around liftEmbedded: its crest is exactly full lift (1)

  // Light trail on the lid
  trailInset: 6, // How far (world units) inside the lid's edge (LID_HALF_X, LID_HALF_Z in interaction.js) the light trail stops
  trailMinStep: 4, // Minimum distance (world units) between consecutive trail samples
  trailMaxPoints: 20, // Maximum number of active trail points kept

  // Pointer, zoom, pan & keyboard
  panRubberBandRatio: .5, // Rubber-band resistance dimension as a fraction of viewBox half-extents (view.js rubberBand)
  wheelPinchZoomRate: .01, // Exponential zoom sensitivity per wheel deltaY unit for trackpad pinch (ctrlKey)
  wheelZoomRate: .0015, // Exponential zoom sensitivity per wheel deltaY unit for regular wheel
  keyLightStep: .25, // Normalised light-position step per arrow key press on the standalone study page

  // Export
  exportRevokeMs: 10000, // Delay (ms) before revoking the object URL created for PNG download
});
