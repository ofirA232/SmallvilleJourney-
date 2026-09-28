import * as THREE from 'three';
import { ball, beam, box, cylinder, group, material } from './primitives';

/** Lex's light-blue Porsche: a low fastback with round headlights on the front wings.
 * The model faces -z. The roof is its own group, hinged at the base of the rear window,
 * so it can be peeled back and torn away; Lex sits in the driver's seat until he is pulled out. */
export const PORSCHE_BLUE = '#86c7e1';
export const PORSCHE_SCALE = 1.3;
const TRIM = '#263034', INTERIOR = '#2b2a2c', SEAT = '#6b4b37';
// Where the roof group is hinged, in model coordinates.
const ROOF_HINGE = new THREE.Vector3(0, .42, .72);
let glassMaterial: THREE.MeshStandardMaterial | null = null;
function glass() {
  glassMaterial ??= new THREE.MeshStandardMaterial({ color: '#cdeef6', transparent: true, opacity: .3, roughness: .05, metalness: .2, depthWrite: false });
  return glassMaterial;
}
function pane(parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glass());
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
}

/** The roof, windscreen, rear window and pillars, built around the hinge so the same
 * pieces can sit on the car or lie torn off on the riverbank. */
export function porscheRoof(parent: THREE.Object3D, color = PORSCHE_BLUE) {
  const inner = group(parent, -ROOF_HINGE.x, -ROOF_HINGE.y, -ROOF_HINGE.z);
  pane(inner, 0, .52, -.085, .66, .35, .018).rotation.x = .95;
  for (const side of [-1, 1]) {
    beam(inner, color, [side * .34, .42, -.2], [side * .31, .625, .085], .02);
    beam(inner, color, [side * .31, .625, .43], [side * .36, .42, .74], .032);
    box(inner, color, side * .318, .612, .26, .03, .03, .36);
    pane(inner, side * .33, .52, .19, .014, .16, .44);
  }
  box(inner, color, 0, .63, .26, .64, .03, .36);
  pane(inner, 0, .522, .575, .6, .355, .018).rotation.x = -.956;
  return inner;
}

export function porsche(parent: THREE.Object3D, color = PORSCHE_BLUE) {
  const root = group(parent, 0, 0, 0, true);
  root.scale.setScalar(PORSCHE_SCALE);
  // Body: floor pan, doors, bonnet between the wings, sloping engine deck and a ducktail.
  box(root, color, 0, .27, 0, .86, .2, 1.74);
  box(root, INTERIOR, 0, .372, .22, .66, .01, .86);
  for (const side of [-1, 1]) {
    box(root, color, side * .4, .4, .2, .06, .07, .86);
    box(root, color, side * .31, .405, -.6, .24, .09, .5);
    box(root, color, side * .35, .4, .5, .18, .1, .5);
    const lamp = cylinder(root, '#fff3c4', side * .31, .425, -.855, .065, .03); lamp.rotation.x = Math.PI / 2; lamp.material = material('#fff3c4', true);
    box(root, '#e39a45', side * .3, .315, -.872, .09, .035, .015);
  }
  box(root, color, 0, .385, -.55, .4, .05, .66).rotation.x = -.1;
  box(root, INTERIOR, 0, .44, -.2, .7, .06, .1);
  box(root, color, 0, .41, .63, .7, .05, .38).rotation.x = .2;
  box(root, color, 0, .445, .84, .7, .025, .12).rotation.x = -.35;
  box(root, TRIM, 0, .24, -.875, .8, .05, .03);
  box(root, '#b8373a', 0, .335, .875, .78, .045, .02);
  box(root, TRIM, 0, .23, .875, .8, .05, .03);
  for (const x of [-.18, .18]) {
    box(root, SEAT, x, .4, .22, .22, .05, .22);
    box(root, SEAT, x, .465, .34, .22, .13, .05).rotation.x = -.2;
  }
  const steering = cylinder(root, INTERIOR, -.18, .49, -.08, .065, .015); steering.rotation.x = 1.1;
  for (const x of [-.43, .43]) for (const [z, r] of [[-.52, .155], [.54, .17]] as const) {
    const wheel = cylinder(root, '#2f3633', x, r, z, r, .11); wheel.rotation.z = Math.PI / 2;
    const hub = cylinder(root, '#c9cfc8', x * 1.03, r, z, r * .55, .115); hub.rotation.z = Math.PI / 2;
  }
  // Lex, seated at the wheel: bald, dark jacket over a purple shirt.
  const driver = group(root, -.18, 0, .2);
  box(driver, '#2d303e', 0, .47, .03, .19, .15, .11);
  box(driver, '#6a4f7c', 0, .5, -.028, .07, .09, .01);
  for (const side of [-1, 1]) box(driver, '#2d303e', side * .085, .47, -.12, .045, .045, .2).rotation.x = .35;
  cylinder(driver, '#dfb296', 0, .53, .02, .026, .04);
  ball(driver, '#dfb296', 0, .57, .015, .045, .047, .048);
  for (const side of [-1, 1]) ball(driver, '#d5a88b', side * .045, .57, .02, .012, .018, .01);
  const roof = group(root, ROOF_HINGE.x, ROOF_HINGE.y, ROOF_HINGE.z, true);
  porscheRoof(roof, color);
  return { root, roof, driver };
}
