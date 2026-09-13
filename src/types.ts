export type LocationId = 'farm' | 'school' | 'bridge' | 'mansion' | 'cemetery' | 'cornfield' | 'metropolis';
export type ActorId = 'clark' | 'jonathan' | 'martha' | 'pete' | 'chloe' | 'lana' | 'lex' | 'whitney' | 'jeremy';
export type Point = readonly [number, number];
export type NpcId = Exclude<ActorId, 'clark'>;
export type StoryPropId = 'crate' | 'ship' | 'car' | 'truck' | 'spray';
export type AbilityId = 'super-speed' | 'super-strength' | 'invulnerability';
export interface WorldPosition { location: LocationId; point: Point }
export interface ActorPlacement extends WorldPosition { visible?: boolean; necklace?: boolean }
export interface PropState { visible: boolean; position?: WorldPosition; lift?: number; tilt?: number }
export interface PlayerWorldState { restrained: boolean; carrying: NpcId | null; abilities: AbilityId[] }
export interface EpisodeWorldState {
  night: boolean;
  actors: Partial<Record<NpcId, ActorPlacement>>;
  props: Partial<Record<StoryPropId, PropState>>;
  player: PlayerWorldState;
  kryptonite: WorldPosition[];
}
export interface WorldStatePatch {
  night?: boolean;
  actors?: Partial<Record<NpcId, ActorPlacement>>;
  props?: Partial<Record<StoryPropId, PropState>>;
  player?: Partial<PlayerWorldState>;
  kryptonite?: WorldPosition[];
}
export interface WorldRule {
  /** Inclusive objective ID; 'complete' means the saved ending. */
  from: string;
  /** Exclusive objective ID; omitted rules remain in effect. */
  until?: string;
  changes: WorldStatePatch;
}
export interface ProloguePage { year: string; title: string; text: string; effect?: 'meteors' }
export interface MemoryDefinition extends WorldPosition { id:string; title:string; text:string; detail:string }

export interface LocationDefinition {
  id: LocationId;
  name: string;
  subtitle: string;
  description: string;
  latitude: number;
  longitude: number;
  color: string;
  accent: string;
  locked?: boolean;
}
export interface DialogueLine { speaker: ActorId | 'narrator'; text: string }
export interface DialogueDefinition {
  id: string;
  lines: DialogueLine[];
  optional?: { label: string; lines: DialogueLine[] }[];
}
export interface QuestDefinition {
  id: string;
  chapter: number;
  title: string;
  description: string;
  location: LocationId;
  point: Point;
  checkpoint?: Point;
  checkpointLocation?: LocationId;
  action: string;
  kind: 'talk' | 'strength' | 'inspect' | 'rescue' | 'race';
  actor?: ActorId;
  dialogue?: string;
  holdSeconds?: number;
  challenge?: ChallengeDefinition;
  radius?: number;
  timeLimit?: number;
  timerLabel?: string;
  arrivalText?: string;
  enterAt?: WorldPosition;
  completionToast?: { title: string; text: string };
}
export type ChallengeDefinition =
  | { kind:'power'; title:string; instruction:string; beats:string[]; speed:number; zone:readonly [number,number]; prop?:StoryPropId; lift?:number }
  | { kind:'evidence'; title:string; cards:{title:string;date:string;text:string}[]; questions:{prompt:string;choices:string[];answer:number;explanation:string}[] };
export interface EpisodeDefinition {
  id: string;
  season: number;
  number: number;
  year?: number;
  title: string;
  description: string;
  chapters: { title: string; caption: string }[];
  quests: QuestDefinition[];
  dialogues: Record<string, DialogueDefinition>;
  world: { initial: WorldStatePatch; rules: WorldRule[] };
  prologue?: ProloguePage[];
  memories?: MemoryDefinition[];
  tagline?: string;
  openingHint?: { title: string; text: string };
  ending?: { title: string; emphasis: string; summary: string };
  nextEpisode: { title: string; number: number; available: false };
}
export interface SaveGame {
  version: 1;
  episodeId: string;
  currentQuestId: string | null;
  checkpointId: string;
  completedQuestIds: string[];
  discoveries: LocationId[];
  episodeCompleted: boolean;
  updatedAt: string;
  memories?: string[];
}
export interface Settings { sound: boolean; reducedMotion: boolean; quality: 'auto' | 'low' | 'high' }
export interface GameSnapshot {
  ready: boolean;
  mode: string;
  questId: string | null;
  questIndex: number;
  nearby: boolean;
  moving: boolean;
  speed: number;
  superSpeed: boolean;
  swimming: boolean;
  weakened: boolean;
  height: number;
  normal: number[];
  routeActive: boolean;
  dialogueOpen: boolean;
  completed: boolean;
  view: string;
  location: string;
}
