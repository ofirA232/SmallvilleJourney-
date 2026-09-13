import { expect, it } from 'vitest';
import { PowerChallenge } from './power-challenge';
import { pilotChallenges } from '../content/pilot-challenges';

const create=()=>new PowerChallenge({kind:'power',title:'Control',instruction:'Hold and release',beats:['Lift','Lower'],speed:.5,zone:[.5,.8]});
it('requires a real press and release in the target zone for every step',()=>{
  const challenge=create();challenge.update(2);expect(challenge.charge).toBe(0);expect(challenge.release()).toBeNull();
  challenge.press();challenge.update(1.2);expect(challenge.release()).toBe('hit');expect(challenge.complete).toBe(false);
  challenge.update(.3);challenge.press();challenge.update(1.2);expect(challenge.release()).toBe('hit');expect(challenge.complete).toBe(true);
  challenge.press();challenge.update(2);expect(challenge.release()).toBeNull();expect(challenge.hits).toBe(2);
});
it('recovers from early release and overload without granting progress',()=>{
  const challenge=create();challenge.press();challenge.update(.3);expect(challenge.release()).toBe('miss');
  challenge.update(.3);challenge.press();expect(challenge.update(3)).toBe(true);expect(challenge.hits).toBe(0);expect(challenge.misses).toBe(2);expect(challenge.held).toBe(false);
});
it('never builds strength while unfocused and discards interrupted input',()=>{
  const challenge=create();challenge.press();challenge.update(.4);challenge.update(30,true);expect(challenge.charge).toBe(.2);
  challenge.interrupt();challenge.update(4);expect(challenge.charge).toBe(0);expect(challenge.release()).toBeNull();
});
it('all pilot power encounters have a reachable control window at a low frame rate',()=>{
  for(const definition of Object.values(pilotChallenges))if(definition.kind==='power'){
    const challenge=new PowerChallenge(definition);for(let i=0;i<definition.beats.length;i++){
      challenge.update(.4);challenge.press();for(let frame=0;frame<50&&!challenge.inZone;frame++)challenge.update(.1);
      expect(challenge.release()).toBe('hit');
    }expect(challenge.complete).toBe(true);
  }
});
