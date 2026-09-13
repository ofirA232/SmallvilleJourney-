import type { ChallengeDefinition } from './types';
import { PowerChallenge } from './core/power-challenge';
import { svg } from './ui';

/** Playable encounters use the same controls on a keyboard or a touch screen. */
export class EncounterUI {
  readonly panel=document.createElement('dialog');
  power:PowerChallenge|null=null;
  private definition:ChallengeDefinition|null=null;
  private done:(()=>void)|null=null;
  private question=0;
  private completed=false;
  private paused=false;
  constructor(private pause:()=>void,private feedback:(success:boolean)=>void,private closed:()=>void){
    this.panel.id='encounter';this.panel.className='encounter-panel';this.panel.setAttribute('aria-labelledby','encounter-title');document.body.append(this.panel);
    this.panel.addEventListener('cancel',event=>{event.preventDefault();this.cancel();});
    window.addEventListener('keydown',event=>{
      if(!this.panel.open)return;
      if(['e',' '].includes(event.key.toLowerCase())&&this.power&&!this.completed){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)this.power.press();}
      if(event.key==='Escape'||event.key.toLowerCase()==='j'){event.preventDefault();event.stopImmediatePropagation();this.cancel();}
    },true);
    window.addEventListener('keyup',event=>{if(this.panel.open&&['e',' '].includes(event.key.toLowerCase())&&this.power&&!this.completed){event.preventDefault();event.stopImmediatePropagation();this.release();}},true);
    window.addEventListener('blur',()=>{this.paused=true;this.power?.interrupt();this.paint();});
    window.addEventListener('focus',()=>{this.paused=false;});
    document.addEventListener('visibilitychange',()=>{this.paused=document.hidden;this.power?.interrupt();this.paint();});
  }
  get active(){return this.panel.open;}
  open(definition:ChallengeDefinition,done:()=>void){
    this.pause();this.definition=definition;this.done=done;this.question=0;this.completed=false;this.paused=false;
    this.power=definition.kind==='power'?new PowerChallenge(definition):null;
    this.panel.classList.toggle('is-power',!!this.power);document.body.classList.toggle('power-active',!!this.power);
    this.panel.innerHTML=`<div class="encounter-top"><span class="eyebrow">${definition.kind==='power'?'EXTRAORDINARY STRENGTH · HUMAN CONTROL':'OBSERVE & CONNECT'}</span><button id="encounter-close" class="icon-button" aria-label="Leave encounter">${svg('close')}</button></div><h2 id="encounter-title">${definition.title}</h2><div id="encounter-content"></div><p id="encounter-feedback" role="status" aria-live="polite"></p><button id="encounter-finish" class="primary-button" hidden><span>${definition.kind==='power'?'Finish the move':'Share the conclusion'}</span>${svg('arrow')}</button><p class="encounter-footnote">You can leave and try again. Your story is safe.</p>`;
    this.panel.querySelector('#encounter-close')!.addEventListener('click',()=>this.cancel());
    this.panel.querySelector('#encounter-finish')!.addEventListener('click',()=>{if(!this.completed)return;const callback=this.done;this.close();callback?.();});
    if(definition.kind==='power'){
      this.content.innerHTML=`<p class="encounter-instruction">${definition.instruction}</p><div class="power-emblem">${svg('speed')}<span>Find the strength.<br><em>Keep the control.</em></span></div><div class="power-beats">${definition.beats.map((beat,index)=>`<span data-beat="${index}"><i>${index+1}</i>${beat}</span>`).join('')}</div><div class="power-readout"><span id="power-phase">${definition.beats[0]}</span><span id="power-percent">0%</span></div><div id="power-meter" class="power-meter" role="meter" aria-label="Strength control" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="power-zone" style="left:${definition.zone[0]*100}%;width:${(definition.zone[1]-definition.zone[0])*100}%"><span>RELEASE</span></div><i id="power-fill"></i><b id="power-needle"></b></div><button id="power-hold" class="power-hold">${svg('speed')}<span>Hold to build strength<small>Release inside the gold zone · E / Space</small></span></button>`;
      const button=this.panel.querySelector<HTMLButtonElement>('#power-hold')!;
      button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);this.power!.press();});
      button.addEventListener('pointerup',event=>{event.preventDefault();this.release();});
      button.addEventListener('pointercancel',()=>{this.power?.interrupt();this.paint();});
      button.addEventListener('lostpointercapture',()=>{this.power?.interrupt();});
      this.message('No rush. Hold, watch the marker, then let go.');
    }else this.paintEvidence();
    this.panel.showModal();this.paint();
  }
  private get content(){return this.panel.querySelector<HTMLElement>('#encounter-content')!;}
  private message(text:string,kind=''){const output=this.panel.querySelector<HTMLElement>('#encounter-feedback');if(output){output.textContent=text;output.dataset.kind=kind;}}
  private release(){
    if(this.paused||document.hidden){this.power?.interrupt();return;}
    const result=this.power?.release();if(!result)return;this.feedback(result==='hit');
    this.message(result==='hit'?'Controlled. Exactly enough.':'A little too much, or too little. Breathe and try that step again.',result);
    if(this.power?.complete)this.finish();this.paint();
  }
  private finish(){
    this.completed=true;this.panel.querySelector<HTMLButtonElement>('#encounter-finish')!.hidden=false;
    const button=this.panel.querySelector<HTMLButtonElement>('#power-hold');if(button)button.disabled=true;
    this.message(this.power?'You found the balance. Ready when you are.':'The evidence fits. You are ready to share your conclusion.','hit');
  }
  private paintEvidence(){
    const definition=this.definition;if(definition?.kind!=='evidence')return;
    const question=definition.questions[this.question];
    this.content.innerHTML=`<div class="evidence-board">${definition.cards.map((card,index)=>`<article class="evidence-card"><span class="evidence-pin"></span><small>EXHIBIT 0${index+1} / ${card.date}</small><h3>${card.title}</h3><p>${card.text}</p></article>`).join('')}</div><div class="deduction-prompt"><span class="eyebrow">CONNECTION ${this.question+1} OF ${definition.questions.length}</span><h3>${question.prompt}</h3></div><div class="deduction-options">${question.choices.map((choice,index)=>`<button data-answer="${index}"><span>${String.fromCharCode(65+index)}</span>${choice}</button>`).join('')}</div>`;
    this.content.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(button=>button.addEventListener('click',()=>{
      if(this.completed)return;
      const correct=Number(button.dataset.answer)===question.answer;this.feedback(correct);
      if(!correct){button.classList.add('incorrect');this.message(question.explanation,'miss');return;}
      this.question++;
      if(this.question===definition.questions.length){this.content.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(value=>value.disabled=true);button.classList.add('correct');this.finish();}
      else{this.paintEvidence();this.message('That connection holds. Follow the next lead.','hit');}
    }));
  }
  update(dt:number){if(!this.active)return;if(this.power?.update(Math.min(.1,dt),this.paused||document.hidden)){this.feedback(false);this.message('Too much force. Let go earlier and try again.','miss');}this.paint();}
  private paint(){
    if(!this.panel.open||!this.power)return;
    const charge=this.power.charge*100;
    const meter=this.panel.querySelector<HTMLElement>('#power-meter')!;meter.setAttribute('aria-valuenow',String(Math.round(charge)));meter.classList.toggle('in-zone',this.power.inZone);
    this.panel.querySelector<HTMLElement>('#power-fill')!.style.width=`${charge}%`;this.panel.querySelector<HTMLElement>('#power-needle')!.style.left=`${charge}%`;
    this.panel.querySelector('#power-percent')!.textContent=`${Math.round(charge)}%`;
    this.panel.querySelector('#power-phase')!.textContent=this.paused?'Paused — return when ready':this.power.complete?'Control achieved':this.power.definition.beats[this.power.hits];
    this.panel.querySelectorAll<HTMLElement>('[data-beat]').forEach(beat=>beat.classList.toggle('done',Number(beat.dataset.beat)<this.power!.hits));
  }
  cancel(){this.close();}
  private close(){this.power?.interrupt();this.done=null;this.power=null;this.definition=null;this.panel.close();document.body.classList.remove('power-active');this.closed();document.getElementById('world')?.focus({preventScroll:true});}
}
