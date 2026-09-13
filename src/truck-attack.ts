import type {Character} from './world/character';
import * as THREE from 'three';
import {at,basis,surfaceRadius,type CharacterController} from './core/sphere';

/** Explicit reaction, with active-time updates supplied by the game loop. */
export class TruckAttack {
  elapsed=0;
  phase:'approach'|'stopped'|'failed'='approach';
  private stopAt=0;
  private original;
  private cab=new THREE.Group();
  private hiddenCab:THREE.Object3D[]=[];
  private jeremyVisible:boolean;
  private cabGeometry=new THREE.BoxGeometry(1,1,1);
  private cabMaterial=new THREE.MeshStandardMaterial({color:0x8b9c8d});
  readonly panel=document.createElement('section');
  constructor(private player:CharacterController,private truck:THREE.Group,private jeremy:Character,private active:()=>boolean,private done:()=>void){
    this.original={position:truck.position.clone(),quaternion:truck.quaternion.clone(),rotation:truck.children[0]?.rotation.clone(),visible:truck.visible};
    this.jeremyVisible=jeremy.root.visible;jeremy.root.visible=false;
    const body=truck.children[0];
    this.hiddenCab=body.children.filter(child=>Math.abs(child.position.y-.61)<.001||Math.abs(child.position.y-.65)<.001);
    this.hiddenCab.forEach(child=>child.visible=false);body.add(this.cab);
    const part=(x:number,y:number,z:number,w:number,h:number,d:number)=>{const mesh=new THREE.Mesh(this.cabGeometry,this.cabMaterial);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);this.cab.add(mesh);};
    part(0,.8,-.28,.81,.045,.64);
    for(const x of [-.38,.38])for(const z of [-.58,.02])part(x,.65,z,.025,.3,.025);
    const torso=jeremy.torso.clone(true);torso.children[jeremy.torso.children.indexOf(jeremy.head)]?.removeFromParent();torso.position.set(-.17,.47,-.3);torso.scale.setScalar(.55);torso.rotation.set(0,Math.PI,0);this.cab.add(torso);
    const head=jeremy.head.clone(true);head.position.set(-.17,.64,-.3);head.scale.setScalar(.55);head.rotation.set(0,Math.PI,0);this.cab.add(head);
    this.panel.id='truck-attack';this.panel.innerHTML='<p class="truck-eyebrow">JEREMY IS COMING STRAIGHT AT YOU</p><h2 id="truck-message">Stand your ground.</h2><progress id="truck-time" max="3.5" value="3.5" aria-label="Time left to stop the truck"></progress><button id="truck-stop" type="button">E - Stop the truck</button><button id="truck-retry" type="button" hidden>Try again</button>';
    document.body.appendChild(this.panel);
    this.panel.querySelector('#truck-stop')!.addEventListener('click',()=>this.stop());
    this.panel.querySelector('#truck-retry')!.addEventListener('click',()=>{if(this.active())this.restart();});
    window.addEventListener('keydown',this.key,true);this.restart();
  }
  private key=(event:KeyboardEvent)=>{
    if(event.code!=='KeyE')return;
    event.preventDefault();event.stopImmediatePropagation();
    if(!event.repeat)this.stop();
  };
  private restart(){
    this.elapsed=0;this.phase='approach';this.player.reset(at('school',[-4.5,3.3]));this.player.locked=true;
    this.player.forward.copy(basis(this.player.normal).north);
    this.panel.querySelector<HTMLButtonElement>('#truck-stop')!.hidden=false;
    this.panel.querySelector<HTMLButtonElement>('#truck-retry')!.hidden=true;
    this.panel.querySelector('#truck-message')!.textContent='Stand your ground.';this.update(0);
  }
  private stop(){
    if(!this.active()||this.phase!=='approach'||this.elapsed>=3.5)return;
    this.stopAt=this.elapsed;this.elapsed=0;this.phase='stopped';
    this.panel.querySelector('#truck-message')!.textContent='You caught it. Hold the line.';
    this.panel.querySelector<HTMLButtonElement>('#truck-stop')!.hidden=true;
  }
  update(dt:number){
    this.elapsed+=dt;
    if(this.phase==='approach'&&this.elapsed>=3.5){
      this.phase='failed';this.panel.querySelector('#truck-message')!.textContent='Too late. Brace yourself and try again.';
      this.panel.querySelector<HTMLButtonElement>('#truck-stop')!.hidden=true;
      this.panel.querySelector<HTMLButtonElement>('#truck-retry')!.hidden=false;
    }
    const start=-4.4,end=1.85;
    const t=this.phase==='stopped'?THREE.MathUtils.lerp(this.stopAt/3.5,1,1-Math.pow(1-Math.min(1,this.elapsed/.65),3)):Math.min(1,this.elapsed/3.5);
    const n=at('school',[-4.5,THREE.MathUtils.lerp(start,end,t)]),{east,north}=basis(n);
    this.truck.visible=true;this.truck.position.copy(n).multiplyScalar(surfaceRadius(n)+.04);
    this.truck.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east,n,north.negate()));
    this.truck.children[0]?.rotation.set(this.phase==='stopped'?-.06*Math.sin(Math.min(1,this.elapsed/.65)*Math.PI):0,Math.PI,0);
    this.panel.dataset.phase=this.phase;
    this.panel.querySelector<HTMLProgressElement>('progress')!.value=this.phase==='approach'?Math.max(0,3.5-this.elapsed):0;
    if(this.phase==='stopped'&&this.elapsed>=1.25){this.dispose();this.done();}
  }
  camera(camera:THREE.PerspectiveCamera){
    const n=this.player.normal;
    camera.clearViewOffset();camera.fov=58;camera.updateProjectionMatrix();
    camera.position.copy(n).multiplyScalar(surfaceRadius(n)+1.35);
    camera.up.copy(n);camera.lookAt(this.truck.position.clone().addScaledVector(n,.65));camera.updateMatrixWorld();
  }
  dispose(){
    this.jeremy.root.visible=this.jeremyVisible;this.hiddenCab.forEach(child=>child.visible=true);this.cab.removeFromParent();this.cabGeometry.dispose();this.cabMaterial.dispose();
    window.removeEventListener('keydown',this.key,true);this.panel.remove();this.player.locked=false;
    this.truck.position.copy(this.original.position);this.truck.quaternion.copy(this.original.quaternion);this.truck.visible=this.original.visible;
    if(this.original.rotation)this.truck.children[0]?.rotation.copy(this.original.rotation);
  }
}
