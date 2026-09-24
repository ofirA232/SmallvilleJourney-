import {test,expect} from '@playwright/test';
test('minimap tracks movement, collapses and navigates without covering controls',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await expect(page.locator('#minimap')).toBeHidden();
 await page.locator('#begin-button').click();await page.locator('#skip-intro').click();await expect(page.locator('#minimap')).toBeVisible();
 const map=page.locator('#minimap');const bounds=(await map.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);expect(bounds.y+bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
 for(const id of info.project.name==='mobile'?['#joystick','#speed-button','#jump-button','#objective']:['#objective','#settings-button']){
  const other=(await page.locator(id).boundingBox())!;
  expect(bounds.x+bounds.width<=other.x||other.x+other.width<=bounds.x||bounds.y+bounds.height<=other.y||other.y+other.height<=bounds.y).toBe(true);
 }
 await page.screenshot({path:info.outputPath('minimap.png'),scale:'css'});
 const start=await map.locator('canvas').getAttribute('data-position');await page.locator('#world').focus();await page.keyboard.down('d');await expect.poll(()=>map.locator('canvas').getAttribute('data-position')).not.toBe(start);await page.keyboard.up('d');
 const click=async(selector:string)=>{if(info.project.name==='mobile')await page.locator(selector).tap();else await page.locator(selector).click();};
 await click('#minimap-toggle');await expect(page.locator('#minimap-body')).toBeHidden();await expect(page.locator('#minimap-toggle')).toHaveAttribute('aria-expanded','false');await click('#minimap-toggle');await expect(page.locator('#minimap-body')).toBeVisible();
 await click('#settings-button');await expect(map).toBeHidden();await page.getByRole('button',{name:'Close settings',exact:true}).click();await expect(map).toBeVisible();
 await click('#minimap-go');await expect(page.locator('#interact-button')).toBeVisible({timeout:60000});await expect(map).toBeHidden();await click('#interact-button');await expect(page.locator('#dialogue')).toBeVisible();await expect(map).toBeHidden();expect(errors).toEqual([]);
});
