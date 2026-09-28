import { actorNames, locations } from './content/locations';
import { portraitMarkup } from './portraits';
import { language, LANGUAGES, t, type Language } from './i18n';

import type { DialogueDefinition, DialogueLine, EpisodeDefinition, LocationId, QuestDefinition, Settings } from './types';
import type { Story } from './core/story';

export const icons = {
  star: '<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z"/><path d="m12 7 1.4 3.6L17 12l-3.6 1.4L12 17l-1.4-3.6L7 12l3.6-1.4Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="3.7" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/>',
  journal: '<path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-3-2H4zM20 4h-4a3 3 0 0 0-3 3m7-3v15h-4"/>',
  sound: '<path d="M3 9v6h4l5 4V5L7 9zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M3 9v6h4l5 4V5L7 9zM17 9l5 6m0-6-5 6"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  northeast: '<path d="M6 18 18 6M6 6h12v12"/>',
  pin: '<path d="M18 10c0 5-6 11-6 11S6 15 6 10a6 6 0 0 1 12 0Z"/><circle cx="12" cy="10" r="2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  speed: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
  jump: '<path d="M5 21h14M12 17V4m-5 5 5-5 5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  map: '<path d="M9 4 3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
};
/** Arrows point the way the text reads, so in right-to-left text they are drawn mirrored. */
const MIRRORED = new Set<keyof typeof icons>(['arrow', 'northeast']);
export const svg = (id: keyof typeof icons, className = '') => {
  const mirrored = MIRRORED.has(id) && typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${mirrored ? `<g transform="matrix(-1 0 0 1 24 0)">${icons[id]}</g>` : icons[id]}</svg>`;
};
export function element<T extends HTMLElement = HTMLElement>(id: string) { return document.getElementById(id) as T; }
/** The language the language button switches to: the other one. */
const otherLanguage = (): Language => language() === 'he' ? 'en' : 'he';

export class UI {
  dialogue: DialogueDefinition | null = null;
  dialogueLines: DialogueLine[] = [];
  lineIndex = 0;
  held = false;
  optional = false;
  dialogueDone: (() => void) | null = null;
  toastUntil = 0;
  callbacks: { navigate?: (location?: LocationId) => void; restart?: () => void; title?: () => void; settings?: (settings: Settings) => void; language?: (language: Language) => void; pause?: () => void } = {};
  constructor(private episode:EpisodeDefinition) {
    const pad=(value:number)=>String(value).padStart(2,'0');
    const seasonLabel=t('SEASON {number}',{number:pad(episode.season)}),episodeLabel=t('EPISODE {number}',{number:pad(episode.number)});
    const next=episode.nextEpisode;
    const ending=episode.ending??{title:t('Another chapter'),emphasis:t('worth remembering.'),summary:t('This chapter is complete. The little world is still yours.')};
    const switchTo=otherLanguage();
    element('app').innerHTML = `
      <canvas id="world" aria-label="${t('Smallville, an interactive spherical world')}" tabindex="0"></canvas>
      <div class="vignette" aria-hidden="true"></div><div class="film-grain" aria-hidden="true"></div>
      <header class="topbar">
        <button id="brand-button" class="wordmark" aria-label="${t('Smallville Journey home')}"><span class="brand-symbol">${svg('star')}</span><span><strong>SMALLVILLE</strong><small>${t('A JOURNEY BEGINS')}</small></span></button>
        <button id="episode-button" class="episode-pill"><span class="live-dot"></span><span>${seasonLabel} <i>/</i> ${episodeLabel}</span>${svg('journal')}</button>
        <nav class="tools" aria-label="${t('Game tools')}">
          <button id="view-button" class="icon-button" title="${t('Globe / follow view (M)')}" aria-label="${t('Switch globe and follow view')}">${svg('globe')}</button>
          <button id="sound-button" class="icon-button" title="${t('Enable sound')}" aria-label="${t('Enable sound')}" aria-pressed="false">${svg('mute')}</button>
          <button id="language-button" class="icon-button language-button" lang="${switchTo}" title="${LANGUAGES[switchTo].name}" aria-label="${LANGUAGES[switchTo].name}">${switchTo==='he'?'עב':'EN'}</button>
          <button id="journal-button" class="icon-button" title="${t('Journey journal (J)')}" aria-label="${t('Open journey journal')}">${svg('journal')}</button>
          <button id="settings-button" class="icon-button" title="${t('Settings and controls')}" aria-label="${t('Settings and controls')}">${svg('settings')}</button>
        </nav>
      </header>
      <main id="landing" class="landing">
        <div class="landing-eyebrow"><span></span> ${t('AN INTERACTIVE ORIGIN STORY')}</div>
        <h1>${t('Every legend <br>starts <em>somewhere.</em>')}</h1>
        <p class="landing-copy">${t('Before the cape. Before the city.<br>A boy, a small town, and a world of possibility.<br> Step into Clark Kent’s story.')}</p>
        <div class="landing-episode"><span class="episode-number">${pad(episode.number)}</span><div><span class="eyebrow">${seasonLabel} · ${t('THE BEGINNING')}</span><h2>${episode.title}</h2><p>${episode.tagline??episode.description}</p></div></div>
        <button id="begin-button" class="primary-button"><span>${t('Begin your journey')}</span>${svg('arrow')}</button>
        <button id="opening-music-button" class="text-button" aria-pressed="false">${t('Play opening music')}</button>
        <div class="landing-meta"><span>${svg('clock')} ${t('A 10–15 minute adventure')}</span><span class="meta-dot">·</span><span>${t('Your story saves as you go')}</span></div>
        <button id="landing-new" class="text-button" hidden>${t('Start a new journey')}</button>
      </main>
      <div class="map-label-layer">
        <div id="world-labels" aria-hidden="true"></div>
        <div id="target-label" class="target-label" hidden><span>${t('YOUR NEXT STEP')}</span><strong></strong></div>
      </div>
      <div id="chapter-hud" class="chapter-hud" hidden><span id="chapter-number" class="eyebrow"></span><span id="chapter-name"></span><div class="chapter-dots">${this.episode.chapters.map((_,index)=>`<i data-chapter="${index}"></i>`).join('')}</div></div>
      <div id="location-hud" class="location-hud" hidden><span class="eyebrow" id="location-subtitle"></span><h2 id="location-name"></h2><p id="location-description"></p><span class="location-coordinate">${t('SMALLVILLE, KANSAS')} <b>✦</b> ${episode.year??2001}</span></div>
      <section id="objective" class="objective" hidden aria-label="${t('Current objective')}">
        <div class="objective-heading"><span>${svg('star')} ${t('YOUR NEXT STEP')}</span><span id="objective-count"></span><button id="objective-toggle" class="objective-toggle" aria-expanded="true" aria-controls="objective-description" aria-label="${t('Collapse the objective card')}">−</button></div>
        <h3 id="objective-title"></h3><p id="objective-description"></p>
        <div class="objective-bottom"><button id="track-button">${svg('pin')}<span>${t('Walk to objective')}</span>${svg('northeast')}</button><span id="save-status" title="${t('Saved on this device')}">${svg('check')} ${t('Saved')}</span></div>
        <div class="objective-progress"><i id="objective-progress"></i></div>
      </section>
      <div id="interaction-area" class="interaction-area" hidden><button id="interact-button" class="interact-button"><span class="keycap">E</span><span><small id="interact-kind">${t('A MOMENT THAT MATTERS')}</small><strong id="interact-label"></strong></span>${svg('arrow')}<i id="interact-progress"></i></button></div>
      <div id="route-status" class="route-status" hidden><span class="live-dot"></span><span id="route-label">${t('Taking the scenic route')}</span><button id="cancel-route" aria-label="${t('Cancel route')}">${svg('close')}</button></div>
      <div id="weakness" class="weakness" hidden>${svg('speed')} ${t('KRYPTONITE NEARBY')} <span>${t('Your strength is fading')}</span></div>
      <div id="race-status" class="race-status" hidden>${svg('clock')}<span>${t('THE DANCE STARTS IN')}</span><strong id="race-clock">0:55</strong></div>
      <div id="toast" class="toast" role="status" aria-live="polite" hidden><span id="toast-title"></span><p id="toast-message"></p></div>
      <p id="save-warning" class="save-warning" role="status" hidden></p>
      <footer class="bottom-bar"><span class="bottom-caption"><span class="live-dot"></span> ${t('A LITTLE WORLD. AN EXTRAORDINARY STORY.')}</span><span id="landing-controls">${t('Drag to explore')} <i>·</i> ${t('Scroll to get closer')}</span><div id="desktop-controls" hidden><span><kbd>W A S D</kbd> ${t('walk')}</span><span><kbd>SHIFT</kbd> ${t('speed')}</span><span><kbd>SPACE</kbd> ${t('hop')}</span><span><kbd>E</kbd> ${t('interact')}</span><span><kbd>M</kbd> ${t('globe')}</span></div><button id="help-link" class="text-button">${t('How to play')} ${svg('northeast')}</button></footer>
      <div id="touch-controls" class="touch-controls" hidden><div id="joystick" aria-label="${t('Movement joystick')}" role="application"><i></i><span id="joystick-knob"></span></div><div class="touch-actions"><button id="speed-button" aria-label="${t('Hold for super speed')}">${svg('speed')}<span>${t('SPEED')}</span></button><button id="jump-button" aria-label="${t('Jump')}">${svg('jump')}</button></div></div>
      <section id="prologue" class="prologue" hidden aria-label="${t('Opening story')}"><button id="skip-intro" class="text-button">${t('Skip intro')} ${svg('arrow')}</button><div><span id="intro-year" class="eyebrow"></span><h2 id="intro-title"></h2><p id="intro-text"></p><button id="intro-next" class="primary-button"><span>${t('Continue')}</span>${svg('arrow')}</button><span id="intro-pages"></span></div></section>
      <section id="dialogue" class="dialogue" hidden aria-label="${t('Character dialogue')}" aria-live="polite"><div class="portrait" id="portrait"><span id="portrait-initial"></span><i></i></div><div class="dialogue-body"><div class="dialogue-heading"><span id="speaker"></span><span id="dialogue-count"></span></div><p id="dialogue-text"></p><div id="dialogue-choices" class="dialogue-choices" hidden></div><div class="dialogue-bottom"><span id="dialogue-hint">${t('Take your time. The world can wait.')}</span><button id="dialogue-next">${t('Continue')} ${svg('arrow')}</button></div></div></section>
      <dialog id="journal" class="panel journal-panel"><button class="close-panel" data-close="journal" aria-label="${t('Close journal')}">${svg('close')}</button><span class="eyebrow">${t('CLARK’S FIELD NOTES')}</span><h2>${t('A story worth living.')}</h2><p class="panel-intro">${t('Every place holds a memory. Every choice is a beginning.')}</p><div class="journal-tabs" role="tablist"><button id="tab-story" class="selected" role="tab" aria-selected="true">${t('The story')}</button><button id="tab-places" role="tab" aria-selected="false">${t('The places')}</button></div><div id="journal-story"><div class="journal-current"><span class="eyebrow">${seasonLabel} · ${episodeLabel}</span><h3>${episode.title} <span id="journal-percent">0%</span></h3><div class="journal-bar"><i id="journal-fill"></i></div></div><div id="journal-chapters"></div><button id="journal-track" class="primary-button"><span>${t('Continue the story')}</span>${svg('northeast')}</button><div class="next-episode"><span>${pad(next.number)}</span><div><strong>${next.title}</strong><small>${t('THE NEXT CHAPTER')}</small></div><em>${t('Coming soon')}</em></div></div><div id="journal-places" hidden></div><p class="journal-footnote">${svg('check')} ${t('Your journey is saved on this device.')}</p></dialog>
      <dialog id="settings" class="panel settings-panel"><button class="close-panel" data-close="settings" aria-label="${t('Close settings')}">${svg('close')}</button><span class="eyebrow">${t('MAKE YOURSELF AT HOME')}</span><h2>${t('Take the scenic route.')}</h2><p class="panel-intro">${t('A few things to help you find your way.')}</p><div class="settings-row"><label for="language-setting">${t('Language')}</label><select id="language-setting"><option value="en" lang="en">English</option><option value="he" lang="he">עברית</option></select></div><div class="settings-row"><label for="sound-setting">${t('Sound & atmosphere')}</label><input id="sound-setting" type="checkbox" /></div><div class="settings-row"><label for="motion-setting">${t('Reduce motion')}</label><input id="motion-setting" type="checkbox" /></div><div class="settings-row"><label for="quality-setting">${t('Graphics')}</label><select id="quality-setting"><option value="auto">${t('Automatic')}</option><option value="low">${t('Battery saver')}</option><option value="high">${t('High detail')}</option></select></div><div class="help-controls"><span>${t('Walk')}</span><b>${t('WASD / Arrow keys / Joystick')}</b><span>${t('Super speed')}</span><b>${t('Hold Shift / SPEED')}</b><span>${t('Hop')}</span><b>${t('Space / Jump button')}</b><span>${t('Interact')}</span><b>${t('E / Tap the gold prompt')}</b><span>${t('Look around')}</span><b>${t('Drag · Scroll or pinch to zoom')}</b><span>${t('Choose a view')}</span><b>${t('M / Globe button')}</b><span>${t('Journal')}</span><b>${t('J / Book button')}</b><span>${t('Stop a route')}</span><b>${t('Escape / Move manually')}</b></div><p class="panel-note">${t('Tap the ground to walk there. You can swim across the river. Green meteor stones weaken Clark—step away to regain your strength.')}</p><button id="return-title" class="secondary-button">${t('Return to title')}</button><button id="restart-button" class="text-button danger">${t('Restart this episode')}</button></dialog>
      <dialog id="restart-confirm" class="panel"><span class="eyebrow">${t('A FRESH START')}</span><h2>${t('Begin again?')}</h2><p class="panel-intro">${t('This will replace your saved journey with a new playthrough of this episode.')}</p><button id="confirm-restart" class="primary-button"><span>${t('Start a new journey')}</span>${svg('arrow')}</button><button id="cancel-restart" class="secondary-button">${t('Keep my journey')}</button></dialog>
      <dialog id="retry" class="panel"><span class="eyebrow">${t('TAKE A BREATH')}</span><h2>${t('There’s still time to try.')}</h2><p class="panel-intro">${t('Find the school on your map, then use your speed to reach Jeremy. Your story is safe at the last checkpoint.')}</p><button id="retry-button" class="primary-button"><span>${t('Try from the field')}</span>${svg('arrow')}</button></dialog>
      <dialog id="completion" class="panel completion-panel"><div class="completion-symbol">${svg('star')}</div><span class="eyebrow">${t('{season} · {episode} COMPLETE',{season:seasonLabel,episode:episodeLabel})}</span><h2>${ending.title}<br><em>${ending.emphasis}</em></h2><p class="panel-intro">${ending.summary}</p><div class="completion-stats"><span><b>${episode.chapters.length}</b>${t('chapters lived')}</span><span><b id="completion-places">6</b>${t('places discovered')}</span><span><b>1</b>${t('story begun')}</span></div><button id="keep-exploring" class="primary-button"><span>${t('Step outside into Smallville')}</span>${svg('arrow')}</button><button id="replay-button" class="text-button">${t('Play {title} again',{title:episode.title})}</button><div class="next-episode"><span>${pad(next.number)}</span><div><strong>${next.title}</strong><small>${t('THE NEXT CHAPTER')}</small></div><em>${t('Coming soon')}</em></div></dialog>
      <div id="loading" class="loading"><div class="loading-planet">${svg('star')}</div><h2>${t('Somewhere in Kansas…')}</h2><p>${t('Growing a little world.')}</p></div>
      <div id="fallback" class="fallback" hidden><span>${svg('star')}</span><h1>${t('A little more power.')}</h1><p>${t('This world needs WebGL 2 and graphics acceleration. Try a current Chrome, Edge, Firefox, or Safari browser.')}</p><button id="reload-button" class="primary-button">${t('Try again')} ${svg('arrow')}</button><small id="fallback-detail"></small></div>
      <output id="telemetry" class="sr-only" aria-hidden="true"></output>`;
    element('world-labels').innerHTML = locations.map(location=>`<div class="world-label ${location.locked?'locked':''}" data-location="${location.id}"><i></i><span>${t(location.name)}${location.locked?svg('lock'):''}</span></div>`).join('');
    document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button=>button.addEventListener('click',()=>this.close(button.dataset.close!)));
    for(const dialog of document.querySelectorAll<HTMLDialogElement>('dialog')) {
      dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom){if(dialog.id!=='retry')dialog.close();}}});
      dialog.addEventListener('cancel',event=>{if(dialog.id==='retry')event.preventDefault();});
    }
    element('dialogue-next').addEventListener('click',()=>this.nextDialogue());
    element('tab-story').addEventListener('click',()=>this.journalTab(false));element('tab-places').addEventListener('click',()=>this.journalTab(true));
    element('track-button').addEventListener('click',()=>this.callbacks.navigate?.());
    // On phones the objective card folds down to its title, like the map.
    element('objective-toggle').addEventListener('click',()=>{
      const collapsed=element('objective').classList.toggle('collapsed');
      element('objective-toggle').textContent=collapsed?'+':'−';element('objective-toggle').setAttribute('aria-expanded',String(!collapsed));
      element('objective-toggle').setAttribute('aria-label',collapsed?t('Expand the objective card'):t('Collapse the objective card'));
    });
    element('journal-track').addEventListener('click',()=>{this.close('journal');this.callbacks.navigate?.();});
    element('restart-button').addEventListener('click',()=>this.open('restart-confirm'));
    element('replay-button').addEventListener('click',()=>this.open('restart-confirm'));
    element('landing-new').addEventListener('click',()=>this.open('restart-confirm'));
    element('cancel-restart').addEventListener('click',()=>this.close('restart-confirm'));
    element('confirm-restart').addEventListener('click',()=>{this.closeAll();this.callbacks.restart?.();});
    element('return-title').addEventListener('click',()=>{this.closeAll();this.callbacks.title?.();});
    element('reload-button').addEventListener('click',()=>location.reload());
    element('language-button').addEventListener('click',()=>this.callbacks.language?.(otherLanguage()));
    element('language-setting').addEventListener('change',()=>this.callbacks.language?.(element<HTMLSelectElement>('language-setting').value as Language));
    for(const id of ['sound-setting','motion-setting','quality-setting'])element(id).addEventListener('change',()=>this.callbacks.settings?.({sound:element<HTMLInputElement>('sound-setting').checked,reducedMotion:element<HTMLInputElement>('motion-setting').checked,quality:element<HTMLSelectElement>('quality-setting').value as Settings['quality'],language:language()}));
  }
  get paused() { return !!document.querySelector('dialog[open]') || this.dialogue !== null; }
  open(id: string) { this.callbacks.pause?.(); const dialog=element<HTMLDialogElement>(id);if(!dialog.open)dialog.showModal(); }
  close(id: string) { element<HTMLDialogElement>(id).close();element('world').focus({preventScroll:true}); }
  closeAll() { document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(dialog=>dialog.close()); }
  setPlaying(playing: boolean) {
    document.body.classList.toggle('playing',playing);
    element('landing').hidden=playing; element('landing-controls').hidden=playing;
    for(const id of ['chapter-hud','location-hud','objective','desktop-controls','touch-controls'])element(id).hidden=!playing;
    if(!playing)for(const id of ['interaction-area','race-status','weakness','route-status','target-label'])element(id).hidden=true;
  }
  updateStory(story: Story) {
    const quest=story.quest; const chapter=quest?.chapter??this.episode.chapters.length-1;
    element('retry').querySelector('.panel-intro')!.textContent=quest?.description??t('Try the current objective again. Your earlier progress is safe.');
    const checkpointName=locations.find(location=>location.id===(quest?.checkpointLocation??quest?.location))?.name;
    element('retry-button').querySelector('span')!.textContent=checkpointName?t('Retry from {place}',{place:t(checkpointName)}):t('Try again');
    element('chapter-number').textContent=t('CHAPTER {number} / {total}',{number:String(chapter+1).padStart(2,'0'),total:String(this.episode.chapters.length).padStart(2,'0')});
    element('chapter-name').textContent=this.episode.chapters[chapter].title;
    document.querySelectorAll<HTMLElement>('[data-chapter]').forEach(dot=>{dot.classList.toggle('done',Number(dot.dataset.chapter)<chapter||story.complete);dot.classList.toggle('active',Number(dot.dataset.chapter)===chapter&&!story.complete);});
    element('objective-title').textContent=quest?.title??t('The world is still yours');
    element('objective-description').textContent=quest?.description??t('This episode is complete. Revisit the places where your story began, or open your journal to look back.');
    element('objective-count').textContent=story.complete?t('COMPLETE'):`${String(story.index+1).padStart(2,'0')} / ${this.episode.quests.length}`;
    element('objective-progress').style.width=`${story.progress*100}%`;
    element('track-button').hidden=story.complete;
    element('save-status').innerHTML=story.saveWarning?`${svg('close')} ${t('Not saved')}`:`${svg('check')} ${t('Saved')}`;
    element('save-status').classList.toggle('unsaved',!!story.saveWarning);
    element('save-warning').textContent=story.saveWarning&&t(story.saveWarning);element('save-warning').hidden=!story.saveWarning;
    document.body.classList.toggle('has-save-warning',!!story.saveWarning);
    element('journal-percent').textContent=`${Math.round(story.progress*100)}%`;
    element('journal-fill').style.width=`${story.progress*100}%`;
    element('journal-track').hidden=story.complete;
    element('journal-chapters').innerHTML=this.episode.chapters.map((entry,index)=>`<div class="journal-chapter ${index<chapter||story.complete?'completed':index===chapter?'current':''}"><span>${index<chapter||story.complete?svg('check'):String(index+1).padStart(2,'0')}</span><div><strong>${entry.title}</strong><small>${entry.caption}</small></div>${index===chapter&&!story.complete?`<i>${t('YOU ARE HERE')}</i>`:''}</div>`).join('');
    element('journal-places').innerHTML=locations.map(location=>`<button class="place-entry" data-place="${location.id}" ${location.locked?'disabled':''}><span class="place-icon" style="--place-color:${location.accent}">${svg(location.locked?'lock':'pin')}</span><span><strong>${t(location.name)}</strong><small>${location.locked?t('A future chapter'):story.discoveries.has(location.id)?t('Discovered · Visit again'):t('A place worth finding')}</small></span>${svg(location.locked?'lock':'northeast')}</button>`).join('');
    document.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(button=>button.addEventListener('click',()=>{this.close('journal');this.callbacks.navigate?.(button.dataset.place as LocationId);}));
    element('completion-places').textContent=String(story.discoveries.size);
  }
  updateInteraction(quest: QuestDefinition | null, visible: boolean, progress = 0) {
    element('interaction-area').hidden=!visible||!quest;
    if(!quest)return;
    element('interact-label').textContent=quest.action;
    element('interact-kind').textContent=progress>0?t('A LITTLE STRENGTH GOES A LONG WAY'):quest.kind==='talk'?t('A CONVERSATION WORTH HAVING'):quest.kind==='inspect'?t('EVERY DETAIL TELLS A STORY'):quest.kind==='stealth'?t('FASTER THAN ANYONE CAN SEE'):t('A MOMENT THAT MATTERS');
    element('interact-progress').style.width=`${progress*100}%`;
    element('interact-button').classList.toggle('working',progress>0);
  }
  startDialogue(dialogue: DialogueDefinition, done: ()=>void) {
    this.callbacks.pause?.();this.dialogue=dialogue;this.dialogueLines=dialogue.lines;this.lineIndex=0;this.optional=false;this.dialogueDone=done;
    element('dialogue').hidden=false;document.body.classList.add('talking');this.renderLine();
  }
  renderLine() {
    const line=this.dialogueLines[this.lineIndex];
    element('speaker').textContent=t(actorNames[line.speaker]);
    element('dialogue-text').textContent=line.text;
    element('dialogue-count').textContent=`${String(this.lineIndex+1).padStart(2,'0')} / ${String(this.dialogueLines.length).padStart(2,'0')}`;
    element('portrait-initial').innerHTML=portraitMarkup(line.speaker);
    element('portrait').dataset.actor=line.speaker;
    element('dialogue-choices').hidden=true;element('dialogue-next').hidden=false;
    element('dialogue-next').innerHTML=`${this.lineIndex===this.dialogueLines.length-1?(this.optional?t('Back to conversation'):t('Continue the story')):t('Continue')} ${svg('arrow')}`;
  }
  /** While a scene shows something the line depends on, the conversation waits for it. */
  holdDialogue(held:boolean) {
    this.held=held;(element('dialogue-next') as HTMLButtonElement).disabled=held;
  }
  nextDialogue() {
    if(!this.dialogue||this.held)return;
    if(this.lineIndex<this.dialogueLines.length-1){this.lineIndex++;this.renderLine();return;}
    if(this.dialogue.optional?.length){this.renderChoices();return;}
    this.finishDialogue();
  }
  renderChoices() {
    if(!this.dialogue)return;
    element('dialogue-text').textContent=t('There is a little more to this story, if you want to ask.');
    element('dialogue-choices').hidden=false;element('dialogue-next').hidden=true;
    element('dialogue-choices').replaceChildren();
    for(const choice of this.dialogue.optional??[]){const button=document.createElement('button');button.textContent=choice.label;button.addEventListener('click',()=>{this.optional=true;this.dialogueLines=choice.lines;this.lineIndex=0;this.renderLine();});element('dialogue-choices').append(button);}
    const done=document.createElement('button');done.className='finish-conversation';done.id='finish-conversation';done.textContent=t('Continue the story →');done.addEventListener('click',()=>this.finishDialogue());element('dialogue-choices').append(done);
  }
  finishDialogue() {
    const callback=this.dialogueDone;this.dialogue=null;this.dialogueDone=null;element('dialogue').hidden=true;document.body.classList.remove('talking');element('world').focus({preventScroll:true});callback?.();
  }
  cancelDialogue(){this.dialogue=null;this.dialogueDone=null;element('dialogue').hidden=true;document.body.classList.remove('talking');}
  journalTab(places: boolean) {
    element('journal-story').hidden=places;element('journal-places').hidden=!places;
    for(const [id,selected] of [['tab-story',!places],['tab-places',places]] as const){element(id).classList.toggle('selected',selected);element(id).setAttribute('aria-selected',String(selected));}
  }
  toast(title: string, message: string, seconds=4.2) {element('toast-title').textContent=title;element('toast-message').textContent=message;element('toast').hidden=false;this.toastUntil=performance.now()+seconds*1000;}
  updateToast(){if(this.toastUntil&&performance.now()>this.toastUntil){element('toast').hidden=true;this.toastUntil=0;}}
  syncSettings(settings: Settings){element<HTMLInputElement>('sound-setting').checked=settings.sound;element<HTMLInputElement>('motion-setting').checked=settings.reducedMotion;element<HTMLSelectElement>('quality-setting').value=settings.quality;element<HTMLSelectElement>('language-setting').value=language();element('sound-button').innerHTML=svg(settings.sound?'sound':'mute');element('sound-button').setAttribute('aria-pressed',String(settings.sound));element('sound-button').setAttribute('aria-label',settings.sound?t('Mute sound'):t('Enable sound'));element('sound-button').title=settings.sound?t('Mute sound'):t('Enable sound');document.body.classList.toggle('reduced-motion',settings.reducedMotion);}
}
