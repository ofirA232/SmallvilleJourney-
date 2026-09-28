import * as THREE from 'three';
import { beam, box, group } from './primitives';
import type { LocationId, Point } from '../types';

/** Farm fence posts Clark drives into the ground in the `fence` objective. Each sits exactly on one
 * post of an existing fence line (see buildFarm), which leaves a gap the section fills: a middle post
 * and rails reaching the neighbouring posts, `half` away along the fence. */
export interface FenceSite { location: LocationId; point: Point; along: 'x' | 'y'; half: number }
export const FENCE_SITES: FenceSite[] = [
  { location: 'farm', point: [-3.96, 3.2], along: 'x', half: .64 },
  { location: 'farm', point: [-2.68, 3.2], along: 'x', half: .64 },
  { location: 'farm', point: [3.44, 3.2], along: 'x', half: .58 },
  { location: 'farm', point: [4.6, 1.9], along: 'y', half: .65 },
];
/** Posts of the regular fence closer than this to a site are left out to make room. */
export const FENCE_GAP = .45;
const WOOD = '#ddd7b9', FRESH = '#f4eedb';
/** How far a loose post sticks up out of its hole, and how far it leans. */
const LOOSE_LIFT = .5, LOOSE_LEAN = .32;

export function fenceSection(anchor: THREE.Group, site: FenceSite) {
  const root = group(anchor, 0, 0, 0, true);
  if (site.along === 'y') root.rotation.y = Math.PI / 2;
  // A fresh post: long enough to show above the ground while it is still loose.
  const post = group(root, 0, 0, 0, true);
  box(post, FRESH, 0, .31, 0, .08, .66 + LOOSE_LIFT * 2, .08).position.y = .31 - LOOSE_LIFT;
  box(post, '#fbf6e6', 0, .65, 0, .095, .025, .095);
  const rails = group(root, 0, 0, 0, true);
  for (const h of [.25, .49]) beam(rails, FRESH, [-site.half, h, 0], [site.half, h, 0], .026);
  // Before the post is in, its rails wait in the grass beside a heap of loose earth.
  const waiting = group(root, 0, 0, 0, true);
  for (const [z, turn] of [[.24, .08], [.36, -.05]] as const) beam(waiting, WOOD, [-site.half * .8, .03, z], [site.half * .8, .03, z + turn], .026);
  box(waiting, '#8a7650', 0, .02, 0, .3, .04, .24).rotation.y = .4;
  const dust = new THREE.Mesh(new THREE.RingGeometry(.12, .2, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#d9c49a', transparent: true, opacity: 0, depthWrite: false }));
  dust.position.y = .04; root.add(dust);
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(.15), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
  marker.position.y = 1.6; marker.visible = false; root.add(marker);
  const section = { root, post, rails, waiting, dust, marker };
  poseFenceSection(section, 0);
  return section;
}
export type FenceSection = ReturnType<typeof fenceSection>;
/** 0 is a loose post leaning out of its hole; 1 is driven home with its rails nailed on. */
export function poseFenceSection(section: FenceSection, driven: number) {
  const loose = 1 - THREE.MathUtils.clamp(driven, 0, 1);
  section.post.position.y = LOOSE_LIFT * loose; section.post.rotation.set(LOOSE_LEAN * .4 * loose, 0, LOOSE_LEAN * loose);
  section.rails.visible = driven >= 1; section.waiting.visible = driven < 1;
}
