import { describe, expect, it } from 'vitest';
import { pilot } from '../content/pilot';
import { locations } from '../content/locations';
import type { EpisodeDefinition } from '../types';
import { resolveWorldState } from './world-state';
import { saveKeyFor, Story, validateEpisode } from './story';
import { World } from '../world/world';

const locationIds=locations.map(location=>location.id);
const fixture:EpisodeDefinition={
  id:'test-another-day',season:2,number:7,title:'Another Day',description:'An independent content fixture.',
  chapters:[{title:'A different morning',caption:'A new chapter.'}],
  quests:[
    {id:'greeting',chapter:0,title:'Hello again',description:'Find Martha.',location:'farm',point:[0,2],action:'Talk',kind:'talk',dialogue:'hello'},
    {id:'help',chapter:0,title:'Make room',description:'Move a crate.',location:'farm',point:[1,2],action:'Lift',kind:'strength'},
    {id:'rest',chapter:0,title:'Rest',description:'Watch the river.',location:'bridge',point:[3,1],action:'Look',kind:'inspect'},
  ],
  dialogues:{hello:{id:'hello',lines:[{speaker:'martha',text:'Come and sit for a moment.'}]}},
  world:{initial:{actors:{martha:{location:'farm',point:[0,2]}},props:{crate:{visible:true}}},rules:[
    {from:'help',until:'rest',changes:{player:{abilities:['super-strength'],carrying:'pete'},kryptonite:[{location:'mansion',point:[1,1]}]}},
    {from:'rest',changes:{night:true,actors:{martha:{location:'cemetery',point:[0,1]}},props:{crate:{visible:false},ship:{visible:true}}}},
  ]},
  nextEpisode:{title:'A future story',number:8,available:false},
};

describe('episode-driven world state',()=>{
  it('restores a temporary strength preview on cancellation and checkpoint sync',()=>{
    const story=new Story(pilot,null,locationIds);story.index=1;const world=new World(pilot.quests);world.sync(story);
    const before=world.dynamic.crate!.position.clone();world.previewPower('crate',1,.5,1,0);expect(world.dynamic.crate!.position.distanceTo(before)).toBeGreaterThan(.4);
    world.endPreview();expect(world.dynamic.crate!.position.equals(before)).toBe(true);
    world.previewPower('crate',1,.5,1,0);world.sync(story);expect(world.dynamic.crate!.position.equals(before)).toBe(true);
  });
  it('preserves the pilot rescue, restraint, power recovery, and ending checkpoints',()=>{
    const state=(id:string)=>resolveWorldState(pilot,pilot.quests.findIndex(quest=>quest.id===id));
    expect(state('lana').actors.lana?.necklace).toBe(true);
    expect(state('car-door').kryptonite).toEqual([]);
    expect(state('bring-lex-ashore').player.carrying).toBe('lex');
    expect(state('bring-lex-ashore').actors.lex).toBeUndefined();
    expect(state('lex-thanks').actors.lex?.location).toBe('bridge');
    expect(state('lex-thanks').player.carrying).toBeNull();
    expect(state('lex-thanks').props.car?.visible).toBe(false);
    expect(state('spaceship').props.ship?.visible).toBe(true);
    expect(state('whitney').actors.whitney?.necklace).toBe(true);
    expect(state('jeremy-field').player.restrained).toBe(true);
    expect(state('call-for-help').actors.lex?.location).toBe('cornfield');
    expect(state('race').player.restrained).toBe(false);
    expect(state('race').actors.lex?.location).toBe('mansion');
    expect(state('race').kryptonite).toEqual([]);
    expect(state('free-jeremy').props.truck?.tilt).toBe(.12);
    expect(resolveWorldState(pilot,pilot.quests.length).actors.jeremy).toBeUndefined();
  });
  it('runs a different episode with new quest IDs and actor placements through the same renderer',()=>{
    expect(()=>validateEpisode(fixture,locationIds)).not.toThrow();
    const story=new Story(fixture,null,locationIds),world=new World(fixture.quests);
    world.sync(story);expect(world.characters.get('martha')!.root.visible).toBe(true);expect(world.characters.get('jonathan')!.root.visible).toBe(false);
    story.advance('greeting');world.sync(story);expect(story.world.player.carrying).toBe('pete');expect(story.world.player.abilities).toEqual(['super-strength']);
    story.advance('help');world.sync(story);expect(world.isNight).toBe(true);expect(world.dynamic.crate!.visible).toBe(false);expect(world.dynamic.ship!.visible).toBe(true);
    expect(story.world.player.carrying).toBeNull();expect(story.world.kryptonite).toEqual([]);
    story.newGame();world.sync(story);expect(world.isNight).toBe(false);expect(world.dynamic.ship!.visible).toBe(false);
  });
  it('uses stable quest IDs when a new objective is inserted before a world rule',()=>{
    const changed=structuredClone(fixture);changed.quests.unshift({...changed.quests[0],id:'new-opening'});
    expect(resolveWorldState(changed,2)).toEqual(resolveWorldState(fixture,1));
  });
  it('does not mutate content or retain transient states between resolutions',()=>{
    const before=structuredClone(fixture);const state=resolveWorldState(fixture,1);
    state.actors.martha!.point=[99,99];state.player.abilities.push('super-speed');state.kryptonite[0].point=[9,9];
    expect(fixture).toEqual(before);expect(resolveWorldState(fixture,1).player.abilities).toEqual(['super-strength']);
    expect(resolveWorldState(fixture,2).player.carrying).toBeNull();
  });
  it('keeps another episode save separate without migrating or overwriting the pilot save',()=>{
    const saves=new Map<string,string>(),storage={getItem:(key:string)=>saves.get(key)??null,setItem:(key:string,value:string)=>{saves.set(key,value);}};
    const first=new Story(pilot,storage,locationIds);first.advance('morning');const original=saves.get(saveKeyFor(pilot.id));
    const second=new Story(fixture,storage,locationIds);second.advance('greeting');expect(saves.get(saveKeyFor(pilot.id))).toBe(original);
    const loaded=new Story(fixture,storage,locationIds);loaded.load();expect(loaded.quest?.id).toBe('help');
    const loadedPilot=new Story(pilot,storage,locationIds);loadedPilot.load();expect(loadedPilot.quest?.id).toBe('feed-crate');
  });
  it.each(['range','location','ability','dialogue','strength'])('rejects invalid %s content before play',kind=>{
    const changed=structuredClone(fixture);
    if(kind==='range')changed.world.rules[0].until='greeting';
    if(kind==='location')changed.world.rules[0].changes.kryptonite![0].point=[NaN,0];
    if(kind==='ability')changed.world.rules[0].changes.player!.abilities=['flight' as never];
    if(kind==='dialogue')changed.dialogues.hello.lines=[];
    if(kind==='strength')changed.world.rules[0].changes.player!.abilities=[];
    expect(()=>validateEpisode(changed,locationIds)).toThrow();
  });
});
