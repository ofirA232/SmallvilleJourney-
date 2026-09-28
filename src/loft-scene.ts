import * as THREE from 'three';
import type { CharacterController } from './core/sphere';
import { fitFov } from './core/cutscene';
import { Cutscene, type StoryScene } from './cutscene';
import { goodnight, lastDance, loftStars } from './content/pilot-cutscenes';
import type { Character } from './world/character';
import { HOLD_NECK, HOLD_WAIST, holdArms } from './world/embrace';
import { LOFT_WIDTH, roofHeight } from './world/loft';
import type { World } from './world/world';

/** The conversation line on screen: which dialogue, how far in, and who is speaking. */
export interface LoftLine { dialogue: string | null; index: number; speaker: string | null }

/** Heading (0 = towards the window) that turns someone at `from` to face `to`. */
function heading(from: THREE.Vector3, to: THREE.Vector3) { const d = to.clone().sub(from); return Math.atan2(-d.x, -d.z); }
/** The same angle, brought into -π..π so a turn takes the short way round. */
function wrap(angle: number) { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
/** How far into the loft conversation Lana appears at the top of the stairs. */
const LANA_ARRIVES = 2;
/** "Goodnight, Lana." plays as a short film (`goodnight`): a beat on Clark, then across town to Lana on
 * her porch. The porch shot follows the first shot, and she turns `PORCH_TURN` seconds into it. */
const PORCH_IN = goodnight.shots[0].duration, PORCH_LENGTH = goodnight.shots[1].duration, PORCH_TURN = .9;
/** The last look, in seconds: the push through the hay door, and the tilt up to the stars. */
const STARS_PUSH = 4.3, STARS_TILT = [3.3, 7.8] as const;
/** Every loft shot creeps in on the people in it: closer and a little tighter, most of the way
 * after about half a minute. */
const PUSH_TIME = 14, PUSH_REACH = .16, PUSH_ZOOM = 10;

/** A framing the camera holds and slowly pushes into: it orbits `centre` from heading `base` (plus the
 * player's drag) at `reach`, `lift` above it, through a lens of `fov` degrees. */
interface Shot { start: number; centre: THREE.Vector3; base: number; reach: number; lift: number; fov: number }

/** The finale in Clark's loft. It runs through the loft conversation (with a camera the player can
 * turn), the last dance as a short film, the goodnight across town and the daydream ending, then
 * stays behind the closing panel. The loft and Lana's porch are sets floating above the planet, so
 * Clark and Lana are placed in their frames. */
export class LoftScene implements StoryScene {
  readonly id = 'loft';
  readonly actor = 'lana' as const;
  phase: 'talk' | 'dance' | 'after' | 'goodnight' | 'stars' = 'talk';
  elapsed = 0;
  private film: Cutscene | null = null;
  private lanaHere = false;
  private yaw = 0;
  private pitch = 0;
  private spin = 0;
  private shot: Shot;
  /** Whether "Goodnight, Lana." has played. */
  private goodnightDone = false;
  /** Lana's neck and head as the animation left them, so her look back never adds up frame on frame. */
  private bones: { bone: THREE.Object3D; rest: THREE.Quaternion }[] = [];
  private fade = document.createElement('div');
  /** The series title that fades up over the stars; loaded with the scene so it is ready in time. */
  private logo = document.createElement('img');
  constructor(private player: CharacterController, private world: World, private reducedMotion: () => boolean, private cue: (id: string) => void, private line: () => LoftLine, private conversation: { hold(held: boolean): void; next(): void }) {
    world.loft.root.visible = true; world.loft.root.updateWorldMatrix(true, true); world.porch.root.updateWorldMatrix(true, true);
    world.characters.get('lana')!.root.visible = false;
    player.locked = true; player.moving = false; player.speed = 0;
    this.fade.className = 'loft-fade'; document.body.appendChild(this.fade);
    this.logo.id = 'series-logo'; this.logo.className = 'series-logo'; this.logo.alt = 'Smallville'; this.logo.src = '/images/smallville-logo.png';
    document.body.appendChild(this.logo);
    document.body.classList.add('cinematic');
    // Clark at the telescope from behind, the hay door and the night beyond.
    this.shot = { start: 0, centre: new THREE.Vector3(0, 1.1, -.9), base: 0, reach: 2.7, lift: .45, fov: 52 };
  }
  /** Film time during the dance, conversation time otherwise. */
  get cutscene() { return this.film; }
  /** Seconds into the porch shot, or -1 outside it. */
  get porch() { return this.phase === 'goodnight' && this.film && this.film.elapsed >= PORCH_IN ? this.film.elapsed - PORCH_IN : -1; }
  /** The goodnight film needs every frame even though the conversation is open behind it. */
  get live() { return this.phase === 'goodnight'; }
  update(dt: number) {
    this.elapsed += dt;
    const line = this.line();
    if (this.phase === 'talk' && !this.lanaHere && line.dialogue === 'loft' && line.index >= LANA_ARRIVES) {
      this.lanaHere = true; this.cue('step');
      // Over Clark's shoulder to Lana at the top of the stairs.
      const loft = this.loft, centre = loft.telescope.clone().lerp(loft.stairs, .6).setY(1.1);
      this.cut({ centre, base: heading(loft.stairs, loft.telescope) + Math.PI + .22, reach: 2.7, lift: .55, fov: 52 });
    }
    if (this.phase === 'after' && !this.goodnightDone && line.dialogue === 'loft-after' && line.speaker === 'clark') this.goodnightFilm();
    if (this.phase === 'dance') { this.spin += dt * .38; this.film?.update(dt); }
    if (this.phase === 'goodnight' || this.phase === 'stars') this.film?.update(dt);
    const porch = this.porch, onPorch = porch >= 0;
    document.body.classList.toggle('goodnight-cut', this.phase === 'goodnight');
    this.world.porch.root.visible = onPorch; this.loft.root.visible = !onPorch;
    const lana = this.world.characters.get('lana')!;
    this.restoreBones();
    lana.root.visible = this.lanaHere || onPorch;
    if (onPorch) this.onPorch(lana, porch, dt);
    else if (this.lanaHere) {
      this.place(lana.root, ...this.lanaSpot()); lana.update(dt, 0, false, false, this.reducedMotion());
      // Dancing, her arms go around his neck.
      if (this.phase === 'dance') holdArms(lana.root, HOLD_NECK);
    }
  }
  /** Starts the dance; `done` runs after the daydream ends. */
  dance(done: () => void) {
    this.phase = 'dance'; this.spin = 0;
    this.film = new Cutscene(lastDance, { cue: id => { if (id === 'daydream') this.lanaHere = false; this.cue(id); }, done: () => {
      this.lanaHere = false; this.phase = 'after'; this.film = null; document.body.classList.add('cinematic');
      // Clark alone at the telescope again, from behind his shoulder.
      this.cut({ centre: new THREE.Vector3(.45, 1.2, -1.45), base: .3, reach: 2.5, lift: .45, fov: 52 });
      done();
    } }, this.reducedMotion);
  }
  /** "Goodnight, Lana." as a short film, with the conversation held behind it. When it ends the camera
   * is back on Clark and the conversation moves on to the next line by itself. */
  private goodnightFilm() {
    this.phase = 'goodnight'; this.goodnightDone = true; this.conversation.hold(true);
    this.film = new Cutscene(goodnight, { done: () => {
      this.film = null; this.phase = 'after'; document.body.classList.add('cinematic');
      // Back on the boy at the window, a little closer than before.
      this.cut({ centre: new THREE.Vector3(.45, 1.25, -1.5), base: .3, reach: 2.1, lift: .4, fov: 52 });
      this.conversation.hold(false); this.conversation.next();
    } }, this.reducedMotion);
  }
  /** The last look: the camera pushes to the window, out through it, and tilts up to the stars. */
  stars(done: () => void) {
    this.phase = 'stars'; this.conversation.hold(false);
    this.film = new Cutscene(loftStars, { cue: id => { if (id === 'logo') this.showLogo(); }, done: () => { this.film = null; done(); } }, this.reducedMotion);
  }
  /** Fades the series title up over the stars. It stays behind the closing panel until Clark leaves. */
  private showLogo() {
    if (this.reducedMotion()) this.logo.style.transition = 'none';
    this.logo.classList.add('shown');
  }
  private get loft() { return this.world.loft; }
  private cut(shot: Omit<Shot, 'start'>) { this.shot = { ...shot, start: this.elapsed }; this.yaw = 0; this.pitch = 0; }
  /** How far the current shot has pushed in, 0 to 1. */
  private push(since: number) { return this.reducedMotion() ? 0 : 1 - Math.exp(-(this.elapsed - since) / PUSH_TIME); }
  /** Local positions and headings in the loft (heading 0 faces the window, -z). */
  private clarkSpot(): [THREE.Vector3, number] {
    if (this.phase === 'dance') { const clark = this.dancer(-1); return [clark, heading(clark, this.dancer(1))]; }
    return [this.loft.telescope, this.lanaHere ? heading(this.loft.telescope, this.loft.stairs) : 0];
  }
  private lanaSpot(): [THREE.Vector3, number] {
    if (this.phase === 'dance') { const lana = this.dancer(1); return [lana, heading(lana, this.dancer(-1))]; }
    return [this.loft.stairs, heading(this.loft.stairs, this.loft.telescope)];
  }
  private dancer(side: number) { return this.loft.floor.clone().add(this.partner(side)); }
  /** The two dancers turn around the middle of the rug, close together and facing each other. */
  private partner(side: number) { return new THREE.Vector3(Math.cos(this.spin), 0, -Math.sin(this.spin)).multiplyScalar(.15 * side); }
  /** Puts a character root at a position in a set's frame, facing `heading` (radians, 0 = the set's -z). */
  private place(root: THREE.Object3D, local: THREE.Vector3, heading: number, frame: THREE.Object3D = this.loft.root) {
    const sway = this.phase === 'dance' && !this.reducedMotion() ? Math.sin(this.elapsed * 1.9) * .05 : 0;
    root.position.copy(local).applyMatrix4(frame.matrixWorld);
    root.quaternion.copy(frame.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, heading + Math.PI, sway, 'YXZ')));
  }
  /** Lana at her door, facing it, until she turns as if she heard him: the head leads, the shoulders follow. */
  private onPorch(lana: Character, t: number, dt: number) {
    const porch = this.world.porch, away = heading(porch.lana, new THREE.Vector3(-.9, 0, -.6)), turn = wrap(heading(porch.lana, porch.camera) - away);
    const reduced = this.reducedMotion(), look = reduced ? 1 : THREE.MathUtils.smoothstep(t, PORCH_TURN, PORCH_TURN + .6), body = reduced ? 1 : THREE.MathUtils.smoothstep(t, PORCH_TURN + .1, PORCH_TURN + .9);
    this.place(lana.root, porch.lana, away + turn * .65 * body, porch.root);
    lana.update(dt, 0, false, false, reduced);
    const twist = turn * .35 * look, model = lana.imported?.root;
    if (!model) { lana.head.rotation.y += twist; return; }
    for (const [name, share] of [['Neck', .4], ['Head', .6]] as const) {
      const bone = model.getObjectByName(name); if (!bone) continue;
      this.bones.push({ bone, rest: bone.quaternion.clone() }); bone.rotateY(twist * share);
    }
  }
  private restoreBones() { for (const { bone, rest } of this.bones) bone.quaternion.copy(rest); this.bones = []; }
  pose(root: THREE.Object3D) {
    this.place(root, ...this.clarkSpot());
    // Dancing, his hands rest at her waist.
    if (this.phase === 'dance' && this.lanaHere) holdArms(root, HOLD_WAIST);
  }
  drag(dx: number, dy: number) { if (this.phase !== 'dance' && this.phase !== 'goodnight') { this.yaw -= dx * .006; this.pitch = THREE.MathUtils.clamp(this.pitch + dy * .004, -.35, .45); } }
  camera(camera: THREE.PerspectiveCamera) {
    if (this.phase === 'stars' && this.film) { this.starCamera(camera, this.film.elapsed); return; }
    if (this.porch >= 0) { this.porchCamera(camera, this.porch); return; }
    const loft = this.loft, dance = this.phase === 'dance' && this.film;
    // Talking: the current shot, which the player can turn. Dancing: a slow orbit that closes in.
    const push = dance ? (this.reducedMotion() ? 0 : THREE.MathUtils.smoothstep(this.film!.elapsed / this.film!.timeline.duration, 0, 1)) : this.push(this.shot.start);
    const centre = dance ? loft.floor.clone().setY(.95) : this.shot.centre;
    const angle = dance ? .6 + this.elapsed * .22 : this.shot.base + this.yaw, reach = (dance ? 2.3 : this.shot.reach) * (1 - (dance ? .25 : PUSH_REACH) * push);
    const sin = Math.sin(angle), cos = Math.cos(angle);
    const radius = Math.min(reach, (LOFT_WIDTH - .75 - Math.sign(sin) * centre.x) / Math.max(.01, Math.abs(sin)), (2.9 - Math.sign(cos) * centre.z) / Math.max(.01, Math.abs(cos)));
    const local = centre.clone().add(new THREE.Vector3(sin * radius, dance ? .55 : this.shot.lift + this.pitch, cos * radius));
    local.y = Math.min(local.y, roofHeight(local.x) - .25);
    const position = local.applyMatrix4(loft.root.matrixWorld), look = centre.clone().applyMatrix4(loft.root.matrixWorld);
    camera.position.copy(position); camera.up.set(0, 1, 0).applyQuaternion(loft.root.quaternion); camera.lookAt(look);
    // Phones held upright see a little wider, so a close shot still fits a face.
    const fov = fitFov((dance ? 52 : this.shot.fov) - (dance ? 8 : PUSH_ZOOM * this.shot.fov / 52) * push, camera.aspect, .6); if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
  }
  /** Lana on her porch, just right of frame centre with the lit door behind her (centred on an upright
   * phone), the camera easing in. */
  private porchCamera(camera: THREE.PerspectiveCamera, t: number) {
    const porch = this.world.porch, push = this.reducedMotion() ? 0 : t / PORCH_LENGTH;
    const face = porch.lana.clone().setY(1.12), local = porch.camera.clone().lerp(face, .2 * push);
    camera.position.copy(local.applyMatrix4(porch.root.matrixWorld)); camera.up.set(0, 1, 0).applyQuaternion(porch.root.quaternion);
    const aside = -.16 * THREE.MathUtils.clamp((camera.aspect - .8) / .8, 0, 1);
    camera.lookAt(face.clone().add(new THREE.Vector3(aside, -.08, 0)).applyMatrix4(porch.root.matrixWorld));
    const fov = fitFov(36 - 3 * push, camera.aspect); if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
  }
  private starCamera(camera: THREE.PerspectiveCamera, seconds: number) {
    const loft = this.loft.root, push = THREE.MathUtils.smoothstep(seconds, 0, STARS_PUSH), tilt = THREE.MathUtils.smoothstep(seconds, ...STARS_TILT);
    // From behind Clark at the telescope, through the hay door, then straight up to hold on the stars.
    const local = new THREE.Vector3(.35, 1.55, -.4).lerp(new THREE.Vector3(0, 1.5, -4.6), push);
    const look = new THREE.Vector3(0, 1.5, -12).lerp(new THREE.Vector3(0, 30, -5.2), tilt).add(new THREE.Vector3(0, 0, local.z + 4.6));
    const up = new THREE.Vector3(0, 1, 0).lerp(new THREE.Vector3(0, 0, 1), tilt).normalize();
    camera.position.copy(local.applyMatrix4(loft.matrixWorld)); camera.up.copy(up.applyQuaternion(loft.quaternion));
    camera.lookAt(look.applyMatrix4(loft.matrixWorld));
    const fov = THREE.MathUtils.lerp(52, 60, tilt); if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
  }
  finish() { this.film?.finish(); }
  dispose() {
    this.film?.dispose(); this.film = null; this.fade.remove(); this.logo.remove(); document.body.classList.remove('cinematic', 'goodnight-cut');
    this.restoreBones(); this.conversation.hold(false);
    this.world.loft.root.visible = false; this.world.porch.root.visible = false; this.player.locked = false;
  }
}
