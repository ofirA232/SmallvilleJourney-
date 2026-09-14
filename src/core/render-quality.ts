/**
 * Measure the share of slow frames over active wall time, not capped simulation
 * time or a plain average. One-off stalls (model decode, shader compile, a
 * background tab returning) barely move the share, so they never lock a
 * capable machine into a lower tier; a machine that really renders below
 * 38 fps produces slow frames continuously and steps down within two seconds.
 */
export class RenderQuality {
  level=0;
  private seconds=0;
  private frames=0;
  private slow=0;
  private smoothSeconds=0;
  private recoveries=0;
  update(dt:number,active:boolean){
    if(!active){this.seconds=0;this.frames=0;this.slow=0;this.smoothSeconds=0;return false;}
    if(dt<=0||dt>1)return false;
    this.seconds+=dt;this.frames++;if(dt>1/38)this.slow++;
    if(this.seconds<2)return false;
    const share=this.slow/this.frames;
    this.seconds=0;this.frames=0;this.slow=0;
    if(share>.6){this.smoothSeconds=0;if(this.level<2){this.level++;return true;}return false;}
    // Step back up only after eight seconds of near-perfect frames, a few times per session, so a
    // stall-induced drop is undone while a machine hovering at the threshold cannot oscillate forever.
    if(share<.1&&this.level>0){this.smoothSeconds+=2;if(this.smoothSeconds>=8&&this.recoveries<3){this.smoothSeconds=0;this.recoveries++;this.level--;return true;}}
    else this.smoothSeconds=0;
    return false;
  }
  reset(){this.level=0;this.seconds=0;this.frames=0;this.slow=0;this.smoothSeconds=0;this.recoveries=0;}
}
