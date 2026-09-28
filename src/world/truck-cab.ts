import * as THREE from 'three';
import { ball, box, cylinder, group } from './primitives';
import { PICKUP_BLUE } from './pickup';

const TRUCK = PICKUP_BLUE, GLASS = '#9fbfca';
/** Jeremy's palette (see content/appearance.ts). */
const SKIN = '#d2aa89', HAIR = '#745239', SHIRT = '#66715b';

/** The driver's door, built around its hinge at the front edge so the same pieces can hang on the
 * truck or lie torn off in the lane. */
export function truckDoor(parent: THREE.Object3D) {
  const panel = group(parent, 0, 0, 0, true);
  box(panel, TRUCK, 0, 0, .28, .03, .27, .56);
  box(panel, GLASS, -.004, .07, .28, .032, .1, .4);
  box(panel, '#5d6a5f', -.02, -.03, .45, .02, .025, .08);
  return panel;
}

/** Adds the "stuck" cab to Jeremy's pickup (see pickup.ts, facing -z): an open frame so
 * Jeremy can be seen at the wheel, the driver's door on the -x side, and Jeremy himself. The closed
 * cab parts are returned so the world can swap between the two. */
export function truckCab(model: THREE.Group) {
  const closed = model.children.filter(child => Math.abs(child.position.y - .61) < .001 || Math.abs(child.position.y - .65) < .001);
  const frame = group(model, 0, 0, 0, true);
  box(frame, TRUCK, 0, .8, -.28, .81, .045, .64);
  for (const x of [-.38, .38]) for (const z of [-.58, .02]) box(frame, TRUCK, x, .65, z, .025, .3, .025);
  box(frame, TRUCK, .4, .6, -.28, .025, .26, .56);
  box(frame, '#344f52', 0, .64, .04, .74, .24, .02);
  const door = group(frame, -.405, .6, -.56, true); truckDoor(door);
  const driver = group(model, -.17, 0, -.28, true);
  box(driver, SHIRT, 0, .56, .02, .17, .15, .1);
  for (const side of [-1, 1]) box(driver, SHIRT, side * .075, .55, -.1, .04, .04, .18).rotation.x = .3;
  cylinder(driver, SKIN, 0, .645, .01, .022, .03);
  ball(driver, SKIN, 0, .69, 0, .045, .052, .047);
  ball(driver, HAIR, 0, .725, .01, .046, .025, .048);
  const wheel = cylinder(model, '#2d302c', -.17, .6, -.47, .06, .012); wheel.rotation.x = 1.15;
  return { closed, frame, door, driver, wheel };
}
export type TruckCab = ReturnType<typeof truckCab>;
