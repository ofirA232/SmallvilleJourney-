import * as THREE from 'three';
import { at, tangent, type CharacterController } from './core/sphere';
import { CutsceneTimeline } from './core/cutscene';
import { Cutscene, type StoryScene } from './cutscene';
import { promAsk } from './content/pilot-cutscenes';
import type { World } from './world/world';

const LANA: [number, number] = [.4, 1.5], CLARK: [number, number] = [.4, 2.15];

/** At the cemetery Clark finally asks Lana to the spring formal. She is going with Whitney, he
 * backs off, and she promises him the last dance with a kiss on the cheek. The objective completes
 * when the scene ends, so an interrupted scene replays from the conversation. */
export class PromScene implements StoryScene {
  readonly id = 'prom-ask';
  readonly actor = 'lana' as const;
  readonly cutscene: Cutscene;
  private kiss: number;
  constructor(private player: CharacterController, private world: World, private reducedMotion: () => boolean, cue: (id: string) => void, done: () => void) {
    this.kiss = new CutsceneTimeline(promAsk).cue('kiss');
    const clark = at('cemetery', CLARK); player.reset(clark); player.forward.copy(tangent(at('cemetery', LANA).sub(clark), clark)); player.locked = true;
    this.cutscene = new Cutscene(promAsk, { update: time => this.choreograph(time), cue, done: () => { player.locked = false; done(); } }, reducedMotion);
  }
  get elapsed() { return this.cutscene.elapsed; }
  update(dt: number) {
    this.cutscene.update(dt);
    const lana = this.world.characters.get('lana')!; if (lana.root.visible) lana.update(dt, 0, false, false, this.reducedMotion());
  }
  camera(camera: THREE.PerspectiveCamera) { this.cutscene.camera(camera); }
  /** Lana faces Clark; for the kiss she steps in, rises a little and leans towards his cheek. */
  private choreograph(time: number) {
    const lean = Math.max(0, Math.min(1, (time - this.kiss) / .8, (this.kiss + 2.2 - time) / .8));
    const soft = THREE.MathUtils.smoothstep(lean, 0, 1);
    const home = at('cemetery', LANA), clark = this.player.normal, toward = tangent(clark.clone().sub(home), home);
    this.world.placeActor('lana', 'cemetery', LANA);
    const lana = this.world.characters.get('lana')!, normal = home.clone().addScaledVector(toward, soft * .36 / 19).normalize();
    const radius = lana.root.position.length(); lana.root.position.copy(normal).multiplyScalar(radius + soft * .04);
    const right = new THREE.Vector3().crossVectors(normal, toward).normalize();
    lana.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, normal, tangent(toward, normal)));
    lana.root.rotateX(soft * .14); lana.root.rotateY(soft * .3);
  }
  finish() { this.cutscene.finish(); }
  dispose() { this.cutscene.dispose(); this.player.locked = false; }
}
