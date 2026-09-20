import {test,expect} from '@playwright/test';
test('Kent conversation music follows dialogue, sound controls and focus',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
 await page.locator('#opening-music-button').click();await page.locator('#begin-button').click();await page.locator('#skip-intro').click();
 const media=()=>page.locator('#story-audio').evaluate(el=>{const a=el as HTMLAudioElement;return{paused:a.paused,time:a.currentTime,error:a.error?.code??null};});
 expect((await media()).paused).toBe(true);
 await page.locator('#track-button').click();await expect(page.locator('#interact-button')).toBeVisible({timeout:60000});await page.locator('#interact-button').click();
 await expect(page.locator('#dialogue')).toBeVisible();await expect.poll(async()=>(await media()).time).toBeGreaterThan(.1);expect((await media()).error).toBeNull();
 expect(await page.locator('#opening-audio').evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect.poll(async()=>(await media()).paused).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(async()=>(await media()).paused).toBe(false);
 await page.locator('#sound-button').click();await expect.poll(async()=>(await media()).paused).toBe(true);
 await page.locator('#sound-button').click();await expect.poll(async()=>(await media()).paused).toBe(false);
 for(let i=0;i<5;i++)await page.locator('#dialogue-next').click();
 await page.getByRole('button',{name:'Why do I have to be so careful?'}).click();expect((await media()).paused).toBe(false);
 await page.locator('#dialogue-next').click();await page.locator('#dialogue-next').click();await page.locator('#finish-conversation').click();
 await expect.poll(async()=>(await media()).paused).toBe(true);expect((await media()).time).toBe(0);expect(errors).toEqual([]);
});
