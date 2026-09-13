import {test,expect,type Page} from '@playwright/test';
import {pilot} from '../src/content/pilot';
import {Story,SAVE_KEY} from '../src/core/story';
import {locations} from '../src/content/locations';
const state=(page:Page)=>page.locator('#telemetry').evaluate(el=>JSON.parse(el.textContent!));
async function load(page:Page,id:string){
  const story=new Story(pilot,null,locations.map(l=>l.id));story.index=pilot.quests.findIndex(q=>q.id===id);
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,save);},{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});
  await start(page);
}
async function start(page:Page){await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await page.locator('#begin-button').click();}
async function reflection(page:Page){
  await page.locator('#track-button').click();await expect.poll(async()=>(await state(page)).nearby,{timeout:60000}).toBe(true);
  await page.locator('#interact-button').click();await expect(page.locator('#dialogue')).toBeVisible();
  await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+3600000));
  for(let i=0;i<6&&await page.locator('#dialogue').isVisible();i++){
    if(await page.locator('#finish-conversation').isVisible())await page.locator('#finish-conversation').click();else await page.locator('#dialogue-next').click();
  }
  await expect(page.locator('#bridge-scene')).toBeVisible();
}
test('bridge impact, pause, splash and reload preserve the rescue',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await load(page,'bridge-moment');await reflection(page);
  await page.clock.runFor(2100);await page.screenshot({path:info.outputPath('impact.png')});
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.clock.runFor(5000);await expect(page.locator('#bridge-scene')).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.clock.runFor(2700);
  await expect(page.locator('#bridge-scene')).toHaveCount(0);await expect.poll(async()=>(await state(page)).questId).toBe('car-door');
  expect((await state(page)).swimming).toBe(true);await page.screenshot({path:info.outputPath('splash.png')});
  await page.clock.resume();await start(page);expect((await state(page)).questId).toBe('car-door');await expect(page.locator('#bridge-scene')).toHaveCount(0);expect(errors).toEqual([]);
});
test('interrupted bridge can replay and skip exactly once',async({page})=>{
  await page.clock.install();await load(page,'bridge-moment');await reflection(page);await page.clock.resume();await start(page);
  expect((await state(page)).questId).toBe('bridge-moment');await reflection(page);await page.locator('#skip-bridge').click();await page.clock.runFor(200);
  expect((await state(page)).questId).toBe('car-door');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('smallville-journey-save-v1')!).completedQuestIds.filter((id:string)=>id==='bridge-moment').length)).toBe(1);
});
test('necklace exposure clears at a distance and returns near Lana',async({page},info)=>{
  await load(page,'lana');await expect.poll(async()=>(await state(page)).actors.lana.model).toBe('ready');
  await expect.poll(async()=>(await state(page)).poisonExposure).toBeGreaterThan(.2);
  await page.screenshot({path:info.outputPath('kryptonite.png')});
  await page.locator('#world').focus();await page.keyboard.down('s');await expect.poll(async()=>(await state(page)).poisonExposure,{timeout:15000}).toBe(0);await page.keyboard.up('s');
  await page.locator('#track-button').click();await expect.poll(async()=>(await state(page)).poisonExposure,{timeout:60000}).toBeGreaterThan(.2);
  expect((await state(page)).weakened).toBe(true);
});
