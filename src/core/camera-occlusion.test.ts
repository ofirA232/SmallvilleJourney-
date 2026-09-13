import {expect,it} from 'vitest';
import {Mesh,Raycaster,Vector3} from 'three';
import {World} from '../world/world';
import {at,basis,surfaceRadius} from './sphere';
import {locations} from '../content/locations';
import {accelerateOccluders} from './camera-occlusion';
it('accelerated scenery queries preserve nearest camera hits',()=>{
 const world=new World();world.root.updateMatrixWorld(true);
 const meshes=world.scenery.children.filter(o=>o instanceof Mesh);
 const rays:Raycaster[]=[];
 for(const location of locations){const n=at(location.id),b=basis(n),target=n.clone().multiplyScalar(surfaceRadius(n)+.85);
 for(let i=0;i<16;i++){const dir=new Vector3().copy(b.north).applyAxisAngle(n,i*Math.PI/8).addScaledVector(n,.6).normalize();rays.push(new Raycaster(target,dir,1,14));}}
 const before=performance.now();const expected=rays.map(r=>r.intersectObjects(meshes,false)[0]?.distance??null);const originalMs=performance.now()-before;
 accelerateOccluders(meshes);
 const after=performance.now();const actual=rays.map(r=>{r.firstHitOnly=true;return r.intersectObjects(meshes,false)[0]?.distance??null;});const acceleratedMs=performance.now()-after;
 actual.forEach((hit,i)=>{if(expected[i]===null)expect(hit).toBeNull();else expect(hit).toBeCloseTo(expected[i]!,5);});
 console.log(JSON.stringify({rays:rays.length,originalMs,acceleratedMs}));
});
