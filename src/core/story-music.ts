import { MusicEnvelope } from './music-envelope';

/** Whether a scored stretch is silent, running, or on its way out. */
export type StoryMusicState='off'|'play'|'fade';

/** Every story track sits at the same level under the scene, unless its cue sets its own. Tracks fade in
 * and out through `MusicEnvelope`. */
const level=.15;

/**
 * One scored stretch of the episode. It opens when `dialogue` starts during the `from` objective
 * (or, without `dialogue`, the moment `from` becomes the objective), runs through everything that
 * follows, and fades out the moment `until` becomes the objective.
 * `until` may be `complete` to run to the end of the episode, and `offset` skips a track's intro.
 * With `untilDialogue`, the track plays on into the `until` objective and fades only when that
 * conversation opens, so the next track can take over on its first line.
 * With `outro`, a track that runs to `complete` plays out to its last note behind the completion
 * screen, without fading or looping, until the player steps back into the world (`release`).
 * `level` sets a track's volume in place of the shared one, for a track that sits too far forward.
 */
type Cue={ id:string; src:string; from:string; dialogue?:string; until:string; untilDialogue?:string; offset?:number; outro?:boolean; level?:number };
const cues:Cue[]=[
  // The Kent family track carries the whole morning: the chores, the fence posts, the bus and the run
  // to school, and hands over to the school track on Pete's first line.
  { id:'story-audio', src:'/audio/kent-morning.mp3', from:'morning', dialogue:'morning', until:'friends', untilDialogue:'friends' },
  { id:'school-audio', src:'/audio/everywhere-you-go.mp3', from:'friends', dialogue:'friends', until:'bridge-moment' },
  // The river track carries the crash and the rescue, and hands over on Lex's first line on the bank.
  { id:'bridge-audio', src:'/audio/unstoppable.mp3', from:'bridge-moment', dialogue:'bridge-thoughts', until:'lex-thanks', untilDialogue:'lex-rescue' },
  { id:'secrets-audio', src:'/audio/family-secrets.mp3', from:'lex-thanks', dialogue:'lex-rescue', until:'cemetery' },
  // Lana at her parents' grave, through the prom question and the kiss, until Clark is due at the mansion.
  { id:'cemetery-audio', src:'/audio/autumn-afterlight.mp3', from:'cemetery', dialogue:'cemetery', until:'mansion' },
  // Chloe's Wall of Weird opens the investigation into Jeremy, which runs until Whitney is waiting outside.
  { id:'wall-audio', src:'/audio/luminous-tension.mp3', from:'wall', dialogue:'wall', until:'whitney' },
  // Night falls on Riley Field as Clark hangs from the scarecrow post; the track runs through Jeremy's visit
  // and Lex's car pulling up, and hands over when Clark calls out to him.
  { id:'cornfield-audio', src:'/audio/cornfield-night.mp3', from:'jeremy-field', until:'call-for-help', untilDialogue:'lex-field', offset:12 },
  // Lex cuts Clark down, and the chase runs through the race to school, the valve and the truck, fading
  // once the water main has taken the charge out of Jeremy. It drives hard, so it sits under the others.
  { id:'momentum-audio', src:'/audio/forward-momentum.mp3', from:'call-for-help', dialogue:'lex-field', until:'free-jeremy', level:.1 },
  { id:'home-audio', src:'/audio/everything.mp3', from:'home', dialogue:'home', until:'complete', offset:140, outro:true },
];

/** Stream music for one story beat, independent of the dialogue's simulation pause. */
class StoryTrack {
  readonly audio:HTMLAudioElement;
  private state:StoryMusicState='off';
  private enabled=false;
  private paused=false;
  private pending=false;
  /** The handover fade has run all the way down. */
  private faded=false;
  private offset:number;
  private level:number;
  private envelope:MusicEnvelope;
  /** Playing out the end of the episode: no loop, and once it ends it stays silent. */
  private final=false;
  private finished=false;
  constructor(cue:Cue){
    this.offset=cue.offset??0;this.level=cue.level??level;
    this.audio=new Audio(cue.src);
    this.audio.id=cue.id;this.audio.preload='none';this.audio.volume=0;
    this.envelope=new MusicEnvelope(this.audio,this.level,()=>this.audio.duration);
    // Tracks loop by hand, back to their offset, so each pass fades out at the end and in again.
    this.audio.loop=false;
    this.audio.addEventListener('ended',()=>{
      if(this.final){this.finished=true;return;}
      this.audio.currentTime=this.offset;this.apply();
    });
    document.body.appendChild(this.audio);
  }
  sync(state:StoryMusicState,enabled:boolean,paused:boolean,final=false){
    if(this.state===state&&this.enabled===enabled&&this.paused===paused&&this.final===final)return;
    const entered=this.state!==state;
    this.state=state;this.enabled=enabled;this.paused=paused;this.final=final;
    if(state==='off')this.finished=false;
    if(entered&&state==='fade')this.envelope.leave(()=>{this.faded=true;this.apply();});
    if(entered&&state!=='fade'){this.faded=false;this.envelope.stay();}
    this.apply();
  }
  private apply(){
    // A track on its way out never starts again: once it is paused or faded, it stays quiet.
    const silent=this.state==='off'||!this.enabled||this.paused||this.finished||(this.state==='fade'&&(this.faded||this.audio.paused));
    if(silent){this.audio.pause();if(this.state==='off')this.audio.currentTime=this.offset;return;}
    if(this.audio.paused&&!this.pending){
      // Before the file has loaded this only sets the default start position, which is the point.
      if(this.audio.currentTime<this.offset)this.audio.currentTime=this.offset;
      this.envelope.start();this.pending=true;
      void this.audio.play().then(()=>{this.apply();}).catch(()=>{/* A blocked browser remains playable; toggling sound retries. */}).finally(()=>{this.pending=false;});
    }
  }
}

/** Hands each cue to its track, so one beat fades out as the next one opens. */
export class StoryScore {
  private entries:{cue:Cue;track:StoryTrack;start:number;fade:number;started:boolean;ending:boolean;released:boolean}[];
  constructor(questIds:string[]){
    const stage=(id:string)=>id==='complete'?questIds.length:questIds.indexOf(id);
    this.entries=cues.map(cue=>{
      const start=stage(cue.from), fade=stage(cue.until);
      if(start<0||fade<=start)throw new Error(`Story cue ${cue.id} does not span a stretch of this episode`);
      return {cue,track:new StoryTrack(cue),start,fade,started:false,ending:false,released:false};
    });
  }
  sync(questIndex:number,dialogue:string|null,playing:boolean,enabled:boolean,paused:boolean){
    for(const entry of this.entries)entry.track.sync(this.state(entry,questIndex,dialogue,playing),enabled,paused,!!entry.cue.outro&&questIndex===entry.fade);
  }
  /** The player has left the finished episode for the open world: the closing track fades away. */
  release(){for(const entry of this.entries)if(entry.cue.outro&&entry.started)entry.released=true;}
  private state(entry:StoryScore['entries'][number],questIndex:number,dialogue:string|null,playing:boolean):StoryMusicState{
    if(!playing||questIndex<entry.start||questIndex>entry.fade){entry.started=false;entry.ending=false;entry.released=false;return 'off';}
    // Nothing to fade if the player joined this stretch after it would have started.
    if(questIndex===entry.fade){
      if(!entry.started)return 'off';
      if(entry.cue.outro)return entry.released?'fade':'play';
      // Play on until the handover conversation opens; once it has, keep fading.
      if(entry.cue.untilDialogue&&!entry.ending&&dialogue!==entry.cue.untilDialogue)return 'play';
      entry.ending=true;return 'fade';
    }
    if(questIndex===entry.start&&!entry.started&&entry.cue.dialogue&&dialogue!==entry.cue.dialogue)return 'off';
    entry.started=true;return 'play';
  }
}
