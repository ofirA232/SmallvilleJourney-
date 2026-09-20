/** Whether a scored stretch is silent, running, or on its way out. */
export type StoryMusicState='off'|'play'|'fade';

/** Every story track sits at the same level under the scene and leaves the same way. */
const level=.15, fadeSeconds=2.6;

/**
 * One scored stretch of the episode. It opens when `dialogue` starts during the `from` objective,
 * runs through everything that follows, and fades out the moment `until` becomes the objective.
 * `until` may be `complete` to run to the end of the episode, and `offset` skips a track's intro.
 */
type Cue={ id:string; src:string; from:string; dialogue:string; until:string; offset?:number };
const cues:Cue[]=[
  { id:'story-audio', src:'/audio/kent-morning.mp3', from:'morning', dialogue:'morning', until:'friends' },
  { id:'school-audio', src:'/audio/everywhere-you-go.mp3', from:'friends', dialogue:'friends', until:'bridge-moment' },
  { id:'bridge-audio', src:'/audio/unstoppable.mp3', from:'bridge-moment', dialogue:'bridge-thoughts', until:'lex-thanks' },
  { id:'home-audio', src:'/audio/everything.mp3', from:'home', dialogue:'home', until:'complete', offset:23 },
];

/** Stream music for one story beat, independent of the dialogue's simulation pause. */
class StoryTrack {
  readonly audio:HTMLAudioElement;
  private state:StoryMusicState='off';
  private enabled=false;
  private paused=false;
  private pending=false;
  private gain=1;
  private frame=0;
  private offset:number;
  constructor(cue:Cue){
    this.offset=cue.offset??0;
    this.audio=new Audio(cue.src);
    this.audio.id=cue.id;this.audio.preload='none';this.audio.volume=level;
    // A track that skips its intro has to loop back to the offset rather than to the top.
    this.audio.loop=!this.offset;
    if(this.offset)this.audio.addEventListener('ended',()=>{this.audio.currentTime=this.offset;this.apply();});
    document.body.appendChild(this.audio);
  }
  sync(state:StoryMusicState,enabled:boolean,paused:boolean){
    if(this.state===state&&this.enabled===enabled&&this.paused===paused)return;
    const entered=this.state!==state;
    this.state=state;this.enabled=enabled;this.paused=paused;
    if(entered&&state!=='fade'){this.stopFade();this.gain=1;this.audio.volume=level;}
    if(entered&&state==='fade')this.startFade();
    this.apply();
  }
  private apply(){
    const silent=this.state==='off'||!this.enabled||this.paused||(this.state==='fade'&&this.gain<=0);
    if(silent){this.audio.pause();if(this.state==='off')this.audio.currentTime=this.offset;return;}
    if(this.audio.paused&&!this.pending){
      // Before the file has loaded this only sets the default start position, which is the point.
      if(this.audio.currentTime<this.offset)this.audio.currentTime=this.offset;
      this.pending=true;
      void this.audio.play().then(()=>{this.apply();}).catch(()=>{/* A blocked browser remains playable; toggling sound retries. */}).finally(()=>{this.pending=false;});
    }
  }
  /** Ride the volume down over a couple of seconds so the beat ends instead of cutting. */
  private startFade(){
    if(this.frame)return;
    let last=performance.now();
    const step=(now:number)=>{
      this.frame=requestAnimationFrame(step);
      const delta=Math.max(0,(now-last)/1000);last=now;
      if(this.state!=='fade'){this.stopFade();return;}
      if(this.paused||!this.enabled||this.audio.paused)return;
      this.gain=Math.max(0,this.gain-delta/fadeSeconds);
      this.audio.volume=level*this.gain;
      if(this.gain<=0){this.stopFade();this.audio.pause();}
    };
    this.frame=requestAnimationFrame(step);
  }
  private stopFade(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}
}

/** Hands each cue to its track, so one beat fades out as the next one opens. */
export class StoryScore {
  private entries:{cue:Cue;track:StoryTrack;start:number;fade:number;started:boolean}[];
  constructor(questIds:string[]){
    const stage=(id:string)=>id==='complete'?questIds.length:questIds.indexOf(id);
    this.entries=cues.map(cue=>{
      const start=stage(cue.from), fade=stage(cue.until);
      if(start<0||fade<=start)throw new Error(`Story cue ${cue.id} does not span a stretch of this episode`);
      return {cue,track:new StoryTrack(cue),start,fade,started:false};
    });
  }
  sync(questIndex:number,dialogue:string|null,playing:boolean,enabled:boolean,paused:boolean){
    for(const entry of this.entries)entry.track.sync(this.state(entry,questIndex,dialogue,playing),enabled,paused);
  }
  private state(entry:StoryScore['entries'][number],questIndex:number,dialogue:string|null,playing:boolean):StoryMusicState{
    if(!playing||questIndex<entry.start||questIndex>entry.fade){entry.started=false;return 'off';}
    // Nothing to fade if the player joined this stretch after it would have started.
    if(questIndex===entry.fade)return entry.started?'fade':'off';
    if(questIndex===entry.start&&!entry.started&&dialogue!==entry.cue.dialogue)return 'off';
    entry.started=true;return 'play';
  }
}
