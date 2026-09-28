import {test,expect} from '@playwright/test';
import {OPENING_START} from '../src/core/opening-music';
test('opening music starts on the title (or at the first touch), skips its silent intro, pauses on blur/mute and ends when gameplay starts',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
 const media=()=>page.locator('#opening-audio').evaluate(el=>{const a=el as HTMLAudioElement;return{paused:a.paused,time:a.currentTime,volume:a.volume,error:a.error?.code??null,preload:a.preload};});
 expect((await media()).preload).toBe('auto');
 // A browser that refuses autoplay starts it at the first interaction with the page.
 await page.keyboard.press('Shift');
 await expect.poll(async()=>(await media()).paused).toBe(false);await expect.poll(async()=>(await media()).time).toBeGreaterThan(OPENING_START);expect((await media()).error).toBeNull();
 await expect(page.locator('#opening-music-button')).toHaveText('Pause opening music');
 // It fades in to its full level.
 await expect.poll(async()=>(await media()).volume,{timeout:8000}).toBeGreaterThan(.35);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect.poll(async()=>(await media()).paused).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(async()=>(await media()).paused).toBe(false);
 await page.locator('#sound-button').click();await expect.poll(async()=>(await media()).paused).toBe(true);
 await page.locator('#opening-music-button').click();await expect.poll(async()=>(await media()).paused).toBe(false);
 await page.locator('#begin-button').click();await expect(page.locator('#prologue')).toBeVisible();await expect.poll(async()=>(await media()).paused).toBe(false);
 // Gameplay starting fades it out, then it rests at the first note for the next visit to the title.
 await page.locator('#skip-intro').click();await expect.poll(async()=>(await media()).volume,{timeout:8000}).toBeLessThan(.2);
 await expect.poll(async()=>(await media()).paused).toBe(true);expect((await media()).time).toBe(OPENING_START);
 await page.locator('#brand-button').click();await expect(page.locator('#landing')).toBeVisible();await expect.poll(async()=>(await media()).paused).toBe(false);
 expect(errors).toEqual([]);
});
test('a player who turned sound off keeps a quiet title',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('smallville-settings-v1',JSON.stringify({sound:false,reducedMotion:false,quality:'low'})));
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await page.keyboard.press('Shift');
 await page.waitForTimeout(800);expect(await page.locator('#opening-audio').evaluate(el=>(el as HTMLAudioElement).paused)).toBe(true);
 await expect(page.locator('#opening-music-button')).toHaveText('Play opening music');
});
