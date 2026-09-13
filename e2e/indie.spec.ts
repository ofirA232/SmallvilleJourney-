import { expect, test } from '@playwright/test';
import { pilot } from '../src/content/pilot';
import { locations } from '../src/content/locations';
import { SAVE_KEY, Story } from '../src/core/story';
import { solveEncounter } from './encounter-helper';

test('investigation: wrong connections cannot complete the objective',async({page},info)=>{
  const story=new Story(pilot,null,locations.map(value=>value.id));story.index=pilot.quests.findIndex(q=>q.id==='deduction');
  await page.addInitScript(({key,save})=>localStorage.setItem(key,save),{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});
  await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60_000});await page.locator('#begin-button').click();
  await page.locator('#track-button').click();await expect(page.locator('#interact-button')).toBeVisible();await page.locator('#interact-button').click();
  await expect(page.locator('#encounter')).toBeVisible();await expect(page.locator('.evidence-card')).toHaveCount(3);
  await page.getByRole('button',{name:'He is a new student with the same name.',exact:false}).click();
  await expect(page.locator('#encounter-feedback')).toHaveAttribute('data-kind','miss');await expect(page.locator('#encounter-finish')).toBeHidden();
  await page.screenshot({path:info.outputPath('investigation.png'),scale:'css',timeout:60_000});
  await solveEncounter(page,info.project.name==='mobile');await expect(page.locator('#dialogue')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('smallville-journey-save-v1')!).currentQuestId)).toBe('deduction');
});

test('exploration: a small detail is saved and can be reread from the journal',async({page},info)=>{
  await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60_000});await page.locator('#begin-button').click();await page.locator('#skip-intro').click();
  await expect(page.locator('#note-prompt')).toBeVisible();
  if(info.project.name==='mobile')await page.locator('#note-prompt').tap();else await page.keyboard.press('e');
  await expect(page.locator('#field-note')).toBeVisible();await expect(page.locator('#field-note-title')).toHaveText('The name on the mailbox');
  await page.screenshot({path:info.outputPath('field-note.png'),scale:'css',timeout:60_000});
  await page.locator('#note-close').click();await expect(page.locator('#objective-title')).toHaveText('A place to call home');
  await page.reload();await page.locator('#loading').waitFor({state:'hidden',timeout:60_000});await page.locator('#begin-button').click();
  await page.locator('#journal-button').click();await page.getByRole('button',{name:'The name on the mailbox',exact:true}).click();await expect(page.locator('#field-note')).toBeVisible();
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('smallville-journey-save-v1')!));expect(save.memories).toEqual(['mailbox']);expect(save.completedQuestIds).toHaveLength(0);
});
