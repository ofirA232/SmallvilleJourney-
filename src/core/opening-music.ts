/** Stream the supplied opening track; never decode it into the render loop. */
export class OpeningMusic {
  readonly audio=new Audio('/audio/opening-piano.mp3');
  private enabled=false;
  private active=true;
  private paused=false;
  private pending=false;
  private blocked=false;
  constructor(private button:HTMLButtonElement){
    this.audio.id='opening-audio';this.audio.preload='none';this.audio.loop=true;this.audio.volume=.4;
    document.body.appendChild(this.audio);this.render();
  }
  get playing(){return this.enabled&&!this.blocked;}
  setEnabled(enabled:boolean){this.enabled=enabled;this.blocked=false;this.apply();}
  sync(active:boolean,paused:boolean){
    if(this.active===active&&this.paused===paused)return;
    this.active=active;this.paused=paused;
    if(!active){this.audio.pause();this.audio.currentTime=0;}
    this.apply();
  }
  private apply(){
    if(!this.enabled||!this.active||this.paused){this.audio.pause();this.render();return;}
    if(this.audio.paused&&!this.pending&&!this.blocked){
      this.pending=true;
      void this.audio.play().then(()=>{if(!this.enabled||!this.active||this.paused)this.audio.pause();}).catch(()=>{this.blocked=true;}).finally(()=>{this.pending=false;this.render();});
    }
    this.render();
  }
  private render(){this.button.textContent=this.playing?'Pause opening music':'Play opening music';this.button.setAttribute('aria-pressed',String(this.playing));}
}
