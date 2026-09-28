import { expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { CameraRig } from './camera';
import { CharacterController, fromLatLon, PLANET_RADIUS, stepOnSphere, tangent } from './sphere';

it('transports the follow camera around both poles without flipping or invalid matrices',()=>{
  const player=new CharacterController();player.reset(fromLatLon(89,0));
  const camera=new CameraRig(player);camera.setView('follow');camera.resize(412,839);camera.snap();
  let direction=tangent(new Vector3(0,1,0),player.normal);
  let previous=new Quaternion();
  for(let step=0;step<3600;step++){
    const old=player.normal.clone();const next=stepOnSphere(old,direction,2*Math.PI*PLANET_RADIUS/3600);
    direction.applyQuaternion(new Quaternion().setFromUnitVectors(old,next));player.normal.copy(next);
    camera.update(1/60,false,false,[]);
    expect(camera.camera.matrixWorld.elements.every(Number.isFinite)).toBe(true);
    expect(camera.camera.up.dot(player.normal)).toBeGreaterThan(.98);
    if(step>0)expect(Math.abs(previous.dot(camera.camera.quaternion))).toBeGreaterThan(.99);
    previous.copy(camera.camera.quaternion);
  }
});

it('lowers the walking view on an upright phone only',()=>{
  const player=new CharacterController();player.reset(fromLatLon(20,0));
  const camera=new CameraRig(player);camera.setView('follow');camera.snap();camera.lowered=true;
  camera.resize(390,844);camera.update(1/60,false,true,[]);
  expect(camera.camera.view?.enabled).toBe(true);expect(camera.camera.view!.offsetY).toBeLessThan(0);
  camera.resize(844,390);camera.update(1/60,false,true,[]);
  expect(camera.camera.view?.enabled??false).toBe(false);
  camera.resize(390,844);camera.lowered=false;camera.update(1/60,false,true,[]);
  expect(camera.camera.view?.enabled??false).toBe(false);
});
