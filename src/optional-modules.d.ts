// Modules two tools import that this repo does not install: scripts/shots.mjs loads playwright only when it is run
// (it prints how to install it otherwise), and tools/threert/plate-reference.js runs inside the ThreeRT checkout.
declare module 'playwright';
declare module '@threert/scene';
