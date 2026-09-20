import {test,expect} from '@playwright/test';
test('opening music streams after a click, pauses on blur/mute and ends when gameplay starts',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
 const media=()=>page.locator('#opening-audio').evaluate(el=>{const a=el as HTMLAudioElement;return{paused:a.paused,time:a.currentTime,error:a.error?.code??null};});
 expect((await media()).paused).toBe(true);
 await page.locator('#opening-music-button').click();await expect.poll(async()=>(await media()).paused).toBe(false);await expect.poll(async()=>(await media()).time).toBeGreaterThan(.1);expect((await media()).error).toBeNull();
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect.poll(async()=>(await media()).paused).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(async()=>(await media()).paused).toBe(false);
 await page.locator('#sound-button').click();await expect.poll(async()=>(await media()).paused).toBe(true);
 await page.locator('#opening-music-button').click();await expect.poll(async()=>(await media()).paused).toBe(false);
 await page.locator('#begin-button').click();await expect(page.locator('#prologue')).toBeVisible();await expect.poll(async()=>(await media()).paused).toBe(false);
 await page.locator('#skip-intro').click();await expect.poll(async()=>(await media()).paused).toBe(true);expect((await media()).time).toBe(0);
 await page.locator('#brand-button').click();await expect(page.locator('#landing')).toBeVisible();await expect.poll(async()=>(await media()).paused).toBe(false);
 expect(errors).toEqual([]);
});
