import {expect,test,type Page} from '@playwright/test';
import {pilot} from '../src/content/pilot';
import {Story,SAVE_KEY} from '../src/core/story';
import {locations} from '../src/content/locations';
import {solveFence} from './encounter-helper';
const state=async(page:Page)=>JSON.parse((await page.locator('#telemetry').textContent())!);
async function begin(page:Page,mobile:boolean){
  const story=new Story(pilot,null,locations.map(l=>l.id));story.index=pilot.quests.findIndex(q=>q.id==='fence');
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,save);},{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});
  await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await page.locator('#begin-button').click();
  if(mobile)await page.locator('#track-button').tap();else await page.locator('#track-button').click();
  await expect.poll(async()=>(await state(page)).nearby,{timeout:60000}).toBe(true);
  if(mobile)await page.locator('#interact-button').tap();else await page.locator('#interact-button').click();
  await expect(page.locator('#fence-status')).toBeVisible();
}
test('fence: repair every section, then Jonathan notices and the bus leaves',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const mobile=info.project.name==='mobile';
  await begin(page,mobile);expect((await state(page)).fence).toMatchObject({phase:'turned',fixed:0,strikes:0});
  await page.screenshot({path:info.outputPath('start.png')});
  await solveFence(page,mobile);
  await expect(page.locator('#dialogue')).toBeVisible();await expect(page.locator('#fence-status')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('done.png')});
  while(await page.locator('#dialogue').isVisible()){const next=await page.locator('#finish-conversation').isVisible()?'#finish-conversation':'#dialogue-next';if(mobile)await page.locator(next).tap();else await page.locator(next).click();}
  await expect.poll(async()=>(await state(page)).questId).toBe('friends');expect(errors).toEqual([]);
});
test('fence: super speed in front of Jonathan earns strikes, and the third starts the fence over',async({page},info)=>{
  test.setTimeout(180_000);const mobile=info.project.name==='mobile';await begin(page,mobile);
  await page.locator('#world').focus();
  for(let strike=1;strike<=3;strike++){
    await expect.poll(async()=>(await state(page)).fence.phase,{timeout:20_000,intervals:[100]}).toBe('watching');
    if(strike===1)await page.screenshot({path:info.outputPath('watching.png')});
    await page.keyboard.down('Shift');await page.keyboard.down('d');
    if(strike<3)await expect.poll(async()=>(await state(page)).fence.strikes,{timeout:5000,intervals:[50]}).toBe(strike);
    else await expect.poll(async()=>(await state(page)).fence.strikes,{timeout:5000,intervals:[50]}).toBe(0);
    await page.keyboard.up('d');await page.keyboard.up('Shift');
    await expect.poll(async()=>(await state(page)).fence.phase,{timeout:20_000,intervals:[100]}).not.toBe('watching');
  }
  expect((await state(page)).fence.fixed).toBe(0);await expect(page.locator('#toast')).toContainText('start over');
});
