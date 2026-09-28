import { t } from './i18n';
import type * as THREE from 'three';

/** Three full turns, against the clock, before Jeremy reaches the sprinkler system. */
export const VALVE_TURNS = 3, VALVE_SECONDS = 12;
const FULL = Math.PI * 2;
/** Arrow keys (or WASD) pressed clockwise each turn the wheel a quarter. */
const QUARTERS: Record<string, number> = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };

export interface ValveHooks { active(): boolean; cue(id: string): void; done(): void }

/** Clark forces the sprinkler valve shut by spinning its wheel: drag around it (mouse or touch) or
 * press the arrow keys in clockwise order. Only clockwise progress counts. If the clock runs out,
 * Jeremy gets there first and the player can try again. */
export class ValveChallenge {
  /** Clockwise rotation so far, in radians. */
  angle = 0;
  remaining = VALVE_SECONDS;
  phase: 'turning' | 'failed' | 'sealed' = 'turning';
  readonly panel = document.createElement('section');
  private wheel: SVGGElement;
  private drag: { pointer: number; angle: number } | null = null;
  private nextQuarter = 0;
  private sealedFor = 0;
  constructor(private hooks: ValveHooks, private prop: THREE.Object3D | null) {
    this.panel.id = 'valve'; this.panel.className = 'valve'; this.panel.setAttribute('role', 'group'); this.panel.setAttribute('aria-label', t('Sprinkler valve'));
    const spokes = [0, 1, 2, 3, 4, 5].map(i => `<line x1="100" y1="100" x2="${100 + Math.cos(i * Math.PI / 3) * 70}" y2="${100 + Math.sin(i * Math.PI / 3) * 70}"/>`).join('');
    this.panel.innerHTML = `<p class="valve-eyebrow">${t('JEREMY IS HEADING FOR THE SPRINKLERS')}</p><h2>${t('Seal the valve')}</h2>
      <p class="valve-hint">${t('Turn the wheel three full times: drag around it, or press ↑ → ↓ ← in turn.')}</p>
      <svg class="valve-wheel" viewBox="0 0 200 200" aria-hidden="true"><circle class="valve-track" cx="100" cy="100" r="92"/><circle class="valve-progress" cx="100" cy="100" r="92" pathLength="100"/><g class="valve-spin"><circle class="valve-rim" cx="100" cy="100" r="72"/>${spokes}<circle class="valve-hub" cx="100" cy="100" r="14"/><circle class="valve-grip" cx="100" cy="28" r="9"/></g></svg>
      <div class="valve-readout"><strong id="valve-turns">0 / ${VALVE_TURNS}</strong><span id="valve-clock"></span></div>
      <div class="valve-time"><i id="valve-time"></i></div>
      <p id="valve-message" role="status" aria-live="polite"></p><button id="valve-retry" type="button" hidden>${t('Try again')}</button>`;
    document.body.appendChild(this.panel);
    this.wheel = this.panel.querySelector('.valve-spin')!;
    const svg = this.panel.querySelector('svg')!;
    svg.addEventListener('pointerdown', event => { if (this.phase !== 'turning') return; event.preventDefault(); svg.setPointerCapture(event.pointerId); this.drag = { pointer: event.pointerId, angle: this.pointerAngle(event) }; });
    svg.addEventListener('pointermove', event => {
      if (!this.drag || event.pointerId !== this.drag.pointer) return;
      const angle = this.pointerAngle(event); let delta = angle - this.drag.angle; this.drag.angle = angle;
      if (delta > Math.PI) delta -= FULL; if (delta < -Math.PI) delta += FULL;
      this.turn(delta);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) svg.addEventListener(type, () => { this.drag = null; });
    this.panel.querySelector('#valve-retry')!.addEventListener('click', () => { if (this.hooks.active()) this.restart(); });
    window.addEventListener('keydown', this.key, true);
    this.paint();
  }
  private key = (event: KeyboardEvent) => {
    const quarter = QUARTERS[event.code]; if (quarter === undefined) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.repeat || this.phase !== 'turning' || !this.hooks.active()) return;
    if (quarter === this.nextQuarter) this.turn(Math.PI / 2);
  };
  /** Screen angle of the pointer around the wheel's centre; it grows clockwise. */
  private pointerAngle(event: PointerEvent) {
    const bounds = this.panel.querySelector('svg')!.getBoundingClientRect();
    return Math.atan2(event.clientY - (bounds.top + bounds.height / 2), event.clientX - (bounds.left + bounds.width / 2));
  }
  private turn(delta: number) {
    if (this.phase !== 'turning' || !this.hooks.active()) return;
    const before = Math.floor(this.angle / (Math.PI / 2));
    this.angle = Math.max(0, this.angle + delta);
    const after = Math.floor(this.angle / (Math.PI / 2));
    this.nextQuarter = after % 4;
    if (after > before) this.hooks.cue('creak');
    if (this.angle >= VALVE_TURNS * FULL) { this.angle = VALVE_TURNS * FULL; this.phase = 'sealed'; this.hooks.cue('sealed'); this.message(t('The valve is sealed. The dance floor stays dry.')); }
    this.paint();
  }
  update(dt: number) {
    if (this.phase === 'turning') {
      this.remaining = Math.max(0, this.remaining - dt);
      if (this.remaining === 0) { this.phase = 'failed'; this.hooks.cue('caught'); this.message(t('Too slow. Jeremy reached the pipes first.')); (this.panel.querySelector('#valve-retry') as HTMLElement).hidden = false; }
    } else if (this.phase === 'sealed') {
      this.sealedFor += dt; if (this.sealedFor > .9) { this.dispose(); this.hooks.done(); return; }
    }
    this.paint();
  }
  private restart() {
    this.angle = 0; this.remaining = VALVE_SECONDS; this.phase = 'turning'; this.nextQuarter = 0;
    (this.panel.querySelector('#valve-retry') as HTMLElement).hidden = true; this.message(''); this.paint();
  }
  private message(text: string) { this.panel.querySelector('#valve-message')!.textContent = text; }
  private paint() {
    const turns = this.angle / FULL;
    this.wheel.setAttribute('transform', `rotate(${this.angle * 180 / Math.PI} 100 100)`);
    (this.panel.querySelector('.valve-progress') as SVGCircleElement).style.strokeDasharray = `${turns / VALVE_TURNS * 100} 100`;
    this.panel.querySelector('#valve-turns')!.textContent = `${Math.min(VALVE_TURNS, Math.floor(turns + 1e-6))} / ${VALVE_TURNS}`;
    this.panel.querySelector('#valve-clock')!.textContent = `${Math.ceil(this.remaining)}s`;
    (this.panel.querySelector('#valve-time') as HTMLElement).style.width = `${this.remaining / VALVE_SECONDS * 100}%`;
    this.panel.dataset.phase = this.phase; this.panel.dataset.next = String(this.nextQuarter);
    if (this.prop) this.prop.rotation.z = -this.angle;
  }
  dispose() { this.panel.remove(); window.removeEventListener('keydown', this.key, true); }
}
