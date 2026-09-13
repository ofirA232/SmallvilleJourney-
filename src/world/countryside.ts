import * as THREE from 'three';
import { ball, beam, box, cylinder, group, material, roof } from './primitives';
import { at, basis, surfaceRadius } from '../core/sphere';
import type { LocationId, Point } from '../types';

/** Short rails and individually grounded posts follow the planet instead of floating. */
export function countryFence(parent: THREE.Group, location: LocationId, start: Point, end: Point, clear: (n: THREE.Vector3) => boolean, white = false) {
  const count = Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / .65);
  const color = white ? '#ddd7b9' : '#887657';
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= count; i++) {
    const n = at(location, [THREE.MathUtils.lerp(start[0], end[0], i / count), THREE.MathUtils.lerp(start[1], end[1], i / count)]);
    points.push(n);
    if (!clear(n)) continue;
    const post = group(parent); post.position.copy(n).multiplyScalar(surfaceRadius(n)); post.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    box(post, color, 0, .31, 0, .075, .66, .075);
    box(post, white ? '#eee5cb' : '#b3a282', 0, .65, 0, .09, .025, .09);
  }
  for (let i = 1; i < points.length; i++) {
    if (!clear(points[i - 1]) || !clear(points[i]) || !clear(points[i].clone().add(points[i - 1]).normalize())) continue;
    for (const h of [.25, .49]) {
      const a = points[i - 1].clone().multiplyScalar(surfaceRadius(points[i - 1]) + h);
      const b = points[i].clone().multiplyScalar(surfaceRadius(points[i]) + h);
      beam(parent, color, a.toArray(), b.toArray(), white ? .026 : .018);
    }
  }
}

export function cow(parent: THREE.Group, brown = false, grazing = false) {
  const coat = brown ? '#805c43' : '#e1dcc8', dark = '#393c35';
  ball(parent, coat, 0, .57, 0, .3, .31, .58);
  for (const x of [-.2, .2]) for (const z of [-.35, .34]) {
    cylinder(parent, coat, x, .25, z, .063, .46);
    box(parent, dark, x, .065, z, .13, .12, .15);
  }
  if (!brown) for (const side of [-1, 1]) {
    ball(parent, dark, side * .253, .64, -.17, .057, .19, .24);
    ball(parent, dark, side * .258, .53, .26, .045, .13, .14);
  }
  const head = group(parent, 0, .65, .48); head.rotation.x = grazing ? .85 : .1;
  ball(head, coat, 0, -.04, .17, .2, .23, .29);
  ball(head, '#b49a86', 0, -.13, .39, .19, .115, .1);
  for (const side of [-1, 1]) {
    ball(head, coat, side * .23, .09, .07, .12, .045, .07);
    ball(head, dark, side * .155, .015, .31, .026, .029, .025);
    ball(head, dark, side * .08, -.105, .475, .021, .015, .008);
  }
  beam(parent, coat, [0, .7, -.52], [.04, .29, -.67], .026);
  ball(parent, dark, .04, .27, -.67, .05, .09, .045);
}

/** Instanced corn includes broad leaves and tassels, not just bare sticks. */
export function cropRows(parent: THREE.Group, location: LocationId, center: Point, width: number, depth: number, clear: (n: THREE.Vector3) => boolean) {
  const points: THREE.Vector3[] = [];
  for (let x = -width / 2 + .2; x < width / 2; x += .37) for (let z = -depth / 2 + .2; z < depth / 2; z += .36) {
    const n = at(location, [center[0] + x, center[1] + z]); if (clear(n)) points.push(n);
  }
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.014, .022, 1, 4), material('#8c9850'), points.length);
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material('#718547'), points.length * 3);
  const ears = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material('#d3b86a'), points.length);
  const dummy = new THREE.Object3D();
  points.forEach((n, i) => {
    const { east, north } = basis(n), rotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, n, north.negate()));
    const height = .65 + (i % 7) * .037, ground = surfaceRadius(n);
    dummy.quaternion.copy(rotation); dummy.position.copy(n).multiplyScalar(ground + height / 2); dummy.scale.set(1, height, 1); dummy.updateMatrix(); stems.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 3; j++) {
      const side = j % 2 ? -1 : 1;
      dummy.position.copy(n).multiplyScalar(ground + height * (.33 + j * .17)).addScaledVector(east, side * .115);
      dummy.quaternion.copy(rotation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * -.65));
      dummy.scale.set(.19, .035, .065); dummy.updateMatrix(); leaves.setMatrixAt(i * 3 + j, dummy.matrix);
    }
    dummy.position.copy(n).multiplyScalar(ground + height); dummy.quaternion.copy(rotation); dummy.scale.set(.025, .12, .025); dummy.updateMatrix(); ears.setMatrixAt(i, dummy.matrix);
  });
  for (const mesh of [stems, leaves, ears]) { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); }
}

export function cityBlock(parent: THREE.Group, height: number, variant: number) {
  const wall = ['#a8aaa0', '#b3a18a', '#829a9a'][variant % 3];
  box(parent, '#707c78', 0, .065, 0, 1.26, .13, 1.38);
  box(parent, wall, 0, height / 2, 0, 1.06, height, 1.16);
  for (const side of [-1, 1]) {
    const facade = group(parent, 0, 0, side * .59); facade.rotation.y = side < 0 ? Math.PI : 0;
    for (let y = .38; y < height - .15; y += .4) for (const x of [-.33, 0, .33]) box(facade, '#405e64', x, y, .012, .18, .22, .022);
    const flank = group(parent, side * .54, 0, 0); flank.rotation.y = side * Math.PI / 2;
    for (let y = .38; y < height - .15; y += .4) for (const x of [-.35, 0, .35]) box(flank, '#405e64', x, y, .012, .18, .22, .022);
  }
  box(parent, '#c5bdab', 0, height, 0, 1.16, .09, 1.26);
  box(parent, '#515e5b', 0, height + .05, 0, .98, .035, 1.08);
  if (variant % 2) { box(parent, wall, 0, height + .2, 0, .57, .3, .65); roof(parent, .65, .73, .19, height + .35, '#596b69'); }
}
