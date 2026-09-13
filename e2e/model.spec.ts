import { expect, test } from '@playwright/test';
import { pilot } from '../src/content/pilot';
import { Story, SAVE_KEY } from '../src/core/story';
import { locations } from '../src/content/locations';

test('model: motion lab loads all clips, skeleton, and original comparison', async ({page}, info) => {
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/model-review.html');
  await expect(page.locator('#status')).toContainText('Loaded');
  for(const motion of ['Walk','Run','Jump','Swim','Strength','Restrained','Idle']){
    await page.locator(`[data-motion="${motion}"]`).click();
    await expect(page.locator('#status')).toContainText(motion);
  }
  await page.locator('#skeleton').click();
  await page.locator('#pause').click();
  await expect(page.locator('#pause')).toHaveText('Play');
  await page.screenshot({path:info.outputPath('rig-lab.png')});
  await page.locator('#original').click();
  await expect(page.locator('#summary')).toContainText('990,606',{timeout:60_000});
  await page.locator('[data-motion="Idle"]').click();
  await expect(page.locator('#summary')).toContainText('24,000');
  expect(errors).toEqual([]);
});

for(const fail of [false,true])test(`model: gameplay ${fail?'retains fallback when asset fails':'uses the supplied rig'}`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  if(fail)await page.route('**/models/clark/clark-rigged.glb',route=>route.abort());
  const story=new Story(pilot,null,locations.map(location=>location.id));
  await page.addInitScript(({key,save})=>localStorage.setItem(key,save),{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});
  await page.goto('/?quality=low');
  await page.locator('#loading').waitFor({state:'hidden',timeout:60_000});
  await page.locator('#begin-button').click();
  await expect(page.locator('#objective')).toBeVisible();
  await expect.poll(async()=>JSON.parse((await page.locator('#telemetry').textContent())!).characterModel).toBe(fail?'fallback':'ready');
  if(!fail)await expect.poll(async()=>JSON.parse((await page.locator('#telemetry').textContent())!).characterMotion).toBe('Idle');
  await page.screenshot({path:info.outputPath(fail?'fallback.png':'imported-game.png')});
  expect(errors).toEqual([]);
});
