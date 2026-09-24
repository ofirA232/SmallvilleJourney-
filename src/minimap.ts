import {Vector3} from 'three';
import {locations,locationById} from './content/locations';
import {at,fromLatLon,isWater} from './core/sphere';
import type {LocationId,QuestDefinition} from './types';
import {svg} from './ui';
import './minimap.css';

export function mapPoint(normal:Vector3){return {x:120+Math.atan2(normal.x,normal.z)*120/Math.PI,y:60-Math.asin(Math.max(-1,Math.min(1,normal.y)))*120/Math.PI};}
// The canvas is drawn at roughly 2x its on-screen width; SCALE converts mapPoint units to canvas pixels.
const WIDTH=640,HEIGHT=320,SCALE=WIDTH/240;
// Label text and placement relative to each dot, spread so neighbouring names never collide.
const labels:Record<LocationId,{text:string,dx:number,dy:number,align:CanvasTextAlign}>={farm:{text:'Kent Farm',dx:0,dy:-15,align:'center'},school:{text:'School',dx:11,dy:9,align:'left'},bridge:{text:'Bridge',dx:0,dy:33,align:'center'},mansion:{text:'Mansion',dx:0,dy:-15,align:'center'},cemetery:{text:'Cemetery',dx:0,dy:-15,align:'center'},cornfield:{text:'Riley Field',dx:0,dy:33,align:'center'},metropolis:{text:'Metropolis (locked)',dx:0,dy:33,align:'center'}};
export class MiniMap {
  readonly panel=document.createElement('section');
  private canvas=document.createElement('canvas');
  private base=document.createElement('canvas');
  private context:CanvasRenderingContext2D|null;
  // Phones start with the map folded into a button so it never covers the play area uninvited.
  private collapsed=matchMedia('(max-width:700px),(pointer:coarse)').matches;
  constructor(go:()=>void){
    this.panel.id='minimap';this.panel.hidden=true;this.panel.setAttribute('aria-label','Navigation map');
    this.panel.innerHTML=`<button id="minimap-toggle" aria-controls="minimap-body" aria-label="Smallville map">${svg('map')}<span class="minimap-short" aria-hidden="true">MAP</span><span class="minimap-title">SMALLVILLE MAP</span><span class="minimap-state" aria-hidden="true"></span></button><div id="minimap-body"><div id="minimap-drawing"></div><div id="minimap-actions"><p id="minimap-caption"></p><button id="minimap-go">Go to objective →</button></div><small><i></i> You <b>◇</b> Objective <span>· North ↑</span></small></div>`;
    this.canvas.width=WIDTH;this.canvas.height=HEIGHT;this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','World map: you are the white arrow; your objective is gold.');
    this.panel.querySelector('#minimap-drawing')!.appendChild(this.canvas);document.body.appendChild(this.panel);
    this.context=this.canvas.getContext('2d');this.base.width=WIDTH;this.base.height=HEIGHT;
    const ctx=this.base.getContext('2d');
    if(ctx){
      for(let y=0;y<HEIGHT;y+=4)for(let x=0;x<WIDTH;x+=4){ctx.fillStyle=isWater(fromLatLon(90-(y+2)*180/HEIGHT,(x+2)*360/WIDTH-180))?'#477c7c':'#456248';ctx.fillRect(x,y,4,4);}
      ctx.strokeStyle='#cbdcb51c';ctx.lineWidth=1;
      for(let x=0;x<=WIDTH;x+=WIDTH/6){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}
      for(let y=0;y<=HEIGHT;y+=HEIGHT/4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke();}
    }
    this.setCollapsed(this.collapsed);
    this.panel.querySelector('#minimap-toggle')!.addEventListener('click',()=>this.setCollapsed(!this.collapsed));
    this.panel.querySelector('#minimap-go')!.addEventListener('click',go);
  }
  private setCollapsed(collapsed:boolean){
    this.collapsed=collapsed;this.panel.classList.toggle('collapsed',collapsed);
    this.panel.querySelector<HTMLElement>('#minimap-body')!.hidden=collapsed;
    this.panel.querySelector('#minimap-toggle')!.setAttribute('aria-expanded',String(!collapsed));
    this.panel.querySelector('.minimap-state')!.textContent=collapsed?'+':'−';
  }
  update(normal:Vector3,forward:Vector3,location:LocationId,quest:QuestDefinition|undefined,visible:boolean){
    this.panel.hidden=!visible;if(!visible)return;
    const caption=this.panel.querySelector('#minimap-caption')!;caption.textContent=quest?`Next: ${locationById[quest.location].name}`:locationById[location].name;
    this.panel.querySelector<HTMLButtonElement>('#minimap-go')!.hidden=!quest;
    const p=mapPoint(normal);this.canvas.dataset.position=`${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    this.canvas.setAttribute('aria-label',`You: ${locationById[location].name}. ${quest?`Objective: ${locationById[quest.location].name}.`:'Explore Smallville.'} Metropolis is locked.`);
    const ctx=this.context;if(!ctx||this.collapsed)return;
    ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(this.base,0,0);ctx.font='600 26px Inter,"Segoe UI",sans-serif';ctx.lineJoin='round';
    for(const place of locations){
      const point=mapPoint(at(place.id)),x=point.x*SCALE,y=point.y*SCALE,objective=quest?.location===place.id;
      ctx.fillStyle=place.locked?'#a4aaa0':objective?'#ffdb7d':'#deceb0';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
      // A dark halo keeps labels readable over both land and water.
      const label=labels[place.id];ctx.textAlign=label.align;ctx.strokeStyle='#102a28e6';ctx.lineWidth=6;ctx.strokeText(label.text,x+label.dx,y+label.dy);ctx.fillText(label.text,x+label.dx,y+label.dy);
    }
    if(quest){const target=mapPoint(at(quest.location,quest.point)),x=target.x*SCALE,y=target.y*SCALE;ctx.strokeStyle='#ffdb7d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y-13);ctx.lineTo(x+13,y);ctx.lineTo(x,y+13);ctx.lineTo(x-13,y);ctx.closePath();ctx.stroke();}
    const ahead=mapPoint(normal.clone().addScaledVector(forward,.015).normalize());let dx=ahead.x-p.x;if(dx>120)dx-=240;if(dx< -120)dx+=240;
    ctx.save();ctx.translate(p.x*SCALE,p.y*SCALE);ctx.rotate(Math.atan2(ahead.y-p.y,dx));ctx.scale(2.6,2.6);ctx.fillStyle='#fff9df';ctx.strokeStyle='#102a28';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(-4,-3.5);ctx.lineTo(-2,0);ctx.lineTo(-4,3.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
}
