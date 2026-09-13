import * as THREE from 'three';
import type { Character } from './character';
import { distance, surfaceRadius, UP } from '../core/sphere';

export function exposureAt(normal:THREE.Vector3,sources:THREE.Vector3[]) {
  const nearest=Math.min(...sources.map(source=>distance(normal,source)));
  return nearest<2.5 ? .2+.8*(1-THREE.MathUtils.smoothstep(nearest,.45,2.5)) : 0;
}

export class KryptoniteEffect {
  readonly light=new THREE.PointLight('#8dff35',0,4.5,1.5);
  readonly ground=new THREE.Mesh(new THREE.CircleGeometry(1.25,48),new THREE.MeshBasicMaterial({color:'#89ff43',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  private materials=new WeakMap<THREE.Mesh,THREE.MeshStandardMaterial[]>();
  private halos=new WeakMap<THREE.Mesh,THREE.Sprite>();
  private haloTexture:THREE.CanvasTexture;
  private lastExposure=-1;
  constructor(scene:THREE.Scene){
    this.ground.geometry.rotateX(-Math.PI/2);scene.add(this.light,this.ground);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!;
    const glow=ctx.createRadialGradient(32,32,0,32,32,32);glow.addColorStop(0,'rgba(211,255,140,1)');glow.addColorStop(.22,'rgba(139,255,62,.8)');glow.addColorStop(1,'rgba(139,255,62,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,64,64);this.haloTexture=new THREE.CanvasTexture(canvas);
  }
  update(normal:THREE.Vector3,sources:THREE.Vector3[],actors:Character[],active:boolean) {
    const exposure=active?exposureAt(normal,sources):0;
    this.light.position.copy(normal).multiplyScalar(surfaceRadius(normal)+.8);this.light.intensity=exposure*4;
    this.ground.position.copy(normal).multiplyScalar(surfaceRadius(normal)+.055);this.ground.quaternion.setFromUnitVectors(UP,normal);this.ground.material.opacity=exposure*.17;this.ground.visible=exposure>0;
    for(const actor of actors){
      const mesh=actor.necklace;
      let mats=this.materials.get(mesh);
      if(!mats){mats=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(mat=>(mat as THREE.MeshStandardMaterial).clone());mesh.material=Array.isArray(mesh.material)?mats:mats[0];this.materials.set(mesh,mats);}
      const source=actor.root.position.clone().normalize();
      const amount=active&&actor.root.visible&&mesh.visible&&sources.some(n=>distance(n,source)<.65)?exposureAt(normal,[source]):0;
      for(const mat of mats){mat.emissive.set('#8aff35');mat.emissiveIntensity=amount*3.5;}
      let halo=this.halos.get(mesh);
      if(!halo){
        halo=new THREE.Sprite(new THREE.SpriteMaterial({map:this.haloTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
        const chest=actor.imported?.root.getObjectByName('Chest');
        if(chest){chest.add(halo);halo.position.set(0,.06,.12);}else{mesh.add(halo);halo.position.z=.025;}
        halo.scale.setScalar(.18);this.halos.set(mesh,halo);
      }
      halo.visible=amount>0;halo.material.opacity=amount*.85;
    }
    if(Math.abs(exposure-this.lastExposure)>.002){
      document.documentElement.style.setProperty('--kryptonite-exposure',String(exposure*.25));this.lastExposure=exposure;
    }
    return exposure;
  }
}
