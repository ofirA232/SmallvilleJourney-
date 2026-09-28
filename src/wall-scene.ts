import type * as THREE from 'three';
import { at, basis, type CharacterController } from './core/sphere';
import { Cutscene, type StoryScene } from './cutscene';
import { wallDiscovery } from './content/pilot-cutscenes';
import type { World } from './world/world';

/** At the Wall of Weird, the pieces fall into place: the yearbook, the meteor clipping and the
 * hospital report tell Jeremy's story before the player shares what Clark worked out. */
export class WallScene implements StoryScene {
  readonly id = 'wall-discovery';
  readonly cutscene: Cutscene;
  /** Chloe stands just behind the spot where Clark reads the wall, so she steps out of the film. */
  readonly actor = 'chloe' as const;
  private chloeVisible: boolean;
  constructor(private player: CharacterController, private world: World, reducedMotion: () => boolean, cue: (id: string) => void, done: () => void) {
    const spot = at('school', [4.1, .35]); player.reset(spot); player.forward.copy(basis(spot).north); player.locked = true;
    const chloe = world.characters.get('chloe')!; this.chloeVisible = chloe.root.visible; chloe.root.visible = false;
    this.cutscene = new Cutscene(wallDiscovery, { cue, done: () => { player.locked = false; this.restore(); done(); } }, reducedMotion);
  }
  /** Chloe is back for the deduction. */
  private restore() { this.world.characters.get('chloe')!.root.visible = this.chloeVisible; }
  get elapsed() { return this.cutscene.elapsed; }
  update(dt: number) { this.cutscene.update(dt); }
  camera(camera: THREE.PerspectiveCamera) { this.cutscene.camera(camera); }
  finish() { this.cutscene.finish(); }
  dispose() { this.cutscene.dispose(); this.player.locked = false; this.restore(); }
}
