import { MathUtils, Vector3 } from 'three';
import { at, basis, PLANET_RADIUS } from './sphere';
import type { LocationId, Point } from '../types';

/** A camera or look-at position, authored in a location's local east/south frame.
 * Heights are measured from the planet radius rather than the terrain so authored
 * camera moves interpolate predictably over water, decks and slopes. */
export interface Spot { location: LocationId; point: Point; height: number }
export interface Shot {
  duration: number;
  from: Spot;
  /** Where the camera ends; omitted for a locked-off shot. */
  to?: Spot;
  look: Spot;
  lookTo?: Spot;
  fov?: number;
  caption?: string;
  ease?: 'inOut' | 'linear';
}
export interface CutsceneDefinition {
  id: string;
  shots: Shot[];
  /** Named moments that drive choreography, sound and flashes. */
  cues?: { at: number; id: string }[];
  /** Camera shakes that decay over about half a second. */
  shakes?: { at: number; strength: number }[];
}
export interface CutsceneFrame { position: Vector3; target: Vector3; up: Vector3; fov: number; caption: string; shot: number }

export function spotPosition(spot: Spot) {
  const normal = at(spot.location, spot.point);
  return normal.multiplyScalar(PLANET_RADIUS + spot.height);
}

/** Shots are framed for landscape. On narrower screens, widen the vertical field of view so
 * roughly the same horizontal slice of the scene stays in frame, up to a limit that avoids distortion. */
export function fitFov(fov: number, aspect: number, minAspect = .9, maximum = 70) {
  if (aspect >= minAspect) return fov;
  const widened = 2 * Math.atan(Math.tan(MathUtils.degToRad(fov) / 2) * minAspect / aspect);
  return Math.max(fov, Math.min(maximum, MathUtils.radToDeg(widened)));
}

export class CutsceneTimeline {
  readonly duration: number;
  constructor(readonly definition: CutsceneDefinition) {
    if (!definition.shots.length) throw new Error(`Cutscene ${definition.id} has no shots.`);
    for (const shot of definition.shots) if (!(shot.duration > 0)) throw new Error(`Cutscene ${definition.id} has a shot without a positive duration.`);
    this.duration = definition.shots.reduce((sum, shot) => sum + shot.duration, 0);
    for (const cue of definition.cues ?? []) if (cue.at < 0 || cue.at > this.duration) throw new Error(`Cutscene ${definition.id} cue ${cue.id} is outside the scene.`);
  }
  cue(id: string) {
    const cue = this.definition.cues?.find(value => value.id === id);
    if (!cue) throw new Error(`Cutscene ${this.definition.id} has no cue ${id}.`);
    return cue.at;
  }
  /** Cues passed while moving from `from` (exclusive) to `to` (inclusive). */
  cuesBetween(from: number, to: number) { return (this.definition.cues ?? []).filter(cue => cue.at > from && cue.at <= to).map(cue => cue.id); }
  shotAt(time: number) {
    let start = 0;
    const shots = this.definition.shots;
    for (let index = 0; index < shots.length; index++) {
      const shot = shots[index];
      if (time < start + shot.duration || index === shots.length - 1) return { index, shot, progress: MathUtils.clamp((time - start) / shot.duration, 0, 1) };
      start += shot.duration;
    }
    throw new Error('Unreachable');
  }
  shake(time: number) {
    let amount = 0;
    for (const shake of this.definition.shakes ?? []) if (time >= shake.at) amount += shake.strength * Math.exp(-(time - shake.at) * 6);
    return amount < .002 ? 0 : amount;
  }
  frame(time: number, reducedMotion = false): CutsceneFrame {
    const { index, shot, progress } = this.shotAt(time);
    const t = shot.ease === 'linear' ? progress : MathUtils.smoothstep(progress, 0, 1);
    const position = spotPosition(shot.from).lerp(spotPosition(shot.to ?? shot.from), t);
    const target = spotPosition(shot.look).lerp(spotPosition(shot.lookTo ?? shot.look), t);
    const up = position.clone().normalize();
    const shake = reducedMotion ? 0 : this.shake(time);
    if (shake) {
      // Deterministic jitter keeps test captures and replays identical.
      const { east, north } = basis(up);
      position.addScaledVector(east, Math.sin(time * 71) * shake).addScaledVector(north, Math.sin(time * 53 + 1.3) * shake * .7).addScaledVector(up, Math.sin(time * 89 + .4) * shake * .5);
    }
    return { position, target, up, fov: shot.fov ?? 42, caption: shot.caption ?? '', shot: index };
  }
}
