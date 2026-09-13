import {expect,test} from '@playwright/test';
import {pilot} from '../src/content/pilot';
import {Story,SAVE_KEY} from '../src/core/story';
import {locations} from '../src/content/locations';
for(const questId of ['lana','cemetery'])test(`Lana: imported actor at ${questId}, dialogue and checkpoint reload`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const story=new Story(pilot,null,locations.map(l=>l.id));story.index=pilot.quests.findIndex(q=>q.id===questId);
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,save);},{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});
  const snapshot=async()=>JSON.parse((await page.locator('#telemetry').textContent())!);
  for(let pass=0;pass<2;pass++){
    await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
    await page.locator('#begin-button').click();
    await expect.poll(async()=>(await snapshot()).actors?.lana).toEqual({model:'ready',visible:true,necklace:questId==='lana'});
    await page.locator('#track-button').click();await expect.poll(async()=>(await snapshot()).nearby,{timeout:60000}).toBe(true);
    await expect.poll(async()=>(await snapshot()).weakened).toBe(questId==='lana');
    await page.screenshot({path:info.outputPath(`${questId}-${pass}.png`),scale:'css'});
    await page.locator('#interact-button').click();await expect(page.locator('#dialogue')).toBeVisible();
    await expect(page.locator('#dialogue-text')).toContainText(questId==='lana'?'Clark?':'I come here');
  }
  // Finish through ordinary conversation controls and verify the next objective.
  for(let i=0;i<12 && await page.locator('#dialogue').isVisible();i++){
    if(await page.locator('#finish-conversation').isVisible()){await page.locator('#finish-conversation').click();break;}
    await page.locator('#dialogue-next').click();
  }
  await expect.poll(async()=>(await snapshot()).questIndex).toBe(story.index+1);
  expect(errors).toEqual([]);
});
test('Lana: missing model keeps the original NPC and necklace available',async({page})=>{
  const story=new Story(pilot,null,locations.map(l=>l.id));story.index=pilot.quests.findIndex(q=>q.id==='lana');
  await page.route('**/models/lana/lana-rigged.glb',route=>route.abort());
  await page.addInitScript(({key,save})=>localStorage.setItem(key,save),{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});
  await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await page.locator('#begin-button').click();
  await expect.poll(async()=>JSON.parse((await page.locator('#telemetry').textContent())!).actors?.lana).toEqual({model:'fallback',visible:true,necklace:true});
});
test('Lana: motion lab displays her imported model',async({page},info)=>{
  await page.goto('/model-review.html?actor=lana');await expect(page.locator('h1')).toContainText('Lana Lang');
  await expect(page.locator('#status')).toContainText('Loaded');await page.locator('#skeleton').click();
  await page.screenshot({path:info.outputPath('lana-lab.png'),scale:'css'});
});
