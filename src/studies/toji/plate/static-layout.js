// Where the still picture of a plate lies on a canvas (see static-plate.js). Pure maths, kept apart so it can be tested without Vite.
import {viewBox} from '../view.js';

/** The camera-plane box every picture covers: centred on the origin, REF_W x REF_H units (the home view at zoom 1 on a 950:680 canvas). */
export const REF_W = 950, REF_H = 680;

/**
 * The CSS that lays a picture over an element showing the camera-plane box (zoom, cx, cy) at the given size, in px:
 * the size the picture is drawn at and the offset of its top-left corner from the element's.
 */
export function pictureLayout(width, height, zoom = 1, cx = 0, cy = 0) {
  const v = viewBox(width / height, zoom, cx, cy), w = v.halfW * 2, h = v.halfH * 2;
  return {width: width * REF_W / w, height: height * REF_H / h, left: width * (-REF_W / 2 - v.left) / w, top: height * (v.top - REF_H / 2) / h};
}
