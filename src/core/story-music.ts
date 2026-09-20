/** Stream music for one story scene, independent of the dialogue's simulation pause. */
export class StoryMusic {
  readonly audio=new Audio('/audio/kent-morning.mp3');
  private active=false;
  private enabled=false;
  private paused=false;
  private pending=false;
  constructor(){this.audio.id='story-audio';this.audio.preload='none';this.audio.loop=true;this.audio.volume=.28;document.body.appendChild(this.audio);}
  sync(active:boolean,enabled:boolean,paused:boolean){
    if(this.active===active&&this.enabled===enabled&&this.paused===paused)return;
    this.active=active;this.enabled=enabled;this.paused=paused;
    if(!active||!enabled||paused){this.audio.pause();if(!active)this.audio.currentTime=0;return;}
    if(this.audio.paused&&!this.pending){
      this.pending=true;
      void this.audio.play().then(()=>{if(!this.active||!this.enabled||this.paused)this.audio.pause();}).catch(()=>{/* A blocked browser remains playable; toggling sound retries. */}).finally(()=>{this.pending=false;});
    }
  }
}
