import * as THREE from 'three';
import { box, cylinder, group, material } from './primitives';

/** Jeremy's pickup: a blue truck with a chrome grille and bumpers, round headlights and an open bed,
 * facing -z. The cab box (y .61) and windscreen (y .65) keep the positions the truck scenes
 * swap out for an open cab (see truck-attack.ts and truck-cab.ts). */
export const PICKUP_BLUE = '#2d5f9e';
const CHROME = '#c9cfc8', DARK = '#1f2a33', GLASS = '#9fbfca';
export function pickup(parent: THREE.Object3D) {
  const root = group(parent, 0, 0, 0, true);
  box(root, PICKUP_BLUE, 0, .33, 0, .9, .27, 1.6);
  box(root, PICKUP_BLUE, 0, .61, -.28, .81, .32, .64);
  box(root, GLASS, 0, .65, -.605, .7, .22, .02);
  box(root, '#344f52', 0, .64, .05, .67, .22, .025);
  box(root, PICKUP_BLUE, 0, .49, -.62, .86, .05, .4).rotation.x = -.06;
  // Open bed with rails and a tailgate.
  box(root, '#243847', 0, .47, .51, .78, .025, .6);
  for (const side of [-1, 1]) box(root, PICKUP_BLUE, side * .43, .54, .5, .04, .14, .62);
  box(root, PICKUP_BLUE, 0, .54, .8, .86, .14, .04);
  // Grille, bumpers, lights.
  box(root, DARK, 0, .37, -.805, .52, .15, .02);
  for (const y of [.33, .37, .41]) box(root, CHROME, 0, y, -.818, .5, .012, .01);
  box(root, CHROME, 0, .22, -.83, .96, .07, .06); box(root, CHROME, 0, .24, .83, .96, .06, .05);
  for (const side of [-1, 1]) {
    const lamp = cylinder(root, '#fff1c2', side * .33, .38, -.81, .06, .02); lamp.rotation.x = Math.PI / 2; lamp.material = material('#fff1c2', true);
    const tail = box(root, '#c43b33', side * .4, .5, .825, .06, .1, .02); tail.material = material('#c43b33', true);
    box(root, DARK, side * .425, .7, -.52, .03, .07, .1);
    box(root, '#e8e2cf', side * .452, .4, 0, .005, .03, 1.5);
  }
  for (const x of [-.46, .46]) for (const z of [-.5, .52]) {
    box(root, DARK, x * 1.02, .36, z, .08, .08, .5);
    const wheel = cylinder(root, '#262a27', x, .21, z, .21, .12); wheel.rotation.z = Math.PI / 2;
    const hub = cylinder(root, CHROME, x * 1.04, .21, z, .1, .125); hub.rotation.z = Math.PI / 2;
  }
  return root;
}
