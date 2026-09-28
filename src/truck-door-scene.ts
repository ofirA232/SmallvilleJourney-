import * as THREE from 'three';
import { at, basis, tangent, type CharacterController } from './core/sphere';
import { CutsceneTimeline } from './core/cutscene';
import { Cutscene, type StoryScene } from './cutscene';
import { truckDoor } from './content/pilot-cutscenes';
import type { World } from './world/world';

/** Clark tears the jammed door off Jeremy's truck and pulls him out. The objective's conversation
 * follows the scene, so an interrupted scene replays from the interaction. */
export class TruckDoorScene implements StoryScene {
  readonly id = 'truck-door';
  readonly cutscene: Cutscene;
  readonly strength = true;
  readonly actor = 'jeremy' as const;
  private tear: number;
  private land: number;
  private lift: number;
  private flight: { position: THREE.Vector3; quaternion: THREE.Quaternion } | null = null;
  private freed = false;
  constructor(private player: CharacterController, private world: World, reducedMotion: () => boolean, cue: (id: string) => void, private done: () => void) {
    const timeline = new CutsceneTimeline(truckDoor); this.tear = timeline.cue('tear'); this.land = timeline.cue('land'); this.lift = timeline.cue('lift');
    const normal = at('school', [-3.72, 1.72]); player.reset(normal); player.forward.copy(basis(normal).east).negate(); player.locked = true;
    this.cutscene = new Cutscene(truckDoor, { update: time => this.choreograph(time), cue, done: () => this.complete() }, reducedMotion);
  }
  get elapsed() { return this.cutscene.elapsed; }
  update(dt: number) {
    this.cutscene.update(dt);
    const jeremy = this.world.characters.get('jeremy')!;
    if (jeremy.root.visible) jeremy.update(dt, 0, false, false, false);
  }
  camera(camera: THREE.PerspectiveCamera) { this.cutscene.camera(camera); }
  private choreograph(time: number) {
    const cab = this.world.truckCab, torn = this.world.tornDoor;
    if (time < this.tear) {
      // The door bends outwards on its hinge as Clark pulls.
      const pull = THREE.MathUtils.smoothstep(time, 0, this.tear);
      cab.door.visible = true; cab.door.rotation.set(0, -pull * .55 - Math.sin(time * 29) * .02 * pull, 0); torn.anchor.visible = false; this.flight = null;
    } else {
      cab.door.visible = false; torn.anchor.visible = true;
      this.flight ??= this.doorPose();
      const t = THREE.MathUtils.clamp((time - this.tear) / (this.land - this.tear), 0, 1);
      torn.pose.position.lerpVectors(this.flight.position, torn.rest.position, t).y += Math.sin(Math.PI * t) * 1.5;
      torn.pose.quaternion.slerpQuaternions(this.flight.quaternion, torn.rest.quaternion, t).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, .4).normalize(), Math.PI * 2 * t));
    }
    const out = time >= this.lift;
    cab.driver.visible = !out;
    const jeremy = this.world.characters.get('jeremy')!;
    if (out && !this.freed) {
      // Out of the cab at full size, beside Clark and turned towards him.
      this.freed = true; this.world.placeActor('jeremy', 'school', [-3.95, 2.3]);
      const up = jeremy.root.position.clone().normalize(), forward = tangent(this.player.normal.clone().sub(up), up), right = new THREE.Vector3().crossVectors(up, forward).normalize();
      jeremy.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward));
    } else if (!out) { this.freed = false; jeremy.root.visible = false; }
  }
  /** The door's current transform, expressed in the torn door's anchor space. */
  private doorPose() {
    const door = this.world.truckCab.door, anchor = this.world.tornDoor.anchor;
    door.updateWorldMatrix(true, false); anchor.updateWorldMatrix(true, false);
    const local = anchor.matrixWorld.clone().invert().multiply(door.matrixWorld), pose = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
    local.decompose(pose.position, pose.quaternion, new THREE.Vector3()); return pose;
  }
  private complete() { this.player.locked = false; this.done(); }
  finish() { this.cutscene.finish(); }
  dispose() {
    this.cutscene.dispose(); this.player.locked = false;
    const cab = this.world.truckCab; cab.door.visible = cab.driver.visible = true; cab.door.rotation.set(0, 0, 0); this.world.tornDoor.anchor.visible = false;
  }
}
