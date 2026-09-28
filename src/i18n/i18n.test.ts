import { describe, expect, it } from 'vitest';
import { pilot } from '../content/pilot';
import * as cutscenes from '../content/pilot-cutscenes';
import { actorNames, locations } from '../content/locations';
import type { CutsceneDefinition } from '../core/cutscene';
import { episodeTexts, localizeEpisode, setLanguage, t, translation } from '.';

/** The game's source files, as text. */
const sources = import.meta.glob(['../**/*.ts', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const read = (file: string) => sources[`../${file}`];
const quoted = (text: string) => [...text.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(match => match[1]);

/** Every piece of text the player can see, in English. */
function everyText() {
  const texts = new Set<string>();
  // Strings the code hands straight to t().
  for (const text of Object.values(sources)) for (const match of text.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) texts.add(match[1]);
  // Strings it translates through a variable: Jonathan's warnings and the map's labels.
  for (const warning of quoted(read('fence-challenge.ts').match(/const CAUGHT = \[([^\]]*)\]/)![1])) texts.add(warning);
  for (const match of read('minimap.ts').matchAll(/text:'([^']+)'/g)) texts.add(match[1]);
  // The story, the films and the places.
  for (const text of episodeTexts(pilot)) texts.add(text);
  for (const scene of Object.values(cutscenes) as CutsceneDefinition[]) for (const shot of scene.shots) if (shot.caption) texts.add(shot.caption);
  for (const place of locations) for (const text of [place.name, place.subtitle, place.description]) texts.add(text);
  for (const name of Object.values(actorNames)) texts.add(name);
  return texts;
}

describe('Hebrew', () => {
  const hebrew = translation('he'), texts = everyText();
  it('translates every line of the game', () => {
    expect([...texts].filter(text => !(text in hebrew))).toEqual([]);
  });
  it('leaves no untranslated English in the code', () => {
    // Signs in the world stay in English, as on screen in the series; object names are never shown.
    const english = new Set(['WALL OF WEIRD', 'DAILY PLANET', 'FEED & SEED', 'SMALLVILLE HARDWARE', 'GENERAL STORE', 'SMALLVILLE HIGH', 'HOME OF THE CROWS',
      'Kent barn — board-and-batten, hayloft and cupolas', 'Smallville High — tall sash windows and burgundy bays']);
    const stray: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      if (/\/(content|i18n)\//.test(file) || /model-review/.test(file)) continue;
      // Two or more words in quotes that are not the argument of a call (errors and t() are calls).
      for (const match of text.matchAll(/(?:^|[^(\w])'([A-Z][A-Za-z’]*(?: [A-Za-z’,.!?&—–-]+)+[.!?…]?)'/gm)) {
        if (!(match[1] in hebrew) && !english.has(match[1])) stray.push(`${file}: ${match[1]}`);
      }
    }
    expect(stray).toEqual([]);
  });
  it('keeps no translation for text the game no longer has', () => {
    expect(Object.keys(hebrew).filter(text => !texts.has(text))).toEqual([]);
  });
  it('keeps every placeholder and line break', () => {
    const marks = (text: string) => [...text.matchAll(/\{\w+\}|<br>|<\/?em>/g)].map(match => match[0]).sort();
    expect(Object.entries(hebrew).filter(([english, translated]) => marks(english).join() !== marks(translated).join()).map(([english]) => english)).toEqual([]);
  });
  it('translates the episode without touching its ids or its world', () => {
    setLanguage('he');
    try {
      const episode = localizeEpisode(pilot);
      expect(episode.quests.map(quest => [quest.id, quest.location, quest.dialogue])).toEqual(pilot.quests.map(quest => [quest.id, quest.location, quest.dialogue]));
      expect(episode.world).toBe(pilot.world);
      expect(episode.quests[0].title).toBe(hebrew[pilot.quests[0].title]);
      expect(t('Retry from {place}', { place: 'X' })).toContain('X');
    } finally { setLanguage('en'); }
  });
});
