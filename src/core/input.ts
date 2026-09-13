import { Vector2 } from 'three';
import { element } from '../ui';

export interface InputCallbacks {
  interact: () => void; jump: () => void; toggleView: () => void; journal: () => void; escape: () => void;
  drag: (dx: number, dy: number) => void; zoom: (factor: number) => void; ground: (x: number, y: number) => void;
  movement: () => void; enabled: () => boolean; dialogue: () => boolean; nextDialogue: () => void;
  menuEnabled: () => boolean;
}
export class Input {
  keys = new Set<string>();
  joystick = new Vector2();
  touchSpeed = false;
  pointerMap = new Map<number, { x: number; y: number }>();
  private dragDistance = 0;
  private pinchDistance = 0;
  private joystickPointer: number | null = null;
  private speedPointer: number | null = null;
  constructor(private canvas: HTMLCanvasElement, callbacks: InputCallbacks) {
    // Some touch browsers synthesize clicks only for the primary finger. Keep
    // ordinary buttons usable while another finger holds the movement stick.
    const secondaryPresses=new Map<number,{button:HTMLButtonElement;x:number;y:number}>();
    const activated=new WeakMap<HTMLButtonElement,number>();
    const buttonAt=(target:EventTarget|null)=>target instanceof Element?target.closest<HTMLButtonElement>('button'):null;
    document.addEventListener('pointerdown',event=>{
      const button=buttonAt(event.target);
      if(event.pointerType==='touch'&&!event.isPrimary&&button&&!button.disabled&&button.id!=='speed-button')secondaryPresses.set(event.pointerId,{button,x:event.clientX,y:event.clientY});
    });
    document.addEventListener('pointerup',event=>{
      const press=secondaryPresses.get(event.pointerId);secondaryPresses.delete(event.pointerId);
      if(!press||press.button!==buttonAt(event.target)||Math.hypot(event.clientX-press.x,event.clientY-press.y)>12)return;
      event.preventDefault();activated.set(press.button,performance.now());press.button.click();
    });
    document.addEventListener('pointercancel',event=>secondaryPresses.delete(event.pointerId));
    document.addEventListener('click',event=>{
      const button=buttonAt(event.target),time=button?activated.get(button):undefined;
      // A browser that also sends a native click must not advance dialogue twice.
      if(event.isTrusted&&event.detail>0&&time!==undefined&&performance.now()-time<600){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    window.addEventListener('blur',()=>secondaryPresses.clear());
    document.addEventListener('visibilitychange',()=>secondaryPresses.clear());
    window.addEventListener('keydown', event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      if (callbacks.dialogue() && ['e',' ','enter'].includes(key) && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); if(!event.repeat)callbacks.nextDialogue(); return; }
      if (!callbacks.enabled()) {
        if(callbacks.menuEnabled()&&['j','escape'].includes(key)){
          event.preventDefault();if(!event.repeat){if(key==='j')callbacks.journal();else callbacks.escape();}
        }
        return;
      }
      if (!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',' ','e','m','j','escape'].includes(key)) return;
      if (event.target instanceof HTMLButtonElement && key === ' ') return;
      event.preventDefault();
      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)) {
        this.keys.add(key);if(key!=='shift')callbacks.movement();
      }
      if (!event.repeat) {
        if(key==='e')callbacks.interact();
        if(key===' ')callbacks.jump();
        if(key==='m')callbacks.toggleView();
        if(key==='j')callbacks.journal();
        if(key==='escape')callbacks.escape();
      }
    });
    window.addEventListener('keyup',event=>this.keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur',()=>this.clear());
    document.addEventListener('visibilitychange',()=>this.clear());
    canvas.addEventListener('pointerdown',event=>{
      if(document.querySelector('dialog[open]')||callbacks.dialogue())return;
      canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);this.pointerMap.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(this.pointerMap.size===1)this.dragDistance=0;
      else {const values=[...this.pointerMap.values()];this.pinchDistance=Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);this.dragDistance=100;}
    });
    canvas.addEventListener('pointermove',event=>{
      const old=this.pointerMap.get(event.pointerId);if(!old)return;
      const dx=event.clientX-old.x,dy=event.clientY-old.y;
      this.pointerMap.set(event.pointerId,{x:event.clientX,y:event.clientY});this.dragDistance+=Math.hypot(dx,dy);
      if(this.pointerMap.size>1){const values=[...this.pointerMap.values()];const distance=Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);if(distance>0&&this.pinchDistance>0)callbacks.zoom(this.pinchDistance/distance);this.pinchDistance=distance;}
      else if(this.dragDistance>5){canvas.classList.add('dragging');callbacks.drag(dx,dy);}
    });
    canvas.addEventListener('pointerup',event=>{
      const single=this.pointerMap.size===1;
      if(this.pointerMap.has(event.pointerId)&&single&&this.dragDistance<7&&callbacks.enabled())callbacks.ground(event.clientX,event.clientY);
      this.pointerMap.delete(event.pointerId);canvas.classList.remove('dragging');
    });
    canvas.addEventListener('pointercancel',event=>{this.pointerMap.delete(event.pointerId);this.dragDistance=100;canvas.classList.remove('dragging');});
    canvas.addEventListener('wheel',event=>{event.preventDefault();if(!document.querySelector('dialog[open]')&&!callbacks.dialogue())callbacks.zoom(Math.exp(Math.max(-100,Math.min(100,event.deltaY))*.0017));},{passive:false});
    canvas.addEventListener('contextmenu',event=>event.preventDefault());
    const joystick=element('joystick');
    const move=(event:PointerEvent)=>{const rect=joystick.getBoundingClientRect();const x=event.clientX-rect.left-rect.width/2,y=event.clientY-rect.top-rect.height/2;const factor=Math.min(1,30/(Math.hypot(x,y)||1));this.joystick.set(x*factor/30,-y*factor/30);element('joystick-knob').style.transform=`translate(${x*factor}px,${y*factor}px)`;};
    joystick.addEventListener('pointerdown',event=>{if(!callbacks.enabled())return;event.preventDefault();this.joystickPointer=event.pointerId;joystick.setPointerCapture(event.pointerId);move(event);callbacks.movement();});
    joystick.addEventListener('pointermove',event=>{if(event.pointerId===this.joystickPointer)move(event);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,()=>{this.joystickPointer=null;this.joystick.set(0,0);element('joystick-knob').style.transform='translate(0,0)';});
    const speed=element('speed-button');
    speed.addEventListener('pointerdown',event=>{if(!callbacks.enabled())return;event.preventDefault();speed.setPointerCapture(event.pointerId);this.speedPointer=event.pointerId;this.touchSpeed=true;speed.classList.add('active');});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])speed.addEventListener(type,()=>{this.speedPointer=null;this.touchSpeed=false;speed.classList.remove('active');});
    element('jump-button').addEventListener('click',()=>{if(callbacks.enabled())callbacks.jump();});
  }
  axes() {return new Vector2((this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0)+this.joystick.x,(this.keys.has('w')||this.keys.has('arrowup')?1:0)-(this.keys.has('s')||this.keys.has('arrowdown')?1:0)+this.joystick.y);}
  get running(){return this.touchSpeed||this.keys.has('shift');}
  clear(){this.keys.clear();this.joystick.set(0,0);this.touchSpeed=false;this.pointerMap.clear();this.dragDistance=0;this.canvas.classList.remove('dragging');if(this.joystickPointer!==null&&element('joystick').hasPointerCapture(this.joystickPointer))element('joystick').releasePointerCapture(this.joystickPointer);if(this.speedPointer!==null&&element('speed-button').hasPointerCapture(this.speedPointer))element('speed-button').releasePointerCapture(this.speedPointer);this.joystickPointer=this.speedPointer=null;element('joystick-knob').style.transform='translate(0,0)';element('speed-button').classList.remove('active');}
}
