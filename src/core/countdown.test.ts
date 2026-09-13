import { expect, it } from 'vitest';
import { Countdown } from './countdown';

it('expires after the same active duration at different frame rates',()=>{
  for(const frame of [1/60,1/10,1,12]){
    const timer=new Countdown();timer.start(55);let elapsed=0,expirations=0;
    while(elapsed<56){const step=Math.min(frame,56-elapsed);if(timer.update(step))expirations++;elapsed+=step;}
    expect(timer.remaining).toBe(0);expect(expirations).toBe(1);
  }
});
it('does not consume time while a menu is open or the window is unfocused',()=>{
  const timer=new Countdown();timer.start(55);timer.update(5);timer.update(3600,true);expect(timer.remaining).toBe(50);
  expect(timer.update(50)).toBe(true);expect(timer.update(1)).toBe(false);
});
it('restarts cleanly and ignores invalid elapsed time',()=>{
  const timer=new Countdown();timer.start(55);timer.update(100);timer.start(55);
  timer.update(NaN);timer.update(-10);expect(timer.remaining).toBe(55);timer.start(0);expect(timer.update(1)).toBe(false);
});
