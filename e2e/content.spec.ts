import { expect, test } from '@playwright/test';
import type { EpisodeDefinition } from '../src/types';

test('content contract: journal and ending render a different episode definition',async({page})=>{
  const definition:EpisodeDefinition={
    id:'ui-contract',season:2,number:4,year:2002,title:'A New Morning',description:'An independent episode.',tagline:'Another day in the same little world.',
    chapters:[{title:'Yesterday',caption:'Before this moment.'},{title:'Today',caption:'A new choice.'},{title:'Tomorrow',caption:'What comes next.'}],
    quests:[{id:'a-new-objective',chapter:1,title:'Take a look',description:'Return to the farm.',location:'farm',point:[0,2],kind:'inspect',action:'Look around'}],
    dialogues:{},world:{initial:{},rules:[]},nextEpisode:{title:'A Different Horizon',number:5,available:false},
    ending:{title:'A day to',emphasis:'remember.',summary:'Your choices made a difference.'},
  };
  await page.route('**/__ui-contract',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"></head><body><div id="app"></div></body></html>'}));
  await page.goto('/__ui-contract');
  await page.evaluate(async episode=>{
    const uiModule='/src/ui.ts',storyModule='/src/core/story.ts';
    const {UI}=await import(uiModule),{Story}=await import(storyModule);
    const ui=new UI(episode),story=new Story(episode,null,['farm']);
    ui.updateStory(story);ui.setPlaying(true);document.querySelector<HTMLElement>('#loading')!.hidden=true;ui.open('journal');
  },definition);
  await expect(page.locator('#journal')).toContainText('A New Morning');
  await expect(page.locator('#journal')).toContainText('SEASON 02');
  await expect(page.locator('#journal')).toContainText('EPISODE 04');
  await expect(page.locator('#journal')).toContainText('A Different Horizon');
  await expect(page.locator('.journal-chapter')).toHaveCount(3);
  await page.getByRole('button',{name:'Close journal',exact:true}).click();
  await expect(page.locator('#chapter-number')).toHaveText('CHAPTER 02 / 03');
  await expect(page.locator('#objective-count')).toHaveText('01 / 1');
  await expect(page.locator('#location-hud .location-coordinate')).toContainText('2002');
  expect(await page.locator('#completion h2').textContent()).toBe('A day toremember.');
  expect(await page.locator('#completion .panel-intro').textContent()).toBe('Your choices made a difference.');
  expect(await page.locator('#completion .completion-stats').textContent()).toContain('3chapters lived');
  expect(await page.getByText('Pilot',{exact:true}).count()).toBe(0);
});
