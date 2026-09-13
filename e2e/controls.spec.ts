import { expect, test, type Page } from '@playwright/test';
import { pilot } from '../src/content/pilot';
import { Story, SAVE_KEY } from '../src/core/story';
import { locations } from '../src/content/locations';
import { solvePower } from './encounter-helper';

async function snapshot(page:Page){return page.locator('#telemetry').evaluate(el=>JSON.parse(el.textContent!));}
// Render at a controlled 10 Hz while the game still simulates at 60 Hz. This
// exercises fixed-step catch-up without drawing thousands of software frames.
async function advanceSimulation(page:Page,milliseconds:number){
  for(let elapsed=0;elapsed<milliseconds;elapsed+=100)await page.clock.fastForward(Math.min(100,milliseconds-elapsed));
}
async function checkpoint(page:Page,index:number){
  const story=new Story(pilot,null,locations.map(location=>location.id));story.index=index;
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,save);},{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});
  await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60_000});
  await page.locator('#begin-button').click();await expect(page.locator('#objective')).toBeVisible();
}

test('controls: manual movement, super speed, jump, and releasing input on pause',async({page},info)=>{
  await page.clock.install({time:new Date('2026-09-01T00:00:00Z')});
  await checkpoint(page,0);
  await expect.poll(async()=>(await snapshot(page)).characterModel).toBe('ready');
  await page.clock.pauseAt(new Date('2026-09-01T01:00:00Z'));
  const start=await snapshot(page);
  if(info.project.name==='mobile'){
    const session=await page.context().newCDPSession(page);
    const joystick=(await page.locator('#joystick').boundingBox())!;
    const speed=(await page.locator('#speed-button').boundingBox())!;
    const stick={id:1,x:joystick.x+joystick.width/2,y:joystick.y+joystick.height/2};
    const fast={id:2,x:speed.x+speed.width/2,y:speed.y+speed.height/2};
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick]});
    stick.x+=28;
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[stick]});
    await advanceSimulation(page,200);
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#telemetry')!.textContent!).moving);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick,fast]});
    await expect(page.locator('#speed-button')).toHaveClass(/active/);
    await advanceSimulation(page,500);
    expect((await snapshot(page)).superSpeed).toBe(true);expect((await snapshot(page)).speed).toBeGreaterThan(9);
    expect((await snapshot(page)).normal).not.toEqual(start.normal);
    await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await advanceSimulation(page,300);
    await expect(page.locator('#speed-button')).not.toHaveClass(/active/);
    await page.waitForFunction(()=>!JSON.parse(document.querySelector('#telemetry')!.textContent!).moving);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick]});
    const jump=(await page.locator('#jump-button').boundingBox())!;
    const hop={id:3,x:jump.x+jump.width/2,y:jump.y+jump.height/2};
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick,hop]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[hop]});
    await advanceSimulation(page,200);
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#telemetry')!.textContent!).height>0,{},{timeout:8_000});
    // Pause with a movement finger still held: closing the journal must not resume it.
    const journal=(await page.locator('#journal-button').boundingBox())!;
    const book={id:4,x:journal.x+journal.width/2,y:journal.y+journal.height/2};
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick,book]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[book]});
    await expect(page.locator('#journal')).toBeVisible();
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.getByRole('button',{name:'Close journal',exact:true}).tap();
  }else{
    await page.locator('#world').focus();await page.keyboard.down('d');
    await advanceSimulation(page,200);
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#telemetry')!.textContent!).moving);
    await page.keyboard.down('Shift');await advanceSimulation(page,500);
    expect((await snapshot(page)).superSpeed).toBe(true);expect((await snapshot(page)).speed).toBeGreaterThan(9);
    expect((await snapshot(page)).normal).not.toEqual(start.normal);
    await page.keyboard.up('Shift');await page.keyboard.up('d');
    await page.keyboard.press('Space');await advanceSimulation(page,200);await page.waitForFunction(()=>JSON.parse(document.querySelector('#telemetry')!.textContent!).height>0);
    await page.keyboard.down('a');await page.keyboard.press('j');
    await expect(page.locator('#journal')).toBeVisible();await page.keyboard.up('a');
    await page.getByRole('button',{name:'Close journal',exact:true}).click();
  }
  await advanceSimulation(page,400);const stopped=await snapshot(page);expect(stopped.moving).toBe(false);
  await advanceSimulation(page,400);expect((await snapshot(page)).normal).toEqual(stopped.normal);
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#telemetry')!.textContent!).height===0);
  // Leaving the window also cancels automatic navigation.
  await page.locator('#track-button').click();
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await advanceSimulation(page,200);expect((await snapshot(page)).routeActive).toBe(false);expect((await snapshot(page)).moving).toBe(false);
  expect((await snapshot(page)).questIndex).toBe(0);
});

test('checkpoint: leaving a power encounter cancels strength without completing it',async({page},info)=>{
  await page.clock.install({time:new Date('2026-09-01T00:00:00Z')});
  await checkpoint(page,1);
  await page.locator('#track-button').click();await page.waitForFunction(()=>JSON.parse(document.querySelector('#telemetry')!.textContent!).nearby);
  await page.clock.pauseAt(new Date('2026-09-01T01:00:00Z'));
  await page.locator('#interact-button').click();await expect(page.locator('#encounter')).toBeVisible();
  await page.screenshot({path:info.outputPath('power-encounter.png'),scale:'css',timeout:60_000});
  await page.keyboard.down('e');await advanceSimulation(page,300);await page.keyboard.up('e');
  await expect(page.locator('#encounter-feedback')).toHaveAttribute('data-kind','miss');
  if(info.project.name==='desktop')await page.keyboard.press('j');else await page.locator('#encounter-close').tap();
  await expect(page.locator('#encounter')).toBeHidden();await advanceSimulation(page,1800);
  expect((await snapshot(page)).questIndex).toBe(1);
  await advanceSimulation(page,200);
  await page.locator('#interact-button').click();
  await solvePower(page,info.project.name==='mobile');await advanceSimulation(page,200);
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#telemetry')!.textContent!).questIndex===2);
  await page.clock.resume();await page.reload();await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#begin-button').click();
  expect((await snapshot(page)).questIndex).toBe(2);
});

test('retry: the journal pauses the race and timeout preserves the story',async({page})=>{
  await page.clock.install({time:new Date('2026-09-01T00:00:00Z')});
  const raceIndex=pilot.quests.findIndex(q=>q.id==='race');await checkpoint(page,raceIndex);
  await page.locator('#journal-button').click();
  await page.clock.pauseAt(new Date('2026-09-01T01:00:00Z'));
  const before=await page.locator('#race-clock').textContent();
  await page.clock.fastForward(1200);expect(await page.locator('#race-clock').textContent()).toBe(before);
  await page.getByRole('button',{name:'Close journal',exact:true}).click();
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.clock.fastForward(60_000);await expect(page.locator('#retry')).toBeHidden();
  expect(await page.locator('#race-clock').textContent()).toBe(before);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.clock.fastForward(56_000);await expect(page.locator('#retry')).toBeVisible();
  expect((await snapshot(page)).questIndex).toBe(raceIndex);
  await page.locator('#retry-button').click();await advanceSimulation(page,200);await expect(page.locator('#race-clock')).toHaveText('0:55');
  expect((await snapshot(page)).location).toBe('cornfield');expect((await snapshot(page)).questIndex).toBe(raceIndex);
  await page.clock.resume();await page.locator('#track-button').click();await page.waitForFunction(()=>JSON.parse(document.querySelector('#telemetry')!.textContent!).nearby,{},{timeout:55_000});
  await page.locator('#interact-button').click();await expect(page.locator('#dialogue')).toBeVisible();
});

test('storage: blocked saving explains the problem and still allows play',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Storage denied','QuotaExceededError');};});
  await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60_000});
  await page.locator('#begin-button').click();await page.locator('#skip-intro').click();
  await expect(page.locator('#save-warning')).toContainText('could not save');
  await page.locator('#track-button').click();await page.waitForFunction(()=>JSON.parse(document.querySelector('#telemetry')!.textContent!).nearby);
  await page.locator('#interact-button').click();await expect(page.locator('#dialogue')).toBeVisible();
  while(await page.locator('#dialogue').isVisible()){
    if(await page.locator('#finish-conversation').isVisible())await page.locator('#finish-conversation').click();
    else await page.locator('#dialogue-next').click();
  }
  await expect(page.locator('#objective-title')).toHaveText('A gentle touch');
  await page.locator('#brand-button').click();await expect(page.locator('#begin-button')).toContainText('Continue your journey');
  await page.locator('#begin-button').click();await expect(page.locator('#objective-title')).toHaveText('A gentle touch');
});
