import * as THREE from 'three';
import { CutsceneTimeline } from './core/cutscene';
import { Cutscene, type StoryScene } from './cutscene';
import { scarecrowNight } from './content/pilot-cutscenes';
import type { World } from './world/world';

/** Night falls on Riley Field with Clark tied to the scarecrow post, then Jeremy steps out of
 * the corn. It plays after the `whitney` objective completes, so it is purely presentation:
 * an interrupted scene simply leaves Jeremy where the story places him. */
export class ScarecrowScene implements StoryScene {
  readonly id='scarecrow-night';
  readonly cutscene:Cutscene;
  readonly actor='jeremy' as const;
  private reveal:number;
  private duration:number;
  constructor(private world:World,private reducedMotion:()=>boolean,cue:(id:string)=>void,done:()=>void){
    const timeline=new CutsceneTimeline(scarecrowNight);this.reveal=timeline.cue('rustle');this.duration=timeline.duration;
    this.cutscene=new Cutscene(scarecrowNight,{update:time=>this.choreograph(time),cue,done:()=>{this.placeJeremy(1);done();}},reducedMotion);
  }
  get elapsed(){return this.cutscene.elapsed;}
  update(dt:number){
    this.cutscene.update(dt);
    const jeremy=this.world.characters.get('jeremy')!,walking=this.cutscene.elapsed>=this.reveal&&this.cutscene.elapsed<this.duration-.4;
    if(jeremy.root.visible)jeremy.update(dt,walking?1.2:0,false,false,this.reducedMotion());
  }
  camera(camera:THREE.PerspectiveCamera){this.cutscene.camera(camera);}
  private choreograph(time:number){
    // Jeremy stays hidden in the corn, then walks out towards the post.
    this.placeJeremy(time<this.reveal?-1:THREE.MathUtils.smoothstep(time,this.reveal,this.duration-.4));
  }
  /** -1 hides Jeremy; 0..1 walks him from the corn to where the story places him. */
  private placeJeremy(walk:number){
    const jeremy=this.world.characters.get('jeremy')!;
    if(walk<0){jeremy.root.visible=false;return;}
    this.world.placeActor('jeremy','cornfield',[0,THREE.MathUtils.lerp(3,1.8,walk)]);jeremy.root.rotateY(Math.PI);
  }
  finish(){this.cutscene.finish();}
  dispose(){this.cutscene.dispose();this.placeJeremy(1);}
}
