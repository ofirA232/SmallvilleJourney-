import { beforeAll, describe, expect, it } from 'vitest';
import { pilot } from '../content/pilot';
import { locations } from '../content/locations';
import { World } from '../world/world';
import { Navigator } from './navigation';
import { at, CharacterController, distance } from './sphere';
import { Story } from './story';

describe('navigation through the actual Smallville world',()=>{
  let world:World,navigator:Navigator;
  beforeAll(()=>{world=new World(pilot.quests);navigator=new Navigator(world.colliders);},30_000);
  it('finds a walkable path to every objective in episode order',()=>{
    const controller=new CharacterController();
    for(const quest of pilot.quests){
      if(quest.id==='jeremy-field')controller.reset(at('cornfield',[0,.5]));
      if(quest.id==='race')controller.reset(at('cornfield',[0,2.4]));
      const target=at(quest.location,quest.point);
      if(distance(controller.normal,target)<(quest.radius??1.65))continue;
      expect(navigator.plan(controller.normal,target),`Route to ${quest.id}`).toBe(true);
      let ticks=0;
      while(navigator.active&&distance(controller.normal,target)>.8&&ticks++<7200)controller.update(1/60,navigator.direction(controller.normal),true,world.colliders);
      expect(distance(controller.normal,target),`Reach ${quest.id} in 120 simulated seconds`).toBeLessThan(quest.radius??1.65);
    }
  },30_000);
  it('keeps Metropolis closed and cancels routes cleanly',()=>{
    expect(navigator.plan(at('farm'),at('metropolis'))).toBe(false);
    expect(navigator.plan(at('farm',[0,3.4]),at('farm',[0,1.7]))).toBe(true);
    navigator.stop();expect(navigator.active).toBe(false);expect(navigator.route).toHaveLength(0);
  });
  it('places every reload checkpoint outside solid scenery',()=>{
    for(const quest of pilot.quests){
      const normal=at(quest.checkpointLocation??quest.location,quest.checkpoint??[quest.point[0],quest.point[1]+1.25]);
      for(const collider of world.colliders)expect(distance(normal,collider.normal),`${quest.id} checkpoint is obstructed`).toBeGreaterThanOrEqual(collider.radius+.23);
    }
  });
  it('reconstructs identical actor and prop states after every reload and repeated visit',()=>{
    let saved='';const storage={getItem:()=>saved,setItem:(_key:string,value:string)=>{saved=value;}};
    const story=new Story(pilot,storage,locations.map(value=>value.id));
    const visibleState=()=>({
      actors:[...world.characters].map(([id,actor])=>[id,actor.root.visible,actor.root.position.toArray(),actor.root.quaternion.toArray(),actor.necklace.visible]),
      props:Object.entries(world.dynamic).map(([id,prop])=>[id,prop.visible,prop.position.toArray(),prop.quaternion.toArray()]),
      night:world.isNight,kryptonite:world.kryptoniteNormals(story).map(point=>point.toArray()),
    });
    for(let index=0;index<=pilot.quests.length;index++){
      world.sync(story);story.save();const expected=visibleState();
      const loaded=new Story(pilot,storage,locations.map(value=>value.id));loaded.load();
      world.sync(loaded);world.sync(loaded);expect(visibleState()).toEqual(expected);
      if(story.quest)story.advance(story.quest.id);
    }
  });
});
