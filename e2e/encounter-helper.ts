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
