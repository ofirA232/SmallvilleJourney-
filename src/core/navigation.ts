import { IcosahedronGeometry, Vector3 } from 'three';
import { distance, isLocked, resolveCollisions, stepOnSphere, tangent } from './sphere';
import type { Collider } from './sphere';

interface Node { normal: Vector3; edges: Set<number> }

/** A reusable spherical navigation graph, with visibility shortcuts around props. */
export class Navigator {
  nodes: Node[] = [];
  route: Vector3[] = [];
  active = false;
  constructor(public colliders: Collider[]) {
    const geometry = new IcosahedronGeometry(1, 13);
    const position = geometry.getAttribute('position');
    const lookup = new Map<string, number>();
    const getNode = (normal: Vector3) => {
      const key = normal.toArray().map(value => value.toFixed(5)).join(',');
      const existing = lookup.get(key);
      if (existing !== undefined) return existing;
      const id = this.nodes.length;
      lookup.set(key, id);
      this.nodes.push({ normal, edges: new Set() });
      return id;
    };
    for (let i = 0; i < position.count; i += 3) {
      const ids = [0, 1, 2].map(offset => getNode(new Vector3().fromBufferAttribute(position, i + offset).normalize()));
      for (let edge = 0; edge < 3; edge++) {
        const a = ids[edge], b = ids[(edge + 1) % 3];
        if (this.clear(this.nodes[a].normal, this.nodes[b].normal)) {
          this.nodes[a].edges.add(b); this.nodes[b].edges.add(a);
        }
      }
    }
    geometry.dispose();
  }
  clear(a: Vector3, b: Vector3) {
    const length = distance(a, b);
    if (length > 48) return false;
    const count = Math.max(1, Math.ceil(length / 0.35));
    const direction = tangent(b, a);
    for (let i = 0; i <= count; i++) {
      const point = stepOnSphere(a, direction, length * i / count);
      if (isLocked(point)) return false;
      for (const collider of this.colliders) {
        if (distance(point, collider.normal) < collider.radius + 0.29) return false;
      }
    }
    return true;
  }
  stop() { this.route = []; this.active = false; }
  plan(start: Vector3, requested: Vector3): boolean {
    this.stop();
    if (isLocked(requested)) return false;
    const target = resolveCollisions(requested, this.colliders, 0.34);
    if (this.clear(start, target)) { this.route = [target]; this.active = true; return true; }
    const nearest = (point: Vector3) => this.nodes.map((node, id) => ({ id, distance: distance(point, node.normal) })).sort((a, b) => a.distance - b.distance).slice(0, 30).filter(node => this.clear(point, this.nodes[node.id].normal)).slice(0, 6);
    const starts = nearest(start), ends = nearest(target);
    if (!starts.length || !ends.length) return false;
    const endIds = new Set(ends.map(node => node.id));
    const costs = new Map<number, number>(), previous = new Map<number, number>();
    const open = new Set<number>(), closed = new Set<number>();
    for (const node of starts) { costs.set(node.id, node.distance); open.add(node.id); }
    let end = -1;
    while (open.size) {
      let current = -1, best = Infinity;
      for (const id of open) {
        const score = costs.get(id)! + distance(this.nodes[id].normal, target);
        if (score < best) { current = id; best = score; }
      }
      if (endIds.has(current)) { end = current; break; }
      open.delete(current); closed.add(current);
      for (const neighbor of this.nodes[current].edges) {
        if (closed.has(neighbor)) continue;
        const next = costs.get(current)! + distance(this.nodes[current].normal, this.nodes[neighbor].normal);
        if (next < (costs.get(neighbor) ?? Infinity)) {
          costs.set(neighbor, next); previous.set(neighbor, current); open.add(neighbor);
        }
      }
    }
    if (end < 0) return false;
    const path = [target];
    let cursor: number | undefined = end;
    while (cursor !== undefined) { path.unshift(this.nodes[cursor].normal); cursor = previous.get(cursor); }
    let anchor = start, index = 0;
    while (index < path.length) {
      let farthest = index;
      for (let test = path.length - 1; test > index; test--) if (this.clear(anchor, path[test])) { farthest = test; break; }
      this.route.push(path[farthest].clone()); anchor = path[farthest]; index = farthest + 1;
    }
    this.active = true;
    return true;
  }
  direction(normal: Vector3) {
    while (this.route.length && distance(normal, this.route[0]) < 0.28) this.route.shift();
    if (!this.route.length) { this.active = false; return new Vector3(); }
    return tangent(this.route[0], normal);
  }
}
