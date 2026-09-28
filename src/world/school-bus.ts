import * as THREE from 'three';
import { at, PLANET_RADIUS, surfaceRadius, tangent } from '../core/sphere';
import { box, cylinder, group, material } from './primitives';

const YELLOW = '#e9b43c', BLACK = '#262626', GLASS = '#304a4f';

/** A low-poly yellow school bus, facing -z like the other vehicles. */
export function schoolBus(parent: THREE.Object3D) {
  const root = group(parent, 0, 0, 0, true);
  box(root, YELLOW, 0, .62, .1, 1, .8, 2.4);
  box(root, YELLOW, 0, .42, -1.35, .9, .42, .5);
  box(root, '#f1e3bd', 0, 1.04, .1, .96, .05, 2.36);
  for (const side of [-1, 1]) {
    for (const y of [.55, .72]) box(root, BLACK, side * .505, y, .1, .012, .035, 2.36);
    for (let z = -.8; z <= 1.15; z += .3) box(root, GLASS, side * .505, .87, z, .014, .22, .22);
  }
  box(root, GLASS, 0, .85, -1.105, .84, .3, .02);
  box(root, BLACK, 0, .99, -1.11, .6, .08, .02);
  box(root, BLACK, 0, .26, -1.63, .96, .08, .06);
  box(root, BLACK, 0, .3, 1.32, .96, .08, .06);
  for (const x of [-.3, .3]) {
    const lamp = box(root, '#fff1c2', x, .47, -1.61, .12, .1, .02); lamp.material = material('#fff1c2', true);
    const tail = box(root, '#c43b33', x * 1.3, .5, 1.31, .1, .1, .02); tail.material = material('#c43b33', true);
  }
  const stop = cylinder(root, '#c43b33', -.53, .74, -.75, .09, .015); stop.rotation.z = Math.PI / 2;
  for (const x of [-.46, .46]) for (const z of [-1.05, .85]) {
    const wheel = cylinder(root, '#2f3633', x, .2, z, .2, .12); wheel.rotation.z = Math.PI / 2;
    const hub = cylinder(root, '#c9cfc8', x * 1.03, .2, z, .09, .125); hub.rotation.z = Math.PI / 2;
  }
  return root;
}

/** The bus's route: from the farm gate down to Loeb Bridge, across the deck (the river has no other
 * crossing), and up to the school gate. Points are unit normals; the bus moves at an even speed. */
const ROUTE = () => [at('farm', [0, 3.5]), at('bridge', [-3.6, 0]), at('bridge', [3.6, 0]), at('school', [0, 3.5])];
let route: { points: THREE.Vector3[]; lengths: number[]; total: number } | null = null;
function busRoute() {
  if (route) return route;
  const points = ROUTE(), lengths = points.slice(1).map((point, index) => point.angleTo(points[index]));
  route = { points, lengths, total: lengths.reduce((sum, length) => sum + length, 0) };
  return route;
}
export function busRoutePoint(t: number) {
  const { points, lengths, total } = busRoute();
  let along = THREE.MathUtils.clamp(t, 0, 1) * total;
  for (let index = 0; index < lengths.length; index++) {
    if (along <= lengths[index] || index === lengths.length - 1) return points[index].clone().lerp(points[index + 1], Math.min(1, along / lengths[index])).normalize();
    along -= lengths[index];
  }
  return points[points.length - 1].clone();
}
/** Places the bus `t` of the way along its route, facing the way it drives, on the ground or the bridge deck. */
export function placeBus(bus: THREE.Object3D, t: number) {
  const here = busRoutePoint(t), ahead = busRoutePoint(Math.min(1, t + .01)), behind = busRoutePoint(Math.max(0, t - .01));
  const forward = tangent(ahead.clone().sub(behind), here), back = forward.clone().negate(), right = new THREE.Vector3().crossVectors(here, back).normalize();
  bus.position.copy(here).multiplyScalar(Math.max(surfaceRadius(here), PLANET_RADIUS) + .02);
  bus.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, here, back));
}
