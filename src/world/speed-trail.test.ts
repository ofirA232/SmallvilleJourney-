import {expect,it} from 'vitest';
import {Vector3} from 'three';
import {SpeedTrail} from './speed-trail';
it('keeps a continuous distance-spaced trail at both 10 and 60 fps',()=>{
 for(const fps of [10,60]){const trail=new SpeedTrail();for(let frame=0;frame<=fps;frame++)trail.update(new Vector3(frame/fps*10,20,0),true,false);
 expect(trail.mesh.visible).toBe(true);expect(trail.sampleCount).toBe(32);expect(trail.geometry.drawRange.count).toBe(372);
 const positions=trail.geometry.getAttribute('position');for(let i=1;i<32;i++){const a=new Vector3().fromBufferAttribute(positions,(i-1)*4),b=new Vector3().fromBufferAttribute(positions,i*4);expect(a.distanceTo(b)).toBeLessThan(.14);}
 }
});
it('respects reduced motion, stops cleanly and does not join across teleports',()=>{
 const t=new SpeedTrail();t.update(new Vector3(0,20,0),true,false);t.update(new Vector3(1,20,0),true,false);expect(t.mesh.visible).toBe(true);
 t.update(new Vector3(1,20,0),true,true);expect(t.mesh.visible).toBe(false);expect(t.sampleCount).toBe(0);
 t.update(new Vector3(1,20,0),true,false);t.update(new Vector3(20,0,0),true,false);expect(t.mesh.visible).toBe(false);
 t.update(new Vector3(20,0,0),false,false);expect(t.sampleCount).toBe(0);
});
