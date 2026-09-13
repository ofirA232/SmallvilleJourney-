import { describe, expect, it } from 'vitest';
import { AnimationClip, Bone, Group, QuaternionKeyframeTrack } from 'three';
import { clarkMotion, ImportedClark } from './imported-clark';

describe('imported Clark animation', () => {
  it('prioritizes story restraints, power actions, swimming and airborne poses over movement', () => {
    expect(clarkMotion(12,true,true,true,true)).toBe('Restrained');
    expect(clarkMotion(12,true,false,true,true)).toBe('Strength');
    expect(clarkMotion(12,true,false,false,true)).toBe('Swim');
    expect(clarkMotion(12,false,false,false,true)).toBe('Jump');
    expect(clarkMotion(12,false,false)).toBe('Run');
    expect(clarkMotion(2,false,false)).toBe('Walk');
    expect(clarkMotion(0,false,false)).toBe('Idle');
  });
  it('clones joints independently and returns to idle after an interrupted action', () => {
    const source=new Group(), bone=new Bone();bone.name='Hips';source.add(bone);
    const clips=['Idle','Walk','Strength'].map((name,index)=>new AnimationClip(name,1,[new QuaternionKeyframeTrack('Hips.quaternion',[0,1],[0,0,0,1,Math.sin(index*.2),0,0,Math.cos(index*.2)])]));
    const a=new ImportedClark(source,clips),b=new ImportedClark(source,clips);
    a.setMotion('Strength',true);for(let i=0;i<10;i++)a.update(.05);
    expect(a.root.getObjectByName('Hips')!.quaternion.x).toBeGreaterThan(0);
    expect(b.root.getObjectByName('Hips')!.quaternion.x).toBe(0);
    a.setMotion('Idle');for(let i=0;i<10;i++)a.update(.05);
    expect(a.motion).toBe('Idle');expect(a.root.getObjectByName('Hips')!.quaternion.x).toBeCloseTo(0);
  });
});
