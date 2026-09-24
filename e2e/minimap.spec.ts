import {test,expect} from '@playwright/test';
// Netlify's hosted "Powered by" badge occupies roughly this bottom-right corner on deployed builds.
const BADGE={width:190,height:52};
test('minimap tracks movement, collapses and navigates without covering controls',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const mobile=info.project.name==='mobile';
 await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await expect(page.locator('#minimap')).toBeHidden();
 await page.locator('#begin-button').click();await page.locator('#skip-intro').click();await expect(page.locator('#minimap')).toBeVisible();
 const map=page.locator('#minimap');const viewport=page.viewportSize()!;
 const click=async(selector:string)=>{if(mobile)await page.locator(selector).tap();else await page.locator(selector).click();};
 const clearOfControls=async()=>{
  const bounds=(await map.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width);expect(bounds.y+bounds.height).toBeLessThanOrEqual(viewport.height);
  for(const id of mobile?['#joystick','#speed-button','#jump-button','#objective','#note-prompt']:['#objective','#settings-button']){
   const other=(await page.locator(id).boundingBox())!;
   expect(bounds.x+bounds.width<=other.x||other.x+other.width<=bounds.x||bounds.y+bounds.height<=other.y||other.y+other.height<=bounds.y,`minimap overlaps ${id}`).toBe(true);
  }
 };
 const clearOfBadge=async(selector:string)=>{const box=(await page.locator(selector).boundingBox())!;expect(box.x+box.width<=viewport.width-BADGE.width||box.y+box.height<=viewport.height-BADGE.height,`${selector} sits under the host badge`).toBe(true);};
 // Phones open with the map folded into a button; desktop shows it expanded.
 await expect(page.locator('#minimap-toggle')).toHaveAttribute('aria-expanded',String(!mobile));await clearOfControls();
 if(mobile){for(const id of ['#speed-button','#jump-button'])await clearOfBadge(id);await click('#minimap-toggle');await expect(page.locator('#minimap-body')).toBeVisible();await clearOfControls();}
 await page.screenshot({path:info.outputPath('minimap.png'),scale:'css'});
 const start=await map.locator('canvas').getAttribute('data-position');await page.locator('#world').focus();await page.keyboard.down('d');await expect.poll(()=>map.locator('canvas').getAttribute('data-position')).not.toBe(start);await page.keyboard.up('d');
 await click('#minimap-toggle');await expect(page.locator('#minimap-body')).toBeHidden();await expect(page.locator('#minimap-toggle')).toHaveAttribute('aria-expanded','false');await click('#minimap-toggle');await expect(page.locator('#minimap-body')).toBeVisible();
 await click('#settings-button');await expect(map).toBeHidden();await page.getByRole('button',{name:'Close settings',exact:true}).click();await expect(map).toBeVisible();
 await click('#minimap-go');await expect(page.locator('#interact-button')).toBeVisible({timeout:60000});await expect(map).toBeHidden();await click('#interact-button');await expect(page.locator('#dialogue')).toBeVisible();await expect(map).toBeHidden();
 await clearOfBadge('#dialogue');expect(errors).toEqual([]);
});
