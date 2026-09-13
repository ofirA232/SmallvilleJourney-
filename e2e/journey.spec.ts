import { expect, test, type Page } from '@playwright/test';
import { pilot } from '../src/content/pilot';
import { solveEncounter } from './encounter-helper';

async function ready(page:Page){await page.goto('/?quality=low');await expect(page.locator('#world')).toHaveAttribute('data-ready','true',{timeout:60_000});await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#fallback')).toBeHidden();}
async function state(page:Page){return page.locator('#telemetry').evaluate(el=>JSON.parse(el.textContent!));}
async function start(page:Page){await ready(page);await page.locator('#begin-button').click();await page.locator('#skip-intro').click();await expect(page.locator('#objective')).toBeVisible();}

test('surface: title, live world, follow view and responsive journal',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await ready(page);await expect(page.getByRole('heading',{name:'Every legend starts somewhere.'})).toBeVisible();
  await page.screenshot({path:info.outputPath('title.png'),scale:'css',timeout:60_000});
  await page.locator('#begin-button').click();await expect(page.locator('#intro-year')).toHaveText('OCTOBER 1989');
  await page.locator('#intro-next').click();await page.locator('#intro-next').click();await page.locator('#intro-next').click();
  await expect(page.locator('#objective-title')).toHaveText('A place to call home');
  await expect(page.locator('#toast')).toBeHidden();await page.screenshot({path:info.outputPath('farm.png'),scale:'css',timeout:60_000});
  await page.locator('#track-button').click();await page.waitForFunction(()=>JSON.parse(document.querySelector('#telemetry')!.textContent!).nearby);
  if(info.project.name==='mobile'){
    for(const selector of ['#settings-button','#journal-button','#interact-button','#joystick','#speed-button','#jump-button']){
      const bounds=await page.locator(selector).boundingBox();expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    }
    expect(await page.evaluate(()=>innerWidth)).toBe(page.viewportSize()!.width);
  }
  await page.locator('#interact-button').click();await expect(page.locator('#dialogue')).toBeVisible();
  await page.screenshot({path:info.outputPath('dialogue.png'),scale:'css',timeout:60_000});
  for(let i=0;i<5;i++)await page.locator('#dialogue-next').click();
  await page.getByRole('button',{name:'Why do I have to be so careful?'}).click();
  await expect(page.locator('#dialogue-text')).toContainText('use what I can do');
  await page.locator('#dialogue-next').click();await page.locator('#dialogue-next').click();await page.locator('#finish-conversation').click();
  await expect(page.locator('#objective-title')).toHaveText('A gentle touch');
  await page.locator('#settings-button').click();await expect(page.locator('#settings')).toBeVisible();
  await page.locator('#motion-setting').check();await page.locator('#quality-setting').selectOption('low');
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  if(info.project.name==='mobile'){
    await expect(page.locator('#joystick')).toBeVisible();await expect(page.locator('#speed-button')).toBeVisible();
    await page.locator('#settings-button').tap();await page.getByRole('button',{name:'Close settings',exact:true}).tap();
    await page.locator('#journal-button').tap();
  }else{await page.keyboard.press('j');}
  await expect(page.locator('#journal')).toBeVisible();await page.locator('#tab-places').click();await expect(page.locator('[data-place="metropolis"]')).toBeDisabled();
  await page.screenshot({path:info.outputPath('journal.png'),scale:'css',timeout:60_000});expect(errors).toEqual([]);
});

test('complete pilot: every objective, a mid-rescue reload, and the saved ending',async({page},info)=>{
  test.setTimeout(600_000);
  await page.clock.install();
  await start(page);
  for(let index=0;index<pilot.quests.length;index++){
    const current=await state(page);expect(current.questIndex).toBe(index);
    if(!current.nearby){
      if(info.project.name==='mobile')await page.locator('#track-button').tap();else await page.locator('#track-button').click();
      await page.waitForFunction(()=>JSON.parse(document.querySelector('#telemetry')!.textContent!).nearby,{},{timeout:55_000});
    }
    await expect(page.locator('#interact-button')).toBeVisible();
    if(info.project.name==='mobile')await page.locator('#interact-button').tap();else{await page.locator('#world').focus();await page.keyboard.press('e');}
    await page.waitForFunction(i=>{const dialogue=document.querySelector<HTMLElement>('#dialogue')!;return !!document.querySelector('#truck-attack')||!!document.querySelector('#encounter[open]')||!dialogue.hidden||JSON.parse(document.querySelector('#telemetry')!.textContent!).questIndex>i;},index);
    if(await page.locator('#truck-attack').isVisible()){if(info.project.name==='mobile')await page.locator('#truck-stop').tap();else await page.keyboard.press('e');}
    if(await page.locator('#encounter').isVisible())await solveEncounter(page,info.project.name==='mobile');
    while(await page.locator('#dialogue').isVisible()){
      const button=await page.locator('#finish-conversation').isVisible()?page.locator('#finish-conversation'):page.locator('#dialogue-next');
      if(info.project.name==='mobile')await button.tap();else await button.click();
    }
    await page.waitForFunction(i=>JSON.parse(document.querySelector('#telemetry')!.textContent!).questIndex>i,index);
    if([6,17,22].includes(index)){
      await expect(page.locator('#toast')).toBeHidden();await page.screenshot({path:info.outputPath(`chapter-${index}.png`),scale:'css',timeout:60_000});
    }
    if(pilot.quests[index].id==='car-door'){await page.reload();await expect(page.locator('#world')).toHaveAttribute('data-ready','true',{timeout:60_000});await expect(page.locator('#begin-button')).toContainText('Continue');await page.locator('#begin-button').click();await expect(page.locator('#objective-title')).toHaveText('Back to the surface');}
  }
  await expect(page.locator('#completion')).toBeVisible();await page.screenshot({path:info.outputPath('completed.png'),scale:'css',timeout:60_000});
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('smallville-journey-save-v1')!));expect(save.episodeCompleted).toBe(true);expect(save.completedQuestIds).toHaveLength(pilot.quests.length);
  await page.locator('#keep-exploring').click();await expect(page.locator('#objective-title')).toHaveText('The world is still yours');
  await page.reload();await expect(page.locator('#world')).toHaveAttribute('data-ready','true',{timeout:60_000});await expect(page.locator('#begin-button')).toContainText('Return to Smallville');
});

test('fallback: a useful message when WebGL is unavailable',async({page})=>{
  await page.goto('/?no-webgl=1');await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('#fallback')).toContainText('WebGL 2');await expect(page.locator('#reload-button')).toBeVisible();
});
