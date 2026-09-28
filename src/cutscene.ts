import { t } from './i18n';
import * as THREE from 'three';
import { CutsceneTimeline, fitFov, type CutsceneDefinition } from './core/cutscene';
import type { ActorId, NpcId } from './types';

export interface CutsceneHooks {
  /** Choreography for props and characters, called with the scene's elapsed time. */
  update?(time: number): void;
  cue?(id: string): void;
  done(): void;
}

/** A story moment the game loop runs while a cutscene plays: it owns the cutscene and
 * any choreography, and may pose Clark (strength) or rotate him (pose). */
export interface StoryScene {
  readonly id: string;
  /** Seconds since the scene began, for telemetry. */
  readonly elapsed: number;
  readonly strength?: boolean;
  /** An actor the scene animates itself, so the world leaves its idle motion alone. */
  readonly actor?: ActorId;
  /** Someone Clark holds in his arms while the scene plays, before the story says so. */
  readonly carry?: NpcId | null;
  /** True while the scene is mid-shot and needs every frame, even with a conversation open. */
  readonly live?: boolean;
  /** Camera drag from the player, for scenes with a camera the player may look around with. */
  drag?(dx: number, dy: number): void;
  update(dt: number): void;
  camera(camera: THREE.PerspectiveCamera): void;
  pose?(root: THREE.Object3D): void;
  finish(): void;
  dispose(): void;
}

/** Plays a CutsceneDefinition over the live world: letterbox bars, subtitles,
 * authored camera shots and a skip control. The game loop supplies active time,
 * so menus, blur and hidden tabs pause the scene where it stands. */
export class Cutscene {
  readonly timeline: CutsceneTimeline;
  /** Where the camera was last looking, so the follow camera can take over without a jump. */
  readonly target = new THREE.Vector3();
  elapsed = 0;
  private cuedUntil = -1;
  private captionOverride: string | null = null;
  private root = document.createElement('div');
  private caption: HTMLElement;
  private flash: HTMLElement;
  constructor(definition: CutsceneDefinition, private hooks: CutsceneHooks, private reducedMotion: () => boolean) {
    this.timeline = new CutsceneTimeline(definition);
    this.root.id = 'cutscene';this.root.className = 'cutscene';this.root.dataset.scene = definition.id;
    this.root.innerHTML = `<div class="letterbox letterbox-top"><button id="skip-cutscene" type="button">${t('Skip scene')} <span aria-hidden="true">›</span></button></div><div class="letterbox letterbox-bottom"><p id="cutscene-caption" role="status" aria-live="polite"></p></div><div class="cutscene-flash" aria-hidden="true"></div>`;
    this.caption = this.root.querySelector('#cutscene-caption')!;this.flash = this.root.querySelector('.cutscene-flash')!;
    this.root.querySelector('#skip-cutscene')!.addEventListener('click', () => this.finish());
    document.body.appendChild(this.root);document.body.classList.add('cinematic');
    window.addEventListener('keydown', this.key, true);
    this.advance(0);
  }
  private key = (event: KeyboardEvent) => {
    if (event.code !== 'Escape' || !this.root.isConnected) return;
    event.preventDefault();event.stopImmediatePropagation();this.finish();
  };
  get active() { return this.root.isConnected; }
  update(dt: number) { if (this.active) this.advance(dt); }
  private advance(dt: number) {
    this.elapsed = Math.min(this.timeline.duration, this.elapsed + dt);
    this.hooks.update?.(this.elapsed);
    const cues = this.timeline.cuesBetween(this.cuedUntil, this.elapsed);this.cuedUntil = this.elapsed;
    for (const id of cues) {
      if (id === 'flash') this.flashNow();
      this.hooks.cue?.(id);
    }
    const caption = this.captionOverride ?? t(this.timeline.shotAt(this.elapsed).shot.caption ?? '');
    if (this.caption.textContent !== caption) this.caption.textContent = caption;
    if (this.elapsed >= this.timeline.duration) this.finish();
  }
  /** Replaces the shot captions until cleared with null (for interactive scenes). */
  setCaption(text: string | null) { this.captionOverride = text; this.caption.textContent = text ?? t(this.timeline.shotAt(this.elapsed).shot.caption ?? ''); }
  flashNow() { if (this.reducedMotion()) return; this.flash.classList.remove('flashing'); void this.flash.offsetWidth; this.flash.classList.add('flashing'); }
  /** Overrides the rig's camera for this frame. */
  camera(camera: THREE.PerspectiveCamera) {
    if (!this.active) return;
    const frame = this.timeline.frame(this.elapsed, this.reducedMotion());
    camera.position.copy(frame.position);camera.up.copy(frame.up);camera.lookAt(frame.target);
    const fov = fitFov(frame.fov, camera.aspect);
    if (camera.fov !== fov) {camera.fov = fov;camera.updateProjectionMatrix();}
    camera.updateMatrixWorld();
    this.target.copy(frame.target);
  }
  finish() { if (!this.active) return;this.dispose();this.hooks.done(); }
  dispose() { this.root.remove();document.body.classList.remove('cinematic');window.removeEventListener('keydown', this.key, true); }
}
