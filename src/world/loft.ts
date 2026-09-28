import * as THREE from 'three';
import { beam, box, cylinder, group, material } from './primitives';

/** Clark's loft, as a lamp-lit interior set. It is only shown during the finale, so it is built far
 * above the barn, away from the planet: nothing in the world can intrude, and its hay-door window
 * looks out on open sky. Local frame: +x right, +y up, +z towards the stairs; the floor is at y 0
 * and the window is in the back wall at z = -BACK. */
export const LOFT_WIDTH = 2.7, BACK = 3.2, KNEE = 1, PEAK = 3.6;
const WOOD = '#6e4428', DARK = '#4b2d1a', BEAM = '#7d5230', FLOOR = '#80532f', RED = '#8e2b2b';

/** Everything in the loft glows faintly warm, as if lit by the string lights. */
function lit(mesh: THREE.Mesh, color: string) { mesh.material = material(color, true); return mesh; }
function warmBox(parent: THREE.Object3D, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) { return lit(box(parent, color, x, y, z, sx, sy, sz), color); }
function warmBeam(parent: THREE.Object3D, color: string, a: number[], b: number[], radius: number) { return lit(beam(parent, color, a, b, radius), color); }
/** Height of the roof above the floor at a given distance from the centre line. */
export function roofHeight(x: number) { return KNEE + (PEAK - KNEE) * Math.max(0, 1 - Math.abs(x) / LOFT_WIDTH); }

function gable(parent: THREE.Object3D, z: number, window: boolean) {
  const outline = new THREE.Shape();
  outline.moveTo(-LOFT_WIDTH, 0); outline.lineTo(LOFT_WIDTH, 0); outline.lineTo(LOFT_WIDTH, KNEE); outline.lineTo(0, PEAK); outline.lineTo(-LOFT_WIDTH, KNEE); outline.closePath();
  if (window) { const hole = new THREE.Path(); hole.moveTo(-.9, .7); hole.lineTo(.9, .7); hole.lineTo(.9, 2.2); hole.lineTo(-.9, 2.2); hole.closePath(); outline.holes.push(hole); }
  const mat = material(WOOD, true).clone(); mat.side = THREE.DoubleSide;
  const wall = new THREE.Mesh(new THREE.ShapeGeometry(outline), mat); wall.position.z = z; parent.add(wall);
  // Vertical boards.
  for (let x = -LOFT_WIDTH + .3; x < LOFT_WIDTH; x += .45) {
    const top = roofHeight(x);
    if (window && Math.abs(x) < .95) { warmBox(parent, DARK, x, .35, z + Math.sign(-z) * .02, .03, .7, .02); warmBox(parent, DARK, x, (2.2 + top) / 2, z + Math.sign(-z) * .02, .03, top - 2.2, .02); }
    else warmBox(parent, DARK, x, top / 2, z + Math.sign(-z) * .02, .03, top, .02);
  }
  if (window) {
    for (const x of [-.95, .95]) warmBox(parent, BEAM, x, 1.45, z + .04, .1, 1.6, .12);
    for (const y of [.65, 2.25]) warmBox(parent, BEAM, 0, y, z + .04, 2, .1, .12);
  }
}

export function loftSet(parent: THREE.Object3D) {
  const root = group(parent, 0, 0, 0, true);
  // Floor with a stairwell in the front-right corner, and the steps going down into the dark barn.
  warmBox(root, FLOOR, -.65, -.06, 0, LOFT_WIDTH * 2 - 1.3, .12, BACK * 2);
  warmBox(root, FLOOR, LOFT_WIDTH - .65, -.06, -.6, 1.3, .12, BACK * 2 - 1.2);
  for (let x = -LOFT_WIDTH + .15; x < LOFT_WIDTH; x += .3) warmBox(root, DARK, x, .002, x > 1.4 ? -.6 : 0, .012, .004, x > 1.4 ? BACK * 2 - 1.2 : BACK * 2);
  for (let i = 0; i < 5; i++) warmBox(root, BEAM, LOFT_WIDTH - .65, -.18 - i * .3, BACK - 1.1 + i * .22, 1.2, .07, .26);
  box(root, '#120b07', LOFT_WIDTH - .65, -1.7, BACK - .6, 1.3, .1, 1.2);
  for (const z of [BACK - 1.2, BACK]) warmBeam(root, BEAM, [1.4, 0, z], [1.4, .95, z], .035);
  warmBeam(root, BEAM, [1.4, .95, BACK - 1.2], [1.4, .95, BACK], .03);
  // Knee walls, the two roof slopes, rafters, collar ties and the ridge.
  for (const side of [-1, 1]) {
    warmBox(root, WOOD, side * LOFT_WIDTH, KNEE / 2, 0, .08, KNEE, BACK * 2);
    const slope = Math.hypot(LOFT_WIDTH, PEAK - KNEE), angle = Math.atan2(PEAK - KNEE, LOFT_WIDTH);
    const panel = warmBox(root, DARK, side * LOFT_WIDTH / 2, (KNEE + PEAK) / 2 + .05, 0, slope + .1, .06, BACK * 2 + .1); panel.rotation.z = -side * angle;
  }
  for (let z = -BACK + .2; z <= BACK - .1; z += .8) {
    for (const side of [-1, 1]) warmBeam(root, BEAM, [side * (LOFT_WIDTH - .05), KNEE, z], [0, PEAK - .06, z], .055);
    const tie = 2.55, reach = LOFT_WIDTH * (1 - (tie - KNEE) / (PEAK - KNEE));
    warmBeam(root, BEAM, [-reach, tie, z], [reach, tie, z], .045);
  }
  warmBeam(root, BEAM, [0, PEAK - .08, -BACK], [0, PEAK - .08, BACK], .07);
  for (const x of [-1.3, 1.3]) warmBeam(root, BEAM, [x, 0, -BACK + .25], [x, roofHeight(x), -BACK + .25], .07);
  gable(root, -BACK, true); gable(root, BACK, false);
  // String lights along both slopes and one bare bulb over the rug.
  const bulb = new THREE.SphereGeometry(.05, 8, 6), glow = new THREE.MeshBasicMaterial({ color: '#ffe2a0' });
  for (const side of [-1, 1]) {
    const x = side * 1.6, y = roofHeight(x) - .14;
    warmBeam(root, '#2b2118', [x, y + .04, -BACK], [x, y + .04, BACK], .008);
    for (let z = -BACK + .25; z < BACK; z += .45) { const light = new THREE.Mesh(bulb, glow); light.position.set(x, y - Math.abs(Math.sin(z * 3.1)) * .06, z); root.add(light); }
  }
  warmBeam(root, '#2b2118', [0, PEAK - .1, .4], [0, 2.95, .4], .006);
  const hanging = new THREE.Mesh(new THREE.SphereGeometry(.08, 10, 8), glow); hanging.position.set(0, 2.9, .4); root.add(hanging);
  // Rug, trunk, dartboard, bookshelf, couch, armchair, globe, hay and the telescope at the window.
  const rug = lit(cylinder(root, '#a86633', 0, .012, -.3, 1.25, .02), '#a86633'); rug.scale.z = .75;
  const inner = lit(cylinder(root, '#6e2f24', 0, .018, -.3, .9, .02), '#6e2f24'); inner.scale.z = .75;
  warmBox(root, '#3d2616', 0, .26, -2.25, .8, .5, .48); for (const x of [-.3, .3]) warmBox(root, '#8a7a55', x, .26, -2.25, .05, .52, .5);
  for (const [r, color] of [[.24, '#1b1712'], [.19, '#e3d3a8'], [.14, '#8e2b2b'], [.09, '#e3d3a8'], [.035, '#8e2b2b']] as const) { const ring = lit(cylinder(root, color, -1.7, 1.5, -BACK + .04 + (.24 - r) * .05, r, .02), color); ring.rotation.x = Math.PI / 2; }
  // An open bookshelf against the right wall: back, sides and four shelves of books.
  const shelf = group(root, 2.1, 0, -2.2);
  warmBox(shelf, '#4a2e1b', .15, .7, 0, .04, 1.4, 1.1);
  for (const z of [-.55, .55]) warmBox(shelf, '#4a2e1b', 0, .7, z, .34, 1.4, .04);
  for (let row = 0; row <= 4; row++) warmBox(shelf, '#5a3822', 0, .04 + row * .33, 0, .34, .03, 1.1);
  for (let row = 0; row < 4; row++) for (let i = 0; i < 7; i++) { const tall = .18 + ((i * 7 + row * 3) % 5) * .02; warmBox(shelf, ['#a33b2f', '#3e5e7a', '#c9a24b', '#4f6b3d', '#e2d6b4', '#6a3b5e'][(i + row) % 6], .02, .06 + row * .33 + tall / 2, -.45 + i * .14, .24, tall, .1); }
  const couch = group(root, 2.05, 0, .35); warmBox(couch, RED, 0, .24, 0, .75, .26, 1.9); warmBox(couch, RED, .3, .55, 0, .18, .45, 1.9);
  for (const z of [-.95, .95]) warmBox(couch, '#7a2424', 0, .42, z, .78, .3, .16);
  for (const z of [-.45, .45]) warmBox(couch, '#a33b36', -.05, .4, z, .6, .08, .85);
  const chair = group(root, -1.95, 0, .9); warmBox(chair, '#4d5a33', 0, .25, 0, .7, .3, .7); warmBox(chair, '#4d5a33', -.28, .55, 0, .15, .5, .7);
  const globe = group(root, -1.95, 0, -1.55); lit(cylinder(globe, '#5b3a22', 0, .35, 0, .03, .7), '#5b3a22'); lit(cylinder(globe, '#5b3a22', 0, .02, 0, .2, .04), '#5b3a22');
  const earth = new THREE.Mesh(new THREE.SphereGeometry(.24, 18, 12), material('#3f6a55', true)); earth.position.y = .95; globe.add(earth);
  for (let i = 0; i < 3; i++) lit(cylinder(root, '#c9a55b', -2.05 + (i % 2) * .55, .25, 2.5 - Math.floor(i / 2) * .6, .25, .52), '#c9a55b').rotation.z = Math.PI / 2;
  const telescope = group(root, .55, 0, -2.45);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; warmBeam(telescope, '#3a2a1c', [0, 1, 0], [Math.cos(a) * .32, 0, Math.sin(a) * .32], .02); }
  const tube = lit(cylinder(telescope, '#b08a4a', 0, 1.18, -.2, .075, 1.05), '#b08a4a'); tube.rotation.x = -1.05;
  // Beyond the hay door: a crescent moon and a scatter of stars over the dark fields.
  const sky = group(root, 0, 0, -BACK - 6);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(.42, 20, 14), new THREE.MeshBasicMaterial({ color: '#f4ecd0' })); moon.position.set(.9, 3.1, 0); sky.add(moon);
  const shadow = new THREE.Mesh(new THREE.SphereGeometry(.4, 20, 14), new THREE.MeshBasicMaterial({ color: '#0f2226' })); shadow.position.set(1.05, 3.2, .1); sky.add(shadow);
  const star = new THREE.SphereGeometry(.035, 6, 4), light = new THREE.MeshBasicMaterial({ color: '#fff6dc' });
  for (let i = 0; i < 26; i++) { const dot = new THREE.Mesh(star, light); dot.position.set(((i * 37) % 23) / 23 * 6 - 3, 1.4 + ((i * 53) % 19) / 19 * 3.2, -((i * 11) % 7) * .3); dot.scale.setScalar(.6 + ((i * 7) % 5) * .25); sky.add(dot); }
  const fields = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshBasicMaterial({ color: '#1d3526' })); fields.rotation.x = -Math.PI / 2; fields.position.set(0, -.3, 2); sky.add(fields);
  // A dome of stars over the loft for the last look upwards.
  const dome = group(root, 0, 0, -BACK - 3);
  let seed = 20011016; const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 220; i++) {
    const a = random() * Math.PI * 2, tilt = Math.acos(1 - random() * .95), r = 13 + random() * 7;
    const dot = new THREE.Mesh(star, light); dot.position.set(Math.sin(tilt) * Math.cos(a) * r, 3 + Math.cos(tilt) * r, Math.sin(tilt) * Math.sin(a) * r); dot.scale.setScalar(.8 + random() * random() * 3); dome.add(dot);
  }
  root.visible = false;
  return {
    root,
    /** Where Clark stands at the telescope, and where Lana appears at the top of the stairs. */
    telescope: new THREE.Vector3(.55, 0, -1.75), stairs: new THREE.Vector3(1.85, 0, 1.75),
    /** The middle of the rug, where they dance. */
    floor: new THREE.Vector3(0, 0, -.3),
  };
}
export type Loft = ReturnType<typeof loftSet>;
