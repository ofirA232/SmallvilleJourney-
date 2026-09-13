import type { EpisodeDefinition, LocationId, SaveGame, WorldPosition, WorldStatePatch } from '../types';
import { resolveWorldState } from './world-state';

export const SAVE_KEY = 'smallville-journey-save-v1';
export const saveKeyFor=(episodeId:string)=>episodeId==='s01e01'?SAVE_KEY:`smallville-journey-${episodeId}-save-v1`;
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function validateEpisode(episode: EpisodeDefinition, locationIds: string[]) {
  const ids = new Set<string>();
  if (!episode.quests.length) throw new Error('An episode must contain at least one quest.');
  for (const quest of episode.quests) {
    if (ids.has(quest.id)||quest.id==='complete'||!quest.id) throw new Error(`Duplicate or reserved quest: ${quest.id}`);
    ids.add(quest.id);
    if (!locationIds.includes(quest.location) || (quest.checkpointLocation && !locationIds.includes(quest.checkpointLocation))) throw new Error(`Unknown location in ${quest.id}`);
    if (!Number.isInteger(quest.chapter)||quest.chapter < 0 || quest.chapter >= episode.chapters.length) throw new Error(`Unknown chapter in ${quest.id}`);
    if (quest.dialogue && !episode.dialogues[quest.dialogue]) throw new Error(`Missing dialogue: ${quest.dialogue}`);
    if (quest.kind === 'race' && (!quest.timeLimit || quest.timeLimit <= 0)) throw new Error(`Missing time limit in ${quest.id}`);
  }
  const actors=['jonathan','martha','pete','chloe','lana','lex','whitney','jeremy'];
  const abilities=['super-speed','super-strength','invulnerability'];
  const position=(value:WorldPosition)=>{if(!locationIds.includes(value.location)||!Array.isArray(value.point)||value.point.length!==2||!value.point.every(Number.isFinite))throw new Error('Invalid world position');};
  const patch=(value:WorldStatePatch)=>{
    if(value.night!==undefined&&typeof value.night!=='boolean')throw new Error('Invalid daylight state');
    for(const [id,actor] of Object.entries(value.actors??{})){if(!actors.includes(id))throw new Error(`Unknown actor: ${id}`);position(actor);}
    for(const [id,prop] of Object.entries(value.props??{})){
      if(!['crate','ship','car','truck','spray'].includes(id)||typeof prop.visible!=='boolean')throw new Error(`Unknown or invalid prop: ${id}`);
      if(prop.position)position(prop.position);
      for(const number of [prop.lift,prop.tilt])if(number!==undefined&&!Number.isFinite(number))throw new Error(`Invalid prop transform: ${id}`);
    }
    value.kryptonite?.forEach(position);
    if(value.player?.carrying!==undefined&&value.player.carrying!==null&&!actors.includes(value.player.carrying))throw new Error('Unknown carried actor');
    if(value.player?.abilities?.some(ability=>!abilities.includes(ability)))throw new Error('Unknown ability');
  };
  if(!episode.world)throw new Error('Missing episode world definition');
  patch(episode.world.initial);
  const stage=(id:string)=>id==='complete'?episode.quests.length:episode.quests.findIndex(quest=>quest.id===id);
  for(const rule of episode.world.rules){
    const from=stage(rule.from),until=rule.until===undefined?Infinity:stage(rule.until);
    if(from<0||until<0||until<=from)throw new Error(`Invalid world rule range: ${rule.from}`);
    patch(rule.changes);
  }
  for(const [index,quest] of episode.quests.entries()){
    position(quest);if(quest.enterAt)position(quest.enterAt);
    if(quest.checkpoint)position({location:quest.checkpointLocation??quest.location,point:quest.checkpoint});
    if(quest.kind==='strength'&&!resolveWorldState(episode,index).player.abilities.includes('super-strength'))throw new Error(`Super strength is unavailable for ${quest.id}`);
    if(quest.holdSeconds!==undefined&&(!Number.isFinite(quest.holdSeconds)||quest.holdSeconds<=0))throw new Error(`Invalid action duration: ${quest.id}`);
    if(quest.timeLimit!==undefined&&(!Number.isFinite(quest.timeLimit)||quest.timeLimit<=0))throw new Error(`Invalid race duration: ${quest.id}`);
    const challenge=quest.challenge;
    if(challenge?.kind==='power'&&((challenge.lift!==undefined&&(!Number.isFinite(challenge.lift)||challenge.lift<0))||(challenge.prop!==undefined&&!['crate','ship','car','truck','spray'].includes(challenge.prop))))throw new Error(`Invalid encounter prop: ${quest.id}`);
    if(challenge?.kind==='power'&&(!challenge.beats.length||challenge.beats.some(beat=>!beat)||!Number.isFinite(challenge.speed)||challenge.speed<=0||challenge.zone.length!==2||!challenge.zone.every(Number.isFinite)||challenge.zone[0]<0||challenge.zone[1]>1||challenge.zone[0]>=challenge.zone[1]))throw new Error(`Invalid power challenge: ${quest.id}`);
    if(challenge?.kind==='evidence'&&(!challenge.cards.length||!challenge.questions.length||challenge.questions.some(question=>!question.prompt||question.choices.length<2||!Number.isInteger(question.answer)||question.answer<0||question.answer>=question.choices.length)))throw new Error(`Invalid evidence challenge: ${quest.id}`);
  }
  const memories=new Set<string>();
  for(const note of episode.memories??[]){position(note);if(!note.id||memories.has(note.id)||!note.title||!note.text)throw new Error('Invalid field note');memories.add(note.id);}
  for(const [id,dialogue] of Object.entries(episode.dialogues)){
    if(dialogue.id!==id||!dialogue.lines.length)throw new Error(`Invalid dialogue: ${id}`);
    for(const lines of [dialogue.lines,...(dialogue.optional??[]).map(choice=>choice.lines)]){
      if(!lines.length||lines.some(line=>!['narrator','clark',...actors].includes(line.speaker)||!line.text))throw new Error(`Invalid dialogue lines: ${id}`);
    }
  }
}

export class Story {
  index = 0;
  discoveries = new Set<LocationId>();
  memories = new Set<string>();
  saveWarning = '';
  hadSave = false;
  private worldIndex=-1;
  private worldEpisode:EpisodeDefinition|null=null;
  private worldCache:ReturnType<typeof resolveWorldState>|null=null;
  constructor(public episode: EpisodeDefinition, private storage: StorageLike | null, private locationIds: LocationId[],private saveKey=saveKeyFor(episode.id)) {}
  get quest() { return this.episode.quests[this.index] ?? null; }
  get complete() { return this.index === this.episode.quests.length; }
  get progress() { return this.index / this.episode.quests.length; }
  hasCompleted(id: string) { const index = this.episode.quests.findIndex(quest => quest.id === id); return index >= 0 && index < this.index; }
  get world(){
    if(this.worldIndex!==this.index||this.worldEpisode!==this.episode||!this.worldCache){this.worldCache=resolveWorldState(this.episode,this.index);this.worldIndex=this.index;this.worldEpisode=this.episode;}
    return this.worldCache;
  }
  get restrained() { return this.world.player.restrained; }
  advance(expectedId: string): boolean {
    if (this.quest?.id !== expectedId) return false;
    this.index++;
    this.save();
    return true;
  }
  discover(id: LocationId) {
    if (this.discoveries.has(id)) return false;
    this.discoveries.add(id);
    this.save();
    return true;
  }
  remember(id:string){if(this.memories.has(id)||!this.episode.memories?.some(note=>note.id===id))return false;this.memories.add(id);this.save();return true;}
  newGame() { this.index = 0; this.discoveries.clear();this.memories.clear(); this.save(); }
  snapshot(): SaveGame {
    return {
      version: 1, episodeId: this.episode.id, currentQuestId: this.quest?.id ?? null,
      checkpointId: this.quest?.id ?? 'complete', completedQuestIds: this.episode.quests.slice(0, this.index).map(quest => quest.id),
      discoveries: [...this.discoveries], episodeCompleted: this.complete, updatedAt: new Date().toISOString(),
      memories:[...this.memories],
    };
  }
  save() {
    // Keep the current journey resumable within this tab even when disk storage
    // is denied. A page reload still reports the lack of a persisted save.
    this.hadSave = true;
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem(this.saveKey, JSON.stringify(this.snapshot()));
      this.saveWarning = '';
    } catch { this.saveWarning = 'Your browser could not save this journey. You can keep playing, but progress may be lost when you leave.'; }
  }
  load() {
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      const raw = this.storage.getItem(this.saveKey);
      if (!raw) return;
      const save = JSON.parse(raw) as Partial<SaveGame>;
      if (save.version !== 1 || save.episodeId !== this.episode.id || !Array.isArray(save.completedQuestIds) || !Array.isArray(save.discoveries)) throw new Error('Invalid save');
      // The bridge scene was inserted into the pilot after its first release.
      // Accept only the exact previous quest order, retaining the current rescue
      // or later checkpoint. Never reinterpret a malformed/out-of-order save.
      const inserted=this.episode.quests.findIndex(quest=>quest.id==='bridge-moment');
      if(this.episode.id==='s01e01'&&inserted>=0&&!save.completedQuestIds.includes('bridge-moment')&&save.currentQuestId!=='bridge-moment'){
        const previous=this.episode.quests.filter(quest=>quest.id!=='bridge-moment');
        const count=save.completedQuestIds.length;
        if(count>=inserted&&count<=previous.length&&save.completedQuestIds.every((id,i)=>previous[i]?.id===id)
          &&save.currentQuestId===(previous[count]?.id??null)&&save.episodeCompleted===(count===previous.length))save.completedQuestIds.splice(inserted,0,'bridge-moment');
      }
      const index = save.completedQuestIds.length;
      if (index > this.episode.quests.length || save.completedQuestIds.some((id, position) => this.episode.quests[position]?.id !== id)) throw new Error('Invalid order');
      if (save.episodeCompleted !== (index === this.episode.quests.length) || save.currentQuestId !== (this.episode.quests[index]?.id ?? null)) throw new Error('Invalid checkpoint');
      if (save.checkpointId !== (save.currentQuestId ?? 'complete') || save.discoveries.some(id => !this.locationIds.includes(id))) throw new Error('Invalid discovery');
      this.index = index;
      if(save.memories!==undefined&&(!Array.isArray(save.memories)||save.memories.some(id=>!this.episode.memories?.some(note=>note.id===id))))throw new Error('Invalid field notes');
      this.memories=new Set(save.memories??[]);
      this.discoveries = new Set(save.discoveries);
      this.hadSave = true;
    } catch {
      this.index = 0; this.discoveries.clear();this.memories.clear(); this.hadSave = false;
      this.saveWarning = 'Your saved journey could not be read. A fresh journey is ready; your old save stays untouched until you begin.';
    }
  }
}
