import * as THREE from 'three';
import { ball, box, cylinder, group, material } from './primitives';

/** Lana's front porch at night, for the one shot of her hearing Clark's goodnight from across town.
 * Like the loft it is a set built far above the planet and shown only for that shot. Local frame:
 * +x right, +y up, +z out from the house towards the street; the porch floor is at y 0 and the
 * front wall at z 0. */
const SIDING = '#7d909b', SHADOW = '#56666f', TRIM = '#ebe5d8', DOOR = '#e2dccf', BOARDS = '#6b665d', BRASS = '#c8a04e';

/** Porch-light materials: everything glows a little, as if lit by the lamp and the hall behind the door. */
function part(parent: THREE.Object3D, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const mesh = box(parent, color, x, y, z, sx, sy, sz); mesh.material = material(color, true); return mesh;
}
/** Lamplight itself: the curtained door glass, the side window and the sconce. */
function glow(parent: THREE.Object3D, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const mesh: THREE.Mesh = box(parent, color, x, y, z, sx, sy, sz); mesh.material = new THREE.MeshBasicMaterial({ color }); return mesh;
}
/** A lit, curtained pane with a painted frame, facing the street. */
function pane(parent: THREE.Object3D, x: number, y: number, z: number, width: number, height: number) {
  glow(parent, '#f5d9a4', x, y, z, width, height, .01);
  for (let i = 0; i < 6; i++) glow(parent, '#e3bd83', x - width / 2 + width * (i + .5) / 6, y, z + .006, .02, height, .004);
  for (const side of [-1, 1]) { part(parent, TRIM, x + side * (width / 2 + .02), y, z + .01, .04, height + .08, .03); part(parent, TRIM, x, y + side * (height / 2 + .02), z + .01, width + .08, .04, .03); }
}

export function porchSet(parent: THREE.Object3D) {
  const root = group(parent, 0, 0, 0, true);
  // Night all round, so nothing of the far-off world shows past the house.
  root.add(new THREE.Mesh(new THREE.SphereGeometry(9, 20, 12), new THREE.MeshBasicMaterial({ color: '#0b1519', side: THREE.BackSide })));
  // Clapboard siding: overlapping boards, each tipped out at the bottom so it throws a line of shadow.
  part(root, SHADOW, 0, 1.5, -.09, 7, 3.2, .1);
  for (let y = 0; y < 2.9; y += .15) { part(root, SIDING, 0, y + .075, -.025, 7, .14, .03).rotation.x = -.16; part(root, SHADOW, 0, y + .004, -.004, 7, .012, .012); }
  // The front door: white panels below, a curtained pane lit from the hall above, and a brass knob.
  const door = group(root, -.72, 0, 0);
  part(door, DOOR, 0, .95, .02, .82, 1.9, .05);
  for (const x of [-.18, .18]) { part(door, '#d6cfc0', x, .5, .05, .27, .72, .02); part(door, DOOR, x, .5, .06, .2, .62, .02); }
  part(door, '#d6cfc0', 0, 1.02, .05, .7, .05, .02);
  pane(door, 0, 1.45, .05, .56, .62);
  ball(door, BRASS, .31, .96, .08, .035).material = material(BRASS, true);
  part(door, BRASS, .31, .96, .055, .04, .1, .02);
  for (const side of [-1, 1]) part(door, TRIM, side * .47, 1.02, .04, .12, 2.04, .06);
  part(door, TRIM, 0, 2.06, .04, 1.08, .14, .07); part(door, TRIM, 0, 2.15, .06, 1.16, .04, .1);
  part(door, '#4f4a44', 0, .015, .14, .9, .02, .3);
  // A curtained window further along the wall, lit from inside.
  pane(root, 1.62, 1.35, .01, .7, .95);
  part(root, TRIM, 1.62, .82, .04, .9, .05, .1);
  // The porch lamp beside the door.
  part(root, '#3a3128', .02, 1.62, .03, .1, .2, .04);
  const lamp = group(root, .02, 1.66, .1);
  glow(lamp, '#ffe6ad', 0, 0, 0, .1, .15, .1);
  for (const x of [-.055, .055]) part(lamp, '#3a3128', x, 0, 0, .012, .17, .11);
  part(lamp, '#3a3128', 0, .09, 0, .14, .03, .13);
  // Porch boards, the ceiling, two columns and a rail.
  part(root, BOARDS, 0, -.05, 1.4, 7, .1, 2.8);
  for (let x = -3.4; x < 3.5; x += .14) part(root, '#57534b', x, .002, 1.4, .01, .004, 2.8);
  part(root, '#d8d2c5', 0, 2.8, 1.4, 7, .08, 2.8);
  for (const x of [-2.3, 2.3]) {
    const column = cylinder(root, TRIM, x, 1.4, 2.55, .07, 2.8); column.material = material(TRIM, true);
    part(root, TRIM, x, .06, 2.55, .2, .12, .2); part(root, TRIM, x, 2.72, 2.55, .2, .1, .2);
  }
  for (const side of [-1, 1]) {
    part(root, TRIM, side * 2.85, .82, 2.55, 1.1, .05, .07);
    for (let x = 2.35; x < 3.4; x += .12) part(root, TRIM, side * x, .42, 2.55, .025, .8, .025);
  }
  // A floral armchair at one end, and a potted fern at the other.
  const chair = group(root, -1.75, 0, .55); chair.rotation.y = .35;
  part(chair, '#a98a5c', 0, .22, 0, .66, .08, .6);
  for (const x of [-.3, .3]) for (const z of [-.26, .26]) part(chair, '#8f7248', x, .1, z, .05, .2, .05);
  for (const x of [-.34, .34]) part(chair, '#a98a5c', x, .42, .02, .08, .34, .58);
  part(chair, '#a98a5c', 0, .62, -.28, .68, .72, .07);
  part(chair, '#d7b39c', 0, .31, .03, .58, .1, .52); part(chair, '#d7b39c', 0, .64, -.22, .56, .56, .08);
  for (let i = 0; i < 9; i++) part(chair, i % 3 === 0 ? '#6f8a58' : '#b3615b', -.2 + (i % 3) * .2 + ((i * 7) % 3) * .02, .44 + Math.floor(i / 3) * .16, -.175, .06, .06, .01);
  const pot = cylinder(root, '#6e4f3c', 2.45, .2, .45, .2, .4); pot.material = material('#6e4f3c', true);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, leaf = ball(root, i % 2 ? '#2e5a31' : '#3b6c39', 2.45 + Math.cos(a) * .2, .55 + (i % 3) * .14, .45 + Math.sin(a) * .2, .2, .12, .2);
    leaf.material = material(i % 2 ? '#2e5a31' : '#3b6c39', true); leaf.rotation.z = Math.cos(a) * .6;
  }
  root.visible = false;
  return {
    root,
    /** Where Lana stands, just in front of the door, and where the camera films her from. */
    lana: new THREE.Vector3(-.12, 0, .5), camera: new THREE.Vector3(.62, 1.2, 2.25),
  };
}
export type Porch = ReturnType<typeof porchSet>;
