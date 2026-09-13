import * as THREE from 'three';
import { beam, box, cylinder, group, material, plaque, roof } from './primitives';

// Architecture is compressed to the existing collision footprints. All detail is
// immutable and is merged by World.batchScenery; no new runtime textures needed.
const red = '#9b3e36', trim = '#d8c6a4', slate = '#454b50';

function sash(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, rows = 4) {
  box(parent, '#574f49', x, y, z, w + .07, h + .07, .05);
  box(parent, '#547575', x, y, z + .03, w, h, .035);
  for (const dx of [-w / 2, 0, w / 2]) box(parent, trim, x + dx, y, z + .057, .025, h, .025);
  for (let i = 0; i <= rows; i++) box(parent, trim, x, y - h / 2 + h * i / rows, z + .06, w, .025, .025);
  box(parent, trim, x, y - h / 2 - .035, z + .06, w + .12, .055, .12);
}

export function kentBarn(parent: THREE.Group) {
  parent.name = 'Kent barn — board-and-batten, hayloft and cupolas';
  box(parent, '#847767', 0, .06, 0, 2.74, .18, 3.23);
  box(parent, red, 0, 1.06, 0, 2.7, 2.04, 3.2);
  // The series barn has steep, gently flared eaves, rather than a generic
  // shallow gambrel. Build its silhouette and leave a real hole in the gable.
  const profile = [[-1.51, 2.02], [-1.23, 2.29], [-.64, 3.11], [0, 3.68], [.64, 3.11], [1.23, 2.29], [1.51, 2.02]];
  const outline = new THREE.Shape(); outline.moveTo(-1.35, 2.02);
  for (const [x, y] of profile) outline.lineTo(x, y);
  outline.lineTo(1.35, 2.02); outline.closePath();
  const hole = new THREE.Path(); hole.moveTo(-.38, 2.42); hole.lineTo(.38, 2.42); hole.lineTo(.38, 2.99); hole.lineTo(-.38, 2.99); hole.closePath(); outline.holes.push(hole);
  const faceMat = material(red); faceMat.side = THREE.DoubleSide;
  const face = new THREE.Mesh(new THREE.ShapeGeometry(outline), faceMat); face.position.z = 1.61; face.castShadow = true; parent.add(face);
  const rear = face.clone(); rear.position.z = -1.6; parent.add(rear);
  box(parent, '#3e3029', 0, 2.62, 1.08, 1.05, .78, .08);
  box(parent, '#957552', 0, 2.41, 1.39, .83, .05, .49);
  for (let i = 0; i < profile.length - 1; i++) {
    const [a, b] = [profile[i], profile[i + 1]];
    const panel = box(parent, slate, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0, Math.hypot(b[0] - a[0], b[1] - a[1]), .065, 3.55);
    panel.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (const z of [-1.79, 1.79]) beam(parent, trim, [a[0], a[1], z], [b[0], b[1], z], .023);
    // Fine standing seams make the roof readable from the orbit camera.
    for (let z = -1.5; z < 1.6; z += .38) beam(parent, '#596064', [a[0], a[1] + .038, z], [b[0], b[1] + .038, z], .009);
  }
  for (let x = -1.27; x <= 1.28; x += .14) {
    const segment = profile.findIndex((p, i) => i < profile.length - 1 && x >= p[0] && x <= profile[i + 1][0]);
    const a = profile[segment], b = profile[segment + 1];
    const top = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]) - .06;
    for (const z of [-1.625, 1.625]) {
      const lowerTop = Math.abs(x) < .41 ? 2.39 : top;
      box(parent, '#b35343', x, (lowerTop + .12) / 2, z, .026, lowerTop - .12, .03);
      if (Math.abs(x) < .41 && top > 3.02) box(parent, '#b35343', x, (top + 3.02) / 2, z, .026, top - 3.02, .03);
    }
  }
  for (const side of [-1, 1]) {
    const wall = group(parent, side * 1.36, 0, 0); wall.rotation.y = side * Math.PI / 2;
    for (let x = -1.5; x <= 1.51; x += .15) box(wall, '#b35343', x, 1.05, 0, .025, 1.97, .025);
    for (const x of [-1.06, -.35, .35, 1.06]) sash(wall, x, 1.38, .025, .3, .38, 2);
    box(wall, trim, 0, .18, .03, 3.2, .065, .05);
  }
  // Sliding doors, their overhead rail and small windows replace the stock X-door.
  for (const x of [-.46, .46]) {
    box(parent, '#86352e', x, .9, 1.66, .9, 1.62, .08);
    for (let i = 0; i < 6; i++) box(parent, '#a94a3c', x - .37 + i * .15, .9, 1.711, .025, 1.57, .025);
    sash(parent, x, 1.12, 1.72, .23, .29, 2);
    box(parent, '#373b37', x + (x < 0 ? .33 : -.33), .68, 1.74, .035, .13, .045);
  }
  box(parent, '#4b4740', 0, 1.81, 1.72, 2.31, .055, .065);
  for (const x of [-1.29, 1.29]) box(parent, trim, x, 1.03, 1.66, .055, 2.07, .05);
  for (const x of [-.41, .41]) box(parent, trim, x, 2.7, 1.68, .055, .65, .1);
  for (const y of [2.4, 3.01]) box(parent, trim, 0, y, 1.68, .88, .055, .1);
  const shutter = group(parent, -.57, 2.7, 1.7); shutter.rotation.y = -.35;
  box(shutter, '#82372f', 0, 0, 0, .32, .58, .05);
  for (const y of [-.22, .22]) box(shutter, trim, 0, y, .03, .32, .025, .025);
  const diamond = box(parent, trim, 0, 3.36, 1.67, .17, .17, .03); diamond.rotation.z = Math.PI / 4;
  const inset = box(parent, '#493d32', 0, 3.36, 1.69, .115, .115, .03); inset.rotation.z = Math.PI / 4;
  for (const z of [-.94, .94]) {
    box(parent, red, 0, 3.83, z, .34, .35, .37);
    for (let y = 3.72; y < 3.97; y += .065) box(parent, trim, 0, y, z + .19, .27, .018, .025);
    roof(parent, .48, .5, .2, 3.99, slate).position.z = z;
  }
  beam(parent, '#56534a', [0, 4.16, .94], [0, 4.45, .94], .013);
  beam(parent, '#56534a', [-.17, 4.35, .94], [.17, 4.35, .94], .012);
}

export function smallvilleSchool(parent: THREE.Group) {
  parent.name = 'Smallville High — tall sash windows and burgundy bays';
  const stone = '#c4bdab', burgundy = '#79423e';
  box(parent, stone, 0, 1.75, 0, 6, 3.5, 2.65);
  box(parent, '#8d8779', 0, .12, 0, 6.08, .24, 2.72);
  for (const y of [1.19, 3.35, 3.55]) box(parent, y === 1.19 ? burgundy : trim, 0, y, 0, 6.18, .105, 2.83);
  box(parent, slate, 0, 3.62, 0, 5.91, .035, 2.58);
  // Continuous upper window bays are the school's strongest identifying feature.
  for (const side of [-1, 1]) {
    for (const x of [1.03, 1.7, 2.37]) {
      box(parent, burgundy, side * x, 2.28, 1.36, .62, 2.14, .13);
      for (const y of [1.77, 2.79]) sash(parent, side * x, y, 1.44, .41, .82, 4);
      sash(parent, side * x, .68, 1.35, .43, .69, 3);
    }
    const wall = group(parent, side * 3.015, 0, 0); wall.rotation.y = side * Math.PI / 2;
    for (const x of [-.86, 0, .86]) for (const y of [.68, 1.77, 2.79]) sash(wall, x, y, .025, .45, y < 1 ? .69 : .82, 4);
    box(parent, trim, side * 2.9, 1.78, 1.36, .13, 3.35, .13);
  }
  // A shallow projecting entrance tower, capped with a stepped parapet.
  box(parent, stone, 0, 1.88, 1.4, 1.43, 3.76, .34);
  box(parent, burgundy, 0, 2.42, 1.595, 1.23, 1.69, .1);
  for (const x of [-.3, .3]) sash(parent, x, 2.42, 1.66, .4, 1.4, 6);
  for (const y of [3.38, 3.7, 3.88]) box(parent, trim, 0, y, 1.41, y === 3.88 ? 1.19 : 1.61, .1, .51);
  box(parent, stone, 0, 3.79, 1.41, 1.1, .18, .36);
  for (const x of [-.32, .32]) for (const y of [3.48, 3.55]) box(parent, '#706b60', x, y, 1.605, .22, .018, .015);
  box(parent, '#62594d', 0, .73, 1.6, 1.08, 1.26, .12);
  for (const x of [-.25, .25]) {
    box(parent, burgundy, x, .65, 1.69, .47, 1.06, .06);
    sash(parent, x, .83, 1.73, .31, .51, 2);
    box(parent, trim, x + (x < 0 ? .14 : -.14), .45, 1.79, .02, .13, .025);
  }
  for (const x of [-.61, .61]) box(parent, trim, x, .68, 1.68, .12, 1.37, .2);
  box(parent, trim, 0, 1.31, 1.68, 1.32, .14, .2);
  plaque(parent, 'SMALLVILLE HIGH', 0, 1.48, 1.74, 1.31, .21, burgundy);
  box(parent, '#a79e89', 0, .07, 1.82, 1.7, .14, .8);
  box(parent, '#c1b69f', 0, .15, 1.67, 1.47, .1, .56);
  // Drainpipes and masonry courses carry detail around the building, not just its front.
  for (const x of [-2.84, 2.84]) cylinder(parent, '#706b60', x, 1.65, 1.43, .021, 3.22);
  for (let y = .3; y < 1.13; y += .18) for (const x of [-1.88, 1.88]) box(parent, '#afa795', x, y, 1.333, 2.12, .012, .012);
  plaque(parent, 'HOME OF THE CROWS', 0, .61, -1.36, 2.1, .31, burgundy).rotation.y = Math.PI;
}
