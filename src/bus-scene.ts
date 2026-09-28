import * as THREE from 'three';
import { at, surfaceRadius, tangent, type CharacterController } from './core/sphere';
import { Cutscene, type StoryScene } from './cutscene';
import { busLeaves } from './content/pilot-cutscenes';
import type { World } from './world/world';

/** Where the bus is when the scene starts and ends; the race picks it up from `BUS_AFTER_SCENE`. */
const BUS_START = .08;
export const BUS_AFTER_SCENE = .16;
const DURATION = busLeaves.shots.reduce((sum, shot) => sum + shot.duration, 0);

/** Clark reaches the farm gate as the school bus pulls away. Plays after the fence objective
 * completes, so it is presentation only; the race's timer waits for it. */
export class BusScene implements StoryScene {
  readonly id = 'bus-leaves';
  readonly cutscene: Cutscene;
  constructor(private player: CharacterController, private world: World, reducedMotion: () => boolean, cue: (id: string) => void, done: () => void) {
    const gate = at('farm', [0, 2.95]); player.reset(gate); player.locked = true;
    this.cutscene = new Cutscene(busLeaves, { update: time => this.choreograph(time), cue, done: () => { player.locked = false; done(); } }, reducedMotion);
  }
  get elapsed() { return this.cutscene.elapsed; }
  update(dt: number) { this.cutscene.update(dt); }
  private choreograph(time: number) {
    const pull = THREE.MathUtils.smoothstep(time, 0, DURATION);
    this.world.setBus(BUS_START + (BUS_AFTER_SCENE - BUS_START) * pull * pull);
    // Clark watches it go.
    const toBus = tangent(this.world.bus.position.clone().normalize().sub(this.player.normal), this.player.normal);
    this.player.forward.copy(toBus);
  }
  camera(camera: THREE.PerspectiveCamera) {
    if (!this.cutscene.active) return;
    const up = this.player.normal, clark = up.clone().multiplyScalar(surfaceRadius(up)), bus = this.world.bus.position.clone();
    const toBus = tangent(bus.clone().sub(clark), up), side = new THREE.Vector3().crossVectors(up, toBus);
    const over = this.cutscene.timeline.shotAt(this.cutscene.elapsed).index === 0;
    // First over Clark's shoulder towards the bus, then from the road looking back at him.
    const position = over ? clark.clone().addScaledVector(toBus, -1.7).addScaledVector(up, 1.45).addScaledVector(side, .35) : clark.clone().addScaledVector(toBus, 2.3).addScaledVector(up, 1.05).addScaledVector(side, -.6);
    const look = over ? bus.clone().addScaledVector(up, .5) : clark.clone().addScaledVector(up, 1.05);
    camera.position.copy(position); camera.up.copy(up); camera.lookAt(look);
    if (camera.fov !== 40) { camera.fov = 40; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld(); this.cutscene.target.copy(look);
  }
  finish() { this.cutscene.finish(); }
  dispose() { this.cutscene.dispose(); this.player.locked = false; }
}
