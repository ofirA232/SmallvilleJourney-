import type { ChallengeDefinition } from '../types';

export class PowerChallenge {
  charge=0;hits=0;misses=0;held=false;cooldown=0;
  constructor(public definition:Extract<ChallengeDefinition,{kind:'power'}>){}
  get complete(){return this.hits>=this.definition.beats.length;}
  get inZone(){const [low,high]=this.definition.zone;return this.charge>=low&&this.charge<=high;}
  press(){if(!this.complete&&this.cooldown===0)this.held=true;}
  release(): 'hit'|'miss'|null {
    if(!this.held)return null;
    this.held=false;
    const hit=this.inZone;if(hit)this.hits++;else this.misses++;
    this.charge=0;this.cooldown=.25;return hit?'hit':'miss';
  }
  update(dt:number,paused=false):boolean {
    if(paused||!Number.isFinite(dt)||dt<=0)return false;
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(!this.held||this.complete)return false;
    this.charge=Math.min(1,this.charge+dt*this.definition.speed);
    if(this.charge>=1){this.held=false;this.charge=0;this.misses++;this.cooldown=.35;return true;}
    return false;
  }
  interrupt(){this.held=false;this.charge=0;}
}
