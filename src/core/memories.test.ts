import { expect, it } from 'vitest';
import { pilot } from '../content/pilot';
import { locations } from '../content/locations';
import { SAVE_KEY, Story } from './story';

it('saves optional discoveries independently of the main story and rejects duplicates',()=>{
  const data=new Map<string,string>();const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
  const story=new Story(pilot,storage,locations.map(value=>value.id));expect(story.remember('mailbox')).toBe(true);expect(story.remember('mailbox')).toBe(false);expect(story.remember('unknown')).toBe(false);expect(story.index).toBe(0);
  const loaded=new Story(pilot,storage,locations.map(value=>value.id));loaded.load();expect([...loaded.memories]).toEqual(['mailbox']);expect(loaded.quest?.id).toBe('morning');loaded.newGame();expect(loaded.memories.size).toBe(0);
});
it('loads an existing version-one pilot save that predates field notes',()=>{
  const story=new Story(pilot,null,locations.map(value=>value.id));story.index=5;const save=story.snapshot();delete save.memories;
  const loaded=new Story(pilot,{getItem:key=>key===SAVE_KEY?JSON.stringify(save):null,setItem:()=>{}},locations.map(value=>value.id));loaded.load();expect(loaded.index).toBe(5);expect(loaded.memories.size).toBe(0);expect(loaded.saveWarning).toBe('');
});
