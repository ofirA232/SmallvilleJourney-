import {test,expect,type Page} from '@playwright/test';
import {solveEncounter} from './encounter-helper';
import {pilot} from '../src/content/pilot';

const track=(page:Page,id:string)=>()=>page.locator(`#${id}`).evaluate(el=>{const a=el as HTMLAudioElement;return{paused:a.paused,time:a.currentTime,volume:a.volume,error:a.error?.code??null};});
const approach=async(page:Page)=>{await page.locator('#track-button').click();await expect(page.locator('#interact-button')).toBeVisible({timeout:60000});await page.locator('#interact-button').click();};
/** Steps through a conversation and returns every line it showed. */
const finishDialogue=async(page:Page)=>{
  const lines:string[]=[];
  while(await page.locator('#dialogue').isVisible()){
    const text=await page.locator('#dialogue-text').textContent();if(text)lines.push(text);
    const button=await page.locator('#finish-conversation').isVisible()?page.locator('#finish-conversation'):page.locator('#dialogue-next');
    await button.click();
  }
  return lines;
};
/** Drops the player at one objective so a late beat can be reached without replaying the episode. */
const seedSave=(page:Page,questId:string)=>{
  const completed=pilot.quests.slice(0,pilot.quests.findIndex(quest=>quest.id===questId)).map(quest=>quest.id);
  return page.addInitScript(([done,next])=>{
    localStorage.setItem('smallville-journey-save-v1',JSON.stringify({version:1,episodeId:'s01e01',currentQuestId:next,checkpointId:next,completedQuestIds:done,discoveries:[],episodeCompleted:false,memories:[],updatedAt:new Date().toISOString()}));
  },[completed,questId] as [string[],string]);
};

test('the score hands off between beats: Kent morning, the first bell, the river, the rescue',async({page})=>{
 test.setTimeout(300_000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
 await page.locator('#opening-music-button').click();await page.locator('#begin-button').click();await page.locator('#skip-intro').click();
 const morning=track(page,'story-audio'), school=track(page,'school-audio'), bridge=track(page,'bridge-audio');
 expect((await morning()).paused).toBe(true);expect((await school()).paused).toBe(true);expect((await bridge()).paused).toBe(true);

 // The Kent kitchen opens the first track, quietly.
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();await expect.poll(async()=>(await morning()).time).toBeGreaterThan(.1);
 expect((await morning()).error).toBeNull();expect((await morning()).volume).toBeLessThanOrEqual(.15);
 expect(await page.locator('#opening-audio').evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect.poll(async()=>(await morning()).paused).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(async()=>(await morning()).paused).toBe(false);
 await page.locator('#sound-button').click();await expect.poll(async()=>(await morning()).paused).toBe(true);
 await page.locator('#sound-button').click();await expect.poll(async()=>(await morning()).paused).toBe(false);
 for(let i=0;i<5;i++)await page.locator('#dialogue-next').click();
 await page.getByRole('button',{name:'Why do I have to be so careful?'}).click();expect((await morning()).paused).toBe(false);
 await page.locator('#dialogue-next').click();await page.locator('#dialogue-next').click();await page.locator('#finish-conversation').click();

 // It carries the chores, including the in-world strength encounter.
 await expect(page.locator('#objective-title')).toHaveText('A gentle touch');expect((await morning()).paused).toBe(false);
 await approach(page);
 await expect(page.locator('#encounter')).toBeVisible();expect((await morning()).paused).toBe(false);
 await solveEncounter(page,false);

 // The first bell fades it out during the run, so Pete's line lands on the next track.
 await expect(page.locator('#objective-title')).toHaveText('The first bell',{timeout:60000});
 await expect.poll(async()=>(await morning()).paused,{timeout:12000}).toBe(true);
 expect((await school()).paused).toBe(true);
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();
 expect((await morning()).paused).toBe(true);
 await expect.poll(async()=>(await school()).time).toBeGreaterThan(.1);
 expect((await school()).error).toBeNull();expect((await school()).volume).toBeLessThanOrEqual(.15);

 // It runs on past the handover, through Lana at the school steps.
 await finishDialogue(page);
 await expect(page.locator('#objective-title')).toHaveText('A little green stone');expect((await school()).paused).toBe(false);
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();expect((await school()).paused).toBe(false);
 await finishDialogue(page);

 // The river closes the stretch the same way the morning ended.
 await expect(page.locator('#objective-title')).toHaveText('A moment above the river',{timeout:60000});
 await expect.poll(async()=>(await school()).volume,{timeout:8000}).toBeLessThan(.08);
 await expect.poll(async()=>(await school()).paused,{timeout:12000}).toBe(true);
 expect((await bridge()).paused).toBe(true);

 // Stepping onto Loeb Bridge opens the last stretch, which carries the crash and the rescue.
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();
 await expect.poll(async()=>(await bridge()).time).toBeGreaterThan(.1);
 expect((await bridge()).error).toBeNull();expect((await bridge()).volume).toBeLessThanOrEqual(.15);
 await finishDialogue(page);
 for(const objective of ['A second changes everything','Back to the surface']){
   await expect(page.locator('#objective-title')).toHaveText(objective,{timeout:60000});
   expect((await bridge()).paused).toBe(false);
   await approach(page);
   if(await page.locator('#encounter').isVisible()){expect((await bridge()).paused).toBe(false);await solveEncounter(page,false);}
 }

 // An unlikely beginning ends it on the same fade.
 await expect(page.locator('#objective-title')).toHaveText('An unlikely beginning',{timeout:60000});
 await expect.poll(async()=>(await bridge()).volume,{timeout:8000}).toBeLessThan(.08);
 await expect.poll(async()=>(await bridge()).paused,{timeout:12000}).toBe(true);
 expect(errors).toEqual([]);
});

test('the closing track opens at home, skips its intro and fades over the completion screen',async({page})=>{
 test.setTimeout(180_000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await seedSave(page,'home');
 await page.clock.install();
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
 await page.locator('#opening-music-button').click();
 await expect(page.locator('#begin-button')).toContainText('Continue');await page.locator('#begin-button').click();
 const home=track(page,'home-audio');
 await expect(page.locator('#objective-title')).toHaveText('The light in the window');
 expect((await home()).paused).toBe(true);

 // The track opens with the family conversation, 23 seconds in.
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();
 await expect.poll(async()=>(await home()).time).toBeGreaterThan(23);
 expect((await home()).error).toBeNull();expect((await home()).volume).toBeLessThanOrEqual(.15);

 // It carries the loft: the daydream dance, the telescope, and the stars.
 await finishDialogue(page);
 await expect(page.locator('#objective-title')).toHaveText('Every legend starts somewhere');
 expect((await home()).paused).toBe(false);
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();expect((await home()).paused).toBe(false);
 const loft=(await finishDialogue(page)).join(' ');
 expect(loft).toContain('saving you the last dance');
 expect(loft).toContain('It was only ever a daydream.');
 expect(loft).toContain('looks back toward the farm');
 expect(loft).toContain('Every legend starts somewhere.');

 // Only the closing panel ends it.
 await expect(page.locator('#completion')).toBeVisible();
 await expect.poll(async()=>(await home()).volume,{timeout:8000}).toBeLessThan(.08);
 await expect.poll(async()=>(await home()).paused,{timeout:12000}).toBe(true);
 expect(errors).toEqual([]);
});
