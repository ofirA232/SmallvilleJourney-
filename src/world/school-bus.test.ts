import { describe, expect, it } from 'vitest';
import { at, distance, isWater } from '../core/sphere';
import { busRoutePoint } from './school-bus';

describe('school bus route', () => {
  it('runs from the farm gate to the school gate', () => {
    expect(distance(busRoutePoint(0), at('farm', [0, 3.5]))).toBeLessThan(.01);
    expect(distance(busRoutePoint(1), at('school', [0, 3.5]))).toBeLessThan(.01);
  });
  it('never drives into the river: it crosses on Loeb Bridge', () => {
    const wet = Array.from({ length: 401 }, (_, i) => i / 400).filter(t => isWater(busRoutePoint(t)));
    expect(wet).toEqual([]);
    const crossing = Array.from({ length: 401 }, (_, i) => busRoutePoint(i / 400)).some(point => distance(point, at('bridge')) < .5);
    expect(crossing).toBe(true);
  });
});
