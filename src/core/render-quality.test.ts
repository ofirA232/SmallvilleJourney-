import {expect,it} from 'vitest';
import {RenderQuality} from './render-quality';
it('reduces quality after two seconds of low active frame rate, even at 10 fps',()=>{
 const q=new RenderQuality();for(let i=0;i<21;i++)q.update(.1,true);expect(q.level).toBe(1);
 for(let i=0;i<21;i++)q.update(.1,true);expect(q.level).toBe(2);
 for(let i=0;i<100;i++)q.update(.1,true);expect(q.level).toBe(2);
});
it('ignores pauses and retains quality on a smooth device',()=>{
 const q=new RenderQuality();for(let i=0;i<600;i++)q.update(1/60,true);expect(q.level).toBe(0);
 for(let i=0;i<10;i++)q.update(.1,true);q.update(30,false);
 for(let i=0;i<10;i++)q.update(.1,true);expect(q.level).toBe(0);
 q.reset();expect(q.level).toBe(0);
});
it('ignores isolated stalls such as model decoding on an otherwise smooth device',()=>{
 const q=new RenderQuality();
 for(let window=0;window<5;window++){for(let i=0;i<110;i++)q.update(1/60,true);q.update(.4,true);q.update(.3,true);q.update(.25,true);}
 expect(q.level).toBe(0);
});
it('recovers a stall-induced drop after sustained smooth frames, but only a few times',()=>{
 const q=new RenderQuality();
 for(let i=0;i<21;i++)q.update(.1,true);expect(q.level).toBe(1);
 for(let i=0;i<5*60;i++)q.update(1/60,true);expect(q.level).toBe(1);
 for(let i=0;i<5*60;i++)q.update(1/60,true);expect(q.level).toBe(0);
 for(let round=0;round<2;round++){
  for(let i=0;i<31;i++)q.update(.1,true);expect(q.level).toBe(1);
  for(let i=0;i<10*60;i++)q.update(1/60,true);expect(q.level).toBe(0);
 }
 for(let i=0;i<31;i++)q.update(.1,true);expect(q.level).toBe(1);
 for(let i=0;i<20*60;i++)q.update(1/60,true);expect(q.level).toBe(1);
});
