import {test,expect,type Page} from '@playwright/test';
import {solveEncounter,solveFence,solveValve} from './encounter-helper';
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
 // Sound is on by default; the first click lets the browser play it.
 await page.locator('#begin-button').click();await page.locator('#skip-intro').click();
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

 // It keeps playing while Clark fixes the fence behind Jonathan's back.
 await expect(page.locator('#objective-title')).toHaveText('Faster than Dad can see',{timeout:60000});
 await approach(page);await expect(page.locator('#fence-status')).toBeVisible();expect((await morning()).paused).toBe(false);
 await solveFence(page,false);expect((await morning()).paused).toBe(false);
 while(await page.locator('#dialogue').isVisible())await page.locator(await page.locator('#finish-conversation').isVisible()?'#finish-conversation':'#dialogue-next').click();
 // The bus pulls away before the run begins.
 await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','bus-leaves');expect((await morning()).paused).toBe(false);
 await expect(page.locator('#cutscene')).toHaveCount(0,{timeout:30000});

 // It plays on through the whole run to school, and hands over on Pete's first line.
 await expect(page.locator('#objective-title')).toHaveText('The first bell',{timeout:60000});
 await page.waitForTimeout(3000);expect((await morning()).paused).toBe(false);expect((await school()).paused).toBe(true);
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();
 await expect.poll(async()=>(await morning()).paused,{timeout:12000}).toBe(true);
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

 // It plays on under the questions on the bank, and hands over to the family track on Lex's first line.
 const secrets=track(page,'secrets-audio');
 await expect(page.locator('#objective-title')).toHaveText('An unlikely beginning',{timeout:60000});
 await page.waitForTimeout(3000);expect((await bridge()).paused).toBe(false);expect((await secrets()).paused).toBe(true);
 await approach(page);
 await expect(page.locator('#encounter')).toBeVisible();expect((await bridge()).paused).toBe(false);
 await solveEncounter(page,false);
 await expect(page.locator('#dialogue')).toBeVisible();
 await expect.poll(async()=>(await bridge()).paused,{timeout:12000}).toBe(true);
 await expect.poll(async()=>(await secrets()).time).toBeGreaterThan(.1);
 expect((await secrets()).error).toBeNull();expect((await secrets()).volume).toBeLessThanOrEqual(.15);
 expect(errors).toEqual([]);
});

test('the family track carries the truth and the spaceship, and fades when the cemetery is next',async({page})=>{
 test.setTimeout(180_000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await seedSave(page,'lex-thanks');
 await page.clock.install();
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
 await page.locator('#begin-button').click();
 const bridge=track(page,'bridge-audio'), secrets=track(page,'secrets-audio');
 await expect(page.locator('#objective-title')).toHaveText('An unlikely beginning');
 expect((await secrets()).paused).toBe(true);

 // A save on the bank never started the river track, so only the family track opens, on Lex's first line.
 await approach(page);
 await expect(page.locator('#encounter')).toBeVisible();expect((await secrets()).paused).toBe(true);
 await solveEncounter(page,false);
 await expect(page.locator('#dialogue')).toBeVisible();
 await expect.poll(async()=>(await secrets()).time).toBeGreaterThan(.1);
 expect((await bridge()).paused).toBe(true);
 await finishDialogue(page);

 // It carries Jonathan's answers and the craft in the storm cellar.
 await expect(page.locator('#objective-title')).toHaveText('The answers at home',{timeout:60000});expect((await secrets()).paused).toBe(false);
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();expect((await secrets()).paused).toBe(false);
 await finishDialogue(page);
 await expect(page.locator('#objective-title')).toHaveText('Somewhere beyond the stars',{timeout:60000});expect((await secrets()).paused).toBe(false);
 await approach(page);
 await expect(page.locator('#encounter')).toBeVisible();expect((await secrets()).paused).toBe(false);
 await solveEncounter(page,false);
 await expect(page.locator('#dialogue')).toBeVisible();expect((await secrets()).paused).toBe(false);
 await finishDialogue(page);

 // The walk to the cemetery ends it on the usual fade.
 await expect(page.locator('#objective-title')).toHaveText('A quiet kind of understanding',{timeout:60000});
 await expect.poll(async()=>(await secrets()).volume,{timeout:8000}).toBeLessThan(.08);
 await expect.poll(async()=>(await secrets()).paused,{timeout:12000}).toBe(true);
 expect(errors).toEqual([]);
});

test('the cemetery opens its own track with Lana, carries the prom question, and fades when the mansion is next',async({page})=>{
 test.setTimeout(180_000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await seedSave(page,'cemetery');
 await page.clock.install();
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
 await page.locator('#begin-button').click();
 const cemetery=track(page,'cemetery-audio');
 await expect(page.locator('#objective-title')).toHaveText('A quiet kind of understanding');
 expect((await cemetery()).paused).toBe(true);

 // Lana's first line opens it.
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();
 await expect.poll(async()=>(await cemetery()).time).toBeGreaterThan(.1);
 expect((await cemetery()).error).toBeNull();expect((await cemetery()).volume).toBeLessThanOrEqual(.15);
 await finishDialogue(page);

 // It plays on under the prom question and the kiss.
 await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','prom-ask');expect((await cemetery()).paused).toBe(false);
 await expect(page.locator('#cutscene')).toHaveCount(0,{timeout:40000});

 // The visit to the mansion ends it.
 await expect(page.locator('#objective-title')).toHaveText('More than a name',{timeout:60000});
 await expect.poll(async()=>(await cemetery()).volume,{timeout:8000}).toBeLessThan(.08);
 await expect.poll(async()=>(await cemetery()).paused,{timeout:12000}).toBe(true);
 expect(errors).toEqual([]);
});

test('the Wall of Weird opens its own track, which carries the investigation until Whitney is waiting',async({page})=>{
 test.setTimeout(240_000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await seedSave(page,'wall');
 await page.clock.install();
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
 await page.locator('#begin-button').click();
 const wall=track(page,'wall-audio');
 await expect(page.locator('#objective-title')).toHaveText('Welcome to the Wall of Weird');
 expect((await wall()).paused).toBe(true);

 // Chloe's first line opens it.
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();
 await expect.poll(async()=>(await wall()).time).toBeGreaterThan(.1);
 expect((await wall()).error).toBeNull();expect((await wall()).volume).toBeLessThanOrEqual(.15);
 await finishDialogue(page);

 // It plays on through every clipping on the board.
 for(const objective of ['The boy in the photograph','Twelve missing years','The day the sky fell']){
   await expect(page.locator('#objective-title')).toHaveText(objective,{timeout:60000});expect((await wall()).paused).toBe(false);
   await approach(page);
   await expect(page.locator('#dialogue')).toBeVisible();expect((await wall()).paused).toBe(false);
   await finishDialogue(page);
 }

 // And through the film of Jeremy's story and the deduction that follows it.
 await expect(page.locator('#objective-title')).toHaveText('Connect the pieces',{timeout:60000});
 await approach(page);
 await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','wall-discovery');expect((await wall()).paused).toBe(false);
 await expect(page.locator('#cutscene')).toHaveCount(0,{timeout:30000});
 await expect(page.locator('#encounter')).toBeVisible();expect((await wall()).paused).toBe(false);
 await solveEncounter(page,false);
 await expect(page.locator('#dialogue')).toBeVisible();expect((await wall()).paused).toBe(false);
 await finishDialogue(page);

 // Whitney waiting outside ends it.
 await expect(page.locator('#objective-title')).toHaveText('An old tradition',{timeout:60000});
 await expect.poll(async()=>(await wall()).volume,{timeout:8000}).toBeLessThan(.08);
 await expect.poll(async()=>(await wall()).paused,{timeout:12000}).toBe(true);
 expect(errors).toEqual([]);
});

test('night on Riley Field opens its own track past the intro, and the chase takes over from Lex’s rescue until Jeremy is stopped',async({page})=>{
 test.setTimeout(300_000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await seedSave(page,'whitney');
 await page.clock.install();
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
 await page.locator('#begin-button').click();
 const field=track(page,'cornfield-audio');
 await expect(page.locator('#objective-title')).toHaveText('An old tradition');

 // Whitney's conversation in the parking area stays quiet.
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();expect((await field()).paused).toBe(true);
 await finishDialogue(page);

 // Night falls on the field: the track opens with the scene, at 0:12.
 await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','scarecrow-night');
 await expect.poll(async()=>(await field()).time).toBeGreaterThan(12);
 expect((await field()).error).toBeNull();expect((await field()).volume).toBeLessThanOrEqual(.15);
 await expect(page.locator('#cutscene')).toHaveCount(0,{timeout:20000});

 // It plays on under Jeremy at the post and while Lex's car pulls up.
 const chase=track(page,'momentum-audio');
 await expect(page.locator('#objective-title')).toHaveText('History repeats');
 await expect(page.locator('#interact-button')).toBeVisible({timeout:15000});await page.locator('#interact-button').click();
 await expect(page.locator('#dialogue')).toBeVisible();expect((await field()).paused).toBe(false);
 await finishDialogue(page);
 await expect(page.locator('#objective-title')).toHaveText('A friend in the dark',{timeout:60000});
 await expect(page.locator('#interact-button')).toBeVisible({timeout:15000});await page.locator('#interact-button').click();
 expect((await field()).paused).toBe(false);expect((await chase()).paused).toBe(true);

 // Clark calling out to Lex hands over to the chase, which sits quieter than the rest of the score.
 await expect(page.locator('#dialogue')).toBeVisible({timeout:20000});
 await expect.poll(async()=>(await field()).paused,{timeout:12000}).toBe(true);
 await expect.poll(async()=>(await chase()).time).toBeGreaterThan(.1);
 // It fades in to its own, lower level.
 expect((await chase()).error).toBeNull();expect((await chase()).volume).toBeLessThanOrEqual(.1);
 await expect.poll(async()=>(await chase()).volume,{timeout:8000}).toBeCloseTo(.1,2);
 await finishDialogue(page);

 // It carries the run to school, the stand-off, the valve and the truck.
 await expect(page.locator('#objective-title')).toHaveText('Before the music stops',{timeout:60000});expect((await chase()).paused).toBe(false);
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();expect((await chase()).paused).toBe(false);
 await finishDialogue(page);
 await expect(page.locator('#objective-title')).toHaveText('Keep them safe',{timeout:60000});
 await approach(page);
 await expect(page.locator('#valve')).toBeVisible();expect((await chase()).paused).toBe(false);
 await solveValve(page);
 await expect(page.locator('#objective-title')).toHaveText('Stand your ground',{timeout:60000});expect((await chase()).paused).toBe(false);
 await approach(page);
 await expect(page.locator('#truck-attack')).toBeVisible();expect((await chase()).paused).toBe(false);
 await page.keyboard.press('e');

 // The broken water main takes the charge out of Jeremy, and the chase fades.
 await expect(page.locator('#objective-title')).toHaveText('Everybody gets to go home',{timeout:60000});
 await expect.poll(async()=>(await chase()).volume,{timeout:8000}).toBeLessThan(.05);
 await expect.poll(async()=>(await chase()).paused,{timeout:12000}).toBe(true);
 expect(errors).toEqual([]);
});

test('the closing track opens at home, skips its intro, plays on behind the completion screen and stops outside',async({page})=>{
 test.setTimeout(180_000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await seedSave(page,'home');
 await page.clock.install();
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
 await expect(page.locator('#begin-button')).toContainText('Continue');await page.locator('#begin-button').click();
 const home=track(page,'home-audio');
 await expect(page.locator('#objective-title')).toHaveText('The light in the window');
 expect((await home()).paused).toBe(true);

 // The track opens with the family conversation, at 2:20.
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();
 await expect.poll(async()=>(await home()).time).toBeGreaterThan(140);
 expect((await home()).error).toBeNull();expect((await home()).volume).toBeLessThanOrEqual(.15);

 // It carries the loft: the daydream dance, the telescope, and the stars.
 await finishDialogue(page);
 await expect(page.locator('#objective-title')).toHaveText('Every legend starts somewhere');
 expect((await home()).paused).toBe(false);
 await approach(page);
 await expect(page.locator('#dialogue')).toBeVisible();expect((await home()).paused).toBe(false);
 const invitation=(await finishDialogue(page)).join(' ');
 expect(invitation).toContain('saving you the last dance');
 // The dance itself plays in the loft, still over the same track.
 await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','last-dance');
 await expect(page.locator('#cutscene')).toHaveCount(0,{timeout:40000});expect((await home()).paused).toBe(false);
 await expect(page.locator('#dialogue')).toBeVisible({timeout:15000});
 const loft=(await finishDialogue(page)).join(' ');
 expect(loft).toContain('It was only ever a daydream.');
 expect(loft).toContain('aunt Nell’s porch');expect(loft).toContain('Goodnight, Lana.');
 // The last look up at the stars ends the episode, still over the same track.
 await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','loft-stars');await expect(page.locator('#cutscene-caption')).toContainText('stars he fell from');
 await expect(page.locator('#cutscene-caption')).toContainText('Every legend starts somewhere',{timeout:10000});

 // The episode is over, but the song plays on behind the closing panel at its full level…
 await expect(page.locator('#completion')).toBeVisible({timeout:30000});
 const ending=(await home()).time;await page.waitForTimeout(3000);
 expect((await home()).paused).toBe(false);expect((await home()).time).toBeGreaterThan(ending+1);expect((await home()).volume).toBeCloseTo(.15,2);
 expect(await page.locator('#home-audio').evaluate(el=>(el as HTMLAudioElement).loop)).toBe(false);
 // …until the player steps outside into Smallville.
 await page.locator('#keep-exploring').click();
 await expect.poll(async()=>(await home()).volume,{timeout:8000}).toBeLessThan(.08);
 await expect.poll(async()=>(await home()).paused,{timeout:12000}).toBe(true);
 expect(errors).toEqual([]);
});
