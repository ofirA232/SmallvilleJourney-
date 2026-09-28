import {expect,test,type Page} from '@playwright/test';
import {pilot} from '../src/content/pilot';
import {Story,SAVE_KEY} from '../src/core/story';
import {locations} from '../src/content/locations';
import {freeze,solveEncounter} from './encounter-helper';
const state=async(page:Page)=>JSON.parse((await page.locator('#telemetry').textContent())!);
async function seed(page:Page,quest:string){
  const story=new Story(pilot,null,locations.map(l=>l.id));story.index=pilot.quests.findIndex(q=>q.id===quest);
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,save);},{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});
}
async function open(page:Page){await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await page.locator('#begin-button').click();}
async function tear(page:Page,mobile:boolean,pause=false){
  if(!(await state(page)).nearby){if(mobile)await page.locator('#track-button').tap();else await page.locator('#track-button').click();}
  await expect.poll(async()=>(await state(page)).nearby,{timeout:60000}).toBe(true);
  if(mobile)await page.locator('#interact-button').tap();else await page.locator('#interact-button').click();
  await expect(page.locator('#encounter')).toBeVisible();await solveEncounter(page,mobile);
  // Freeze the scene near its start so each shot can be captured.
  if(pause)await freeze(page);
  await expect(page.locator('#cutscene')).toBeVisible();await expect.poll(async()=>(await state(page)).cutscene?.id).toBe('roof-tear');
}
test('Clark tears the Porsche roof off, lifts Lex out, and the wreck stays opened after reload',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const mobile=info.project.name==='mobile';
  await seed(page,'car-door');await open(page);
  expect((await state(page)).porsche).toEqual({roof:true,driver:true,tornRoof:false});
  await page.screenshot({path:info.outputPath('porsche-in-river.png')});
  await tear(page,mobile,true);
  for(const [ms,name] of [[900,'grip'],[900,'flight'],[1300,'lift']] as const){await page.clock.runFor(ms);await page.screenshot({path:info.outputPath(`${name}.png`)});}
  await page.clock.runFor(1500);await page.clock.resume();
  await expect(page.locator('#cutscene')).toHaveCount(0);
  await expect.poll(async()=>(await state(page)).questId).toBe('bring-lex-ashore');
  expect((await state(page)).porsche).toEqual({roof:false,driver:false,tornRoof:true});
  await expect.poll(async()=>(await state(page)).carriedActor?.id).toBe('lex');
  await page.screenshot({path:info.outputPath('after.png')});
  await open(page);expect((await state(page)).porsche).toEqual({roof:false,driver:false,tornRoof:true});expect(errors).toEqual([]);
});
test('an interrupted roof tear replays from the strength encounter',async({page},info)=>{
  const mobile=info.project.name==='mobile';await seed(page,'car-door');await open(page);await tear(page,mobile);
  await open(page);
  expect((await state(page)).questId).toBe('car-door');expect((await state(page)).porsche).toEqual({roof:true,driver:true,tornRoof:false});
  await tear(page,mobile);if(mobile)await page.locator('#skip-cutscene').tap();else await page.locator('#skip-cutscene').click();
  await expect.poll(async()=>(await state(page)).questId).toBe('bring-lex-ashore');expect((await state(page)).porsche.tornRoof).toBe(true);
});
