import * as THREE from 'three';
import { at, basis, type CharacterController } from './core/sphere';
import { CutsceneTimeline } from './core/cutscene';
import { Cutscene, type StoryScene } from './cutscene';
import { roofTear } from './content/pilot-cutscenes';
import type { World } from './world/world';
import type { NpcId } from './types';

/** Clark tears the roof off Lex's Porsche and lifts him out. The objective completes
 * when the scene ends, so an interrupted scene replays from the strength encounter. */
export class RoofTearScene implements StoryScene {
  readonly id='roof-tear';
  readonly cutscene:Cutscene;
  readonly strength=true;
  /** Clark holds Lex from the moment he lifts him out, at full size. */
  carry:NpcId|null=null;
  private tear:number;
  private land:number;
  private lift:number;
  private flight:{from:{position:THREE.Vector3;quaternion:THREE.Quaternion;scale:THREE.Vector3}}|null=null;
  constructor(private player:CharacterController,private world:World,reducedMotion:()=>boolean,cue:(id:string)=>void,private done:()=>void){
    const timeline=new CutsceneTimeline(roofTear);this.tear=timeline.cue('tear');this.land=timeline.cue('land');this.lift=timeline.cue('lift');
    // Clark stands in the water on the passenger (east) side and throws the roof over the car.
    const normal=at('bridge',[.78,-1.75]);player.reset(normal);player.forward.copy(basis(normal).east).negate();player.locked=true;
    this.cutscene=new Cutscene(roofTear,{update:time=>this.choreograph(time),cue,done:()=>this.complete()},reducedMotion);
  }
  get elapsed(){return this.cutscene.elapsed;}
  update(dt:number){this.cutscene.update(dt);}
  camera(camera:THREE.PerspectiveCamera){this.cutscene.camera(camera);}
  private choreograph(time:number){
    const {roof,driver}=this.world.porsche,torn=this.world.tornRoof;
    if(time<this.tear){
      // The front of the roof peels up from the windscreen as Clark pulls.
      const pull=THREE.MathUtils.smoothstep(time,0,this.tear);
      roof.visible=true;roof.rotation.x=.12+pull*.5+Math.sin(time*31)*.02*pull;torn.anchor.visible=false;this.flight=null;
    }else{
      roof.visible=false;torn.anchor.visible=true;
      this.flight??={from:this.roofPose()};
      const t=THREE.MathUtils.clamp((time-this.tear)/(this.land-this.tear),0,1),{from}=this.flight,rest=torn.rest;
      torn.pose.position.lerpVectors(from.position,rest.position,t).y+=Math.sin(Math.PI*t)*1.4;
      // One full tumble on the way, ending exactly in the resting pose.
      torn.pose.quaternion.slerpQuaternions(from.quaternion,rest.quaternion,t).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,.3).normalize(),Math.PI*2*t));
      torn.pose.scale.lerpVectors(from.scale,rest.scale,t);
    }
    const out=time>=this.lift;driver.visible=!out;this.carry=out?'lex':null;
  }
  /** The attached roof's current transform, expressed in the torn roof's anchor space. */
  private roofPose(){
    const {roof}=this.world.porsche,anchor=this.world.tornRoof.anchor;
    roof.updateWorldMatrix(true,false);anchor.updateWorldMatrix(true,false);
    const local=anchor.matrixWorld.clone().invert().multiply(roof.matrixWorld),pose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:new THREE.Vector3()};
    local.decompose(pose.position,pose.quaternion,pose.scale);return pose;
  }
  private complete(){this.player.locked=false;this.done();}
  finish(){this.cutscene.finish();}
  dispose(){
    this.cutscene.dispose();
    const {roof,driver}=this.world.porsche;roof.visible=driver.visible=true;roof.rotation.x=0;driver.position.set(-.18,0,.2);this.world.tornRoof.anchor.visible=false;
  }
}
