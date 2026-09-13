import type { MemoryDefinition } from './types';
import type { Story } from './core/story';
import { svg } from './ui';

export class FieldNotes {
  private prompt=document.createElement('button');
  private panel=document.createElement('dialog');
  private list=document.createElement('section');
  nearby:MemoryDefinition|null=null;
  constructor(private story:Story,private pause:()=>void,private changed:()=>void){
    this.prompt.id='note-prompt';this.prompt.hidden=true;this.prompt.className='note-prompt';document.getElementById('app')!.append(this.prompt);
    this.prompt.addEventListener('click',()=>this.observe());
    this.panel.id='field-note';this.panel.className='panel field-note-panel';this.panel.setAttribute('aria-labelledby','field-note-title');document.body.append(this.panel);
    this.panel.addEventListener('cancel',()=>document.getElementById('world')?.focus());
    this.list.id='collected-notes';document.getElementById('journal-story')!.append(this.list);this.refresh();
  }
  show(note:MemoryDefinition|null){
    if(this.nearby?.id===note?.id)return;
    this.nearby=note;this.prompt.hidden=!note;
    if(note)this.prompt.innerHTML=`${svg('journal')}<span><small>A SMALL DETAIL</small>${note.title}</span><span class="note-key">E</span>`;
  }
  observe(){
    if(!this.nearby)return false;const note=this.nearby;this.pause();
    this.story.remember(note.id);this.changed();this.refresh();this.show(null);
    this.read(note);return true;
  }
  private read(note:MemoryDefinition){
    this.pause();
    this.panel.innerHTML=`<span class="eyebrow">${note.detail}</span><div class="note-illustration">${svg('journal')}</div><h2 id="field-note-title">${note.title}</h2><p class="note-prose">${note.text}</p><p class="note-saved">${this.story.memories.size} / ${this.story.episode.memories?.length??0} moments remembered</p><button id="note-close" class="primary-button"><span>Keep this moment</span>${svg('check')}</button>`;
    this.panel.querySelector('#note-close')!.addEventListener('click',()=>{this.panel.close();document.getElementById('world')?.focus({preventScroll:true});});this.panel.showModal();
  }
  refresh(){
    const memories=this.story.episode.memories??[];this.list.hidden=!memories.length;
    this.list.innerHTML=`<div class="notes-heading"><span class="eyebrow">THE LITTLE THINGS</span><span>${this.story.memories.size} / ${memories.length}</span></div><p>A few reasons to take the long way home.</p><div class="notes-grid">${memories.map(note=>`<button data-memory="${note.id}" ${this.story.memories.has(note.id)?'':'disabled'}>${svg(this.story.memories.has(note.id)?'journal':'lock')}<span>${this.story.memories.has(note.id)?note.title:'A moment waiting to be found'}</span></button>`).join('')}</div>`;
    this.list.querySelectorAll<HTMLButtonElement>('[data-memory]').forEach(button=>button.addEventListener('click',()=>this.read(memories.find(note=>note.id===button.dataset.memory)!)));
  }
}
