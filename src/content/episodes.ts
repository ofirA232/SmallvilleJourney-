import { pilot } from './pilot';
import type { EpisodeDefinition } from '../types';

/** Add completed episode definitions here; unreleased episodes stay metadata. */
export const playableEpisodes:EpisodeDefinition[]=[pilot];
export const activeEpisode=playableEpisodes.find(episode=>episode.id==='s01e01')!;
