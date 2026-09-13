/** Active play time is independent of fixed-step movement and rendering FPS. */
export class Countdown {
  remaining=0;
  start(seconds:number){this.remaining=Math.max(0,Number.isFinite(seconds)?seconds:0);}
  update(elapsed:number,paused=false){
    if(paused||this.remaining===0||!Number.isFinite(elapsed)||elapsed<=0)return false;
    this.remaining=Math.max(0,this.remaining-elapsed);
    return this.remaining===0;
  }
}
