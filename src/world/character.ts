import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeColor, box, cylinder, group, plainMaterial } from './primitives';
import type { ActorId } from '../types';

import { palettes } from '../content/appearance';
import { clarkMotion, loadImportedActor, type ImportedClark } from './imported-clark';
const roundGeometry=new THREE.SphereGeometry(1,12,10);
const taperGeometry=new THREE.CylinderGeometry(.83,1,1,8);
const materials=new Map<string,THREE.MeshStandardMaterial>();
function soft(color:string){
  if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.92}));
  return materials.get(color)!;
}
function mesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number){
  const result=new THREE.Mesh(geometry,soft(color));result.position.set(x,y,z);result.scale.set(sx,sy,sz);result.castShadow=true;parent.add(result);return result;
}
const round=(p:THREE.Object3D,c:string,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>mesh(p,roundGeometry,c,x,y,z,sx,sy,sz);
const taper=(p:THREE.Object3D,c:string,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>mesh(p,taperGeometry,c,x,y,z,sx,sy,sz);
// Merge only siblings within a joint; elbow, knee and neck pivots stay articulated.
// Colours are baked into vertices, so a joint costs one draw call per shading variant, not per colour.
function batchJoint(joint:THREE.Group){
  const buckets=new Map<string,{material:THREE.MeshStandardMaterial;meshes:THREE.Mesh[];receive:boolean}>();
  for(const child of joint.children)if(child instanceof THREE.Mesh&&plainMaterial(child.material)){
    const source=child.material,key=`${source.flatShading}|${source.roughness}`;
    const bucket=buckets.get(key)??{material:new THREE.MeshStandardMaterial({vertexColors:true,roughness:source.roughness,flatShading:source.flatShading}),meshes:[],receive:false};
    bucket.meshes.push(child);bucket.receive||=child.receiveShadow;buckets.set(key,bucket);
  }
  for(const bucket of buckets.values()){
    const parts=bucket.meshes.map(value=>{
      value.updateMatrix();const transformed=value.geometry.clone().applyMatrix4(value.matrix);transformed.deleteAttribute('uv');
      const geometry=transformed.index?transformed.toNonIndexed():transformed;if(geometry!==transformed)transformed.dispose();
      return bakeColor(geometry,(value.material as THREE.MeshStandardMaterial).color);
    });
    const geometry=mergeGeometries(parts,false);parts.forEach(part=>part.dispose());if(!geometry)continue;
    bucket.meshes.forEach(value=>joint.remove(value));const combined=new THREE.Mesh(geometry,bucket.material);combined.castShadow=true;combined.receiveShadow=bucket.receive;joint.add(combined);
  }
}
export class Character {
  root=new THREE.Group();torso:THREE.Group;head:THREE.Group;
  arms:THREE.Group[]=[];forearms:THREE.Group[]=[];legs:THREE.Group[]=[];knees:THREE.Group[]=[];
  necklace:THREE.Mesh;time=0;
  imported?:ImportedClark;
  modelStatus:'procedural'|'loading'|'ready'|'fallback'='procedural';
  constructor(public id:ActorId,scale=1){
    this.root.userData.dynamic=true;this.root.scale.setScalar(scale);
    const p=palettes[id],slim=['lana','chloe','martha'].includes(id),width=slim?.177:id==='clark'?.223:.205;
    this.torso=group(this.root,0,.83,0);
    taper(this.torso,p.shirt,0,.065,0,width,.49,.132).rotation.z=Math.PI;
    round(this.torso,p.pants,0,-.205,0,width*.85,.105,.125);
    if(id==='clark'){
      box(this.torso,'#3d7393',0,.065,.132,.17,.43,.013);
      for(const side of [-1,1]){
        box(this.torso,'#8c292c',side*.126,.055,.126,.08,.43,.027);
        box(this.torso,'#c15145',side*.075,.241,.147,.066,.11,.018).rotation.z=side*-.32;
        box(this.torso,'#bc5147',side*.135,.12,.151,.09,.025,.012);
      }
    }else if(id==='lex'){
      box(this.torso,'#51485e',0,.11,.138,.135,.3,.014);
      for(const side of [-1,1])box(this.torso,'#232634',side*.085,.18,.15,.063,.2,.018).rotation.z=side*-.23;
    }else if(id==='jonathan'){
      for(const x of [-.13,0,.13])box(this.torso,'#a7ab8d',x,.08,.136,.017,.43,.01);
      for(const y of [-.08,.04,.17])box(this.torso,'#a7ab8d',0,y,.138,.34,.016,.011);
    }else if(id==='whitney'){
      box(this.torso,'#dfc591',-.1,.18,.14,.078,.09,.018);box(this.torso,'#dfc591',0,-.12,.137,.33,.037,.014);
    }else if(id==='chloe'){
      box(this.torso,'#35493f',-.13,-.03,.14,.033,.45,.018).rotation.z=-.22;
      box(this.torso,'#34433f',-.04,-.19,.19,.16,.11,.08);cylinder(this.torso,'#98aba2',-.04,-.19,.25,.045,.035).rotation.x=Math.PI/2;
    }
    box(this.torso,'#574638',0,-.176,.115,width*1.6,.038,.025);box(this.torso,'#b59a6b',0,-.176,.136,.045,.039,.013);
    this.head=group(this.torso,0,.415,0);cylinder(this.head,p.skin,0,-.13,0,.065,.15);
    round(this.head,p.skin,0,.015,.012,slim?.144:.16,.201,.143);round(this.head,p.skin,0,-.015,.149,.027,.037,.034);
    for(const side of [-1,1]){
      round(this.head,p.skin,side*.151,.013,.006,.027,.045,.024);
      round(this.head,'#eee4d2',side*.063,.054,.137,.029,.016,.008);
      round(this.head,id==='clark'?'#172c49':id==='lana'?'#53756e':'#586554',side*.063,.053,.145,.012,.013,.006);
      round(this.head,'#283532',side*.063,.053,.151,.006,.009,.003);
      box(this.head,p.hair,side*.064,.09,.141,.052,.012,.012).rotation.z=side*-.08;
    }
    round(this.head,'#ac7766',0,-.064,.143,.035,.009,.006);
    if(id!=='lex'){
      round(this.head,p.hair,0,.132,-.029,.163,.114,.15);
      if(id==='lana'||id==='martha'){
        for(const side of [-1,1])round(this.head,p.hair,side*.128,-.07,-.033,.05,.25,.098).rotation.z=side*.06;
        round(this.head,p.hair,0,-.085,-.115,.137,.236,.057);
      }else if(id==='chloe')for(const side of [-1,1])round(this.head,p.hair,side*.133,.004,-.037,.048,.13,.117);
      if(id!=='pete')for(let i=0;i<3;i++)round(this.head,p.hair,-.1+i*.074,.15-i*.012,.088,.077,.063,.07).rotation.z=-.35;
    }
    for(const side of [-1,1]){
      const arm=group(this.torso,side*(width+.028),.24,0),sleeve=id==='whitney'?'#d5b995':p.shirt;
      round(arm,sleeve,0,-.026,0,.072,.089,.077);taper(arm,sleeve,0,-.133,0,.061,.235,.067);
      const elbow=group(arm,0,-.255,0);taper(elbow,sleeve,0,-.095,0,.052,.19,.056);round(elbow,p.skin,0,-.225,.009,.047,.066,.052);
      this.arms.push(arm);this.forearms.push(elbow);
      const leg=group(this.root,side*.096,.635,0);taper(leg,p.pants,0,-.135,0,.087,.3,.105);
      const knee=group(leg,0,-.285,0);taper(knee,p.pants,0,-.135,0,.067,.27,.083);round(knee,'#393b37',0,-.302,.033,.081,.052,.131);
      box(knee,'#80735d',0,-.337,.033,.135,.025,.213);this.legs.push(leg);this.knees.push(knee);
      batchJoint(arm);batchJoint(elbow);batchJoint(leg);batchJoint(knee);
    }
    batchJoint(this.head);batchJoint(this.torso);
    this.necklace=new THREE.Mesh(new THREE.OctahedronGeometry(.044),new THREE.MeshStandardMaterial({color:'#94ce62',emissive:'#6ece42',emissiveIntensity:1.5}));
    this.necklace.position.set(0,.13,.161);this.necklace.visible=false;this.torso.add(this.necklace);
    if((id==='clark'||id==='lana'||id==='lex')&&typeof window!=='undefined'){
      this.modelStatus='loading';
      const proceduralParts=[...this.root.children];
      void loadImportedActor(id).then(actor=>{
        // Swap only after loading succeeds; the original character remains a usable fallback.
        for(const child of proceduralParts)child.visible=false;
        this.imported=actor;this.root.add(actor.root);
        if(actor.pendant){const visible=this.necklace.visible;this.necklace.removeFromParent();this.necklace=actor.pendant;this.necklace.visible=visible;}
        else{this.root.add(this.necklace);this.necklace.position.set(0,1.04,.14);}
        this.modelStatus='ready';
      }).catch(error=>{this.modelStatus='fallback';console.warn(`Using the procedural ${id} because the imported model could not load.`,error);});
    }
  }
  update(dt:number,speed=0,swimming=false,restrained=false,reduced=false,presentation:{strength?:boolean;airborne?:boolean}={}){
    if(this.imported){this.imported.setMotion(clarkMotion(speed,swimming,restrained,presentation.strength,presentation.airborne));this.imported.update(dt);}
    this.time+=dt;const moving=Math.min(1,speed/2.5),phase=this.time*(speed>5?18:8.5);
    this.torso.position.y=.83+(reduced?0:Math.cos(phase*2)*.018*moving+Math.sin(this.time*1.8)*.006);
    this.torso.rotation.x=swimming?-.46:speed>5?.19:0;this.torso.rotation.y=reduced?0:Math.sin(phase)*moving*.035;
    this.head.rotation.y=moving||reduced?0:Math.sin(this.time*.6)*.06;
    this.arms.forEach((arm,index)=>{
      const sign=index===0?-1:1;
      arm.rotation.x=swimming?-1.4+Math.sin(phase*.65+index*Math.PI)*.5:Math.sin(phase+index*Math.PI)*moving*.65;
      arm.rotation.z=restrained?sign*-1.5:sign*-.07;this.forearms[index].rotation.x=restrained?0:speed>5?-.95:-.12-moving*.24;
    });
    this.legs.forEach((leg,index)=>{const swing=Math.sin(phase+index*Math.PI+Math.PI);leg.rotation.x=restrained?0:swing*moving*.63;this.knees[index].rotation.x=restrained?0:Math.max(0,-swing)*moving*.65;});
  }
}
