import { t } from '../i18n';
import { MusicEnvelope } from './music-envelope';

/** The supplied piano track opens with 2.7 s of silence and ends with 4.6 s more. Playback starts
 * at the first note and loops before the silent tail, so the title never waits for its music. */
export const OPENING_START = 2.6, OPENING_LOOP_END = 49.7;

/** Stream the supplied opening track; never decode it into the render loop. It starts (fading in) as
 * soon as the title appears; when the browser does not allow sound before any interaction, it starts
 * on the first touch, click or key press instead. It fades out at each loop and when the title closes. */
export class OpeningMusic {
  readonly audio=new Audio('/audio/opening-piano.mp3');
  private enabled=false;
  private active=true;
  private paused=false;
  private pending=false;
  private blocked=false;
  private waitingForGesture=false;
  private envelope=new MusicEnvelope(this.audio,.4,()=>OPENING_LOOP_END);
  constructor(private button:HTMLButtonElement){
    this.audio.id='opening-audio';this.audio.preload='auto';this.audio.volume=0;
    this.audio.addEventListener('loadedmetadata',()=>{if(this.audio.currentTime<OPENING_START)this.audio.currentTime=OPENING_START;});
    // The envelope has faded the pass out by the loop point; the next pass fades in.
    this.audio.addEventListener('timeupdate',()=>{if(this.audio.currentTime>=OPENING_LOOP_END){this.audio.currentTime=OPENING_START;this.envelope.start();}});
    this.audio.addEventListener('ended',()=>{this.audio.currentTime=OPENING_START;this.apply();});
    document.body.appendChild(this.audio);this.render();
  }
  get playing(){return this.enabled&&!this.blocked;}
  setEnabled(enabled:boolean){this.enabled=enabled;this.blocked=false;this.apply();}
  sync(active:boolean,paused:boolean){
    if(this.active===active&&this.paused===paused)return;
    this.active=active;this.paused=paused;
    this.apply();
  }
  private apply(){
    if(!this.enabled||this.paused){this.audio.pause();this.render();return;}
    if(!this.active){
      // The title has closed: let the music fade away, then rewind for the next visit.
      const rewind=()=>{this.audio.pause();this.audio.currentTime=OPENING_START;};
      if(this.audio.paused)rewind();else this.envelope.leave(rewind);
      this.render();return;
    }
    if(this.audio.paused&&!this.pending&&!this.blocked){
      this.pending=true;
      if(this.audio.currentTime<OPENING_START)this.audio.currentTime=OPENING_START;
      this.envelope.start();
      void this.audio.play().then(()=>{if(!this.enabled||!this.active||this.paused)this.audio.pause();}).catch(()=>{this.blocked=true;this.waitForGesture();}).finally(()=>{this.pending=false;this.render();});
    }else this.envelope.stay();
    this.render();
  }
  /** Autoplay was refused: try again on the first interaction with the page. */
  private waitForGesture(){
    if(this.waitingForGesture)return;this.waitingForGesture=true;
    const retry=(event:Event)=>{
      // The music button handles its own click; any other first interaction starts the music.
      if(event.target instanceof Node&&this.button.contains(event.target))return;
      for(const type of ['pointerdown','keydown','touchstart'])window.removeEventListener(type,retry,true);
      this.waitingForGesture=false;if(this.blocked){this.blocked=false;this.apply();}
    };
    for(const type of ['pointerdown','keydown','touchstart'])window.addEventListener(type,retry,true);
  }
  private render(){this.button.textContent=this.playing?t('Pause opening music'):t('Play opening music');this.button.setAttribute('aria-pressed',String(this.playing));}
}
