import * as THREE from 'three';
import { distance, isWater, resolveCollisions, stepOnSphere, surfaceRadius, tangent, type Collider } from '../core/sphere';
import type { Character } from './character';

/** How far a character strays from where the story placed them, and how fast they stroll. */
const ROAM = .5, WALK = .55;
/** Within this distance of Clark, characters stop what they are doing and turn to him. */
export const ATTENTION = 4.5;

interface Life { home: THREE.Vector3; normal: THREE.Vector3; heading: THREE.Vector3; target: THREE.Vector3 | null; timer: number; glance: number; glanceTime: number; glanceTotal: number; seed: number }

/** Small, unscripted behaviour that makes the townspeople feel alive: a few steps around their
 * spot, a look over the shoulder, turning to Clark when he comes close, and talking with their
 * hands. The story still decides where each character stands; this only plays around that spot
 * and never takes anyone into water or through a building. */
export class ActorLife {
  private lives = new Map<Character, Life>();
  private random = 1234567;
  constructor(private colliders: Collider[]) {}
  private next() { this.random = (this.random * 16807) % 2147483647; return this.random / 2147483647; }
  /** Called whenever the story places a character: this becomes their home spot. */
  home(actor: Character, normal: THREE.Vector3) {
    const heading = new THREE.Vector3(0, 0, 1).applyQuaternion(actor.root.quaternion);
    this.lives.set(actor, { home: normal.clone(), normal: normal.clone(), heading: tangent(heading, normal), target: null, timer: 1 + this.next() * 4, glance: 0, glanceTime: 0, glanceTotal: 1, seed: this.next() * 10 });
  }
  /** Moves and animates one character; returns false for characters it does not manage. */
  update(actor: Character, dt: number, player: THREE.Vector3 | null, speaking: boolean, reduced: boolean, time: number) {
    const life = this.lives.get(actor); if (!life) return false;
    const up = life.normal, near = !!player && distance(up, player) < ATTENTION;
    let speed = 0;
    if (near || reduced) life.target = null;
    else {
      life.timer -= dt;
      if (life.timer <= 0 && !life.target) {
        const choice = this.next();
        if (choice < .5) {
          // A short stroll to somewhere nearby, or back home if they have wandered.
          const away = distance(up, life.home) > ROAM * .6;
          const angle = this.next() * Math.PI * 2, offset = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
          const candidate = away ? life.home.clone() : stepOnSphere(life.home, tangent(offset, life.home), ROAM * (.4 + this.next() * .6));
          if (!isWater(candidate) && resolveCollisions(candidate, this.colliders).distanceTo(candidate) < 1e-6) life.target = candidate;
        } else if (choice < .82) { life.glance = (this.next() < .5 ? -1 : 1) * (.5 + this.next() * .5); life.glanceTime = life.glanceTotal = 1.6 + this.next(); }
        life.timer = 3 + this.next() * 5;
      }
      if (life.target) {
        const remaining = distance(up, life.target);
        if (remaining < .05) life.target = null;
        else {
          const direction = tangent(life.target.clone().sub(up), up);
          life.heading.lerp(direction, 1 - Math.exp(-dt * 6)).normalize();
          life.normal.copy(stepOnSphere(up, direction, Math.min(remaining, WALK * dt)));
          speed = WALK * 2.2;
        }
      }
    }
    life.glanceTime = Math.max(0, life.glanceTime - dt);
    const normal = life.normal;
    actor.root.position.copy(normal).multiplyScalar(surfaceRadius(normal) + .03);
    if (!near) {
      // Face the way they walk, turning the head a little when glancing around.
      const heading = tangent(life.heading, normal), right = new THREE.Vector3().crossVectors(normal, heading).normalize();
      actor.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, normal, heading));
    }
    actor.update(dt, speed, false, false, reduced);
    if (!actor.imported) {
      const glance = life.glanceTime > 0 ? life.glance * Math.sin(Math.PI * (1 - life.glanceTime / life.glanceTotal)) : 0;
      actor.head.rotation.y += glance * .7;
      if (speaking && !reduced) {
        // Talking with their hands: one forearm lifts and moves with the words, the head nods.
        const beat = time * 3.1 + life.seed;
        actor.arms[1].rotation.x = -.35 + Math.sin(beat) * .18; actor.forearms[1].rotation.x = -.85 + Math.sin(beat * 1.7) * .25;
        actor.arms[0].rotation.x = -.12 + Math.sin(beat * .8 + 1) * .08;
        actor.head.rotation.x = Math.sin(beat * 1.3) * .06;
      }
    }
    return true;
  }
  /** Where the character stands now (they may have strolled from their home spot). */
  position(actor: Character) { return this.lives.get(actor)?.normal; }
}
