import { expect, type Page } from '@playwright/test';
import { pilotChallenges } from '../src/content/pilot-challenges';

export async function advance(page:Page,ms:number){for(let elapsed=0;elapsed<ms;elapsed+=100)await page.clock.fastForward(Math.min(100,ms-elapsed));}
/** Uses actual held keys / touch contacts, and reads the visible control meter. */
export async function solvePower(page:Page,mobile:boolean){
  const session=mobile?await page.context().newCDPSession(page):null;
  for(let beat=0;beat<4;beat++){
    if(await page.locator('#encounter-finish').isVisible())break;
    await advance(page,400);
    const bounds=(await page.locator('#power-hold').boundingBox())!;
    if(session)await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2}]});else await page.keyboard.down('e');
    let reached=false;
    for(let frame=0;frame<30;frame++){
      await advance(page,100);
      if((await page.locator('#power-meter').getAttribute('class'))?.includes('in-zone')){reached=true;break;}
    }
    expect(reached).toBe(true);
    if(session)await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('e');
  }
  await expect(page.locator('#encounter-finish')).toBeVisible();
  if(mobile)await page.locator('#encounter-finish').tap();else await page.locator('#encounter-finish').click();
  await session?.detach();
}
export async function solveEncounter(page:Page,mobile:boolean){
  if(await page.locator('#power-hold').isVisible()){
    // Pause inside the encounter, with enough headroom for a busy browser's IPC.
    // The story timer is paused by the modal, and no input is held yet.
    const now=await page.evaluate(()=>Date.now());await page.clock.pauseAt(new Date(now+3_600_000));
    await solvePower(page,mobile);await page.clock.resume();
  }else{
    const title=await page.locator('#encounter-title').textContent();
    const definition=Object.values(pilotChallenges).find(value=>value.title===title);
    if(!definition||definition.kind!=='evidence')throw new Error(`Unknown evidence encounter: ${title}`);
    for(const text of definition.questions.map(question=>question.choices[question.answer])){
      const answer=page.getByRole('button',{name:text,exact:false});if(mobile)await answer.tap();else await answer.click();
    }
    if(mobile)await page.locator('#encounter-finish').tap();else await page.locator('#encounter-finish').click();
  }
}

/** Repairs the farm fence with normal controls: the objective route walks to each broken section and
 * the interact control fixes it (instantly while Jonathan's back is turned, by hand while he watches). */
export async function solveFence(page:Page,mobile:boolean){
  const fence=async()=>JSON.parse((await page.locator('#telemetry').textContent())!).fence as {fixed:number;site:number|null;working:boolean}|null;
  const press=async(selector:string)=>{if(mobile)await page.locator(selector).tap();else await page.locator(selector).click();};
  // Telemetry refreshes a few times a second; wait until it reports the mission that just began.
  await expect.poll(async()=>(await fence())!==null,{timeout:10_000}).toBe(true);
  for(let attempt=0;;attempt++){
    if(attempt>=12)throw new Error('The fence was not repaired.');
    const current=await fence();if(!current||current.fixed>=4)break;
    if(current.site===null){await press('#track-button');await expect.poll(async()=>(await fence())?.site??null,{timeout:45_000}).not.toBeNull();}
    await expect.poll(async()=>(await fence())?.working??false,{timeout:30_000}).toBe(false);
    const before=(await fence())?.fixed??0;
    await press('#interact-button');
    // A repair by hand takes 3.2 seconds of game time, which is longer on a slow renderer.
    await expect.poll(async()=>(await fence())?.fixed??4,{timeout:30_000}).toBeGreaterThan(before);
  }
  // The mission closes a moment later, when Jonathan turns around, and his reaction begins.
  await expect(page.locator('#fence-status')).toHaveCount(0,{timeout:20_000});
  await expect(page.locator('#dialogue')).toBeVisible();
}

/** Pauses the page clock a moment ahead of now (the clock is already installed), tolerating a busy machine. */
export async function freeze(page:Page){
  for(let attempt=0;;attempt++){
    try{await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+100+attempt*400));return;}
    catch(error){if(attempt>=4||!String(error).includes('past'))throw error;}
  }
}

/** Plays through the rest of an interaction: story scenes run to their end and every conversation
 * is read, until the objective advances or the closing panel opens. */
export async function finishStory(page:Page,mobile:boolean,index:number){
  const press=async(selector:string)=>{if(mobile)await page.locator(selector).tap();else await page.locator(selector).click();};
  for(let pass=0;pass<6;pass++){
    if(await page.locator('#cutscene').count())await expect(page.locator('#cutscene')).toHaveCount(0,{timeout:60_000});
    if(await page.locator('#encounter').isVisible()){await solveEncounter(page,mobile);continue;}
    if(await page.locator('#valve').count()){await solveValve(page);continue;}
    while(await page.locator('#dialogue').isVisible())await press(await page.locator('#finish-conversation').isVisible()?'#finish-conversation':'#dialogue-next');
    const done=await page.evaluate(i=>JSON.parse(document.querySelector('#telemetry')!.textContent!).questIndex>i||!!document.querySelector('#completion[open]'),index);
    if(done)return;
    await page.waitForTimeout(400);
  }
}

/** Spins the sprinkler valve its three full turns with the arrow keys, clockwise. The (installed)
 * page clock is held while the keys go in, so a slow machine does not lose to the valve's timer. */
export async function solveValve(page:Page){
  await freeze(page);
  try{
    // Press whichever arrow the wheel expects next (clockwise), until it is sealed.
    for(let press=0;press<40&&await page.locator('#valve').getAttribute('data-phase')==='turning';press++){
      const next=Number(await page.locator('#valve').getAttribute('data-next'));
      await page.keyboard.press(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'][next]);
    }
    await expect(page.locator('#valve')).toHaveAttribute('data-phase','sealed');
    await page.clock.runFor(1500);
  }finally{await page.clock.resume();}
  await expect(page.locator('#valve')).toHaveCount(0,{timeout:15_000});
}
