import type { EpisodeDefinition } from '../types';
import { hebrew } from './he';

/** The languages the game speaks. English is the source text; every other language is a dictionary
 * keyed by the English, so a line is translated once wherever it appears and anything missing simply
 * stays in English. */
export type Language = 'en' | 'he';
export const LANGUAGES: Record<Language, { name: string; dir: 'ltr' | 'rtl' }> = {
  en: { name: 'English', dir: 'ltr' },
  he: { name: 'עברית', dir: 'rtl' },
};
const dictionaries: Record<Exclude<Language, 'en'>, Record<string, string>> = { he: hebrew };

/** Where the player's preferences (language among them) are saved. */
export const SETTINGS_KEY = 'smallville-settings-v1';

let current: Language = 'en';
export function language() { return current; }

/** The language saved with the player's settings, or the browser's own on a first visit. */
export function preferredLanguage(storage: Storage | null): Language {
  try {
    const saved = JSON.parse(storage?.getItem(SETTINGS_KEY) ?? 'null');
    if (saved?.language === 'en' || saved?.language === 'he') return saved.language;
  } catch { /* Unreadable settings fall back to the browser. */ }
  return typeof navigator !== 'undefined' && /^(he|iw)\b/i.test(navigator.language) ? 'he' : 'en';
}

/** Chooses the language for this page: the document's lang and direction follow it, and Hebrew
 * brings its fonts. The page reloads to change it, so everything is built in one language. */
export function setLanguage(value: Language) {
  current = value;
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = value; root.dir = LANGUAGES[value].dir;
  if (value === 'he' && !document.getElementById('hebrew-fonts')) {
    const link = document.createElement('link');
    link.id = 'hebrew-fonts'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=Heebo:wght@400;500;600;700&display=swap';
    document.head.append(link);
  }
}

/** Waits (briefly) for the Hebrew fonts, so text drawn into the world is drawn in them. */
export async function fontsReady(timeout = 1500) {
  if (current !== 'he' || typeof document === 'undefined' || !document.fonts) return;
  const loads = ['700 44px "Frank Ruhl Libre"', '26px "Frank Ruhl Libre"', '600 16px Heebo'].map(font => document.fonts.load(font, 'א').catch(() => []));
  await Promise.race([Promise.all(loads), new Promise(resolve => setTimeout(resolve, timeout))]);
}

/** Translates English text into the current language, filling `{name}` placeholders from `values`. */
export function t(text: string, values?: Record<string, string | number>) {
  const translated = current === 'en' ? text : dictionaries[current][text] ?? text;
  return values ? translated.replace(/\{(\w+)\}/g, (match, key: string) => key in values ? String(values[key]) : match) : translated;
}

/** The fields of episode content that are words for the player. Everything else (ids, places, kinds,
 * the world rules) is left exactly as it is. */
const TEXT_KEYS = new Set(['title', 'description', 'action', 'arrivalText', 'timerLabel', 'text', 'label', 'caption', 'year', 'tagline', 'summary', 'emphasis', 'detail', 'instruction', 'beats', 'prompt', 'choices', 'explanation', 'date']);
function walk(value: unknown, visit: (text: string) => string, key?: string): unknown {
  if (typeof value === 'string') return key && TEXT_KEYS.has(key) ? visit(value) : value;
  if (Array.isArray(value)) return value.map(item => walk(item, visit, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, name === 'world' ? item : walk(item, visit, name)]));
  return value;
}
/** The episode in the current language: the same story, ids and world, with every line translated. */
export function localizeEpisode(episode: EpisodeDefinition): EpisodeDefinition {
  return current === 'en' ? episode : walk(episode, text => t(text)) as EpisodeDefinition;
}
/** Every piece of player-facing text in an episode, for checking that a translation is complete. */
export function episodeTexts(episode: EpisodeDefinition) {
  const texts = new Set<string>(); walk(episode, text => { texts.add(text); return text; }); return texts;
}
export function translation(value: Exclude<Language, 'en'>) { return dictionaries[value]; }
