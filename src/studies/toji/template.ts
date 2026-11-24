// The cabinet stage: everything mountBunko() needs, and nothing else.
// Static, trusted markup; all ward text is written later with textContent.
export const BUNKO_STAGE = `<div class="stage" id="stage">
    <canvas id="scene" tabindex="0" role="button"></canvas>
    <div class="track" id="track" aria-hidden="true"></div>
    <div class="loading" id="loading" role="status"></div>
    <div class="seal" aria-hidden="true">京<br>洛</div>
    <p id="cabinet-verse" class="cabinet-verse" aria-hidden="true"></p>
    <div class="stage-caption"><small id="cabinet-context" aria-live="polite" aria-atomic="true"></small><span id="cabinet-place"></span><small id="cabinet-landmark"></small></div>
    <div class="era-panel" id="era-panel" data-mode="auto">
      <small id="era-kicker" aria-hidden="true"></small><span id="era" class="era" aria-hidden="true"></span>
      <div class="era-scale"><span id="era-new" aria-hidden="true"></span><input id="era-range" class="era-range" type="range" min="0" step="1"><span id="era-old" aria-hidden="true"></span></div>
      <div class="era-mode" id="era-mode" role="group"><button id="era-auto" type="button" aria-pressed="true"></button><button id="era-custom" type="button" aria-pressed="false"></button></div>
    </div>
    <button id="zoom-reset" class="zoom-reset" type="button" hidden><span aria-hidden="true">⤡</span></button>
  </div>`;
