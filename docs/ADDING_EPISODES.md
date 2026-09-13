# Adding an episode through content

The shipped episode is **s01e01, Pilot**. Metamorphosis remains a coming-soon card. The engine reads objectives, dialogue, world changes, character placements, powers, introductions, and ending text from the selected `EpisodeDefinition`.

For another story using the existing places, actors, props, and mechanics, add a content definition and register it. You do not need to add quest-ID checks to `main.ts`, `Story`, or `World`.

## A complete definition

Create `src/content/another-day.ts`:

```ts
import type { EpisodeDefinition } from '../types';

export const anotherDay: EpisodeDefinition = {
  id: 'another-day', season: 1, number: 2, year: 2001,
  title: 'Another Day',
  description: 'An example story for testing the content workflow.',
  tagline: 'A new morning in a familiar place.',
  chapters: [{ title: 'At home', caption: 'There is always something to do.' }],
  quests: [
    {
      id: 'greet-martha', chapter: 0,
      title: 'A familiar face', description: 'Find Martha outside the farmhouse.',
      location: 'farm', point: [1.3, 0.4], checkpoint: [0, 3.4],
      action: 'Talk to Martha', kind: 'talk', dialogue: 'morning-chat',
    },
    {
      id: 'move-crate', chapter: 0,
      title: 'Lend a hand', description: 'Move the feed crate.',
      location: 'farm', point: [1.7, 1.6],
      action: 'Move the crate', kind: 'strength', holdSeconds: 1.5,
      completionToast: { title: 'All done', text: 'A little help goes a long way.' },
    },
  ],
  dialogues: {
    'morning-chat': {
      id: 'morning-chat',
      lines: [{ speaker: 'martha', text: 'Would you give me a hand with this crate?' }],
      optional: [{ label: 'Ask about the day', lines: [
        { speaker: 'martha', text: 'The rest of the afternoon is yours.' },
      ] }],
    },
  },
  world: {
    initial: {
      actors: { martha: { location: 'farm', point: [1.3, 0.4] } },
      props: { crate: { visible: true } },
      player: { abilities: ['super-speed', 'super-strength', 'invulnerability'] },
    },
    rules: [{
      from: 'complete',
      changes: { props: {
        crate: { visible: true, position: { location: 'farm', point: [2.8, 0.7] } },
      } },
    }],
  },
  openingHint: { title: 'A new morning', text: 'Martha is waiting by the farmhouse.' },
  ending: { title: 'A little help.', emphasis: 'A good beginning.', summary: 'Home is a place you help to build.' },
  nextEpisode: { title: 'A future chapter', number: 3, available: false },
};
```

This is an authoring example, not a released adaptation of episode two.

## Register and activate it

In `src/content/episodes.ts`, import the definition and add it to `playableEpisodes`. Choose its ID in the `activeEpisode` lookup while developing or building that episode. The UI, prologue player, quest system, and world renderer use that selection.

The pilot keeps its original `smallville-journey-save-v1` key. Other definitions use `smallville-journey-<episode-id>-save-v1`, so trying another episode does not overwrite the pilot. Format version 1 and existing pilot saves remain compatible.

The active episode is currently a content/build setting. A player-facing season selector and automatic progression between installed episodes are future campaign features; the shipped interface still presents only the playable pilot and the coming-soon card.

## World rules

`world.initial` establishes the baseline. `world.rules` applies changes in list order. `from` includes that objective; `until` excludes that objective. Omit `until` to keep a change through the ending. Use `from: 'complete'` for changes that appear only after the last objective.

```ts
{
  from: 'a-new-objective', until: 'the-next-objective',
  changes: {
    night: true,
    actors: { lex: { location: 'bridge', point: [3, 1.5], necklace: true } },
    player: { restrained: true, carrying: null },
    kryptonite: [{ location: 'bridge', point: [3, 1.5] }],
  },
}
```

Every checkpoint is resolved afresh from the baseline and matching rules. A temporary placement or restraint disappears when its range ends, including after a reload. No effect is toggled or replayed on a visit.

Actor and prop entries replace the corresponding entry in the accumulated state. Unmentioned actors/props remain at the accumulated baseline; actors/props absent from that baseline are hidden. `player` fields merge individually. A `kryptonite` array replaces the previous array; an empty array clears it. Returned state is cloned from content.

Available actor IDs are the NPCs in `ActorId`. A placement can include `visible: false` or `necklace: true`. Kryptonite positions define weakness zones; keep them aligned with the visible necklace or a scene prop. Story props are `crate`, `ship`, `car`, `truck`, and `spray`; `position`, `lift` (world units), and `tilt` (radians) are optional. Ambient scenery such as trees and the windmill belongs to the shared world.

Player state supports `restrained`, carrying any existing NPC, and the pilot's abilities: `super-speed`, `super-strength`, and `invulnerability`. Superspeed and strength are checked against episode state. Invulnerability is a story capability; the pilot has no health/combat system.

## Objectives and introductions

- `point` is `[east, south]` in local units relative to the named location. `at(location, point)` maps it onto the sphere.
- `checkpoint` and optional `checkpointLocation` control a safe reload/retry location.
- `enterAt` moves Clark when an objective first becomes active through progression. Loading uses its checkpoint instead, without replaying the transition.
- `kind` is `talk`, `inspect`, `strength`, `rescue`, or `race`.
- `dialogue` must reference a nonempty dialogue. Finishing it completes the objective.
- `holdSeconds` specifies a short contextual action. `radius` controls interaction distance.
- `challenge` can replace the automatic action with a playable `power` or `evidence` encounter. See `src/content/pilot-challenges.ts` for complete examples. Power encounters define named `beats`, a positive charge `speed`, and a normalized gold `zone` such as `[0.52, 0.78]`; each beat requires a fresh hold/release. Evidence encounters define readable `cards` and `questions` with choices, an answer index, and a hint for wrong connections. The existing quest dialogue follows a successful encounter, and the objective completes only after its explicit finish action/dialogue.
- `race` requires a positive `timeLimit`. Retry preserves all earlier objectives.
- `timerLabel` customizes the countdown caption for another race, such as the missed school bus.
- `completionToast` is an optional message after a same-chapter objective.

An optional `prologue` array contains `{ year, title, text, effect? }` pages. `effect: 'meteors'` enables the existing meteor visual for that page. Without a prologue, a new journey starts directly in play. `openingHint`, `tagline`, and `ending` customize presentation without editing UI code.

An optional `memories` array defines small discoveries with `{ id, location, point, title, detail, text }`. They have physical page markers, an explicit nearby interaction, and a rereadable entry in the journal. They never advance the story. Saves add an optional `memories` list to version 1; older saves with no such field load with an empty collection. Keep memory IDs stable after release, just as you do objective IDs.

Power encounters can also specify a story `prop` and a nonnegative `lift` in world units. Its temporary strain/lift preview is restored on cancellation; successful completion still applies the episode's normal world rules. This keeps previews out of the save state.

## Validation and new mechanics

`validateEpisode` rejects broken quest IDs, world-rule ranges, positions, actors, abilities, prop transforms, durations, and dialogue references. It also rejects a mandatory strength objective when that power is unavailable. Keep IDs stable after release because saves store the completed objective prefix.

Run `npm test`, `npm run build`, and `npm run test:e2e`. Unit tests include an independent episode with different quest IDs, state transitions, and isolated saves. Browser tests also mount a different episode's journal/ending, while the full pilot tests navigate and interact through every objective using normal controls.

New locations or NPC models still need scenery/rig definitions and collision volumes. New powers or encounter types need an implementation in the appropriate core system, then a small content option. Test checkpoint safety and navigation before making them available to players.
