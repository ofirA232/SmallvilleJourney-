import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { at, centers, CharacterController, distance, fromLatLon, isWater, PLANET_RADIUS, resolveCollisions, stepOnSphere, surfaceRadius, tangent, WATER_RADIUS } from './sphere';

describe('spherical movement',()=>{
  it('stays on the sphere when crossing a pole and completing a full circuit',()=>{
    let normal=fromLatLon(89.9,0);let forward=tangent(new Vector3(0,1,0),normal);
    const start=normal.clone();
    for(let i=0;i<3600;i++){
      const next=stepOnSphere(normal,forward,2*Math.PI*PLANET_RADIUS/3600);
      forward=tangent(next.clone().sub(normal),next);normal=next;
      expect(normal.length()).toBeCloseTo(1,8);
      expect(Number.isFinite(normal.x+normal.y+normal.z)).toBe(true);
    }
    expect(distance(start,normal)).toBeLessThan(.1);
  });
  it('pushes the character outside a collider even at its exact center',()=>{
    const normal=at('farm');const result=resolveCollisions(normal,[{normal,radius:1}]);
    expect(distance(result,normal)).toBeGreaterThanOrEqual(1.23);
    expect(result.length()).toBeCloseTo(1,8);
  });
  it('cannot tunnel through a prop at super speed using fixed simulation steps',()=>{
    const controller=new CharacterController();controller.reset(fromLatLon(0,-10));
    const collider={normal:fromLatLon(0,0),radius:.8};
    for(let i=0;i<180;i++){
      controller.update(1/60,tangent(collider.normal,controller.normal),true,[collider]);
      expect(distance(controller.normal,collider.normal)).toBeGreaterThanOrEqual(1.029);
    }
  });
  it('weakness limits speed and prevents jumping',()=>{
    const controller=new CharacterController();controller.reset(at('farm'));controller.weakened=true;
    for(let i=0;i<60;i++)controller.update(1/60,tangent(new Vector3(1,0,0),controller.normal),true,[]);
    expect(controller.speed).toBeLessThanOrEqual(1.25);expect(controller.superSpeed).toBe(false);expect(controller.jump()).toBe(false);
  });
  it('distinguishes the bridge deck from the river and returns safely from a jump',()=>{
    expect(isWater(at('bridge',[0,0]))).toBe(false);
    for(const east of [-2.7,0,2.7]){
      const normal=at('bridge',[east,0]);
      expect(surfaceRadius(normal)*normal.dot(centers.bridge)).toBeCloseTo(WATER_RADIUS+.36,6);
    }
    expect(isWater(at('bridge',[0,-1.7]))).toBe(true);
    const controller=new CharacterController();controller.reset(at('farm'));expect(controller.jump()).toBe(true);
    for(let i=0;i<120;i++)controller.update(1/60,new Vector3(),false,[]);
    expect(controller.height).toBe(0);expect(controller.verticalSpeed).toBe(0);
  });
});
