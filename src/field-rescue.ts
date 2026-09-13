import * as THREE from 'three';
import {at,basis,surfaceRadius} from './core/sphere';
import type {Character} from './world/character';

export class FieldRescue {
  elapsed=0;
  readonly panel=document.createElement('div');
  private original:{position:THREE.Vector3;quaternion:THREE.Quaternion;visible:boolean};
  constructor(private lex:Character,private arrived:()=>void){
    this.original={position:lex.root.position.clone(),quaternion:lex.root.quaternion.clone(),visible:lex.root.visible};
    this.panel.id='field-rescue';this.panel.setAttribute('role','status');this.panel.textContent='Clark: “Help! Someone, please!”';document.body.appendChild(this.panel);lex.root.visible=false;
  }
  update(dt:number){
    this.elapsed+=dt;
    if(this.elapsed<3)return;
    const t=THREE.MathUtils.clamp((this.elapsed-3)/3.5,0,1),n=at('cornfield',[.65,THREE.MathUtils.lerp(4.7,1.6,t)]);
    this.lex.root.visible=true;this.lex.root.position.copy(n).multiplyScalar(surfaceRadius(n)+.03);
    const {east,north}=basis(n);this.lex.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east.negate(),n,north));
    this.lex.update(Math.min(dt,.05),t<1?1:0);this.panel.textContent='Footsteps in the corn. Lex is coming toward you.';
    if(t===1){this.panel.remove();this.arrived();}
  }
  dispose(){this.panel.remove();this.lex.root.position.copy(this.original.position);this.lex.root.quaternion.copy(this.original.quaternion);this.lex.root.visible=this.original.visible;}
}
