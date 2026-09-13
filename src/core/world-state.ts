import type { EpisodeDefinition, EpisodeWorldState, WorldStatePatch } from '../types';

/** Derive an absolute state from content. No events are replayed when loading. */
export function resolveWorldState(episode:EpisodeDefinition,index:number):EpisodeWorldState {
  const state:EpisodeWorldState={night:false,actors:{},props:{},player:{restrained:false,carrying:null,abilities:[]},kryptonite:[]};
  const apply=(patch:WorldStatePatch)=>{
    if(patch.night!==undefined)state.night=patch.night;
    for(const [id,actor] of Object.entries(patch.actors??{}))Object.assign(state.actors,{[id]:{...actor,point:[...actor.point]}});
    for(const [id,prop] of Object.entries(patch.props??{}))Object.assign(state.props,{[id]:{...prop,position:prop.position?{...prop.position,point:[...prop.position.point]}:undefined}});
    if(patch.player)state.player={...state.player,...patch.player,abilities:[...(patch.player.abilities??state.player.abilities)]};
    if(patch.kryptonite)state.kryptonite=patch.kryptonite.map(position=>({...position,point:[...position.point]}));
  };
  apply(episode.world.initial);
  const stage=(id:string)=>id==='complete'?episode.quests.length:episode.quests.findIndex(quest=>quest.id===id);
  for(const rule of episode.world.rules){
    const from=stage(rule.from),until=rule.until===undefined?Infinity:stage(rule.until);
    if(from>=0&&index>=from&&index<until)apply(rule.changes);
  }
  return state;
}
