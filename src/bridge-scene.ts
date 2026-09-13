import * as THREE from 'three';
import { at, basis, surfaceRadius } from './core/sphere';
import type { CharacterController } from './core/sphere';

/** A short, pauseable scene. Saving still points to the explicit bridge interaction
 * until the splash completes, so an interrupted scene can safely be replayed. */
export class BridgeScene {
  private original:{position:THREE.Vector3;quaternion:THREE.Quaternion;rotation?:THREE.Euler;visible:boolean};
  elapsed=0;
  readonly panel=document.createElement('div');
  constructor(private player:CharacterController,private car:THREE.Group,private done:()=>void){
    this.original={position:car.position.clone(),quaternion:car.quaternion.clone(),rotation:car.children[0]?.rotation.clone(),visible:car.visible};
    this.panel.id='bridge-scene';this.panel.setAttribute('role','status');
    this.panel.innerHTML='<p id="bridge-caption">A moment of quiet. Then the sound of tires.</p><button id="skip-bridge" type="button">Skip scene</button>';
    document.body.appendChild(this.panel);this.panel.querySelector('button')!.addEventListener('click',()=>this.finish());
    player.reset(at('bridge'));player.locked=true;car.visible=true;this.update(0);
  }
  update(dt:number){
    this.elapsed+=dt;
    const impact=1.8,fall=THREE.MathUtils.clamp((this.elapsed-impact)/1.5,0,1);
    const x=this.elapsed<impact?THREE.MathUtils.lerp(-3.6,0,this.elapsed/impact):.2*fall;
    const normal=at('bridge',[x,-1.7*fall]),{east,north}=basis(normal);
    this.car.position.copy(normal).multiplyScalar(surfaceRadius(normal)+(fall>0?-.25*fall:.1));
    this.car.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east,normal,north.negate()));
    this.car.children[0]?.rotation.set(fall*.3,-Math.PI/2,fall*.45);
    this.player.normal.copy(at('bridge',[.45*fall,-1.7*fall]));this.player.height=Math.sin(fall*Math.PI)*.65;this.player.swimming=fall>.85;
    this.player.forward.copy(basis(this.player.normal).north);
    this.panel.querySelector('p')!.textContent=this.elapsed<impact?'A moment of quiet. Then the sound of tires.':fall<1?'The impact throws Clark and the car over the edge.':'Under the surface, someone is still trapped.';
    if(this.elapsed>=4.4)this.finish();
  }
  finish(){if(!this.panel.isConnected)return;this.dispose();this.player.reset(at('bridge',[.45,-1.7]));this.player.locked=false;this.done();}
  pose(root:THREE.Object3D){const fall=THREE.MathUtils.clamp((this.elapsed-1.8)/1.5,0,1);root.rotateX(-fall*.75);root.rotateZ(fall*.45);}
  dispose(){this.panel.remove();this.car.position.copy(this.original.position);this.car.quaternion.copy(this.original.quaternion);this.car.visible=this.original.visible;if(this.original.rotation)this.car.children[0]?.rotation.copy(this.original.rotation);}
}
