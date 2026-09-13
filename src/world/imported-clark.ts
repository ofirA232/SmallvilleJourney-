import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { blueClarkEyes } from './clark-eyes';

export type ClarkMotion = 'Idle' | 'Walk' | 'Run' | 'Jump' | 'Swim' | 'Strength' | 'Restrained';
export function clarkMotion(speed: number, swimming: boolean, restrained: boolean, strength = false, airborne = false): ClarkMotion {
  return restrained ? 'Restrained' : strength ? 'Strength' : swimming ? 'Swim' : airborne ? 'Jump' : speed > 5 ? 'Run' : speed > .1 ? 'Walk' : 'Idle';
}
const loader = new GLTFLoader();
const assets = new Map<string, ReturnType<GLTFLoader['loadAsync']>>();
export class ImportedClark {
  readonly root: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current?: THREE.AnimationAction;
  motion: ClarkMotion = 'Idle';
  pendant?:THREE.Mesh;
  private pendantBacking?:THREE.Mesh;
  constructor(source: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.root = clone(source);
    this.root.traverse(object => {
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
      // Bind-pose bounds do not cover every moving limb.
      if (object instanceof THREE.SkinnedMesh) object.frustumCulled = false;
    });
    this.mixer = new THREE.AnimationMixer(this.root);
    const pendant=this.root.getObjectByName('LanaPendant');
    if(pendant instanceof THREE.Mesh){
      this.pendant=pendant;
      this.pendantBacking=new THREE.Mesh(new THREE.PlaneGeometry(.034,.032),new THREE.MeshStandardMaterial({color:'#c59c87',roughness:.9}));
      this.pendantBacking.position.set(0,.06,.103);
      this.root.getObjectByName('Chest')?.add(this.pendantBacking);
      this.pendantBacking.visible=false;
    }
    for (const clip of clips) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.setMotion('Idle', true);
  }
  setMotion(motion: ClarkMotion, immediate = false) {
    const next = this.actions.get(motion);
    if (!next || (next === this.current && !immediate)) return;
    if (immediate) this.mixer.stopAllAction(); else this.current?.fadeOut(.18);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (!immediate) next.fadeIn(.18);
    this.current = next; this.motion = motion; this.mixer.update(0);
  }
  update(dt: number) { if(this.pendantBacking)this.pendantBacking.visible=!this.pendant?.visible;this.mixer.update(Math.max(0, Math.min(dt, .05))); }
}
export async function loadImportedClark() {
  return loadImportedActor('clark');
}
export async function loadImportedActor(id:'clark'|'lana'|'lex') {
  if (!assets.has(id)) assets.set(id, loader.loadAsync(`/models/${id}/${id}-rigged.glb`).catch(error => { assets.delete(id); throw error; }));
  const model = await assets.get(id)!;
  if (!model.animations.length) throw new Error(`The ${id} model has no animation clips.`);
  const actor=new ImportedClark(model.scene, model.animations);
  if(id==='clark')blueClarkEyes(actor.root);
  return actor;
}
