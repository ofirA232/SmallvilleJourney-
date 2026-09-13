/** Measure active wall time, not capped simulation time or the number of slow frames. */
export class RenderQuality {
  level=0;
  private seconds=0;
  private frames=0;
  update(dt:number,active:boolean){
    if(!active){this.seconds=0;this.frames=0;return false;}
    if(dt<=0||dt>1)return false;
    this.seconds+=dt;this.frames++;
    if(this.seconds<2)return false;
    const fps=this.frames/this.seconds;
    this.seconds=0;this.frames=0;
    if(fps<38&&this.level<2){this.level++;return true;}
    return false;
  }
  reset(){this.level=0;this.seconds=0;this.frames=0;}
}
