import {expect,test,type Page} from '@playwright/test';
import {pilot} from '../src/content/pilot';
import {Story,SAVE_KEY} from '../src/core/story';
import {locations} from '../src/content/locations';
import {freeze,solveEncounter,solveFence,solveValve} from './encounter-helper';
const state=async(page:Page)=>JSON.parse((await page.locator('#telemetry').textContent())!);
async function seed(page:Page,quest:string){
  const story=new Story(pilot,null,locations.map(l=>l.id));story.index=pilot.quests.findIndex(q=>q.id===quest);
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,save);},{key:SAVE_KEY,save:JSON.stringify(story.snapshot())});
  // Installed before load so scenes can be frozen and stepped without a time jump.
  await page.clock.install();
  await page.goto('/?quality=low');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await page.locator('#begin-button').click();
}
async function begin(page:Page,quest:string,mobile:boolean){
  await seed(page,quest);
  if(!(await state(page)).nearby){if(mobile)await page.locator('#track-button').tap();else await page.locator('#track-button').click();}
  await expect.poll(async()=>(await state(page)).nearby,{timeout:60000}).toBe(true);
  if(mobile)await page.locator('#interact-button').tap();else await page.locator('#interact-button').click();
}
async function talk(page:Page,mobile:boolean){
  await expect(page.locator('#dialogue')).toBeVisible();
  while(await page.locator('#dialogue').isVisible()){const next=await page.locator('#finish-conversation').isVisible()?'#finish-conversation':'#dialogue-next';if(mobile)await page.locator(next).tap();else await page.locator(next).click();}
}
/** Steps a frozen scene, saving one capture per named moment. */
async function film(page:Page,info:{outputPath:(name:string)=>string},shots:readonly (readonly [number,string])[]){
  await freeze(page);
  for(const [ms,name] of shots){await page.clock.runFor(ms);await page.screenshot({path:info.outputPath(`${name}.png`)});}
}
test('scarecrow: night falls on Riley Field, then Jeremy steps out of the corn',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const mobile=info.project.name==='mobile';
  await begin(page,'whitney',mobile);
  await talk(page,mobile);
  await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','scarecrow-night');
  await film(page,info,[[1500,'field'],[2200,'post'],[2200,'jeremy']]);
  expect((await state(page)).questId).toBe('jeremy-field');
  await page.clock.runFor(2000);await page.clock.resume();
  await expect(page.locator('#cutscene')).toHaveCount(0);
  await expect.poll(async()=>(await state(page)).actors.jeremy.visible).toBe(true);
  await expect(page.locator('#interact-button')).toBeVisible();expect(errors).toEqual([]);
});
test('bus: after the fence posts, the bus pulls away, then drives the road during the race',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const mobile=info.project.name==='mobile';
  await begin(page,'fence',mobile);await expect(page.locator('#fence-status')).toBeVisible();
  await solveFence(page,mobile);await talk(page,mobile);
  await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','bus-leaves');
  await film(page,info,[[1400,'bus-away'],[2400,'clark-watches']]);
  expect((await state(page))).toMatchObject({questId:'friends',bus:true});
  await page.clock.runFor(1500);await page.clock.resume();
  await expect(page.locator('#cutscene')).toHaveCount(0);
  // The race clock waited for the scene; the bus now drives towards the school.
  await expect(page.locator('#race-clock')).toHaveText(/1:00|0:5[0-9]/);
  const start=(await state(page)).bus;expect(start).toBe(true);
  await page.screenshot({path:info.outputPath('race.png')});expect(errors).toEqual([]);
});
test('Jeremy: Clark tears the truck door off and pulls him out before they talk',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const mobile=info.project.name==='mobile';
  await seed(page,'free-jeremy');
  expect((await state(page)).truckCab).toEqual({door:true,driver:true,tornDoor:false});expect((await state(page)).actors.jeremy.visible).toBe(false);
  // Everyone else is inside at the dance: the service yard is Clark's and Jeremy's alone.
  const everyone=(await state(page)).actors;for(const id of ['pete','chloe','whitney'])expect(everyone[id].visible,id).toBe(false);
  if(mobile)await page.locator('#track-button').tap();else await page.locator('#track-button').click();
  await expect.poll(async()=>(await state(page)).nearby,{timeout:60000}).toBe(true);
  if(mobile)await page.locator('#interact-button').tap();else await page.locator('#interact-button').click();
  await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','truck-door');
  await film(page,info,[[900,'grip'],[900,'door-flies'],[1300,'pulled-out']]);
  await page.clock.runFor(1200);await page.clock.resume();
  await expect(page.locator('#dialogue')).toBeVisible();
  expect((await state(page)).truckCab).toEqual({door:false,driver:false,tornDoor:true});expect((await state(page)).actors.jeremy.visible).toBe(true);
  await talk(page,mobile);await expect.poll(async()=>(await state(page)).questId).toBe('home');
  expect((await state(page)).truckCab.tornDoor).toBe(true);expect(errors).toEqual([]);
});
test('loft: the finale plays in Clark’s loft, with a camera the player can turn while they talk',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const mobile=info.project.name==='mobile';
  await begin(page,'loft',mobile);
  await expect(page.locator('#dialogue')).toBeVisible();
  await expect.poll(async()=>(await state(page)).loft?.phase).toBe('talk');
  expect((await state(page)).loft.lana).toBe(false);
  await page.screenshot({path:info.outputPath('telescope.png')});
  // Turning the view during the conversation.
  const before=(await state(page)).camera,box=(await page.locator('#world').boundingBox())!;
  await page.mouse.move(box.width*.5,box.height*.3);await page.mouse.down();await page.mouse.move(box.width*.2,box.height*.32,{steps:8});await page.mouse.up();
  await expect.poll(async()=>(await state(page)).camera).not.toEqual(before);
  // Lana arrives at the top of the stairs.
  for(let line=0;line<2;line++){if(mobile)await page.locator('#dialogue-next').tap();else await page.locator('#dialogue-next').click();}
  await expect.poll(async()=>(await state(page)).loft.lana).toBe(true);
  await page.screenshot({path:info.outputPath('lana-arrives.png')});
  await talk(page,mobile);
  await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','last-dance');
  await film(page,info,[[2500,'dance'],[5000,'dance-turn']]);
  await page.clock.runFor(4600);await page.clock.resume();
  await expect(page.locator('#cutscene')).toHaveCount(0);expect((await state(page)).loft.lana).toBe(false);
  await page.screenshot({path:info.outputPath('after.png')});
  // “Goodnight, Lana.”: across town to her porch, where she turns as if she heard him, then back.
  for(let line=0;line<2;line++){if(mobile)await page.locator('#dialogue-next').tap();else await page.locator('#dialogue-next').click();}
  // It plays as a film: letterbox bars, the line as a subtitle, and the conversation held behind it.
  await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','goodnight');
  await expect(page.locator('#cutscene-caption')).toHaveText('Clark: “Goodnight, Lana.”');await expect(page.locator('#dialogue-next')).toBeDisabled();
  await page.screenshot({path:info.outputPath('goodnight.png')});
  await expect.poll(async()=>(await state(page)).loft.porch,{timeout:20000}).toBe(true);
  await film(page,info,[[100,'porch'],[1400,'porch-turn'],[1200,'porch-look']]);
  await page.clock.resume();
  // Back on Clark, and the conversation has moved on to its closing line by itself.
  await expect(page.locator('#cutscene')).toHaveCount(0,{timeout:20000});expect((await state(page)).loft.porch).toBe(false);
  await expect(page.locator('#dialogue-text')).toContainText('a little less ordinary');
  await expect(page.locator('#dialogue-next')).toBeEnabled();expect((await state(page)).loft.lana).toBe(false);
  await page.screenshot({path:info.outputPath('back-to-clark.png')});
  await talk(page,mobile);
  // The last look: through the window and up to the stars.
  await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','loft-stars');
  await film(page,info,[[1500,'window'],[5200,'stars'],[3600,'logo']]);
  await page.clock.runFor(1500);await page.clock.resume();
  // The series title has come up over the stars, and stays behind the closing panel.
  await expect(page.locator('#series-logo')).toHaveClass(/shown/,{timeout:30000});
  await expect(page.locator('#completion')).toBeVisible({timeout:30000});
  if(mobile)await page.locator('#keep-exploring').tap();else await page.locator('#keep-exploring').click();
  await expect(page.locator('#objective-title')).toHaveText('The world is still yours');await expect.poll(async()=>(await state(page)).loft).toBeNull();
  await expect(page.locator('#series-logo')).toHaveCount(0);expect(errors).toEqual([]);
});
test('life: characters stroll around their spot and talk with their hands',async({page},info)=>{
  const mobile=info.project.name==='mobile';
  await seed(page,'lana');
  // Jonathan is at the farm, far from Clark at school, so he goes about his own business.
  const start=(await state(page)).actors.jonathan.at;
  await expect.poll(async()=>(await state(page)).actors.jonathan.at,{timeout:30000,intervals:[500]}).not.toEqual(start);
  // A conversation keeps the world moving: Lana stays live and the camera can be turned.
  if(mobile)await page.locator('#track-button').tap();else await page.locator('#track-button').click();
  await expect.poll(async()=>(await state(page)).nearby,{timeout:60000}).toBe(true);
  if(mobile)await page.locator('#interact-button').tap();else await page.locator('#interact-button').click();
  await expect(page.locator('#dialogue')).toBeVisible();
  const before=(await state(page)).camera,box=(await page.locator('#world').boundingBox())!;
  await page.mouse.move(box.width*.5,box.height*.3);await page.mouse.down();await page.mouse.move(box.width*.75,box.height*.3,{steps:8});await page.mouse.up();
  await expect.poll(async()=>(await state(page)).camera).not.toEqual(before);
  await page.screenshot({path:info.outputPath('conversation.png')});
});

test('cemetery: Clark asks Lana to the formal, and she promises the last dance with a kiss',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const mobile=info.project.name==='mobile';
  await begin(page,'cemetery',mobile);await talk(page,mobile);
  await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','prom-ask');
  await film(page,info,[[2000,'ask'],[3600,'whitney'],[3000,'forget'],[3800,'last-dance'],[2600,'kiss']]);
  expect((await state(page)).questId).toBe('cemetery');
  await page.clock.runFor(3500);await page.clock.resume();
  await expect(page.locator('#cutscene')).toHaveCount(0);await expect.poll(async()=>(await state(page)).questId).toBe('mansion');expect(errors).toEqual([]);
});
test('wall of weird: the clippings tell Jeremy’s story, then Clark connects the pieces',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const mobile=info.project.name==='mobile';
  await begin(page,'deduction',mobile);
  await expect(page.locator('#cutscene')).toHaveAttribute('data-scene','wall-discovery');
  // Chloe stands just behind Clark's spot, so she is out of the film, and back for the deduction.
  await expect.poll(async()=>(await state(page)).actors.chloe.visible).toBe(false);
  await film(page,info,[[1500,'wall'],[3400,'yearbook'],[3600,'meteor'],[3600,'hospital'],[3600,'realisation']]);
  await page.clock.runFor(2000);await page.clock.resume();
  await expect(page.locator('#encounter')).toBeVisible();await expect.poll(async()=>(await state(page)).actors.chloe.visible).toBe(true);await solveEncounter(page,mobile);await talk(page,mobile);
  await expect.poll(async()=>(await state(page)).questId).toBe('whitney');expect(errors).toEqual([]);
});
test('valve: three full turns against the clock; running out lets the player try again',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const mobile=info.project.name==='mobile';
  await begin(page,'sprinklers',mobile);
  await expect(page.locator('#valve')).toBeVisible();await expect(page.locator('#valve')).toHaveAttribute('data-phase','turning');
  // Dragging around the wheel turns it clockwise.
  const box=(await page.locator('.valve-wheel').boundingBox())!,cx=box.x+box.width/2,cy=box.y+box.height/2,r=box.width*.35;
  await page.mouse.move(cx,cy-r);await page.mouse.down();
  for(let step=1;step<=24;step++){const a=-Math.PI/2+step/24*Math.PI*2;await page.mouse.move(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}
  await page.mouse.up();
  await expect.poll(async()=>(await state(page)).valve?.turns).toBeGreaterThan(.9);
  await page.screenshot({path:info.outputPath('valve.png')});
  // Let the clock run out, then try again with the keys.
  await expect(page.locator('#valve')).toHaveAttribute('data-phase','failed',{timeout:20000});
  if(mobile)await page.locator('#valve-retry').tap();else await page.locator('#valve-retry').click();
  await expect(page.locator('#valve')).toHaveAttribute('data-phase','turning');await expect.poll(async()=>(await state(page)).valve?.turns).toBe(0);
  await solveValve(page);await talk(page,mobile).catch(()=>{});
  await expect.poll(async()=>(await state(page)).questId,{timeout:20000}).toBe('truck');expect(errors).toEqual([]);
});
test('objective card folds down to its title on phones',async({page},info)=>{
  test.skip(info.project.name!=='mobile','The fold control is for touch screens.');
  await seed(page,'lana');
  await expect(page.locator('#objective-toggle')).toBeVisible();await expect(page.locator('#objective-description')).toBeVisible();
  await page.locator('#objective-toggle').tap();
  await expect(page.locator('#objective-description')).toBeHidden();await expect(page.locator('#track-button')).toBeHidden();await expect(page.locator('#objective-title')).toBeVisible();
  await expect(page.locator('#objective-toggle')).toHaveAttribute('aria-expanded','false');
  await page.screenshot({path:info.outputPath('folded.png')});
  await page.locator('#objective-toggle').tap();await expect(page.locator('#track-button')).toBeVisible();
});
