export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = false;
  private paused = false;
  private stepTime = 0;
  private melodyTime = 0;
  private melodyIndex = 0;
  private noise:AudioBuffer|null=null;
  private wind:GainNode|null=null;
  async setEnabled(enabled:boolean){
    this.enabled=enabled;
    if(enabled){
      try{
        this.context??=new AudioContext();
        if(!this.master){
          this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);
          this.noise=this.context.createBuffer(1,this.context.sampleRate*2,this.context.sampleRate);
          const data=this.noise.getChannelData(0);let sample=0;for(let i=0;i<data.length;i++){sample=(sample+(Math.random()*2-1)*.045)/1.025;data[i]=sample;}
          const source=this.context.createBufferSource();source.buffer=this.noise;source.loop=true;
          const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1100;
          this.wind=this.context.createGain();this.wind.gain.value=.04;source.connect(filter);filter.connect(this.wind);this.wind.connect(this.master);source.start();
        }
        await this.context.resume();this.applyGain();return true;
      }catch{this.enabled=false;return false;}
    }
    this.applyGain();return true;
  }
  setPaused(paused:boolean){if(this.paused===paused)return;this.paused=paused;this.applyGain();}
  private applyGain(){if(this.context&&this.master)this.master.gain.setTargetAtTime(this.enabled&&!this.paused?.28:0,this.context.currentTime,.08);}
  private tone(frequency:number,duration:number,volume:number,type:OscillatorType='sine',delay=0){
    if(!this.context||!this.master||!this.enabled||this.paused)return;
    const time=this.context.currentTime+delay,osc=this.context.createOscillator(),gain=this.context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(frequency,time);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.025);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(gain);gain.connect(this.master);osc.start(time);osc.stop(time+duration+.03);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  update(dt:number,speed:number,swimming:boolean){
    if(!this.enabled||this.paused)return;
    this.stepTime+=dt*speed;this.melodyTime+=dt;
    if(this.wind&&this.context)this.wind.gain.setTargetAtTime(.04+Math.max(0,speed-4)*.025,this.context.currentTime,.2);
    if(speed>.1&&this.stepTime>.9){this.stepTime=0;this.rustle(swimming);this.tone(swimming?180:78,.065,.015,'triangle');}
    if(this.melodyTime>3.4){this.melodyTime=0;const notes=[196,246.94,293.66,369.99,329.63,246.94,220,293.66];this.tone(notes[this.melodyIndex++%notes.length],2.9,.04);this.tone(98,3.1,.025);}
  }
  private rustle(water:boolean){
    if(!this.context||!this.master||!this.noise)return;
    const source=this.context.createBufferSource();source.buffer=this.noise;const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=water?1800:650;
    const gain=this.context.createGain(),time=this.context.currentTime;gain.gain.setValueAtTime(water?.7:.36,time);gain.gain.exponentialRampToValueAtTime(.001,time+.16);source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start(time,.4);source.stop(time+.18);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  /** Short synthesized hits for cutscene cues. */
  cue(id:string){
    if(id==='engine'){this.sweep(70,150,1.1,.05);this.burst(500,1.1,.18);}
    else if(id==='impact'){this.tone(52,1.1,.2,'triangle');this.burst(1400,.55,.9);}
    else if(id==='splash'){this.burst(2600,1.2,.8);this.tone(120,.5,.05,'sine');}
    else if(id==='strain'){this.sweep(48,62,1.3,.06);}
    else if(id==='tear'){this.sweep(1400,380,.7,.035);this.burst(3200,.5,.5);this.tone(70,.6,.12,'triangle');}
    else if(id==='land'){this.tone(60,.5,.14,'triangle');this.burst(900,.35,.5);}
    else if(id==='lift'){this.burst(1900,.7,.35);}
    else if(id==='slam'){this.tone(58,.4,.16,'triangle');this.burst(900,.3,.55);this.burst(4200,.18,.3);}
    else if(id==='hammer'){this.tone(180,.09,.07,'square');this.burst(2400,.06,.35);}
    else if(id==='warning'){this.tone(392,.25,.05,'sine');this.tone(330,.3,.05,'sine',.16);}
    else if(id==='caught'){this.tone(147,.45,.09,'triangle');}
    else if(id==='creak'){this.tone(96+Math.random()*20,.18,.05,'sawtooth');this.burst(1300,.12,.2);}
    else if(id==='sealed'){this.tone(70,.5,.12,'triangle');this.tone(329.63,.5,.05,'sine',.12);this.tone(493.88,.6,.045,'sine',.24);}
    else if(id==='screech'){this.sweep(1900,1150,1.1,.045);this.sweep(2600,1500,1,.03);this.burst(5200,1.1,.55);this.tone(62,.5,.12,'triangle',.9);}
    else if(id==='night'){this.sweep(55,41,2.2,.05);for(let i=0;i<5;i++)this.tone(4200+i*90,.05,.012,'sine',.8+i*.23);}
    else if(id==='rustle'){this.burst(700,.9,.55);}
    else if(id==='step'){this.tone(523.25,.5,.05,'sine');this.tone(659.25,.6,.035,'sine',.12);}
    else if(id==='stumble'){this.tone(196,.3,.05,'triangle');}
    else if(id==='daydream'){[392,493.88,587.33,783.99].forEach((note,index)=>this.tone(note,1.2,.045,'sine',index*.12));}
  }
  private sweep(from:number,to:number,duration:number,volume:number){
    if(!this.context||!this.master||!this.enabled||this.paused)return;
    const time=this.context.currentTime,osc=this.context.createOscillator(),gain=this.context.createGain();
    osc.type='sawtooth';osc.frequency.setValueAtTime(from,time);osc.frequency.exponentialRampToValueAtTime(to,time+duration);
    gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+duration*.8);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(gain);gain.connect(this.master);osc.start(time);osc.stop(time+duration+.03);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  private burst(frequency:number,duration:number,volume:number){
    if(!this.context||!this.master||!this.noise||!this.enabled||this.paused)return;
    const source=this.context.createBufferSource();source.buffer=this.noise;const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=frequency;
    const gain=this.context.createGain(),time=this.context.currentTime;gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.001,time+duration);
    source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start(time,Math.random());source.stop(time+duration+.02);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  chime(complete=false){[261.63,329.63,392,...(complete?[523.25]:[])].forEach((note,index)=>this.tone(note,.7,.11,'sine',index*.1));}
  jump(){this.tone(195,.18,.035,'sine');}
  strength(){this.tone(75,.7,.07,'triangle');}
  feedback(success:boolean){this.tone(success?329.63:110,.22,.09,'triangle');if(success)this.tone(493.88,.32,.065,'sine',.08);}
  dispose(){void this.context?.close();}
}
