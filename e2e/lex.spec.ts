import {expect,test,type Page} from '@playwright/test';
import {pilot} from '../src/content/pilot';
import {Story,SAVE_KEY} from '../src/core/story';
import {locations} from '../src/content/locations';
import {solveEncounter} from './encounter-helper';
const state=async(page:Page)=>JSON.parse((await page.locator('#telemetry').textContent())!);
async function seed(page:Page,quest:string){
  const story=new Story(pilot,null,locations.map(l=>l.id));story.index=pilot.quests.findIndex(q=>q.id===quest);
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,save);},{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});
}
async function open(page:Page){await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await page.locator('#begin-button').click();}
async function arrive(page:Page){await page.locator('#track-button').click();await expect.poll(async()=>(await state(page)).nearby,{timeout:60000}).toBe(true);}
async function finish(page:Page){
  if(await page.locator('#encounter').isVisible())await solveEncounter(page,false);
  await expect(page.locator('#dialogue')).toBeVisible();
  for(let i=0;i<16&&await page.locator('#dialogue').isVisible();i++){
    if(await page.locator('#finish-conversation').isVisible()){await page.locator('#finish-conversation').click();break;}
    await page.locator('#dialogue-next').click();
  }
}
test('Lex: imported rescue model survives reload and becomes the riverbank NPC',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await seed(page,'bring-lex-ashore');
  for(let i=0;i<2;i++){
    await open(page);
    await expect.poll(async()=>(await state(page)).carriedActor).toEqual({id:'lex',model:'ready',attached:true});
    expect((await state(page)).actors.lex.visible).toBe(false);
  }
  await page.screenshot({path:info.outputPath('lex-carried.png'),scale:'css'});
  await arrive(page);await page.locator('#interact-button').click();
  await expect.poll(async()=>(await state(page)).questId,{timeout:30000}).toBe('lex-thanks');
  await expect.poll(async()=>(await state(page)).carriedActor).toBeNull();
  await expect.poll(async()=>(await state(page)).actors.lex).toEqual({model:'ready',visible:true,necklace:false});
  await arrive(page);await page.screenshot({path:info.outputPath('lex-bank.png'),scale:'css'});
  await page.locator('#interact-button').click();await finish(page);
  await expect.poll(async()=>(await state(page)).questId).toBe('family-truth');expect(errors).toEqual([]);
});
for(const quest of ['mansion','call-for-help'])test(`Lex: imported actor participates in ${quest}`,async({page},info)=>{
  await seed(page,quest);await open(page);
  await expect.poll(async()=>(await state(page)).actors.lex).toEqual({model:'ready',visible:quest!=='call-for-help',necklace:false});
  if(quest==='mansion')await arrive(page);else await expect.poll(async()=>(await state(page)).nearby).toBe(true);
  await page.screenshot({path:info.outputPath(`${quest}.png`),scale:'css'});
  const index=(await state(page)).questIndex;await page.locator('#interact-button').click();await finish(page);
  await expect.poll(async()=>(await state(page)).questIndex).toBe(index+1);
});
test('Lex: failed asset keeps the playable NPC fallback',async({page})=>{
  await page.route('**/models/lex/lex-rigged.glb',route=>route.abort());await seed(page,'mansion');await open(page);
  await expect.poll(async()=>(await state(page)).actors.lex).toEqual({model:'fallback',visible:true,necklace:false});
  await arrive(page);await page.locator('#interact-button').click();await finish(page);
  await expect.poll(async()=>(await state(page)).questId).toBe('wall');
});
