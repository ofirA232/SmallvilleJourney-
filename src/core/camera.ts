import * as THREE from 'three';
import { basis, PLANET_RADIUS, surfaceRadius, tangent, UP } from './sphere';
import type { CharacterController } from './sphere';

export class CameraRig {
  camera = new THREE.PerspectiveCamera(42, 1, 0.12, 220);
  view: 'globe' | 'follow' = 'globe';
  theta = -0.33;
  phi = 1.06;
  globeZoom = 1;
  followDistance = 10.8;
  pitch = 0.88;
  back = new THREE.Vector3(0,-1,0);
  target = new THREE.Vector3();
  previousNormal: THREE.Vector3;
  width = 1440;
  height = 900;
  private first = true;
  constructor(private player: CharacterController){this.previousNormal=player.normal.clone();this.back.copy(basis(player.normal).north).negate();}
  resize(width:number,height:number){this.width=width;this.height=height;this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
  toggle(){this.setView(this.view==='globe'?'follow':'globe');}
  setView(view:'globe'|'follow'){
    if(view===this.view)return;
    this.view=view;
    if(view==='globe'){this.theta=Math.atan2(this.player.normal.x,this.player.normal.z);this.phi=Math.acos(THREE.MathUtils.clamp(this.player.normal.y,-.94,.94));}
  }
  snap(){this.first=true;this.previousNormal.copy(this.player.normal);this.back.copy(basis(this.player.normal).north).negate();}
  drag(dx:number,dy:number){if(this.view==='globe'){this.theta-=dx*.0055;this.phi=THREE.MathUtils.clamp(this.phi-dy*.0045,.12,Math.PI-.12);}else{this.back.applyAxisAngle(this.player.normal,-dx*.007);this.pitch=THREE.MathUtils.clamp(this.pitch+dy*.004,.43,1.35);}}
  zoom(factor:number){if(this.view==='globe')this.globeZoom=THREE.MathUtils.clamp(this.globeZoom*factor,.77,1.6);else this.followDistance=THREE.MathUtils.clamp(this.followDistance*factor,7.2,20);}
  update(dt:number,landing:boolean,reduced:boolean,occluders:THREE.Object3D[]){
    const fov=this.view==='follow'&&this.player.superSpeed&&!reduced?46:42;
    this.camera.fov=THREE.MathUtils.damp(this.camera.fov,fov,4,dt);this.camera.updateProjectionMatrix();
    const normal=this.player.normal;
    this.back.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(this.previousNormal,normal));this.back.copy(tangent(this.back,normal));this.previousNormal.copy(normal);
    let position:THREE.Vector3,target:THREE.Vector3,up:THREE.Vector3;
    if(this.view==='globe'){
      const fov=Math.atan(Math.tan(21*Math.PI/180)*Math.min(1,this.width/this.height));
      const radius=(PLANET_RADIUS+3.3)/Math.sin(fov)*1.07*this.globeZoom;
      position=new THREE.Vector3().setFromSphericalCoords(radius,this.phi,this.theta);target=new THREE.Vector3();up=UP;
    }else{
      const radius=surfaceRadius(normal);const d=this.followDistance*(this.width/this.height<.65?1.2:1);
      target=normal.clone().multiplyScalar(radius+.85);
      position=normal.clone().multiplyScalar(radius+Math.sin(this.pitch)*d).addScaledVector(this.back,Math.cos(this.pitch)*d);
      up=normal;
      const direction=position.clone().sub(target);const length=direction.length();direction.normalize();
      const ray=new THREE.Raycaster(target,direction,1.0,length);
      const hit=ray.intersectObjects(occluders,false)[0];
      if(hit&&hit.distance<length-.5)position=target.clone().addScaledVector(direction,Math.max(3.5,hit.distance-.45));
    }
    if(landing){
      if(this.width>600)this.camera.setViewOffset(this.width,this.height,-this.width*.175,0,this.width,this.height);
      else this.camera.setViewOffset(this.width,this.height,0,this.height*.235,this.width,this.height);
    }else this.camera.clearViewOffset();
    const amount=this.first||reduced?1:1-Math.exp(-dt*5.5);
    this.camera.position.lerp(position,amount);this.target.lerp(target,amount);this.camera.up.lerp(up,amount).normalize();this.camera.lookAt(this.target);this.camera.updateMatrixWorld();this.first=false;
  }
}
