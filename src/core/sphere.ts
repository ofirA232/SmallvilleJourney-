import { MathUtils, Quaternion, Vector3 } from 'three';
import { locations, locationById } from '../content/locations';
import type { LocationId, Point } from '../types';

export const PLANET_RADIUS = 19;
export const WATER_RADIUS = PLANET_RADIUS - 0.1;
export const UP = new Vector3(0, 1, 0);
const radians = Math.PI / 180;
export function fromLatLon(latitude: number, longitude: number) {
  const lat = latitude * radians, lon = longitude * radians;
  return new Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
}
export const centers = Object.fromEntries(locations.map(location => [location.id, fromLatLon(location.latitude, location.longitude)])) as Record<LocationId, Vector3>;
export function basis(normal: Vector3) {
  const east = new Vector3().crossVectors(UP, normal);
  if (east.lengthSq() < 0.00001) east.set(1, 0, 0);
  east.normalize();
  return { east, north: new Vector3().crossVectors(normal, east).normalize() };
}
export function at(id: LocationId, point: Point = [0, 0]) {
  const normal = centers[id];
  const { east, north } = basis(normal);
  return normal.clone().multiplyScalar(PLANET_RADIUS).addScaledVector(east, point[0]).addScaledVector(north, -point[1]).normalize();
}
export function nearestLocation(normal: Vector3) {
  let nearest = locations[0], score = -Infinity;
  for (const location of locations) {
    const dot = normal.dot(centers[location.id]);
    if (dot > score) { nearest = location; score = dot; }
  }
  return nearest;
}
function waterTerrain(normal: Vector3) {
  const latitude = Math.asin(MathUtils.clamp(normal.y, -1, 1)) / radians;
  const longitude = Math.atan2(normal.x, normal.z) / radians;
  const middle = 11 + Math.sin(latitude * 0.06) * 3;
  const river = latitude > -62 && latitude < 15 && Math.abs(longitude - middle) < 2.5;
  const sea = normal.dot(fromLatLon(-48, 135)) > Math.cos(38 * radians);
  return river || sea;
}
function onBridge(normal: Vector3) {
  const center=centers.bridge;
  if(distance(normal,center)>3.25)return false;
  const {east,north}=basis(center);
  const scale=PLANET_RADIUS/normal.dot(center);
  return Math.abs(normal.dot(east)*scale)<2.95&&Math.abs(normal.dot(north)*scale)<.68;
}
export function isWater(normal: Vector3) { return waterTerrain(normal) && !onBridge(normal); }
export function terrainRadius(normal: Vector3) {
  if (waterTerrain(normal)) return PLANET_RADIUS - 0.47;
  // Broad prairie swells, with level village/farm building pads. The same
  // height function is used by rendering, grounding and player movement.
  const clearance = Math.min(...locations.map(location => distance(normal, centers[location.id])));
  const rural = MathUtils.smoothstep(clearance, 5, 9);
  return PLANET_RADIUS + 0.08 + rural * (.12 + .13 * Math.sin(normal.x * 5 + normal.z * 3) * Math.sin(normal.y * 6));
}
export function surfaceRadius(normal: Vector3) { return onBridge(normal) ? (WATER_RADIUS + .36) / normal.dot(centers.bridge) : Math.max(WATER_RADIUS, terrainRadius(normal)); }
export function distance(a: Vector3, b: Vector3) { return Math.acos(MathUtils.clamp(a.dot(b), -1, 1)) * PLANET_RADIUS; }
export function tangent(direction: Vector3, normal: Vector3) { return direction.clone().addScaledVector(normal, -direction.dot(normal)).normalize(); }
export function stepOnSphere(normal: Vector3, direction: Vector3, amount: number) {
  if (direction.lengthSq() < 1e-12 || !amount) return normal.clone();
  const angle = amount / PLANET_RADIUS;
  return normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(tangent(direction, normal), Math.sin(angle)).normalize();
}
export interface Collider { normal: Vector3; radius: number }
export function resolveCollisions(normal: Vector3, colliders: Collider[], bodyRadius = 0.23) {
  const result = normal.clone();
  for (let pass = 0; pass < 4; pass++) {
    for (const collider of colliders) {
      const minimum = (collider.radius + bodyRadius) / PLANET_RADIUS;
      if (result.dot(collider.normal) <= Math.cos(minimum)) continue;
      let away = tangent(result, collider.normal);
      if (away.lengthSq() < 0.01) away = basis(collider.normal).east;
      result.copy(collider.normal).multiplyScalar(Math.cos(minimum + 0.00002)).addScaledVector(away, Math.sin(minimum + 0.00002)).normalize();
    }
  }
  return result;
}
export function isLocked(normal: Vector3) { return distance(normal, centers.metropolis) < 7; }
export function labelOf(id: LocationId) { return locationById[id].name; }

export class CharacterController {
  normal = at('farm', [0, 3.4]);
  forward = tangent(new Vector3(0, 0, -1), this.normal);
  speed = 0;
  height = 0;
  verticalSpeed = 0;
  walked = 0;
  swimming = false;
  weakened = false;
  moving = false;
  superSpeed = false;
  locked = false;
  reset(normal: Vector3) {
    const rotation = new Quaternion().setFromUnitVectors(this.normal, normal);
    this.forward.applyQuaternion(rotation);
    this.normal.copy(normal);
    this.height = this.verticalSpeed = this.speed = 0;
    this.moving = false;
    this.swimming = isWater(normal);
  }
  jump() {
    if (this.height > 0.001 || this.swimming || this.weakened || this.locked) return false;
    this.verticalSpeed = 4.6;
    return true;
  }
  update(dt: number, direction: Vector3, running: boolean, colliders: Collider[]) {
    this.swimming = isWater(this.normal);
    const active = !this.locked && direction.lengthSq() > 0.01;
    this.superSpeed = active && running && !this.weakened && !this.swimming;
    const targetSpeed = active ? (this.weakened ? 1.25 : this.swimming ? 2.9 : this.superSpeed ? 10.5 : 3.15) : 0;
    this.speed = MathUtils.damp(this.speed, targetSpeed, 14, dt);
    if (this.speed < 0.015) this.speed = 0;
    if (active) {
      const old = this.normal.clone();
      const desired = stepOnSphere(old, direction, this.speed * dt);
      const next = resolveCollisions(desired, colliders);
      if (!isLocked(next)) this.normal.copy(next);
      this.walked += distance(old, this.normal);
      const transport = new Quaternion().setFromUnitVectors(old, this.normal);
      this.forward.applyQuaternion(transport);
      const facing = tangent(direction, this.normal);
      this.forward.lerp(facing, Math.min(1, dt * 16)).normalize();
    }
    this.moving = active && this.speed > 0.1;
    this.verticalSpeed -= 13 * dt;
    this.height += this.verticalSpeed * dt;
    if (this.height < 0 || this.swimming) this.height = this.verticalSpeed = 0;
  }
}
