import {test,expect,type Page} from '@playwright/test';
import {pilot} from '../src/content/pilot';
import {pilotChallenges} from '../src/content/pilot-challenges';
import {Story,SAVE_KEY} from '../src/core/story';
import {locations} from '../src/content/locations';
const state=(page:Page)=>page.locator('#telemetry').evaluate(el=>JSON.parse(el.textContent!));
async function seed(page:Page,id:string){const story=new Story(pilot,null,locations.map(l=>l.id));story.index=pilot.quests.findIndex(q=>q.id===id);await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,save);},{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});await open(page);}
async function open(page:Page){await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await page.locator('#begin-button').click();}
test('suspended Clark waits for Lex, whose approach pauses and replays safely',async({page},info)=>{
  await page.clock.install();await seed(page,'call-for-help');
  await expect.poll(async()=>(await state(page)).actors.lex.model).toBe('ready');
  expect((await state(page)).actors.lex.visible).toBe(false);expect((await state(page)).restraintHeight).toBeGreaterThan(.2);
  await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+3600000));
  await page.screenshot({path:info.outputPath('hanging.png'),scale:'css'});
  await page.locator('#interact-button').click();await page.clock.runFor(2200);expect((await state(page)).actors.lex.visible).toBe(false);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.clock.runFor(6000);expect((await state(page)).actors.lex.visible).toBe(false);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.clock.runFor(2000);expect((await state(page)).actors.lex.visible).toBe(true);expect((await state(page)).fieldRescue).toBe(true);
  await page.screenshot({path:info.outputPath('lex-approaching.png'),scale:'css'});
  await page.clock.resume();await open(page);expect((await state(page)).actors.lex.visible).toBe(false);
  await page.locator('#interact-button').click();await expect(page.locator('#dialogue')).toBeVisible({timeout:20000});
  for(let i=0;i<10&&await page.locator('#dialogue').isVisible();i++){
    if(await page.locator('#finish-conversation').isVisible())await page.locator('#finish-conversation').click();else await page.locator('#dialogue-next').click();
  }
  await expect.poll(async()=>(await state(page)).questId).toBe('race');expect((await state(page)).restrained).toBe(false);
});
for(const id of ['lex-thanks','spaceship'])test(`reasoning at ${id} requires evidence and explicit completion`,async({page},info)=>{
  await seed(page,id);await page.locator('#track-button').click();await expect.poll(async()=>(await state(page)).nearby,{timeout:60000}).toBe(true);
  await page.locator('#interact-button').click();await expect(page.locator('#encounter')).toBeVisible();
  const definition=pilotChallenges[id];if(definition.kind!=='evidence')throw new Error('Expected evidence');
  await page.locator(`[data-answer="${1-definition.questions[0].answer}"]`).click();await expect(page.locator('#encounter-feedback')).toHaveAttribute('data-kind','miss');expect((await state(page)).questId).toBe(id);
  await page.locator('#encounter-close').click();await page.locator('#interact-button').click();
  for(const question of definition.questions)await page.locator(`[data-answer="${question.answer}"]`).click();
  await page.screenshot({path:info.outputPath(`${id}.png`),scale:'css'});expect((await state(page)).questId).toBe(id);
  await page.locator('#encounter-finish').click();await expect(page.locator('#dialogue')).toBeVisible();
});
