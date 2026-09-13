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
  chime(complete=false){[261.63,329.63,392,...(complete?[523.25]:[])].forEach((note,index)=>this.tone(note,.7,.11,'sine',index*.1));}
  jump(){this.tone(195,.18,.035,'sine');}
  strength(){this.tone(75,.7,.07,'triangle');}
  feedback(success:boolean){this.tone(success?329.63:110,.22,.09,'triangle');if(success)this.tone(493.88,.32,.065,'sine',.08);}
  dispose(){void this.context?.close();}
}
