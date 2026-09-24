import {Vector3} from 'three';
import {locations,locationById} from './content/locations';
import {at,fromLatLon,isWater} from './core/sphere';
import type {LocationId,QuestDefinition} from './types';
import './minimap.css';

export function mapPoint(normal:Vector3){return {x:120+Math.atan2(normal.x,normal.z)*120/Math.PI,y:60-Math.asin(Math.max(-1,Math.min(1,normal.y)))*120/Math.PI};}
export class MiniMap {
  readonly panel=document.createElement('section');
  private canvas=document.createElement('canvas');
  private base=document.createElement('canvas');
  private context:CanvasRenderingContext2D|null;
  private collapsed=false;
  constructor(go:()=>void){
    this.panel.id='minimap';this.panel.hidden=true;this.panel.setAttribute('aria-label','Navigation map');
    this.panel.innerHTML='<button id="minimap-toggle" aria-expanded="true" aria-controls="minimap-body"><span>SMALLVILLE MAP</span><span aria-hidden="true">−</span></button><div id="minimap-body"><div id="minimap-drawing"></div><p id="minimap-caption"></p><button id="minimap-go">Go to objective →</button><small><i></i> You <b>◇</b> Objective <span>· North ↑</span></small></div>';
    this.canvas.width=480;this.canvas.height=240;this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','World map: you are the white arrow; your objective is gold.');
    this.panel.querySelector('#minimap-drawing')!.appendChild(this.canvas);document.body.appendChild(this.panel);
    this.context=this.canvas.getContext('2d');this.base.width=240;this.base.height=120;
    const ctx=this.base.getContext('2d');
    if(ctx){
      for(let y=0;y<120;y+=2)for(let x=0;x<240;x+=2){ctx.fillStyle=isWater(fromLatLon(90-y*1.5,x*1.5-180))?'#477c7c':'#456248';ctx.fillRect(x,y,2,2);}
      ctx.strokeStyle='#cbdcb51c';ctx.lineWidth=.5;
      for(let x=0;x<=240;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,120);ctx.stroke();}
      for(let y=0;y<=120;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(240,y);ctx.stroke();}
    }
    this.panel.querySelector('#minimap-toggle')!.addEventListener('click',()=>{this.collapsed=!this.collapsed;this.panel.querySelector<HTMLElement>('#minimap-body')!.hidden=this.collapsed;this.panel.querySelector('#minimap-toggle')!.setAttribute('aria-expanded',String(!this.collapsed));});
    this.panel.querySelector('#minimap-go')!.addEventListener('click',go);
  }
  update(normal:Vector3,forward:Vector3,location:LocationId,quest:QuestDefinition|undefined,visible:boolean){
    this.panel.hidden=!visible;if(!visible)return;
    const caption=this.panel.querySelector('#minimap-caption')!;caption.textContent=quest?`Next: ${locationById[quest.location].name}`:locationById[location].name;
    this.panel.querySelector<HTMLButtonElement>('#minimap-go')!.hidden=!quest;
    const p=mapPoint(normal);this.canvas.dataset.position=`${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    this.canvas.setAttribute('aria-label',`You: ${locationById[location].name}. ${quest?`Objective: ${locationById[quest.location].name}.`:'Explore Smallville.'} Metropolis is locked.`);
    const ctx=this.context;if(!ctx||this.collapsed)return;
    ctx.setTransform(2,0,0,2,0,0);ctx.drawImage(this.base,0,0);ctx.font='8px sans-serif';ctx.textAlign='center';
    const labels:Record<LocationId,string>={farm:'Farm',school:'School',bridge:'Bridge',mansion:'Mansion',cemetery:'Cemetery',cornfield:'Field',metropolis:'City (locked)'};
    for(const place of locations){const point=mapPoint(at(place.id));ctx.fillStyle=place.locked?'#a4aaa0':'#deceb0';ctx.beginPath();ctx.arc(point.x,point.y,2,0,Math.PI*2);ctx.fill();ctx.fillText(labels[place.id],point.x,point.y+(place.id==='bridge'?12:-6));}
    if(quest){const target=mapPoint(at(quest.location,quest.point));ctx.strokeStyle='#ffdb7d';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(target.x,target.y-5);ctx.lineTo(target.x+5,target.y);ctx.lineTo(target.x,target.y+5);ctx.lineTo(target.x-5,target.y);ctx.closePath();ctx.stroke();}
    const ahead=mapPoint(normal.clone().addScaledVector(forward,.015).normalize());let dx=ahead.x-p.x;if(dx>120)dx-=240;if(dx< -120)dx+=240;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(ahead.y-p.y,dx));ctx.fillStyle='#fff9df';ctx.strokeStyle='#102a28';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(-4,-3.5);ctx.lineTo(-2,0);ctx.lineTo(-4,3.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
}
