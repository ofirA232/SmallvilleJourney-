import * as THREE from 'three';
import { at, basis, surfaceRadius } from './core/sphere';
import type { CharacterController } from './core/sphere';
import { Cutscene, type StoryScene } from './cutscene';
import { CutsceneTimeline } from './core/cutscene';
import { bridgeFall } from './content/pilot-cutscenes';

/** The crash on Loeb Bridge, played as a cutscene. Saving still points to the explicit
 * bridge interaction until the splash completes, so an interrupted scene can safely be replayed. */
export class BridgeScene implements StoryScene {
  private original:{position:THREE.Vector3;quaternion:THREE.Quaternion;rotation?:THREE.Euler;visible:boolean};
  readonly id='bridge-fall';
  readonly cutscene:Cutscene;
  private impact:number;
  private splash:number;
  constructor(private player:CharacterController,private car:THREE.Group,reducedMotion:()=>boolean,cue:(id:string)=>void,private done:()=>void){
    this.original={position:car.position.clone(),quaternion:car.quaternion.clone(),rotation:car.children[0]?.rotation.clone(),visible:car.visible};
    const timeline=new CutsceneTimeline(bridgeFall);this.impact=timeline.cue('impact');this.splash=timeline.cue('splash');
    player.reset(at('bridge'));player.locked=true;
    this.cutscene=new Cutscene(bridgeFall,{update:time=>this.choreograph(time),cue,done:()=>this.complete()},reducedMotion);
  }
  get elapsed(){return this.cutscene.elapsed;}
  update(dt:number){this.cutscene.update(dt);}
  camera(camera:THREE.PerspectiveCamera){this.cutscene.camera(camera);}
  private fall(time:number){return THREE.MathUtils.clamp((time-this.impact)/(this.splash-this.impact),0,1);}
  private choreograph(time:number){
    const fall=this.fall(time);
    // The car appears at the west end of the deck and accelerates to reach Clark at the impact cue.
    const approach=THREE.MathUtils.clamp((time-(this.impact-1.1))/1.1,0,1);
    const x=time<this.impact?THREE.MathUtils.lerp(-5,0,approach**1.6):.2*fall;
    this.car.visible=time>=this.impact-1.1;
    const normal=at('bridge',[x,-1.7*fall]),{east,north}=basis(normal);
    this.car.position.copy(normal).multiplyScalar(surfaceRadius(normal)+(fall>0?-.25*fall:.1));
    this.car.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east,normal,north.negate()));
    this.car.children[0]?.rotation.set(fall*.3,-Math.PI/2,fall*.45);
    this.player.normal.copy(at('bridge',[.45*fall,-1.7*fall]));this.player.height=Math.sin(fall*Math.PI)*.65;this.player.swimming=fall>.85;
    this.player.forward.copy(basis(this.player.normal).north);
  }
  private complete(){this.restoreCar();this.player.reset(at('bridge',[.45,-1.7]));this.player.locked=false;this.done();}
  finish(){this.cutscene.finish();}
  pose(root:THREE.Object3D){const fall=this.fall(this.elapsed);root.rotateX(-fall*.75);root.rotateZ(fall*.45);}
  dispose(){this.cutscene.dispose();this.restoreCar();}
  private restoreCar(){this.car.position.copy(this.original.position);this.car.quaternion.copy(this.original.quaternion);this.car.visible=this.original.visible;if(this.original.rotation)this.car.children[0]?.rotation.copy(this.original.rotation);}
}
