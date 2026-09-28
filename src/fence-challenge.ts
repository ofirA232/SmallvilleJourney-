import * as THREE from 'three';
import { at, basis, distance, type CharacterController } from './core/sphere';
import { FENCE_SITES } from './world/fence-repair';
import type { World } from './world/world';

export type WatchPhase = 'turned' | 'warning' | 'watching';
/** Jonathan's rhythm: back turned, a short tell, then a look at the fence. Fixed rather than
 * random so the mission is learnable and tests are repeatable. */
const TURNED = [4.4, 3.4, 5, 3.6, 4.6], WATCHING = [2.6, 3.2, 2.2, 3], WARNING = .9;
export const HUMAN_FIX_SECONDS = 3.2;
const REACH = 1.05, STRIKES = 3;
const CAUGHT = ['Clark.', 'Son, I saw that.'];

export interface FenceHooks { cue(id: string): void; toast(title: string, text: string): void; done(): void }

/** Red light, green light with Dad: drive the new fence posts into the ground with one push while
 * Jonathan's back is turned. While he watches, Clark can only hammer them in at human speed; running
 * at super speed in front of him is a strike, and the third strike pulls the posts back out. */
export class FenceChallenge {
  phase: WatchPhase = 'turned';
  strikes = 0;
  fixed = FENCE_SITES.map(() => false);
  working: { site: number; elapsed: number } | null = null;
  private timer = 0;
  private cycle = 0;
  private caught = false;
  private finishing = -1;
  private facing = 0;
  /** Per post: how far it is driven in (0 loose, 1 home) and how long its dust puff has been settling. */
  private driven = FENCE_SITES.map(() => 0);
  private dust = FENCE_SITES.map(() => 1);
  private cone: THREE.Mesh;
  readonly panel = document.createElement('section');
  constructor(private player: CharacterController, private world: World, private hooks: FenceHooks) {
    const jonathan = world.characters.get('jonathan')!;
    this.cone = new THREE.Mesh(new THREE.CircleGeometry(5, 28, -Math.PI / 2 - Math.PI * .36, Math.PI * .72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff9a72', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    this.cone.position.y = .06; this.cone.renderOrder = 3; jonathan.root.add(this.cone);
    this.panel.id = 'fence-status'; this.panel.className = 'race-status fence-status'; this.panel.setAttribute('role', 'status');
    this.panel.innerHTML = '<span class="fence-eye" aria-hidden="true"></span><span id="fence-phase"></span><strong id="fence-count"></strong><span id="fence-strikes" aria-label="Strikes"></span>';
    document.body.appendChild(this.panel);
    world.fenceSections.forEach((section, index) => { world.setFenceSection(index, 0); section.marker.visible = true; });
    this.paint();
  }
  get complete() { return this.fixed.every(Boolean); }
  get count() { return this.fixed.filter(Boolean).length; }
  get progress() { return this.working ? this.working.elapsed / HUMAN_FIX_SECONDS : 0; }
  /** The unrepaired section within reach, if any. */
  get site() {
    let best: number | null = null, closest = REACH;
    FENCE_SITES.forEach((site, index) => { const d = distance(this.player.normal, at(site.location, site.point)); if (!this.fixed[index] && d < closest) { closest = d; best = index; } });
    return best;
  }
  /** The nearest section still broken, for the objective route. */
  nextTarget() {
    let best: THREE.Vector3 | null = null, closest = Infinity;
    FENCE_SITES.forEach((site, index) => {
      if (this.fixed[index]) return;
      // Stand on the yard side of the fence rather than on the fence line itself.
      const point: [number, number] = site.along === 'x' ? [site.point[0], site.point[1] - .55] : [site.point[0] - .55, site.point[1]];
      const normal = at(site.location, point), d = distance(this.player.normal, normal);
      if (d < closest) { closest = d; best = normal; }
    });
    return best;
  }
  interact() {
    if (this.working || this.complete) return;
    const site = this.site;
    if (site === null) { this.hooks.toast('Find a loose post', 'Walk to one of the gold markers along the fence.'); return; }
    if (this.phase === 'watching') { this.working = { site, elapsed: 0 }; this.hooks.cue('hammer'); return; }
    // One push at super speed: the post goes home in a blink and kicks up a ring of dust.
    this.driven[site] = .999; this.dust[site] = 0; this.repair(site); this.hooks.cue('slam');
  }
  private repair(site: number) {
    this.fixed[site] = true;
    if (this.complete) this.finishing = 0;
    this.paint();
  }
  update(dt: number) {
    for (const [index, section] of this.world.fenceSections.entries()) {
      // Hammered posts sink in steps with each blow; a pushed post finishes its last few centimetres now.
      const target = this.fixed[index] ? 1 : this.working?.site === index ? Math.floor(this.progress * 7) / 7 : 0;
      if (this.driven[index] !== target) { this.driven[index] = target > this.driven[index] ? Math.min(target, this.driven[index] + dt * 6) : target; this.world.setFenceSection(index, this.driven[index]); }
      if (this.dust[index] < 1) { this.dust[index] = Math.min(1, this.dust[index] + dt * 2.2); section.dust.scale.setScalar(1 + this.dust[index] * 4); (section.dust.material as THREE.MeshBasicMaterial).opacity = .7 * (1 - this.dust[index]); }
      section.marker.visible = !this.fixed[index]; section.marker.rotation.y += dt * 2; section.marker.position.y = 1.6 + Math.sin(performance.now() / 300 + index) * .05;
    }
    if (this.working) {
      this.working.elapsed += dt;
      if (Math.floor(this.working.elapsed / .45) !== Math.floor((this.working.elapsed - dt) / .45)) this.hooks.cue('hammer');
      if (this.working.elapsed >= HUMAN_FIX_SECONDS) { const { site } = this.working; this.working = null; this.repair(site); }
    }
    if (this.finishing >= 0) {
      // Dad turns around to find the fence finished.
      this.phase = 'watching'; this.turn(dt);this.finishing += dt;
      if (this.finishing > 1.1) { this.finishing = -1; this.hooks.done(); }
      this.paint(); return;
    }
    this.timer += dt;
    const turned = TURNED[this.cycle % TURNED.length], watching = WATCHING[this.cycle % WATCHING.length];
    const previous = this.phase;
    if (this.timer < turned) this.phase = 'turned';
    else if (this.timer < turned + WARNING) this.phase = 'warning';
    else if (this.timer < turned + WARNING + watching) this.phase = 'watching';
    else { this.timer = 0; this.cycle++; this.caught = false; this.phase = 'turned'; }
    if (previous !== this.phase && this.phase === 'warning') this.hooks.cue('warning');
    if (this.phase === 'watching' && this.player.superSpeed && !this.caught) this.strike();
    this.turn(dt); this.paint();
  }
  private strike() {
    this.caught = true; this.strikes++; this.hooks.cue('caught');
    if (this.strikes < STRIKES) { this.hooks.toast('Jonathan', CAUGHT[this.strikes - 1]); return; }
    this.hooks.toast('Jonathan', 'Clark. The right way, son. Pull those posts and start over.');
    this.strikes = 0; this.working = null; this.fixed = this.fixed.map(() => false); this.driven = this.driven.map(() => 0); this.fixed.forEach((_, index) => this.world.setFenceSection(index, 0));
  }
  /** Faces Jonathan towards the house (back to the fence) or the fence. */
  private turn(dt: number) {
    const jonathan = this.world.characters.get('jonathan')!, target = this.phase === 'watching' ? Math.PI : 0;
    this.facing = THREE.MathUtils.damp(this.facing, target, 9, dt);
    const up = jonathan.root.position.clone().normalize(), { east, north } = basis(up);
    const forward = north.multiplyScalar(Math.cos(this.facing)).addScaledVector(east, Math.sin(this.facing)).normalize(), right = new THREE.Vector3().crossVectors(up, forward).normalize();
    jonathan.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward));
    const material = this.cone.material as THREE.MeshBasicMaterial;
    material.opacity = this.phase === 'watching' ? .34 : this.phase === 'warning' ? .14 + Math.sin(performance.now() / 90) * .08 : 0;
    material.color.set(this.phase === 'watching' ? '#ff8a6b' : '#ffd27a');
  }
  private paint() {
    this.panel.dataset.phase = this.phase;
    const phase = this.panel.querySelector('#fence-phase')!, text = this.complete ? 'EVERY POST IS IN' : this.phase === 'watching' ? 'DAD IS WATCHING · ACT NORMAL' : this.phase === 'warning' ? 'HE IS ABOUT TO TURN' : 'HIS BACK IS TURNED · GO';
    if (phase.textContent !== text) phase.textContent = text;
    this.panel.querySelector('#fence-count')!.textContent = `${this.count}/${this.fixed.length}`;
    this.panel.querySelector('#fence-strikes')!.textContent = '●'.repeat(this.strikes) + '○'.repeat(STRIKES - this.strikes);
  }
  dispose() {
    this.panel.remove(); this.cone.removeFromParent(); this.cone.geometry.dispose(); (this.cone.material as THREE.Material).dispose();
    this.world.fenceSections.forEach(section => { section.marker.visible = false; });
  }
}
