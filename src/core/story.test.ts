import { describe, expect, it } from 'vitest';
import { pilot } from '../content/pilot';
import { locations } from '../content/locations';
import { SAVE_KEY, Story, validateEpisode } from './story';
import type { StorageLike } from './story';

class MemoryStorage implements StorageLike {
  values = new Map<string,string>();
  getItem(key:string){return this.values.get(key)??null;}
  setItem(key:string,value:string){this.values.set(key,value);}
}
const create=(storage:StorageLike|null=new MemoryStorage())=>new Story(pilot,storage,locations.map(location=>location.id));

describe('episode content and progression',()=>{
  it('migrates pre-bridge-scene saves without losing the rescue or completed ending',()=>{
    for(const id of ['car-door','home',null]){
      const storage=new MemoryStorage(),story=create(storage);
      story.index=id?pilot.quests.findIndex(q=>q.id===id):pilot.quests.length;
      const old=story.snapshot();old.completedQuestIds=old.completedQuestIds.filter(q=>q!=='bridge-moment');
      storage.setItem(SAVE_KEY,JSON.stringify(old));const loaded=create(storage);loaded.load();
      expect(loaded.quest?.id??null).toBe(id);expect(loaded.saveWarning).toBe('');expect(loaded.hasCompleted('bridge-moment')).toBe(true);
    }
  });
  it('has valid references and only explicitly available episodes',()=>{
    expect(()=>validateEpisode(pilot,locations.map(location=>location.id))).not.toThrow();
    expect(pilot.nextEpisode.available).toBe(false);
    expect(pilot.quests.some(quest=>quest.location==='metropolis')).toBe(false);
  });
  it('does not advance for an unrelated or repeated interaction',()=>{
    const story=create();
    expect(story.advance('spaceship')).toBe(false);
    expect(story.index).toBe(0);
    expect(story.advance('morning')).toBe(true);
    expect(story.advance('morning')).toBe(false);
    expect(story.quest?.id).toBe('feed-crate');
    story.discover('school');expect(story.index).toBe(1);
  });
  it('restores every checkpoint, including carrying Lex and being restrained',()=>{
    const storage=new MemoryStorage(),story=create(storage);
    story.discover('farm');
    for(let i=0;i<=pilot.quests.length;i++){
      story.save();const loaded=create(storage);loaded.load();
      expect(loaded.index).toBe(i);
      expect(loaded.quest?.id).toBe(story.quest?.id);
      expect(loaded.restrained).toBe(story.restrained);
      expect(loaded.world.player.carrying).toBe(story.world.player.carrying);
      expect(loaded.discoveries.has('farm')).toBe(true);
      if(story.quest)story.advance(story.quest.id);
    }
    expect(story.complete).toBe(true);expect(story.progress).toBe(1);
    expect(story.advance('loft')).toBe(false);
  });
  it.each(['bad JSON','unknown version','skipped objective','unknown place','mismatched checkpoint'])('recovers safely from %s without overwriting it on load',kind=>{
    const storage=new MemoryStorage(),story=create(storage);const value=story.snapshot();
    let raw='invalid-json';
    if(kind==='unknown version')raw=JSON.stringify({...value,version:9});
    if(kind==='skipped objective')raw=JSON.stringify({...value,completedQuestIds:['morning','spaceship']});
    if(kind==='unknown place')raw=JSON.stringify({...value,discoveries:['krypton']});
    if(kind==='mismatched checkpoint')raw=JSON.stringify({...value,checkpointId:'truck'});
    storage.setItem(SAVE_KEY,raw);story.load();
    expect(story.index).toBe(0);expect(story.saveWarning).toContain('could not be read');expect(storage.getItem(SAVE_KEY)).toBe(raw);
  });
  it('continues in memory when browser storage fails',()=>{
    const story=create({getItem:()=>null,setItem:()=>{throw new Error('Quota exceeded');}});
    expect(story.advance('morning')).toBe(true);expect(story.index).toBe(1);expect(story.saveWarning).toContain('could not save');expect(story.hadSave).toBe(true);
  });
  it('starts a fresh, internally consistent episode on replay',()=>{
    const story=create();for(const quest of pilot.quests)story.advance(quest.id);story.discover('farm');story.newGame();
    expect(story.index).toBe(0);expect(story.complete).toBe(false);expect(story.discoveries.size).toBe(0);expect(story.snapshot().completedQuestIds).toEqual([]);
  });
});
