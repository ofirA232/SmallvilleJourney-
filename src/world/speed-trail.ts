import * as THREE from 'three';

/** Two short ribbons: one draw call, fixed buffers, distance-spaced samples. */
export class SpeedTrail {
  readonly geometry=new THREE.BufferGeometry();
  readonly mesh:THREE.Mesh;
  private samples=Array.from({length:32},()=>new THREE.Vector3());
  private count=0;
  private next=new THREE.Vector3();
  private up=new THREE.Vector3();
  constructor(){
    const positions=new Float32Array(32*4*3),colors=new Float32Array(32*4*4),indices:number[]=[];
    const palette=[new THREE.Color('#ed5946'),new THREE.Color('#80d4ff')];
    for(let i=0;i<32;i++)for(let band=0;band<2;band++){
      for(let edge=0;edge<2;edge++){const offset=(i*4+band*2+edge)*4;colors[offset]=palette[band].r;colors[offset+1]=palette[band].g;colors[offset+2]=palette[band].b;colors[offset+3]=.78*Math.pow(1-i/31,1.4);}
      if(i<31){const a=i*4+band*2;indices.push(a,a+1,a+4,a+1,a+5,a+4);}
    }
    this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color',new THREE.BufferAttribute(colors,4));this.geometry.setIndex(indices);this.geometry.setDrawRange(0,0);
    this.mesh=new THREE.Mesh(this.geometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
    this.mesh.frustumCulled=false;this.mesh.visible=false;
  }
  get sampleCount(){return this.count;}
  update(position:THREE.Vector3,enabled:boolean,reducedMotion:boolean){
    if(!enabled||reducedMotion){this.clear();return;}
    if(this.count===0||position.distanceTo(this.samples[0])>6){this.count=1;this.samples[0].copy(position);this.mesh.visible=false;this.geometry.setDrawRange(0,0);return;}
    let remaining=position.distanceTo(this.samples[0]);
    while(remaining>=.12){
      this.next.copy(this.samples[0]).lerp(position,.12/remaining);
      this.count=Math.min(32,this.count+1);
      for(let i=this.count-1;i>0;i--)this.samples[i].copy(this.samples[i-1]);
      this.samples[0].copy(this.next);remaining=position.distanceTo(this.samples[0]);
    }
    const attribute=this.geometry.getAttribute('position');
    for(let i=0;i<this.count;i++){
      const p=this.samples[i];this.up.copy(p).normalize();
      for(let band=0;band<2;band++)for(let edge=0;edge<2;edge++){
        const height=.48+band*.23+(edge?1:-1)*.075;
        attribute.setXYZ(i*4+band*2+edge,p.x+this.up.x*height,p.y+this.up.y*height,p.z+this.up.z*height);
      }
    }
    attribute.needsUpdate=true;this.geometry.setDrawRange(0,Math.max(0,this.count-1)*12);this.mesh.visible=this.count>1;
  }
  clear(){this.count=0;this.mesh.visible=false;this.geometry.setDrawRange(0,0);}
}
