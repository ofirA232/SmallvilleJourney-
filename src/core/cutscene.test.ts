import { describe, expect, it } from 'vitest';
import { CutsceneTimeline, fitFov, spotPosition, type CutsceneDefinition } from './cutscene';
import { bridgeFall } from '../content/pilot-cutscenes';

const scene: CutsceneDefinition = {
  id: 'test',
  shots: [
    { duration: 2, caption: 'One', from: { location: 'farm', point: [0, 4], height: 2 }, to: { location: 'farm', point: [0, 2], height: 1 }, look: { location: 'farm', point: [0, 0], height: 1 } },
    { duration: 1, caption: 'Two', fov: 35, from: { location: 'farm', point: [3, 0], height: 1 }, look: { location: 'farm', point: [0, 0], height: .5 } },
  ],
  cues: [{ at: 0, id: 'start' }, { at: 1.5, id: 'hit' }, { at: 3, id: 'end' }],
  shakes: [{ at: 1.5, strength: .2 }],
};

describe('cutscene timeline', () => {
  it('sums shot durations and finds the shot at any time', () => {
    const timeline = new CutsceneTimeline(scene);
    expect(timeline.duration).toBe(3);
    expect(timeline.shotAt(0).index).toBe(0);
    expect(timeline.shotAt(1.99).index).toBe(0);
    expect(timeline.shotAt(2).index).toBe(1);
    expect(timeline.shotAt(99)).toMatchObject({ index: 1, progress: 1 });
  });
  it('moves the camera from its first spot to its last and holds locked-off shots', () => {
    const timeline = new CutsceneTimeline(scene);
    expect(timeline.frame(0, true).position.distanceTo(spotPosition(scene.shots[0].from))).toBeLessThan(1e-9);
    expect(timeline.frame(1.999, true).position.distanceTo(spotPosition(scene.shots[0].to!))).toBeLessThan(1e-3);
    const held = [2, 2.5, 3].map(time => timeline.frame(time, true).position);
    expect(held[0].distanceTo(held[2])).toBeLessThan(1e-9);
    expect(timeline.frame(2.5)).toMatchObject({ caption: 'Two', fov: 35, shot: 1 });
    expect(timeline.frame(.5).fov).toBe(42);
  });
  it('fires each cue exactly once however the time is sliced', () => {
    const timeline = new CutsceneTimeline(scene);
    for (const step of [1 / 60, .4, 3]) {
      const fired: string[] = [];let time = -1;
      for (let next = 0; time < timeline.duration; next = Math.min(timeline.duration, next + step)) {fired.push(...timeline.cuesBetween(time, next));time = next;}
      expect(fired).toEqual(['start', 'hit', 'end']);
    }
  });
  it('shakes after an impact, settles, and stays still for reduced motion', () => {
    const timeline = new CutsceneTimeline(scene);
    expect(timeline.shake(1.4)).toBe(0);
    expect(timeline.shake(1.55)).toBeGreaterThan(.1);
    expect(timeline.shake(2.9)).toBe(0);
    const still = timeline.frame(1.55, true).position, shaken = timeline.frame(1.55).position;
    expect(still.distanceTo(shaken)).toBeGreaterThan(.01);
  });
  it('widens the view for portrait screens without distorting landscape ones', () => {
    expect(fitFov(42, 16 / 9)).toBe(42);
    expect(fitFov(42, .9)).toBe(42);
    expect(fitFov(42, .7)).toBeGreaterThan(50);
    expect(fitFov(42, .45)).toBe(70);
  });
  it('rejects broken definitions', () => {
    expect(() => new CutsceneTimeline({ id: 'empty', shots: [] })).toThrow();
    expect(() => new CutsceneTimeline({ ...scene, shots: [{ ...scene.shots[0], duration: 0 }] })).toThrow();
    expect(() => new CutsceneTimeline({ ...scene, cues: [{ at: 9, id: 'late' }] })).toThrow();
    expect(() => new CutsceneTimeline(scene).cue('missing')).toThrow();
  });
  it('keeps the bridge crash cues in story order', () => {
    const timeline = new CutsceneTimeline(bridgeFall);
    expect(timeline.cue('engine')).toBeLessThan(timeline.cue('impact'));
    expect(timeline.cue('impact')).toBeLessThan(timeline.cue('splash'));
    expect(timeline.cue('splash')).toBeLessThan(timeline.duration);
  });
});
