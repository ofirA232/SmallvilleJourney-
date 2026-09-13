import {test,expect,type Page} from '@playwright/test';
import {pilot} from '../src/content/pilot';
import {Story,SAVE_KEY} from '../src/core/story';
import {locations} from '../src/content/locations';
const state=(page:Page)=>page.locator('#telemetry').evaluate(el=>JSON.parse(el.textContent!));
async function open(page:Page){await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await page.locator('#begin-button').click();}
async function prepare(page:Page){
 const story=new Story(pilot,null,locations.map(l=>l.id));story.index=pilot.quests.findIndex(q=>q.id==='truck');
 await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,save);},{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});
 await open(page);await page.locator('#track-button').click();await expect.poll(async()=>(await state(page)).nearby,{timeout:60000}).toBe(true);
 await page.clock.install();await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+3600000));
 await page.locator('#interact-button').click();await page.clock.runFor(100);
}
test('truck: missed reaction, paused countdown, retry and explicit stop',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await prepare(page);
 await page.clock.runFor(1800);await page.screenshot({path:info.outputPath('truck-approaching.png'),scale:'css'});
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.clock.runFor(5000);
 await expect(page.locator('#truck-attack')).toHaveAttribute('data-phase','approach');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.clock.runFor(1900);
 await expect(page.locator('#truck-attack')).toHaveAttribute('data-phase','failed');expect((await state(page)).questId).toBe('truck');
 await page.keyboard.press('e');await page.clock.runFor(100);expect((await state(page)).questId).toBe('truck');
 await page.screenshot({path:info.outputPath('truck-missed.png'),scale:'css'});
 if(info.project.name==='mobile')await page.locator('#truck-retry').tap();else await page.locator('#truck-retry').click();
 await page.clock.runFor(1600);
 if(info.project.name==='mobile')await page.locator('#truck-stop').tap();else await page.keyboard.press('e');
 await page.clock.runFor(400);await expect(page.locator('#truck-attack')).toHaveAttribute('data-phase','stopped');
 await page.screenshot({path:info.outputPath('truck-caught.png'),scale:'css'});
 await page.clock.runFor(1000);expect((await state(page)).questId).toBe('free-jeremy');await expect(page.locator('#truck-attack')).toHaveCount(0);
 await page.clock.resume();await open(page);await expect.poll(async()=>(await state(page)).questId).toBe('free-jeremy');expect(errors).toEqual([]);
});
test('truck: settings pause and unfinished reload preserve checkpoint',async({page})=>{
 await prepare(page);await page.locator('#settings-button').click();await page.clock.runFor(6000);
 await expect(page.locator('#truck-attack')).toHaveAttribute('data-phase','approach');
 await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.clock.runFor(500);
 await page.clock.resume();await open(page);expect((await state(page)).questId).toBe('truck');await expect(page.locator('#truck-attack')).toHaveCount(0);
});
